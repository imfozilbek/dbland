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

/// Base64 encode
fn base64_encode(data: &[u8]) -> String {
    use std::io::Write;
    let mut buf = Vec::new();
    {
        let mut encoder = base64_writer(&mut buf);
        encoder.write_all(data).unwrap();
    }
    String::from_utf8(buf).unwrap()
}

/// Base64 decode
fn base64_decode(s: &str) -> Result<Vec<u8>, CryptoError> {
    let mut result = Vec::new();
    for chunk in s.as_bytes().chunks(4) {
        let mut buf = [0u8; 4];
        let len = chunk.len().min(4);
        buf[..len].copy_from_slice(&chunk[..len]);

        // Decode 4 base64 chars to 3 bytes
        let vals: Vec<u8> = buf[..len]
            .iter()
            .filter(|&&c| c != b'=')
            .map(|&c| match c {
                b'A'..=b'Z' => c - b'A',
                b'a'..=b'z' => c - b'a' + 26,
                b'0'..=b'9' => c - b'0' + 52,
                b'+' => 62,
                b'/' => 63,
                _ => 0,
            })
            .collect();

        match vals.len() {
            2 => {
                result.push((vals[0] << 2) | (vals[1] >> 4));
            }
            3 => {
                result.push((vals[0] << 2) | (vals[1] >> 4));
                result.push((vals[1] << 4) | (vals[2] >> 2));
            }
            4 => {
                result.push((vals[0] << 2) | (vals[1] >> 4));
                result.push((vals[1] << 4) | (vals[2] >> 2));
                result.push((vals[2] << 6) | vals[3]);
            }
            _ => {}
        }
    }
    Ok(result)
}

/// Simple base64 encoder writer
fn base64_writer(output: &mut Vec<u8>) -> Base64Writer<'_> {
    Base64Writer { output, buffer: 0, bits: 0 }
}

struct Base64Writer<'a> {
    output: &'a mut Vec<u8>,
    buffer: u32,
    bits: u8,
}

impl<'a> std::io::Write for Base64Writer<'a> {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

        for &byte in buf {
            self.buffer = (self.buffer << 8) | (byte as u32);
            self.bits += 8;

            while self.bits >= 6 {
                self.bits -= 6;
                let idx = ((self.buffer >> self.bits) & 0x3F) as usize;
                self.output.push(CHARS[idx]);
            }
        }

        Ok(buf.len())
    }

    fn flush(&mut self) -> std::io::Result<()> {
        if self.bits > 0 {
            const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
            let idx = ((self.buffer << (6 - self.bits)) & 0x3F) as usize;
            self.output.push(CHARS[idx]);

            // Add padding
            let padding = (3 - (self.bits / 8 + 1) % 3) % 3;
            for _ in 0..padding {
                self.output.push(b'=');
            }
        }
        Ok(())
    }
}

impl<'a> Drop for Base64Writer<'a> {
    fn drop(&mut self) {
        let _ = std::io::Write::flush(self);
    }
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
