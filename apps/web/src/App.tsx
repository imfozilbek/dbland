import { BrowserRouter, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom"
import { useState } from "react"
import {
    ConnectionManagerDialog,
    PlatformProvider,
    Sidebar,
    StatusBar,
    Toolbar,
    useConnectionStore,
    usePlatformInit,
} from "@dbland/ui"
import { webPlatformAPI } from "./lib/web-platform"
import { HomePage } from "./pages/HomePage"
import { WorkspacePage } from "./pages/WorkspacePage"
import { SettingsPage } from "./pages/SettingsPage"

function AppLayout(): JSX.Element {
    const navigate = useNavigate()
    const location = useLocation()
    const [dialogOpen, setDialogOpen] = useState(false)
    const { loadConnections, connections } = useConnectionStore()

    // Initialize stores with platform API
    usePlatformInit()

    // Derive the active connection from the URL so the global toolbar shows
    // its name + type pill instead of permanently saying "No connection".
    const activeConnectionMatch = /^\/(?:workspace|redis)\/([^/?#]+)/.exec(location.pathname)
    const activeConnection = activeConnectionMatch
        ? connections.find((c) => c.id === activeConnectionMatch[1])
        : undefined

    return (
        <div className="flex h-screen flex-col overflow-hidden">
            {/* Toolbar */}
            <Toolbar
                connectionName={activeConnection?.name}
                databaseType={activeConnection?.type}
            />

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
                        navigate(`/workspace/${connectionId}`)
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
            <StatusBar version={`v${__APP_VERSION__}`} />

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
        <PlatformProvider api={webPlatformAPI}>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<AppLayout />}>
                        <Route index element={<HomePage />} />
                        <Route path="workspace/:connectionId" element={<WorkspacePage />} />
                        <Route path="settings" element={<SettingsPage />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </PlatformProvider>
    )
}

export default App
