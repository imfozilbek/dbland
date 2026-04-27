import { useEffect, useState } from "react"
import { Label } from "../ui/label"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { ArrowLeftRight, Eye, EyeOff } from "lucide-react"

interface ConnectionStringBuilderProps {
    databaseType: "mongodb" | "redis"
    host: string
    port: number
    username?: string
    password?: string
    database?: string
    authDatabase?: string
    onParse?: (parsed: {
        host: string
        port: number
        username?: string
        password?: string
        database?: string
        authDatabase?: string
    }) => void
}

const DEFAULT_PORT_BY_TYPE: Record<"mongodb" | "redis", string> = {
    mongodb: "27017",
    redis: "6379",
}

export function ConnectionStringBuilder({
    databaseType,
    host,
    port,
    username,
    password,
    database,
    authDatabase,
    onParse,
}: ConnectionStringBuilderProps): JSX.Element {
    const [connectionString, setConnectionString] = useState("")
    const [showPassword, setShowPassword] = useState(false)

    // Build connection string from individual components
    useEffect(() => {
        let uri = ""
        if (databaseType === "mongodb") {
            uri = "mongodb://"
            if (username && password) {
                uri += `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`
            }
            uri += `${host}:${port}`
            if (authDatabase) {
                uri += `/${authDatabase}`
            }
        } else if (databaseType === "redis") {
            uri = "redis://"
            if (password) {
                uri += `:${password}@`
            }
            uri += `${host}:${port}`
            if (database) {
                uri += `/${database}`
            }
        }
        setConnectionString(uri)
    }, [databaseType, host, port, username, password, database, authDatabase])

    // Parse connection string. The URI's path component means *different*
    // things per engine — MongoDB calls it the auth database, Redis uses it
    // as the database index. Routing it to the right field both ways was a
    // bug: previously both fields received the same value.
    const handleParseConnectionString = (): void => {
        try {
            const url = new URL(connectionString)
            const path = url.pathname.slice(1) || undefined

            const parsed = {
                host: url.hostname,
                port: parseInt(url.port || DEFAULT_PORT_BY_TYPE[databaseType], 10),
                username: url.username ? decodeURIComponent(url.username) : undefined,
                password: url.password ? decodeURIComponent(url.password) : undefined,
                database: databaseType === "redis" ? path : undefined,
                authDatabase: databaseType === "mongodb" ? path : undefined,
            }

            if (onParse) {
                onParse(parsed)
            }
        } catch (err) {
            console.error("Failed to parse connection string:", err)
        }
    }

    // Mask the password component visually unless the user explicitly reveals
    // it. We keep the in-state value clean (real password) and produce a
    // separate display string with the secret stars-out so accidental
    // screen-shares don't leak credentials.
    const displayValue = showPassword ? connectionString : maskPasswordInUri(connectionString)
    const hasPassword = !!password

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="connection-string">Connection String</Label>
                <div className="flex gap-2">
                    <Input
                        id="connection-string"
                        placeholder={`${databaseType}://user:password@host:port/database`}
                        value={displayValue}
                        onChange={(e) => {
                            setConnectionString(e.target.value)
                        }}
                        className="font-mono text-sm"
                        aria-describedby="connection-string-help"
                    />
                    {hasPassword && (
                        <Button
                            type="button"
                            onClick={() => {
                                setShowPassword((prev) => !prev)
                            }}
                            variant="outline"
                            size="icon"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            aria-pressed={showPassword}
                        >
                            {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                            ) : (
                                <Eye className="h-4 w-4" />
                            )}
                        </Button>
                    )}
                    <Button
                        onClick={handleParseConnectionString}
                        variant="outline"
                        size="icon"
                        aria-label="Parse connection string into form fields"
                    >
                        <ArrowLeftRight className="h-4 w-4" />
                    </Button>
                </div>
                <p id="connection-string-help" className="text-xs text-[var(--muted-foreground)]">
                    Paste a URI and click the arrows to populate the form, or build one above.
                    {hasPassword && " Password is hidden by default — use the eye to reveal."}
                </p>
            </div>
        </div>
    )
}

/**
 * Replace the password component of a URI like
 * `mongodb://user:secret@host:27017/db` with bullet characters of the
 * matching length, leaving the URI shape intact for the user to inspect.
 */
function maskPasswordInUri(uri: string): string {
    return uri.replace(
        /(\/\/[^:/@]*:)([^@]+)(@)/u,
        (_match: string, prefix: string, secret: string, suffix: string) => {
            const masked = "•".repeat(Math.min(secret.length, 16))
            return `${prefix}${masked}${suffix}`
        },
    )
}
