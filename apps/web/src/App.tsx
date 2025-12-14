import React from "react"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import { AppLayout } from "./components/layout/AppLayout"
import { HomePage } from "./pages/HomePage"
import { WorkspacePage } from "./pages/WorkspacePage"
import { SettingsPage } from "./pages/SettingsPage"

function App(): React.ReactElement {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<AppLayout />}>
                    <Route index element={<HomePage />} />
                    <Route path="workspace/:connectionId" element={<WorkspacePage />} />
                    <Route path="settings" element={<SettingsPage />} />
                </Route>
            </Routes>
        </BrowserRouter>
    )
}

export default App
