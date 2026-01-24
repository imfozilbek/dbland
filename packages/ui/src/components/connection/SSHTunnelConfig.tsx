import { useState } from "react"
import { Label } from "../ui/label"
import { Input } from "../ui/input"
import { Switch } from "../ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"

interface SSHTunnelConfigProps {
    value: {
        enabled: boolean
        host: string
        port: number
        username: string
        authMethod: "password" | "key" | "agent"
        password?: string
        privateKeyPath?: string
        passphrase?: string
    }
    onChange: (value: SSHTunnelConfigProps["value"]) => void
}

export function SSHTunnelConfig({ value, onChange }: SSHTunnelConfigProps): JSX.Element {
    const [enabled, setEnabled] = useState(value.enabled)
    const [host, setHost] = useState(value.host)
    const [port, setPort] = useState(value.port)
    const [username, setUsername] = useState(value.username)
    const [authMethod, setAuthMethod] = useState(value.authMethod)
    const [password, setPassword] = useState(value.password ?? "")
    const [privateKeyPath, setPrivateKeyPath] = useState(value.privateKeyPath ?? "")
    const [passphrase, setPassphrase] = useState(value.passphrase ?? "")

    const handleUpdate = (updates: Partial<SSHTunnelConfigProps["value"]>): void => {
        const newValue = { ...value, ...updates }
        onChange(newValue)
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Label>Enable SSH Tunnel</Label>
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
                    <div className="space-y-2">
                        <Label htmlFor="ssh-host">SSH Host</Label>
                        <Input
                            id="ssh-host"
                            placeholder="ssh.example.com"
                            value={host}
                            onChange={(e) => {
                                setHost(e.target.value)
                                handleUpdate({ host: e.target.value })
                            }}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="ssh-port">SSH Port</Label>
                        <Input
                            id="ssh-port"
                            type="number"
                            placeholder="22"
                            value={port}
                            onChange={(e) => {
                                const newPort = parseInt(e.target.value, 10)
                                setPort(newPort)
                                handleUpdate({ port: newPort })
                            }}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="ssh-username">SSH Username</Label>
                        <Input
                            id="ssh-username"
                            placeholder="user"
                            value={username}
                            onChange={(e) => {
                                setUsername(e.target.value)
                                handleUpdate({ username: e.target.value })
                            }}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="ssh-auth-method">Authentication Method</Label>
                        <Select
                            value={authMethod}
                            onValueChange={(newMethod: "password" | "key" | "agent") => {
                                setAuthMethod(newMethod)
                                handleUpdate({ authMethod: newMethod })
                            }}
                        >
                            <SelectTrigger id="ssh-auth-method">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="password">Password</SelectItem>
                                <SelectItem value="key">Private Key</SelectItem>
                                <SelectItem value="agent">SSH Agent</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {authMethod === "password" && (
                        <div className="space-y-2">
                            <Label htmlFor="ssh-password">SSH Password</Label>
                            <Input
                                id="ssh-password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value)
                                    handleUpdate({ password: e.target.value })
                                }}
                            />
                        </div>
                    )}

                    {authMethod === "key" && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="ssh-key-path">Private Key Path</Label>
                                <Input
                                    id="ssh-key-path"
                                    placeholder="/path/to/private/key"
                                    value={privateKeyPath}
                                    onChange={(e) => {
                                        setPrivateKeyPath(e.target.value)
                                        handleUpdate({ privateKeyPath: e.target.value })
                                    }}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="ssh-passphrase">Passphrase (optional)</Label>
                                <Input
                                    id="ssh-passphrase"
                                    type="password"
                                    placeholder="••••••••"
                                    value={passphrase}
                                    onChange={(e) => {
                                        setPassphrase(e.target.value)
                                        handleUpdate({ passphrase: e.target.value })
                                    }}
                                />
                            </div>
                        </>
                    )}

                    {authMethod === "agent" && (
                        <div className="text-sm text-muted-foreground">
                            Using SSH agent for authentication. Make sure your SSH agent is running
                            with the appropriate key loaded.
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
