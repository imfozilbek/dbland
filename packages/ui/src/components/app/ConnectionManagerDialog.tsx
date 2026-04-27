import { useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "../ui/alert"
import { Button } from "../ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../ui/dialog"
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
const DEFAULT_SSH_PORT = 22
const MAX_NAME_LENGTH = 50
const MIN_PORT = 1
const MAX_PORT = 65535

const DEFAULT_SSH = {
    enabled: false,
    host: "",
    port: DEFAULT_SSH_PORT,
    username: "",
    authMethod: "password",
} as const

const DEFAULT_SSL = {
    enabled: false,
    rejectUnauthorized: true,
} as const

/**
 * Build the initial form state. Each field has an obvious default,
 * so we lean on a single spread of the connection plus per-field
 * fallbacks instead of long ?? chains (the original was complexity 22).
 */
function getInitialFormData(connection?: Connection): ConnectionConfig {
    if (!connection) {
        return {
            name: "",
            type: "mongodb",
            host: "localhost",
            port: DEFAULT_MONGODB_PORT,
            password: "",
            tls: false,
            ssh: { ...DEFAULT_SSH },
            ssl: { ...DEFAULT_SSL },
        }
    }
    return {
        ...connection,
        // password is never sent back from the backend — start blank
        password: "",
        ssh: connection.ssh ?? { ...DEFAULT_SSH },
        ssl: connection.ssl ?? { ...DEFAULT_SSL },
    }
}

function validateForm(config: ConnectionConfig): FormErrors {
    const errors: FormErrors = {}

    if (!config.name.trim()) {
        errors.name = "Connection name is required"
    } else if (config.name.length > MAX_NAME_LENGTH) {
        errors.name = `Name must be ${MAX_NAME_LENGTH} characters or less`
    }

    if (!config.host.trim()) {
        errors.host = "Host is required"
    }

    if (config.port < MIN_PORT || config.port > MAX_PORT) {
        errors.port = `Port must be between ${MIN_PORT} and ${MAX_PORT}`
    }

    return errors
}

/**
 * Reusable label + input row. Centralises the 4-column grid that the
 * basic-fields tab uses repeatedly so the parent component stays at a
 * sane complexity.
 */
function FormRow({
    htmlFor,
    label,
    error,
    children,
}: {
    htmlFor: string
    label: string
    error?: string
    children: React.ReactNode
}): JSX.Element {
    return (
        <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor={htmlFor} className="text-right text-[13px]">
                {label}
            </Label>
            <div className="col-span-3">
                {children}
                {error && <span className="text-xs text-destructive">{error}</span>}
            </div>
        </div>
    )
}

interface BasicFieldsProps {
    formData: ConnectionConfig
    errors: FormErrors
    isEditMode: boolean
    onTypeChange: (type: "mongodb" | "redis") => void
    updateField: <K extends keyof ConnectionConfig>(field: K, value: ConnectionConfig[K]) => void
}

/**
 * Type / name / host / port / credentials form. Lives in its own component
 * so ConnectionManagerDialog itself stays under the complexity cap.
 */
function BasicFields({
    formData,
    errors,
    isEditMode,
    onTypeChange,
    updateField,
}: BasicFieldsProps): JSX.Element {
    const portPlaceholder = formData.type === "mongodb" ? DEFAULT_MONGODB_PORT : DEFAULT_REDIS_PORT
    return (
        <div className="grid gap-4 py-4">
            <FormRow htmlFor="type" label="Type">
                <Select
                    value={formData.type}
                    onValueChange={(value: "mongodb" | "redis") => {
                        onTypeChange(value)
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
            </FormRow>

            <FormRow htmlFor="name" label="Name" error={errors.name}>
                <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => {
                        updateField("name", e.target.value)
                    }}
                    placeholder="My Connection"
                />
            </FormRow>

            <FormRow htmlFor="host" label="Host" error={errors.host}>
                <Input
                    id="host"
                    value={formData.host}
                    onChange={(e) => {
                        updateField("host", e.target.value)
                    }}
                    placeholder="localhost"
                />
            </FormRow>

            <FormRow htmlFor="port" label="Port" error={errors.port}>
                <Input
                    id="port"
                    type="number"
                    value={formData.port}
                    onChange={(e) => {
                        updateField("port", parseInt(e.target.value, 10) || 0)
                    }}
                    placeholder={String(portPlaceholder)}
                />
            </FormRow>

            <FormRow htmlFor="username" label="Username">
                <Input
                    id="username"
                    value={formData.username ?? ""}
                    onChange={(e) => {
                        updateField("username", e.target.value || undefined)
                    }}
                    placeholder="Optional"
                />
            </FormRow>

            <FormRow htmlFor="password" label="Password">
                <Input
                    id="password"
                    type="password"
                    value={formData.password ?? ""}
                    onChange={(e) => {
                        updateField("password", e.target.value || undefined)
                    }}
                    placeholder={isEditMode ? "Leave empty to keep current" : "Optional"}
                />
            </FormRow>

            {formData.type === "mongodb" && (
                <FormRow htmlFor="authDatabase" label="Auth DB">
                    <Input
                        id="authDatabase"
                        value={formData.authDatabase ?? ""}
                        onChange={(e) => {
                            updateField("authDatabase", e.target.value || undefined)
                        }}
                        placeholder="admin"
                    />
                </FormRow>
            )}

            {formData.type === "redis" && (
                <FormRow htmlFor="database" label="Database">
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
                </FormRow>
            )}
        </div>
    )
}

function TestResultAlert({ result }: { result: TestConnectionResult }): JSX.Element {
    return (
        <Alert variant={result.success ? "default" : "destructive"} className="mt-4">
            <AlertTitle>
                {result.success ? "Connection successful" : "Connection failed"}
            </AlertTitle>
            <AlertDescription>
                {result.message}
                {result.success && result.latencyMs !== undefined && (
                    <span className="block text-xs text-muted-foreground">
                        Latency: {result.latencyMs}ms
                        {result.serverVersion && ` | Server: ${result.serverVersion}`}
                    </span>
                )}
            </AlertDescription>
        </Alert>
    )
}

export function ConnectionManagerDialog({
    open,
    onOpenChange,
    connection,
    onSaved,
}: ConnectionManagerDialogProps): JSX.Element {
    const { testConnection, saveConnection } = useConnectionStore()

    const [formData, setFormData] = useState<ConnectionConfig>(() => getInitialFormData(connection))
    const [errors, setErrors] = useState<FormErrors>({})
    const [isTesting, setIsTesting] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [testResult, setTestResult] = useState<TestConnectionResult | null>(null)

    const isEditMode = !!connection

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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? "Edit Connection" : "New Connection"}</DialogTitle>
                    <DialogDescription>
                        {isEditMode
                            ? "Update your database connection settings."
                            : "Configure a new database connection."}
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="basic">Basic</TabsTrigger>
                        <TabsTrigger value="ssh">SSH</TabsTrigger>
                        <TabsTrigger value="ssl">SSL/TLS</TabsTrigger>
                        <TabsTrigger value="advanced">Advanced</TabsTrigger>
                    </TabsList>

                    <TabsContent value="basic" className="mt-4">
                        <BasicFields
                            formData={formData}
                            errors={errors}
                            isEditMode={isEditMode}
                            onTypeChange={handleTypeChange}
                            updateField={updateField}
                        />
                    </TabsContent>

                    <TabsContent value="ssh" className="mt-4">
                        <div className="grid gap-4 py-4">
                            <SSHTunnelConfig
                                value={formData.ssh ?? { ...DEFAULT_SSH }}
                                onChange={(ssh) => {
                                    updateField("ssh", ssh)
                                }}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="ssl" className="mt-4">
                        <div className="grid gap-4 py-4">
                            <SSLTLSConfig
                                value={formData.ssl ?? { ...DEFAULT_SSL }}
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
                                    setFormData((prev) => ({ ...prev, ...parsed }))
                                }}
                            />
                        </div>
                    </TabsContent>

                    {testResult && <TestResultAlert result={testResult} />}
                </Tabs>

                <DialogFooter>
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
                        {isTesting ? "Testing…" : "Test Connection"}
                    </Button>
                    <Button
                        onClick={() => {
                            void handleSave()
                        }}
                        disabled={isLoading}
                    >
                        {isSaving ? "Saving…" : "Save"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
