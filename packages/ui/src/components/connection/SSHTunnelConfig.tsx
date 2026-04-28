import { Label } from "../ui/label"
import { Input } from "../ui/input"
import { Switch } from "../ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { useT } from "../../i18n"

interface SSHTunnelValue {
    enabled: boolean
    host: string
    port: number
    username: string
    authMethod: "password" | "key" | "agent"
    password?: string
    privateKeyPath?: string
    passphrase?: string
}

interface SSHTunnelConfigProps {
    value: SSHTunnelValue
    onChange: (value: SSHTunnelValue) => void
}

const DEFAULT_SSH_PORT = 22

/**
 * Fully controlled — every input reads its current value straight from
 * the parent's `value` prop and reports edits through `onChange`. The
 * previous version mirrored each field into local `useState` and only
 * initialised from `value` on first render, which meant a parent reset
 * (e.g. opening the connection dialog with a different connection)
 * wouldn't propagate to the visible inputs.
 */
export function SSHTunnelConfig({ value, onChange }: SSHTunnelConfigProps): JSX.Element {
    const t = useT()
    const update = (patch: Partial<SSHTunnelValue>): void => {
        onChange({ ...value, ...patch })
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Label htmlFor="ssh-enabled">{t("sshTunnel.enable")}</Label>
                <Switch
                    id="ssh-enabled"
                    checked={value.enabled}
                    onCheckedChange={(checked) => {
                        update({ enabled: checked })
                    }}
                />
            </div>

            {value.enabled && (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="ssh-host">{t("sshTunnel.host")}</Label>
                        <Input
                            id="ssh-host"
                            placeholder={t("sshTunnel.hostPlaceholder")}
                            value={value.host}
                            onChange={(e) => {
                                update({ host: e.target.value })
                            }}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="ssh-port">{t("sshTunnel.port")}</Label>
                        <Input
                            id="ssh-port"
                            type="number"
                            placeholder={String(DEFAULT_SSH_PORT)}
                            value={value.port}
                            onChange={(e) => {
                                // Don't pass NaN downstream when the field is
                                // emptied; fall back to the SSH default.
                                const parsed = parseInt(e.target.value, 10)
                                update({ port: Number.isNaN(parsed) ? DEFAULT_SSH_PORT : parsed })
                            }}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="ssh-username">{t("sshTunnel.username")}</Label>
                        <Input
                            id="ssh-username"
                            placeholder={t("sshTunnel.usernamePlaceholder")}
                            value={value.username}
                            onChange={(e) => {
                                update({ username: e.target.value })
                            }}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="ssh-auth-method">{t("sshTunnel.authMethod")}</Label>
                        <Select
                            value={value.authMethod}
                            onValueChange={(newMethod: SSHTunnelValue["authMethod"]) => {
                                update({ authMethod: newMethod })
                            }}
                        >
                            <SelectTrigger id="ssh-auth-method">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="password">
                                    {t("sshTunnel.authPassword")}
                                </SelectItem>
                                <SelectItem value="key">{t("sshTunnel.authKey")}</SelectItem>
                                <SelectItem value="agent">{t("sshTunnel.authAgent")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {value.authMethod === "password" && (
                        <div className="space-y-2">
                            <Label htmlFor="ssh-password">{t("sshTunnel.password")}</Label>
                            <Input
                                id="ssh-password"
                                type="password"
                                placeholder={t("sshTunnel.passwordPlaceholder")}
                                value={value.password ?? ""}
                                onChange={(e) => {
                                    update({ password: e.target.value })
                                }}
                            />
                        </div>
                    )}

                    {value.authMethod === "key" && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="ssh-key-path">
                                    {t("sshTunnel.privateKeyPath")}
                                </Label>
                                <Input
                                    id="ssh-key-path"
                                    placeholder={t("sshTunnel.privateKeyPathPlaceholder")}
                                    value={value.privateKeyPath ?? ""}
                                    onChange={(e) => {
                                        update({ privateKeyPath: e.target.value })
                                    }}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="ssh-passphrase">{t("sshTunnel.passphrase")}</Label>
                                <Input
                                    id="ssh-passphrase"
                                    type="password"
                                    placeholder={t("sshTunnel.passphrasePlaceholder")}
                                    value={value.passphrase ?? ""}
                                    onChange={(e) => {
                                        update({ passphrase: e.target.value })
                                    }}
                                />
                            </div>
                        </>
                    )}

                    {value.authMethod === "agent" && (
                        <p className="rounded-md border border-[var(--border)] bg-[var(--card)] p-3 text-xs text-[var(--muted-foreground)]">
                            {t("sshTunnel.agentHintPrefix")}
                            <code className="font-mono">ssh-add ~/.ssh/id_ed25519</code>
                            {t("sshTunnel.agentHintSuffix")}
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}
