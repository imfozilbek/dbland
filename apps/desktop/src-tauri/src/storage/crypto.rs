use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use thiserror::Error;

const NONCE_SIZE: usize = 12;
const KEY_SIZE: usize = 32;

#[derive(Debug, Error)]
pub enum CryptoError {
    #[error("Encryption failed: {0}")]
    EncryptionFailed(String),

    #[error("Decryption failed: {0}")]
    DecryptionFailed(String),

    #[error("Invalid key length")]
    InvalidKeyLength,

    #[error("Invalid data format")]
    InvalidDataFormat,
}

/// AES-256-GCM encryption for credentials
pub struct Crypto {
    cipher: Aes256Gcm,
}

impl Crypto {
    /// Create a new Crypto instance with a 32-byte key
    pub fn new(key: &[u8]) -> Result<Self, CryptoError> {
        if key.len() != KEY_SIZE {
            return Err(CryptoError::InvalidKeyLength);
        }

        let cipher = Aes256Gcm::new_from_slice(key)
            .map_err(|e| CryptoError::EncryptionFailed(e.to_string()))?;

        Ok(Self { cipher })
    }

    /// Generate a new random 32-byte key
    pub fn generate_key() -> [u8; KEY_SIZE] {
        use aes_gcm::aead::rand_core::RngCore;
        let mut key = [0u8; KEY_SIZE];
        OsRng.fill_bytes(&mut key);
        key
    }

    /// Encrypt plaintext data
    /// Returns: nonce (12 bytes) + ciphertext
    pub fn encrypt(&self, plaintext: &[u8]) -> Result<Vec<u8>, CryptoError> {
        use aes_gcm::aead::rand_core::RngCore;

        // Generate random nonce
        let mut nonce_bytes = [0u8; NONCE_SIZE];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        // Encrypt
        let ciphertext = self
            .cipher
            .encrypt(nonce, plaintext)
            .map_err(|e| CryptoError::EncryptionFailed(e.to_string()))?;

        // Prepend nonce to ciphertext
        let mut result = Vec::with_capacity(NONCE_SIZE + ciphertext.len());
        result.extend_from_slice(&nonce_bytes);
        result.extend_from_slice(&ciphertext);

        Ok(result)
    }

    /// Decrypt ciphertext data
    /// Input format: nonce (12 bytes) + ciphertext
    pub fn decrypt(&self, data: &[u8]) -> Result<Vec<u8>, CryptoError> {
        if data.len() < NONCE_SIZE {
            return Err(CryptoError::InvalidDataFormat);
        }

        // Extract nonce and ciphertext
        let (nonce_bytes, ciphertext) = data.split_at(NONCE_SIZE);
        let nonce = Nonce::from_slice(nonce_bytes);

        // Decrypt
        self.cipher
            .decrypt(nonce, ciphertext)
            .map_err(|e| CryptoError::DecryptionFailed(e.to_string()))
    }

    /// Encrypt a string
    pub fn encrypt_string(&self, plaintext: &str) -> Result<String, CryptoError> {
        let encrypted = self.encrypt(plaintext.as_bytes())?;
        Ok(base64_encode(&encrypted))
    }

    /// Decrypt a string
    pub fn decrypt_string(&self, encrypted: &str) -> Result<String, CryptoError> {
        let data = base64_decode(encrypted)?;
        let decrypted = self.decrypt(&data)?;
        String::from_utf8(decrypted).map_err(|_| CryptoError::DecryptionFailed("Invalid UTF-8".to_string()))
    }
}

/// Base64 encode using the standard `base64` crate.
///
/// The previous version was a hand-rolled encoder + custom `Write`
/// adapter (~100 lines) plus a decoder that silently mapped invalid
/// bytes to `0` (`_ => 0` in the match). Neither is worth maintaining
/// when AES-GCM keys and encrypted credentials flow through it — the
/// crate is 30kB, fuzz-tested, and rejects malformed input cleanly.
fn base64_encode(data: &[u8]) -> String {
    use base64::engine::general_purpose::STANDARD;
    use base64::Engine as _;
    STANDARD.encode(data)
}

/// Base64 decode using the standard `base64` crate. Invalid input
/// surfaces as `CryptoError::InvalidKey` instead of being silently
/// coerced to zero bits.
fn base64_decode(s: &str) -> Result<Vec<u8>, CryptoError> {
    use base64::engine::general_purpose::STANDARD;
    use base64::Engine as _;
    STANDARD
        .decode(s)
        .map_err(|e| CryptoError::DecryptionFailed(format!("invalid base64: {e}")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt() {
        let key = Crypto::generate_key();
        let crypto = Crypto::new(&key).unwrap();

        let plaintext = "secret password 123!@#";
        let encrypted = crypto.encrypt_string(plaintext).unwrap();
        let decrypted = crypto.decrypt_string(&encrypted).unwrap();

        assert_eq!(plaintext, decrypted);
    }

    #[test]
    fn test_different_nonces() {
        let key = Crypto::generate_key();
        let crypto = Crypto::new(&key).unwrap();

        let plaintext = "same text";
        let encrypted1 = crypto.encrypt_string(plaintext).unwrap();
        let encrypted2 = crypto.encrypt_string(plaintext).unwrap();

        // Same plaintext should produce different ciphertext due to random nonce
        assert_ne!(encrypted1, encrypted2);

        // But both should decrypt to the same plaintext
        assert_eq!(crypto.decrypt_string(&encrypted1).unwrap(), plaintext);
        assert_eq!(crypto.decrypt_string(&encrypted2).unwrap(), plaintext);
    }
}
