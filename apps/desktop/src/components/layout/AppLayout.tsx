import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { Toolbar } from "./Toolbar"
import { StatusBar } from "./StatusBar"

export function AppLayout() {
    return (
        <div className="flex h-screen flex-col overflow-hidden">
            {/* Toolbar */}
            <Toolbar />

            {/* Main content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <Sidebar />

                {/* Content area */}
                <main className="flex-1 overflow-hidden">
                    <Outlet />
                </main>
            </div>

            {/* Status bar */}
            <StatusBar />
        </div>
    )
}
