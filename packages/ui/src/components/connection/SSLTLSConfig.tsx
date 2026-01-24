import { useState } from "react"
import { Label } from "../ui/label"
import { Input } from "../ui/input"
import { Switch } from "../ui/switch"

interface SSLTLSConfigProps {
    value: {
        enabled: boolean
        rejectUnauthorized: boolean
        caPath?: string
        certPath?: string
        keyPath?: string
    }
    onChange: (value: SSLTLSConfigProps["value"]) => void
}

export function SSLTLSConfig({ value, onChange }: SSLTLSConfigProps): JSX.Element {
    const [enabled, setEnabled] = useState(value.enabled)
    const [rejectUnauthorized, setRejectUnauthorized] = useState(value.rejectUnauthorized)
    const [caPath, setCaPath] = useState(value.caPath ?? "")
    const [certPath, setCertPath] = useState(value.certPath ?? "")
    const [keyPath, setKeyPath] = useState(value.keyPath ?? "")

    const handleUpdate = (updates: Partial<SSLTLSConfigProps["value"]>): void => {
        const newValue = { ...value, ...updates }
        onChange(newValue)
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Label>Enable SSL/TLS</Label>
                <Switch
                    checked={enabled}
                    onCheckedChange={(checked) => {
                        setEnabled(checked)
                        handleUpdate({ enabled: checked })
                    }}
                />
            </div>

            {enabled && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label>Reject Unauthorized Certificates</Label>
                        <Switch
                            checked={rejectUnauthorized}
                            onCheckedChange={(checked) => {
                                setRejectUnauthorized(checked)
                                handleUpdate({ rejectUnauthorized: checked })
                            }}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="ca-path">CA Certificate Path (optional)</Label>
                        <Input
                            id="ca-path"
                            placeholder="/path/to/ca.pem"
                            value={caPath}
                            onChange={(e) => {
                                setCaPath(e.target.value)
                                handleUpdate({ caPath: e.target.value })
                            }}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="cert-path">Client Certificate Path (optional)</Label>
                        <Input
                            id="cert-path"
                            placeholder="/path/to/client-cert.pem"
                            value={certPath}
                            onChange={(e) => {
                                setCertPath(e.target.value)
                                handleUpdate({ certPath: e.target.value })
                            }}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="key-path">Client Key Path (optional)</Label>
                        <Input
                            id="key-path"
                            placeholder="/path/to/client-key.pem"
                            value={keyPath}
                            onChange={(e) => {
                                setKeyPath(e.target.value)
                                handleUpdate({ keyPath: e.target.value })
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
