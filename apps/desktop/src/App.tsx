import { BrowserRouter, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom"
import { useState } from "react"
import {
    ConnectionManagerDialog,
    PlatformProvider,
    Sidebar,
    StatusBar,
    ThemeProvider,
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

            {/* Connection Manager Dialog */}
            <ConnectionManagerDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSaved={() => {
                    void loadConnections()
                }}
            />
        </div>
    )
}

function App(): JSX.Element {
    return (
        <ThemeProvider defaultTheme="system" storageKey="dbland-ui-theme">
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
            </PlatformProvider>
        </ThemeProvider>
    )
}

export default App
