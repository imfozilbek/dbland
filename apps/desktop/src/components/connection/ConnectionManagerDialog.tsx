import { useEffect, useState } from "react"
import { X } from "lucide-react"
import {
    Alert,
    AlertDescription,
    AlertTitle,
    Button,
    Input,
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Switch,
} from "@dbland/ui"
import {
    type Connection,
    type ConnectionConfig,
    type TestConnectionResult,
    useConnectionStore,
} from "../../stores"

interface ConnectionManagerDialogProps {
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
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
            }}
            onClick={() => onOpenChange(false)}
        >
            <div
                style={{
                    backgroundColor: "var(--color-background)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                    padding: "24px",
                    width: "100%",
                    maxWidth: "500px",
                    maxHeight: "90vh",
                    overflowY: "auto",
                    position: "relative",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={() => onOpenChange(false)}
                    style={{
                        position: "absolute",
                        top: "16px",
                        right: "16px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px",
                        opacity: 0.7,
                    }}
                >
                    <X className="h-4 w-4" />
                </button>

                {/* Header */}
                <div style={{ marginBottom: "16px" }}>
                    <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "4px" }}>
                        {isEditMode ? "Edit Connection" : "New Connection"}
                    </h2>
                    <p style={{ fontSize: "14px", color: "var(--color-muted-foreground)" }}>
                        {isEditMode
                            ? "Update your database connection settings."
                            : "Configure a new database connection."}
                    </p>
                </div>

                {/* Form */}
                <div className="grid gap-4 py-4">
                    {/* Connection Type */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">
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
                        <Label htmlFor="name" className="text-right">
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
                                <span className="text-sm text-destructive">{errors.name}</span>
                            )}
                        </div>
                    </div>

                    {/* Host */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="host" className="text-right">
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
                                <span className="text-sm text-destructive">{errors.host}</span>
                            )}
                        </div>
                    </div>

                    {/* Port */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="port" className="text-right">
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
                                <span className="text-sm text-destructive">{errors.port}</span>
                            )}
                        </div>
                    </div>

                    {/* Username */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="username" className="text-right">
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
                        <Label htmlFor="password" className="text-right">
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
                            <Label htmlFor="authDatabase" className="text-right">
                                Auth DB
                            </Label>
                            <div className="col-span-3">
                                <Input
                                    id="authDatabase"
                                    value={formData.authDatabase ?? ""}
                                    onChange={(e) => {
                                        updateField("authDatabase", e.target.value || undefined)
                                    }}
                                    placeholder="admin"
                                />
                            </div>
                        </div>
                    )}

                    {/* Redis: Database Index */}
                    {formData.type === "redis" && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="database" className="text-right">
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

                    {/* TLS */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="tls" className="text-right">
                            TLS/SSL
                        </Label>
                        <div className="col-span-3 flex items-center">
                            <Switch
                                id="tls"
                                checked={formData.tls ?? false}
                                onCheckedChange={(checked) => {
                                    updateField("tls", checked)
                                }}
                            />
                            <span className="ml-2 text-sm text-muted-foreground">
                                {formData.tls ? "Enabled" : "Disabled"}
                            </span>
                        </div>
                    </div>

                    {/* Test Result */}
                    {testResult && (
                        <Alert variant={testResult.success ? "default" : "destructive"}>
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
                </div>

                {/* Footer */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "8px",
                        marginTop: "16px",
                    }}
                >
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
