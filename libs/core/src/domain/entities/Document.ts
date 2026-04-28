/**
 * Document field type
 */
export enum FieldType {
    String = "string",
    Number = "number",
    Boolean = "boolean",
    Date = "date",
    ObjectId = "objectId",
    Array = "array",
    Object = "object",
    Null = "null",
    Binary = "binary",
    Undefined = "undefined",
}

/**
 * Document field with type information
 */
export interface DocumentField {
    key: string
    value: unknown
    type: FieldType
    path: string
}

/**
 * Document entity - represents a single document in a collection
 */
export interface Document {
    _id: string
    data: Record<string, unknown>
    collectionName: string
    databaseName: string
}

/**
 * Infer the type of a value.
 *
 * Trusts the BSON-style envelope tags (`$oid`, `$date`, `$binary`) the
 * Rust adapters emit. Does **not** look inside plain strings to guess
 * "this 24-hex-character thing is probably an ObjectId" — that
 * classifier was a leaky anti-corruption layer: a perfectly normal
 * username like `"deadbeefdeadbeefdeadbeef"` got rendered as an
 * ObjectId, and any ISO-shaped log line mid-string ended up coloured
 * as a Date. The domain layer should reflect what the adapter
 * promised, nothing more.
 *
 * If a future adapter actually emits a bare 24-hex string and means
 * "ObjectId," the right place to fix it is the adapter envelope, not
 * here.
 */
export function inferFieldType(value: unknown): FieldType {
    if (value === null) {
        return FieldType.Null
    }
    if (value === undefined) {
        return FieldType.Undefined
    }
    if (typeof value === "string") {
        return FieldType.String
    }
    if (typeof value === "number") {
        return FieldType.Number
    }
    if (typeof value === "boolean") {
        return FieldType.Boolean
    }
    if (value instanceof Date) {
        return FieldType.Date
    }
    if (Array.isArray(value)) {
        return FieldType.Array
    }
    if (typeof value === "object") {
        // BSON envelopes from the Rust adapters carry their own type
        // tags; trust them rather than guessing by shape.
        if ("$oid" in value) {
            return FieldType.ObjectId
        }
        if ("$date" in value) {
            return FieldType.Date
        }
        if ("$binary" in value) {
            return FieldType.Binary
        }
        return FieldType.Object
    }
    return FieldType.String
}

/**
 * Look up a single field by dotted path. Returns the typed `DocumentField`
 * or `undefined` when the path doesn't resolve. The previous version of
 * the codebase forced callers to flatten the whole document and `find`
 * by string match — quadratic when iterating, brittle when paths shared
 * prefixes (`"user.name"` vs `"user"` accidentally returned the
 * top-level Object instead of the Object's child).
 *
 * Walks one segment at a time so we keep the actual path-component
 * boundaries intact: `data.field` stops at the period, `arr.0.label`
 * indexes into an array, and missing intermediate segments short-circuit
 * to `undefined` instead of throwing.
 */
export function findField(data: Record<string, unknown>, path: string): DocumentField | undefined {
    if (!path) {
        return undefined
    }
    const segments = path.split(".")
    let current: unknown = data
    for (const segment of segments) {
        if (current === null || current === undefined) {
            return undefined
        }
        if (typeof current !== "object") {
            return undefined
        }
        current = (current as Record<string, unknown>)[segment]
    }
    if (current === undefined) {
        return undefined
    }
    const lastSegment = segments[segments.length - 1] ?? path
    return {
        key: lastSegment,
        value: current,
        type: inferFieldType(current),
        path,
    }
}

/**
 * Flatten a document into fields
 */
export function flattenDocument(data: Record<string, unknown>, parentPath = ""): DocumentField[] {
    const fields: DocumentField[] = []

    for (const [key, value] of Object.entries(data)) {
        const path = parentPath ? `${parentPath}.${key}` : key
        const type = inferFieldType(value)

        fields.push({ key, value, type, path })

        // Recursively flatten nested objects (but not arrays)
        if (type === FieldType.Object && value !== null) {
            fields.push(...flattenDocument(value as Record<string, unknown>, path))
        }
    }

    return fields
}
