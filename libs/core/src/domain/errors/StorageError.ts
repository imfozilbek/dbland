import { DomainError, ErrorCode } from "./DomainError"

/**
 * Failures from the persistence boundary — reading or writing the
 * encrypted SQLite store, or whatever else implements `ConnectionStoragePort`
 * in the future. Carries the operation name to keep the message useful when
 * the cause is a vendor-specific lock / IO error that doesn't say which
 * call site triggered it.
 */
export class StorageError extends DomainError {
    readonly code: typeof ErrorCode.STORAGE_READ_FAILED | typeof ErrorCode.STORAGE_WRITE_FAILED

    constructor(code: StorageError["code"], message: string, options?: { cause?: unknown }) {
        super(message, options)
        this.code = code
    }

    static readFailed(operation: string, cause?: unknown): StorageError {
        return new StorageError(
            ErrorCode.STORAGE_READ_FAILED,
            `Storage read failed during ${operation}`,
            { cause },
        )
    }

    static writeFailed(operation: string, cause?: unknown): StorageError {
        return new StorageError(
            ErrorCode.STORAGE_WRITE_FAILED,
            `Storage write failed during ${operation}`,
            { cause },
        )
    }
}
