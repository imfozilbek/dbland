import type { QueryLanguage } from "../stores/query-store"

/**
 * Format a query string based on the query language.
 */
export function formatQuery(query: string, language: QueryLanguage): string {
    if (!query.trim()) {
        return query
    }

    try {
        if (language === "mongodb") {
            return formatMongoDBQuery(query)
        } else if (language === "redis") {
            return formatRedisQuery(query)
        }
        return query
    } catch {
        // If formatting fails, return original query
        return query
    }
}

/**
 * Format MongoDB query (JSON-like syntax).
 */
function formatMongoDBQuery(query: string): string {
    try {
        // Try to parse as JSON and prettify
        const parsed: unknown = JSON.parse(query)
        return JSON.stringify(parsed, null, 4)
    } catch {
        // If not valid JSON, try to format as MongoDB shell syntax
        return formatMongoDBShellSyntax(query)
    }
}

/**
 * Format MongoDB shell syntax (e.g., db.collection.find(...))
 */
function formatMongoDBShellSyntax(query: string): string {
    // Remove extra whitespace
    let formatted = query.trim()

    // Add newlines after each method call for readability
    formatted = formatted.replace(
        /\.(find|findOne|aggregate|insertOne|insertMany|updateOne|updateMany|deleteOne|deleteMany|countDocuments)\(/g,
        "\n    .$1(",
    )

    // Indent chained methods
    formatted = formatted.replace(/\.(sort|limit|skip|project)\(/g, "\n    .$1(")

    return formatted
}

/**
 * Format Redis query (CLI syntax).
 */
function formatRedisQuery(query: string): string {
    // Normalize spacing for Redis commands
    const parts = query.trim().split(/\s+/)

    if (parts.length === 0) {
        return query
    }

    // Uppercase command (first part)
    const command = parts[0].toUpperCase()

    // Keep arguments as-is
    const args = parts.slice(1)

    return [command, ...args].join(" ")
}
