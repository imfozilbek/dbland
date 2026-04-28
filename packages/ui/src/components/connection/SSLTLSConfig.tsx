import { Label } from "../ui/label"
import { Input } from "../ui/input"
import { Switch } from "../ui/switch"

interface SSLTLSValue {
    enabled: boolean
    rejectUnauthorized: boolean
    caPath?: string
    certPath?: string
    keyPath?: string
}

interface SSLTLSConfigProps {
    value: SSLTLSValue
    onChange: (value: SSLTLSValue) => void
}

/**
 * Fully controlled SSL / TLS form. Each input reads from `value` and writes
 * through `onChange`; no local mirror state, so a parent reset (the
 * connection dialog re-opening with a different connection) flows through.
 */
export function SSLTLSConfig({ value, onChange }: SSLTLSConfigProps): JSX.Element {
    const update = (patch: Partial<SSLTLSValue>): void => {
        onChange({ ...value, ...patch })
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Label htmlFor="ssl-enabled">Enable SSL/TLS</Label>
                <Switch
                    id="ssl-enabled"
                    checked={value.enabled}
                    onCheckedChange={(checked) => {
                        update({ enabled: checked })
                    }}
                />
            </div>

            {value.enabled && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="ssl-reject-unauthorized">
                            Reject Unauthorized Certificates
                        </Label>
                        <Switch
                            id="ssl-reject-unauthorized"
                            checked={value.rejectUnauthorized}
                            onCheckedChange={(checked) => {
                                update({ rejectUnauthorized: checked })
                            }}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="ca-path">CA Certificate Path (optional)</Label>
                        <Input
                            id="ca-path"
                            placeholder="/path/to/ca.pem"
                            value={value.caPath ?? ""}
                            onChange={(e) => {
                                update({ caPath: e.target.value || undefined })
                            }}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="cert-path">Client Certificate Path (optional)</Label>
                        <Input
                            id="cert-path"
                            placeholder="/path/to/client-cert.pem"
                            value={value.certPath ?? ""}
                            onChange={(e) => {
                                update({ certPath: e.target.value || undefined })
                            }}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="key-path">Client Key Path (optional)</Label>
                        <Input
                            id="key-path"
                            placeholder="/path/to/client-key.pem"
                            value={value.keyPath ?? ""}
                            onChange={(e) => {
                                update({ keyPath: e.target.value || undefined })
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
