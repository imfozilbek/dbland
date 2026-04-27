import { describe, expect, it } from "vitest"
import { Credentials, hasEncryptedCredentials } from "./Credentials"

const base = (): Credentials => ({
    id: "cred-1",
    connectionId: "c-1",
    createdAt: new Date(),
    updatedAt: new Date(),
})

describe("Credentials.hasEncryptedCredentials", () => {
    it("is false when none of the three encrypted fields is set", () => {
        expect(hasEncryptedCredentials(base())).toBe(false)
    })

    it.each([
        ["encryptedPassword", { encryptedPassword: "x" }],
        ["encryptedPrivateKey", { encryptedPrivateKey: "x" }],
        ["encryptedPassphrase", { encryptedPassphrase: "x" }],
    ] as const)("is true when only %s is set", (_label, partial) => {
        expect(hasEncryptedCredentials({ ...base(), ...partial })).toBe(true)
    })

    it("is false when fields are present but empty strings", () => {
        expect(
            hasEncryptedCredentials({
                ...base(),
                encryptedPassword: "",
                encryptedPrivateKey: "",
                encryptedPassphrase: "",
            }),
        ).toBe(false)
    })
})
