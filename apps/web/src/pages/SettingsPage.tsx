import { Monitor, Moon, Sun } from "lucide-react"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Label,
    Separator,
    Switch,
} from "@dbland/ui"

export function SettingsPage(): JSX.Element {
    return (
        <div className="h-full overflow-auto p-8">
            <div className="mx-auto max-w-2xl space-y-8">
                <div>
                    <h1 className="text-2xl font-bold">Settings</h1>
                    <p className="text-muted-foreground">Customize your DBLand experience</p>
                </div>

                {/* Appearance */}
                <Card>
                    <CardHeader>
                        <CardTitle>Appearance</CardTitle>
                        <CardDescription>
                            Customize the look and feel of the application
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Theme</Label>
                                <p className="text-sm text-muted-foreground">
                                    Choose your preferred theme
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button className="flex h-9 w-9 items-center justify-center rounded-md border hover:bg-accent">
                                    <Sun className="h-4 w-4" />
                                </button>
                                <button className="flex h-9 w-9 items-center justify-center rounded-md border bg-accent">
                                    <Monitor className="h-4 w-4" />
                                </button>
                                <button className="flex h-9 w-9 items-center justify-center rounded-md border hover:bg-accent">
                                    <Moon className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Editor */}
                <Card>
                    <CardHeader>
                        <CardTitle>Editor</CardTitle>
                        <CardDescription>Configure the query editor behavior</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Auto-complete</Label>
                                <p className="text-sm text-muted-foreground">
                                    Show suggestions while typing
                                </p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Format on save</Label>
                                <p className="text-sm text-muted-foreground">
                                    Automatically format queries when saving
                                </p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Line numbers</Label>
                                <p className="text-sm text-muted-foreground">
                                    Show line numbers in the editor
                                </p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                    </CardContent>
                </Card>

                {/* Data */}
                <Card>
                    <CardHeader>
                        <CardTitle>Data</CardTitle>
                        <CardDescription>Configure how data is displayed</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Page size</Label>
                                <p className="text-sm text-muted-foreground">
                                    Number of documents per page
                                </p>
                            </div>
                            <span className="text-sm">50</span>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Expand nested objects</Label>
                                <p className="text-sm text-muted-foreground">
                                    Automatically expand nested objects in results
                                </p>
                            </div>
                            <Switch />
                        </div>
                    </CardContent>
                </Card>

                {/* About */}
                <Card>
                    <CardHeader>
                        <CardTitle>About</CardTitle>
                        <CardDescription>DBLand version information</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Version</span>
                                {/* Read from package.json at build time via
                                 * Vite's `define` block (see vite.config.ts)
                                 * so the literal stays in lockstep with the
                                 * actual shipped version. The previous
                                 * hard-coded "0.1.0" was stale by ten minor
                                 * versions and actively misled users about
                                 * what they were running. */}
                                <span>{`v${__APP_VERSION__}`}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">License</span>
                                <span>MIT</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
