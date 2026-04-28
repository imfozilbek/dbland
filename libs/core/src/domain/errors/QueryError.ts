import { DomainError, ErrorCode } from "./DomainError"

/**
 * Failures that happen *during* query execution, after the connection is
 * already healthy. Connection-time failures belong in `ConnectionError`.
 *
 * The three subtypes map to clearly distinct UX:
 *   - `QUERY_INVALID_SYNTAX`     surface inline near the editor
 *   - `QUERY_EXECUTION_FAILED`   surface in the results panel as a server error
 *   - `QUERY_LANGUAGE_MISMATCH`  block at the use-case boundary, nudge the user
 *                                 to switch the editor language
 */
export class QueryError extends DomainError {
    readonly code:
        | typeof ErrorCode.QUERY_INVALID_SYNTAX
        | typeof ErrorCode.QUERY_EXECUTION_FAILED
        | typeof ErrorCode.QUERY_LANGUAGE_MISMATCH

    constructor(code: QueryError["code"], message: string, options?: { cause?: unknown }) {
        super(message, options)
        this.code = code
    }

    static invalidSyntax(reason: string, cause?: unknown): QueryError {
        return new QueryError(ErrorCode.QUERY_INVALID_SYNTAX, `Invalid query syntax: ${reason}`, {
            cause,
        })
    }

    static executionFailed(reason: string, cause?: unknown): QueryError {
        return new QueryError(
            ErrorCode.QUERY_EXECUTION_FAILED,
            `Query execution failed: ${reason}`,
            { cause },
        )
    }

    static languageMismatch(expected: string, got: string): QueryError {
        return new QueryError(
            ErrorCode.QUERY_LANGUAGE_MISMATCH,
            `Query language mismatch: expected ${expected}, got ${got}`,
        )
    }
}
