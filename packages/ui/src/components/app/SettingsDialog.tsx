import * as React from "react"
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
                                            <SelectItem value="ru">Русский</SelectItem>
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
                            <Card className="p-4 space-y-4">
                                <div>
                                    <h3 className="text-lg font-semibold">DBLand</h3>
                                    <p className="text-sm text-muted-foreground">
                                        NoSQL Database Agnostic GUI/WEB Client
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Version: 0.8.0
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="text-sm font-semibold">Features</h4>
                                    <ul className="text-sm text-muted-foreground space-y-1">
                                        <li>✅ MongoDB Support</li>
                                        <li>✅ Query Editor with Syntax Highlighting</li>
                                        <li>✅ Document CRUD Operations</li>
                                        <li>✅ Import/Export (JSON)</li>
                                        <li>✅ Aggregation Pipeline Builder</li>
                                        <li>✅ Index Management</li>
                                    </ul>
                                </div>

                                <div className="pt-4">
                                    <Button
                                        variant="outline"
                                        onClick={resetSettings}
                                        className="w-full"
                                    >
                                        Reset to Defaults
                                    </Button>
                                </div>
                            </Card>
                        </TabsContent>
                    </ScrollArea>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}
