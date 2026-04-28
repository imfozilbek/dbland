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
 * Decrypted credentials, only ever held in memory and only for as long as
 * a single connect attempt needs them. The shape distinguishes the two
 * independent passwords a connection can carry — the database account
 * password and the SSH tunnel account password — because they are
 * different secrets and merging them silently (as an earlier version of
 * `ConnectToDatabaseUseCase` did) lets an SSH-tunnel auth failure look
 * like a DB-auth failure, or worse, leaks one secret into a system that
 * shouldn't see it.
 *
 * `password` is kept for backward compatibility with existing storage
 * adapters that haven't migrated yet; new code should set the explicit
 * `authPassword` / `sshPassword` fields.
 */
export interface DecryptedCredentials {
    /** Database account password (used by the DB driver). */
    authPassword?: string
    /** SSH tunnel password (used only when SSH auth method is "password"). */
    sshPassword?: string
    /** SSH private key passphrase (used when SSH auth method is "key"). */
    passphrase?: string
    /** SSH private key contents (used when SSH auth method is "key"). */
    privateKey?: string
    /**
     * @deprecated Legacy single-password field. New code should pick one of
     * `authPassword` / `sshPassword`. Storage adapters that still write a
     * single `password` are read by this slot during a transition window.
     */
    password?: string
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
