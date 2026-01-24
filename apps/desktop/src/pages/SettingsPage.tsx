import { useEffect, useState } from "react"
import { SettingsDialog } from "@dbland/ui"

export function SettingsPage(): JSX.Element {
    const [open, setOpen] = useState(false)

    // Auto-open dialog when page loads
    useEffect(() => {
        setOpen(true)
    }, [])

    return (
        <div className="flex h-full items-center justify-center">
            <SettingsDialog open={open} onOpenChange={setOpen} />
            {!open && (
                <div className="text-center">
                    <h1 className="text-2xl font-bold">Settings</h1>
                    <p className="text-muted-foreground">Configure your DBLand preferences</p>
                </div>
            )}
        </div>
    )
}
