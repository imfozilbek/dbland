import { Check, RotateCcw } from "lucide-react"
import { useSettingsStore } from "../../stores/settings-store"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog"
import { Label } from "../ui/label"
import { Input } from "../ui/input"
import { Switch } from "../ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Button } from "../ui/button"
import { ScrollArea } from "../ui/scroll-area"
import { Card } from "../ui/card"

/**
 * Build-time version string for the About tab. Bumped on every release —
 * the previous static "0.8.0" was stale by five minor versions and made
 * the dialog actively misleading.
 *
 * TODO: wire this through Vite's `import.meta.env` so the value is read
 * from package.json at build time instead of being hand-edited.
 */
const APP_VERSION = "1.1.0"

const FEATURES: { label: string; group: string }[] = [
    { group: "MongoDB", label: "Query editor with Monaco" },
    { group: "MongoDB", label: "Document CRUD with form & JSON modes" },
    { group: "MongoDB", label: "Aggregation pipeline builder (10+ stages)" },
    { group: "MongoDB", label: "Index manager with usage stats" },
    { group: "MongoDB", label: "GridFS file browser" },
    { group: "MongoDB", label: "Replica set monitor with replication lag" },
    { group: "MongoDB", label: "Sharding dashboard" },
    { group: "MongoDB", label: "Geospatial query builder" },
    { group: "MongoDB", label: "Database profiler" },
    { group: "MongoDB", label: "Collection statistics" },
    { group: "Redis", label: "Key browser with pattern search" },
    { group: "Redis", label: "Data viewers (string, list, set, hash, zset)" },
    { group: "Redis", label: "TTL viewer & editor" },
    { group: "Redis", label: "Slow log monitor" },
    { group: "Connectivity", label: "SSH tunneling (password, key, agent)" },
    { group: "Connectivity", label: "SSL/TLS support" },
    { group: "Connectivity", label: "AES-256-GCM credentials, master key in OS keychain" },
]

export interface SettingsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps): JSX.Element {
    const { settings, updateSettings, updateEditorSettings, resetSettings } = useSettingsStore()

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription>Configure your DBLand preferences</DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="general" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="editor">Editor</TabsTrigger>
                        <TabsTrigger value="about">About</TabsTrigger>
                    </TabsList>

                    <ScrollArea className="h-[400px] pr-4">
                        <TabsContent value="general" className="space-y-4">
                            <Card className="p-4 space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="theme">Theme</Label>
                                    <Select
                                        value={settings.theme}
                                        onValueChange={(value: "light" | "dark" | "system") => {
                                            updateSettings({ theme: value })
                                        }}
                                    >
                                        <SelectTrigger id="theme">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="light">Light</SelectItem>
                                            <SelectItem value="dark">Dark</SelectItem>
                                            <SelectItem value="system">System</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="language">Language</Label>
                                    <Select
                                        value={settings.language}
                                        onValueChange={(value: "en" | "ru") => {
                                            updateSettings({ language: value })
                                        }}
                                    >
                                        <SelectTrigger id="language">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="en">English</SelectItem>
                                            <SelectItem value="ru">Russian</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center justify-between">
                                    <Label htmlFor="auto-save">Auto-save queries</Label>
                                    <Switch
                                        id="auto-save"
                                        checked={settings.autoSave}
                                        onCheckedChange={(checked) => {
                                            updateSettings({ autoSave: checked })
                                        }}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <Label htmlFor="confirm-delete">Confirm before delete</Label>
                                    <Switch
                                        id="confirm-delete"
                                        checked={settings.confirmDelete}
                                        onCheckedChange={(checked) => {
                                            updateSettings({ confirmDelete: checked })
                                        }}
                                    />
                                </div>
                            </Card>
                        </TabsContent>

                        <TabsContent value="editor" className="space-y-4">
                            <Card className="p-4 space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="font-size">Font Size</Label>
                                    <Input
                                        id="font-size"
                                        type="number"
                                        min="10"
                                        max="24"
                                        value={settings.editor.fontSize}
                                        onChange={(e) => {
                                            const value = parseInt(e.target.value, 10)
                                            if (!isNaN(value)) {
                                                updateEditorSettings({ fontSize: value })
                                            }
                                        }}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="tab-size">Tab Size</Label>
                                    <Input
                                        id="tab-size"
                                        type="number"
                                        min="2"
                                        max="8"
                                        value={settings.editor.tabSize}
                                        onChange={(e) => {
                                            const value = parseInt(e.target.value, 10)
                                            if (!isNaN(value)) {
                                                updateEditorSettings({ tabSize: value })
                                            }
                                        }}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <Label htmlFor="word-wrap">Word Wrap</Label>
                                    <Switch
                                        id="word-wrap"
                                        checked={settings.editor.wordWrap}
                                        onCheckedChange={(checked) => {
                                            updateEditorSettings({ wordWrap: checked })
                                        }}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <Label htmlFor="minimap">Show Minimap</Label>
                                    <Switch
                                        id="minimap"
                                        checked={settings.editor.minimap}
                                        onCheckedChange={(checked) => {
                                            updateEditorSettings({ minimap: checked })
                                        }}
                                    />
                                </div>
                            </Card>
                        </TabsContent>

                        <TabsContent value="about" className="space-y-4">
                            <Card className="space-y-4 p-4">
                                <div className="space-y-1">
                                    <h3 className="text-lg font-semibold text-[var(--foreground)]">
                                        DBLand
                                    </h3>
                                    <p className="text-sm text-[var(--muted-foreground)]">
                                        NoSQL database client for MongoDB and Redis.
                                    </p>
                                    <p className="pt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]/70">
                                        Version {APP_VERSION}
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-sm font-semibold text-[var(--foreground)]">
                                        What's inside
                                    </h4>
                                    <FeatureList />
                                </div>

                                <div className="border-t border-[var(--border)] pt-4">
                                    <Button
                                        variant="outline"
                                        onClick={resetSettings}
                                        className="w-full"
                                    >
                                        <RotateCcw className="mr-2 h-4 w-4" />
                                        Reset to defaults
                                    </Button>
                                    <p className="mt-2 text-center text-[11px] text-[var(--muted-foreground)]/70">
                                        Resets preferences only — saved connections stay.
                                    </p>
                                </div>
                            </Card>
                        </TabsContent>
                    </ScrollArea>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}

/**
 * Group the feature list by area (MongoDB / Redis / Connectivity) so the
 * About tab reads as a feature manifest instead of a flat ✅ checklist.
 */
function FeatureList(): JSX.Element {
    const groups = FEATURES.reduce<Record<string, string[]>>((acc, item) => {
        acc[item.group] = acc[item.group] ?? []
        acc[item.group].push(item.label)
        return acc
    }, {})

    return (
        <div className="space-y-3">
            {Object.entries(groups).map(([group, labels]) => (
                <div key={group} className="space-y-1.5">
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]/70">
                        {group}
                    </p>
                    <ul className="space-y-1">
                        {labels.map((label) => (
                            <li
                                key={label}
                                className="flex items-start gap-2 text-sm text-[var(--muted-foreground)]"
                            >
                                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--success)]" />
                                <span>{label}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    )
}
