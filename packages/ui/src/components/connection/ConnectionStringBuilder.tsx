import { useEffect, useState } from "react"
import { Label } from "../ui/label"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { ArrowLeftRight } from "lucide-react"

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

    // Parse connection string
    const handleParseConnectionString = (): void => {
        try {
            const url = new URL(connectionString)

            const parsed = {
                host: url.hostname,
                port: parseInt(url.port || (databaseType === "mongodb" ? "27017" : "6379"), 10),
                username: url.username ? decodeURIComponent(url.username) : undefined,
                password: url.password ? decodeURIComponent(url.password) : undefined,
                database: url.pathname.slice(1) || undefined,
                authDatabase: url.pathname.slice(1) || undefined,
            }

            if (onParse) {
                onParse(parsed)
            }
        } catch (err) {
            console.error("Failed to parse connection string:", err)
        }
    }

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="connection-string">Connection String</Label>
                <div className="flex gap-2">
                    <Input
                        id="connection-string"
                        placeholder={`${databaseType}://user:password@host:port/database`}
                        value={connectionString}
                        onChange={(e) => {
                            setConnectionString(e.target.value)
                        }}
                        className="font-mono text-sm"
                    />
                    <Button
                        onClick={handleParseConnectionString}
                        variant="outline"
                        size="icon"
                        aria-label="Parse connection string into form fields"
                    >
                        <ArrowLeftRight className="h-4 w-4" />
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                    You can paste a connection string and click the arrow to parse it, or build it
                    from the fields above.
                </p>
            </div>
        </div>
    )
}
