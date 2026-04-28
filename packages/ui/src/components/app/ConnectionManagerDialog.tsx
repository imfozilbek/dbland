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
import { useT } from "../../i18n"

type T = ReturnType<typeof useT>

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

function validateForm(config: ConnectionConfig, t: T): FormErrors {
    const errors: FormErrors = {}

    if (!config.name.trim()) {
        errors.name = t("connectionManager.errors.nameRequired")
    } else if (config.name.length > MAX_NAME_LENGTH) {
        errors.name = t("connectionManager.errors.nameTooLong", { max: MAX_NAME_LENGTH })
    }

    if (!config.host.trim()) {
        errors.host = t("connectionManager.errors.hostRequired")
    }

    if (config.port < MIN_PORT || config.port > MAX_PORT) {
        errors.port = t("connectionManager.errors.portRange", { min: MIN_PORT, max: MAX_PORT })
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
    const t = useT()
    const portPlaceholder = formData.type === "mongodb" ? DEFAULT_MONGODB_PORT : DEFAULT_REDIS_PORT
    return (
        <div className="grid gap-4 py-4">
            <FormRow htmlFor="type" label={t("connectionManager.fields.type")}>
                <Select
                    value={formData.type}
                    onValueChange={(value: "mongodb" | "redis") => {
                        onTypeChange(value)
                    }}
                >
                    <SelectTrigger>
                        <SelectValue placeholder={t("connectionManager.fields.typePlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="mongodb">MongoDB</SelectItem>
                        <SelectItem value="redis">Redis</SelectItem>
                    </SelectContent>
                </Select>
            </FormRow>

            <FormRow htmlFor="name" label={t("connectionManager.fields.name")} error={errors.name}>
                <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => {
                        updateField("name", e.target.value)
                    }}
                    placeholder={t("connectionManager.fields.namePlaceholder")}
                />
            </FormRow>

            <FormRow htmlFor="host" label={t("connectionManager.fields.host")} error={errors.host}>
                <Input
                    id="host"
                    value={formData.host}
                    onChange={(e) => {
                        updateField("host", e.target.value)
                    }}
                    placeholder="localhost"
                />
            </FormRow>

            <FormRow htmlFor="port" label={t("connectionManager.fields.port")} error={errors.port}>
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

            <FormRow htmlFor="username" label={t("connectionManager.fields.username")}>
                <Input
                    id="username"
                    value={formData.username ?? ""}
                    onChange={(e) => {
                        updateField("username", e.target.value || undefined)
                    }}
                    placeholder={t("connectionManager.fields.usernamePlaceholder")}
                />
            </FormRow>

            <FormRow htmlFor="password" label={t("connectionManager.fields.password")}>
                <Input
                    id="password"
                    type="password"
                    value={formData.password ?? ""}
                    onChange={(e) => {
                        updateField("password", e.target.value || undefined)
                    }}
                    placeholder={
                        isEditMode
                            ? t("connectionManager.fields.passwordPlaceholderEdit")
                            : t("connectionManager.fields.passwordPlaceholderNew")
                    }
                />
            </FormRow>

            {formData.type === "mongodb" && (
                <FormRow htmlFor="authDatabase" label={t("connectionManager.fields.authDatabase")}>
                    <Input
                        id="authDatabase"
                        value={formData.authDatabase ?? ""}
                        onChange={(e) => {
                            updateField("authDatabase", e.target.value || undefined)
                        }}
                        placeholder={t("connectionManager.fields.authDatabasePlaceholder")}
                    />
                </FormRow>
            )}

            {formData.type === "redis" && (
                <FormRow htmlFor="database" label={t("connectionManager.fields.database")}>
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
    const t = useT()
    return (
        <Alert variant={result.success ? "default" : "destructive"} className="mt-4">
            <AlertTitle>
                {result.success
                    ? t("connectionManager.test.success")
                    : t("connectionManager.test.failed")}
            </AlertTitle>
            <AlertDescription>
                {result.message}
                {result.success && result.latencyMs !== undefined && (
                    <span className="block text-xs text-muted-foreground">
                        {t("connectionManager.test.latency", { ms: result.latencyMs })}
                        {result.serverVersion &&
                            ` | ${t("connectionManager.test.server", { version: result.serverVersion })}`}
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
    const t = useT()
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
        const validationErrors = validateForm(formData, t)
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
        const validationErrors = validateForm(formData, t)
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
                    <DialogTitle>
                        {isEditMode
                            ? t("connectionManager.titleEdit")
                            : t("connectionManager.titleNew")}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditMode
                            ? t("connectionManager.descriptionEdit")
                            : t("connectionManager.descriptionNew")}
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="basic">{t("connectionManager.tabs.basic")}</TabsTrigger>
                        <TabsTrigger value="ssh">{t("connectionManager.tabs.ssh")}</TabsTrigger>
                        <TabsTrigger value="ssl">{t("connectionManager.tabs.ssl")}</TabsTrigger>
                        <TabsTrigger value="advanced">
                            {t("connectionManager.tabs.advanced")}
                        </TabsTrigger>
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
                        {t("common.cancel")}
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => {
                            void handleTest()
                        }}
                        disabled={isLoading}
                    >
                        {isTesting
                            ? t("connectionManager.test.testing")
                            : t("connectionManager.test.button")}
                    </Button>
                    <Button
                        onClick={() => {
                            void handleSave()
                        }}
                        disabled={isLoading}
                    >
                        {isSaving ? t("common.saving") : t("common.save")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
