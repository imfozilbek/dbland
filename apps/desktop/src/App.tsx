import { BrowserRouter, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom"
import { useState } from "react"
import {
    type Connection,
    ConnectionManagerDialog,
    PlatformProvider,
    Sidebar,
    StatusBar,
    ThemeProvider,
    Toaster,
    Toolbar,
    useConnectionStore,
    usePlatformInit,
} from "@dbland/ui"
import { tauriPlatformAPI } from "./lib/tauri-platform"
import { HomePage } from "./pages/HomePage"
import { WorkspacePage } from "./pages/WorkspacePage"
import { RedisWorkspacePage } from "./pages/RedisWorkspacePage"
import { SettingsPage } from "./pages/SettingsPage"

function AppLayout(): JSX.Element {
    const navigate = useNavigate()
    const location = useLocation()
    const [dialogOpen, setDialogOpen] = useState(false)
    // When set, the connection-manager dialog opens in edit mode for this
    // connection. `null` means "add new" (the existing flow).
    const [editingConnection, setEditingConnection] = useState<Connection | null>(null)
    const { loadConnections } = useConnectionStore()

    // Initialize stores with platform API
    usePlatformInit()

    return (
        <div className="flex h-screen flex-col overflow-hidden">
            {/* Toolbar */}
            <Toolbar />

            {/* Main content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <Sidebar
                    activePath={location.pathname}
                    onSettingsClick={() => {
                        navigate("/settings")
                    }}
                    onAddConnectionClick={() => {
                        setEditingConnection(null)
                        setDialogOpen(true)
                    }}
                    onEditConnection={(connection) => {
                        setEditingConnection(connection)
                        setDialogOpen(true)
                    }}
                    onConnectionSelect={(connectionId) => {
                        // Get connection from store to determine type
                        const { connections } = useConnectionStore.getState()
                        const connection = connections.find((c) => c.id === connectionId)

                        if (connection?.type === "redis") {
                            navigate(`/redis/${connectionId}`)
                        } else {
                            navigate(`/workspace/${connectionId}`)
                        }
                    }}
                    onCollectionSelect={(connectionId, database, collection) => {
                        navigate(
                            `/workspace/${connectionId}?db=${database}&collection=${collection}`,
                        )
                    }}
                />

                {/* Content area */}
                <main className="flex-1 overflow-hidden">
                    <Outlet />
                </main>
            </div>

            {/* Status bar */}
            <StatusBar />

            {/* Connection Manager Dialog (single instance for both add + edit) */}
            <ConnectionManagerDialog
                open={dialogOpen}
                onOpenChange={(open) => {
                    setDialogOpen(open)
                    if (!open) {
                        setEditingConnection(null)
                    }
                }}
                connection={editingConnection ?? undefined}
                onSaved={() => {
                    void loadConnections()
                }}
            />
        </div>
    )
}

function App(): JSX.Element {
    return (
        <ThemeProvider defaultTheme="system">
            <PlatformProvider api={tauriPlatformAPI}>
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<AppLayout />}>
                            <Route index element={<HomePage />} />
                            <Route path="workspace/:connectionId" element={<WorkspacePage />} />
                            <Route path="redis/:connectionId" element={<RedisWorkspacePage />} />
                            <Route path="settings" element={<SettingsPage />} />
                        </Route>
                    </Routes>
                </BrowserRouter>
                <Toaster
                    theme="dark"
                    position="bottom-right"
                    richColors
                    closeButton
                    toastOptions={{
                        // Pull sonner's default cards into the brand token surface so
                        // toasts read as part of the workspace, not as a third-party
                        // overlay.
                        classNames: {
                            toast: "border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-lg",
                            description: "text-[var(--muted-foreground)]",
                            actionButton:
                                "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90",
                            cancelButton:
                                "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--accent)]",
                        },
                    }}
                />
            </PlatformProvider>
        </ThemeProvider>
    )
}

export default App
