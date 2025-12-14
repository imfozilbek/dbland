/**
 * Encrypted credentials for a connection
 * The actual encryption/decryption is handled by the storage layer
 */
export interface Credentials {
    id: string
    connectionId: string
    encryptedPassword?: string
    encryptedPrivateKey?: string
    encryptedPassphrase?: string
    createdAt: Date
    updatedAt: Date
}

/**
 * Decrypted credentials (only in memory, never persisted)
 */
export interface DecryptedCredentials {
    password?: string
    privateKey?: string
    passphrase?: string
}

/**
 * Check if credentials need to be decrypted
 */
export function hasEncryptedCredentials(credentials: Credentials): boolean {
    return !!(
        credentials.encryptedPassword ||
        credentials.encryptedPrivateKey ||
        credentials.encryptedPassphrase
    )
}
