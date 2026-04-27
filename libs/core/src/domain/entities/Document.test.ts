import { describe, expect, it } from "vitest"
import { FieldType, flattenDocument, inferFieldType } from "./Document"

describe("Document.inferFieldType", () => {
    it.each([
        [null, FieldType.Null],
        [undefined, FieldType.Undefined],
        [42, FieldType.Number],
        [true, FieldType.Boolean],
        [new Date(), FieldType.Date],
        [[1, 2, 3], FieldType.Array],
        ["plain string", FieldType.String],
    ])("infers %p as %s", (value, expected) => {
        expect(inferFieldType(value)).toBe(expected)
    })

    it("recognises a 24-hex string as ObjectId", () => {
        expect(inferFieldType("507f1f77bcf86cd799439011")).toBe(FieldType.ObjectId)
    })

    it("recognises an ISO timestamp string as Date", () => {
        expect(inferFieldType("2024-04-27T12:34:56Z")).toBe(FieldType.Date)
    })

    it("recognises a Mongo extended-JSON $oid as ObjectId", () => {
        expect(inferFieldType({ $oid: "507f1f77bcf86cd799439011" })).toBe(FieldType.ObjectId)
    })

    it("recognises a Mongo extended-JSON $date as Date", () => {
        expect(inferFieldType({ $date: "2024-01-01" })).toBe(FieldType.Date)
    })

    it("recognises a Mongo extended-JSON $binary as Binary", () => {
        expect(inferFieldType({ $binary: { base64: "AA==", subType: "00" } })).toBe(
            FieldType.Binary,
        )
    })

    it("falls back to Object for plain objects", () => {
        expect(inferFieldType({ a: 1 })).toBe(FieldType.Object)
    })
})

describe("Document.flattenDocument", () => {
    it("yields one field per top-level key", () => {
        const fields = flattenDocument({ a: 1, b: "two", c: true })
        expect(fields).toHaveLength(3)
        expect(fields.map((f) => f.path).sort()).toEqual(["a", "b", "c"])
    })

    it("recurses into nested objects with dotted paths", () => {
        const fields = flattenDocument({ user: { name: "Alice", age: 30 } })
        const paths = fields.map((f) => f.path)
        expect(paths).toContain("user")
        expect(paths).toContain("user.name")
        expect(paths).toContain("user.age")
    })

    it("does NOT recurse into arrays", () => {
        const fields = flattenDocument({ tags: ["a", "b", "c"] })
        // tags is reported once as an Array field; its items aren't yielded
        expect(fields).toHaveLength(1)
        expect(fields[0].type).toBe(FieldType.Array)
    })

    it("attaches the inferred type to each field", () => {
        const fields = flattenDocument({ id: "507f1f77bcf86cd799439011", count: 7 })
        const byKey = Object.fromEntries(fields.map((f) => [f.key, f.type]))
        expect(byKey.id).toBe(FieldType.ObjectId)
        expect(byKey.count).toBe(FieldType.Number)
    })
})
