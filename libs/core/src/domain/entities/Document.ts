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
 * Infer the type of a value
 */
export function inferFieldType(value: unknown): FieldType {
    if (value === null) {
        return FieldType.Null
    }
    if (value === undefined) {
        return FieldType.Undefined
    }
    if (typeof value === "string") {
        // Check for ObjectId format (24 hex chars)
        if (/^[a-f\d]{24}$/i.test(value)) {
            return FieldType.ObjectId
        }
        // Check for ISO date format
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
            return FieldType.Date
        }
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
        // Check for MongoDB ObjectId-like object
        if ("$oid" in value) {
            return FieldType.ObjectId
        }
        // Check for MongoDB Date-like object
        if ("$date" in value) {
            return FieldType.Date
        }
        // Check for Binary
        if ("$binary" in value) {
            return FieldType.Binary
        }
        return FieldType.Object
    }
    return FieldType.String
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
