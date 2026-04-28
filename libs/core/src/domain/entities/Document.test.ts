import { describe, expect, it } from "vitest"
import { FieldType, findField, flattenDocument, inferFieldType } from "./Document"

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

    it("treats a bare 24-hex string as String, not ObjectId — adapters carry their own envelope", () => {
        // A 24-hex-character username or hash should NOT be misclassified
        // just because it shape-matches ObjectId. The Rust adapter wraps
        // real ObjectIds in a `$oid` envelope; if a bare string lands
        // here, it's a string by construction.
        expect(inferFieldType("507f1f77bcf86cd799439011")).toBe(FieldType.String)
        expect(inferFieldType("deadbeefdeadbeefdeadbeef")).toBe(FieldType.String)
    })

    it("treats an ISO-shaped string as String — date strings come through `$date` envelopes", () => {
        // Same reasoning: the domain trusts the envelope. A free-text
        // log line that happens to start with an ISO timestamp shouldn't
        // get coloured as a Date in the result viewer.
        expect(inferFieldType("2024-04-27T12:34:56Z")).toBe(FieldType.String)
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
        const fields = flattenDocument({
            id: { $oid: "507f1f77bcf86cd799439011" },
            count: 7,
        })
        const byKey = Object.fromEntries(fields.map((f) => [f.key, f.type]))
        expect(byKey.id).toBe(FieldType.ObjectId)
        expect(byKey.count).toBe(FieldType.Number)
    })
})

describe("Document.findField", () => {
    const doc = {
        name: "Alice",
        address: { city: "Tashkent", zip: "100000" },
        tags: ["admin", "owner"],
    }

    it("finds a top-level field with the right type and path", () => {
        const field = findField(doc, "name")
        expect(field).toEqual({
            key: "name",
            value: "Alice",
            type: FieldType.String,
            path: "name",
        })
    })

    it("walks dotted paths into nested objects", () => {
        const field = findField(doc, "address.city")
        expect(field?.value).toBe("Tashkent")
        expect(field?.path).toBe("address.city")
        expect(field?.key).toBe("city")
    })

    it("returns the array as a single field, doesn't index into items by default", () => {
        // findField walks the path verbatim; if the caller wanted items,
        // they'd path through "tags.0".
        const field = findField(doc, "tags")
        expect(field?.type).toBe(FieldType.Array)
    })

    it("returns undefined for missing intermediate segments", () => {
        expect(findField(doc, "address.country")).toBeUndefined()
        expect(findField(doc, "missing.thing")).toBeUndefined()
    })

    it("returns undefined for an empty path", () => {
        expect(findField(doc, "")).toBeUndefined()
    })

    it("doesn't accidentally return a parent for a longer-path miss", () => {
        // Was a real bug in the previous flatten + .find(p => p === path)
        // approach: searching for "address.zip2" could match "address"
        // first. The path-walking version short-circuits cleanly.
        expect(findField(doc, "address.zip2")).toBeUndefined()
    })
})
