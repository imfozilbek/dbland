import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "../ui/alert"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { SSHTunnelConfig } from "../connection/SSHTunnelConfig"
import { SSLTLSConfig } from "../connection/SSLTLSConfig"
import { ConnectionStringBuilder } from "../connection/ConnectionStringBuilder"
import {
    type Connection,
    type ConnectionConfig,
    type TestConnectionResult,
    useConnectionStore,
} from "../../stores/connection-store"

export interface ConnectionManagerDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    connection?: Connection
    onSaved?: (connection: Connection) => void
}

interface FormErrors {
    name?: string
    host?: string
    port?: string
}

const DEFAULT_MONGODB_PORT = 27017
const DEFAULT_REDIS_PORT = 6379

function getInitialFormData(connection?: Connection): ConnectionConfig {
    return {
        id: connection?.id,
        name: connection?.name ?? "",
        type: connection?.type ?? "mongodb",
        host: connection?.host ?? "localhost",
        port: connection?.port ?? DEFAULT_MONGODB_PORT,
        username: connection?.username ?? "",
        password: "",
        database: connection?.database ?? "",
        authDatabase: connection?.authDatabase ?? "",
        tls: connection?.tls ?? false,
        ssh: connection?.ssh ?? {
            enabled: false,
            host: "",
            port: 22,
            username: "",
            authMethod: "password",
        },
        ssl: connection?.ssl ?? {
            enabled: false,
            rejectUnauthorized: true,
        },
    }
}

function validateForm(config: ConnectionConfig): FormErrors {
    const errors: FormErrors = {}

    if (!config.name.trim()) {
        errors.name = "Connection name is required"
    } else if (config.name.length > 50) {
        errors.name = "Name must be 50 characters or less"
    }

    if (!config.host.trim()) {
        errors.host = "Host is required"
    }

    if (config.port < 1 || config.port > 65535) {
        errors.port = "Port must be between 1 and 65535"
    }

    return errors
}

export function ConnectionManagerDialog({
    open,
    onOpenChange,
    connection,
    onSaved,
}: ConnectionManagerDialogProps): JSX.Element | null {
    const { testConnection, saveConnection } = useConnectionStore()

    const [formData, setFormData] = useState<ConnectionConfig>(() => getInitialFormData(connection))
    const [errors, setErrors] = useState<FormErrors>({})
    const [isTesting, setIsTesting] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [testResult, setTestResult] = useState<TestConnectionResult | null>(null)

    const isEditMode = !!connection

    // Reset form when dialog opens/closes or connection changes
    useEffect(() => {
        if (open) {
            setFormData(getInitialFormData(connection))
            setErrors({})
            setTestResult(null)
        }
    }, [open, connection])

    function updateField<K extends keyof ConnectionConfig>(
        field: K,
        value: ConnectionConfig[K],
    ): void {
        setFormData((prev) => ({ ...prev, [field]: value }))
        if (errors[field as keyof FormErrors]) {
            setErrors((prev) => ({ ...prev, [field]: undefined }))
        }
        setTestResult(null)
    }

    function handleTypeChange(type: "mongodb" | "redis"): void {
        setFormData((prev) => ({
            ...prev,
            type,
            port: type === "mongodb" ? DEFAULT_MONGODB_PORT : DEFAULT_REDIS_PORT,
            authDatabase: type === "mongodb" ? prev.authDatabase : "",
            database: type === "redis" ? prev.database : "",
        }))
        setTestResult(null)
    }

    async function handleTest(): Promise<void> {
        const validationErrors = validateForm(formData)
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors)
            return
        }

        setIsTesting(true)
        setTestResult(null)

        try {
            const result = await testConnection(formData)
            setTestResult(result)
        } finally {
            setIsTesting(false)
        }
    }

    async function handleSave(): Promise<void> {
        const validationErrors = validateForm(formData)
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors)
            return
        }

        setIsSaving(true)

        try {
            const saved = await saveConnection(formData)
            onSaved?.(saved)
            onOpenChange(false)
        } catch {
            // Error is handled by the store
        } finally {
            setIsSaving(false)
        }
    }

    const isLoading = isTesting || isSaving

    if (!open) {
        return null
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            onClick={() => {
                onOpenChange(false)
            }}
        >
            <div
                className="relative max-h-[90vh] w-full max-w-[500px] overflow-y-auto rounded-lg border bg-background p-6"
                onClick={(e) => {
                    e.stopPropagation()
                }}
            >
                {/* Close button */}
                <button
                    onClick={() => {
                        onOpenChange(false)
                    }}
                    className="absolute right-4 top-4 p-1 opacity-70 hover:opacity-100"
                >
                    <X className="h-4 w-4" />
                </button>

                {/* Header */}
                <div className="mb-4">
                    <h2 className="text-lg font-semibold">
                        {isEditMode ? "Edit Connection" : "New Connection"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {isEditMode
                            ? "Update your database connection settings."
                            : "Configure a new database connection."}
                    </p>
                </div>

                {/* Form with Tabs */}
                <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="basic">Basic</TabsTrigger>
                        <TabsTrigger value="ssh">SSH</TabsTrigger>
                        <TabsTrigger value="ssl">SSL/TLS</TabsTrigger>
                        <TabsTrigger value="advanced">Advanced</TabsTrigger>
                    </TabsList>

                    <TabsContent value="basic" className="mt-4">
                        <div className="grid gap-4 py-4">
                            {/* Connection Type */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="type" className="text-right text-[13px]">
                                    Type
                                </Label>
                                <div className="col-span-3">
                                    <Select
                                        value={formData.type}
                                        onValueChange={(value: "mongodb" | "redis") => {
                                            handleTypeChange(value)
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select database type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="mongodb">MongoDB</SelectItem>
                                            <SelectItem value="redis">Redis</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Connection Name */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right text-[13px]">
                                    Name
                                </Label>
                                <div className="col-span-3">
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => {
                                            updateField("name", e.target.value)
                                        }}
                                        placeholder="My Connection"
                                    />
                                    {errors.name && (
                                        <span className="text-xs text-destructive">
                                            {errors.name}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Host */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="host" className="text-right text-[13px]">
                                    Host
                                </Label>
                                <div className="col-span-3">
                                    <Input
                                        id="host"
                                        value={formData.host}
                                        onChange={(e) => {
                                            updateField("host", e.target.value)
                                        }}
                                        placeholder="localhost"
                                    />
                                    {errors.host && (
                                        <span className="text-xs text-destructive">
                                            {errors.host}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Port */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="port" className="text-right text-[13px]">
                                    Port
                                </Label>
                                <div className="col-span-3">
                                    <Input
                                        id="port"
                                        type="number"
                                        value={formData.port}
                                        onChange={(e) => {
                                            updateField("port", parseInt(e.target.value, 10) || 0)
                                        }}
                                        placeholder={String(
                                            formData.type === "mongodb"
                                                ? DEFAULT_MONGODB_PORT
                                                : DEFAULT_REDIS_PORT,
                                        )}
                                    />
                                    {errors.port && (
                                        <span className="text-xs text-destructive">
                                            {errors.port}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Username */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="username" className="text-right text-[13px]">
                                    Username
                                </Label>
                                <div className="col-span-3">
                                    <Input
                                        id="username"
                                        value={formData.username ?? ""}
                                        onChange={(e) => {
                                            updateField("username", e.target.value || undefined)
                                        }}
                                        placeholder="Optional"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="password" className="text-right text-[13px]">
                                    Password
                                </Label>
                                <div className="col-span-3">
                                    <Input
                                        id="password"
                                        type="password"
                                        value={formData.password ?? ""}
                                        onChange={(e) => {
                                            updateField("password", e.target.value || undefined)
                                        }}
                                        placeholder={
                                            isEditMode ? "Leave empty to keep current" : "Optional"
                                        }
                                    />
                                </div>
                            </div>

                            {/* MongoDB: Auth Database */}
                            {formData.type === "mongodb" && (
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label
                                        htmlFor="authDatabase"
                                        className="text-right text-[13px]"
                                    >
                                        Auth DB
                                    </Label>
                                    <div className="col-span-3">
                                        <Input
                                            id="authDatabase"
                                            value={formData.authDatabase ?? ""}
                                            onChange={(e) => {
                                                updateField(
                                                    "authDatabase",
                                                    e.target.value || undefined,
                                                )
                                            }}
                                            placeholder="admin"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Redis: Database Index */}
                            {formData.type === "redis" && (
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="database" className="text-right text-[13px]">
                                        Database
                                    </Label>
                                    <div className="col-span-3">
                                        <Input
                                            id="database"
                                            type="number"
                                            min={0}
                                            max={15}
                                            value={formData.database ?? "0"}
                                            onChange={(e) => {
                                                updateField("database", e.target.value || undefined)
                                            }}
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="ssh" className="mt-4">
                        <div className="grid gap-4 py-4">
                            <SSHTunnelConfig
                                value={
                                    formData.ssh ?? {
                                        enabled: false,
                                        host: "",
                                        port: 22,
                                        username: "",
                                        authMethod: "password",
                                    }
                                }
                                onChange={(ssh) => {
                                    updateField("ssh", ssh)
                                }}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="ssl" className="mt-4">
                        <div className="grid gap-4 py-4">
                            <SSLTLSConfig
                                value={
                                    formData.ssl ?? {
                                        enabled: false,
                                        rejectUnauthorized: true,
                                    }
                                }
                                onChange={(ssl) => {
                                    updateField("ssl", ssl)
                                }}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="advanced" className="mt-4">
                        <div className="grid gap-4 py-4">
                            <ConnectionStringBuilder
                                databaseType={formData.type}
                                host={formData.host}
                                port={formData.port}
                                username={formData.username}
                                password={formData.password}
                                database={formData.database}
                                authDatabase={formData.authDatabase}
                                onParse={(parsed) => {
                                    setFormData((prev) => ({
                                        ...prev,
                                        ...parsed,
                                    }))
                                }}
                            />
                        </div>
                    </TabsContent>

                    {/* Test Result */}
                    {testResult && (
                        <Alert
                            variant={testResult.success ? "default" : "destructive"}
                            className="mt-4"
                        >
                            <AlertTitle>
                                {testResult.success ? "Connection successful" : "Connection failed"}
                            </AlertTitle>
                            <AlertDescription>
                                {testResult.message}
                                {testResult.success && testResult.latencyMs !== undefined && (
                                    <span className="block text-xs text-muted-foreground">
                                        Latency: {testResult.latencyMs}ms
                                        {testResult.serverVersion &&
                                            ` | Server: ${testResult.serverVersion}`}
                                    </span>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}
                </Tabs>

                {/* Footer */}
                <div className="mt-4 flex justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={() => {
                            onOpenChange(false)
                        }}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => {
                            void handleTest()
                        }}
                        disabled={isLoading}
                    >
                        {isTesting ? "Testing..." : "Test Connection"}
                    </Button>
                    <Button
                        onClick={() => {
                            void handleSave()
                        }}
                        disabled={isLoading}
                    >
                        {isSaving ? "Saving..." : "Save"}
                    </Button>
                </div>
            </div>
        </div>
    )
}
