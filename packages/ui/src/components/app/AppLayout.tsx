import * as React from "react"
import { Sidebar, type SidebarProps } from "./Sidebar"
import { Toolbar, type ToolbarProps } from "./Toolbar"
import { StatusBar, type StatusBarProps } from "./StatusBar"

export interface AppLayoutProps {
    /** Content to render in main area */
    children: React.ReactNode
    /** Toolbar props */
    toolbarProps?: ToolbarProps
    /** Sidebar props */
    sidebarProps?: SidebarProps
    /** Status bar props */
    statusBarProps?: StatusBarProps
    /** Additional content to render before children (e.g., dialogs) */
    extraContent?: React.ReactNode
}

export function AppLayout({
    children,
    toolbarProps,
    sidebarProps,
    statusBarProps,
    extraContent,
}: AppLayoutProps): JSX.Element {
    return (
        <div className="flex h-screen flex-col overflow-hidden">
            {/* Toolbar */}
            <Toolbar {...toolbarProps} />

            {/* Main content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <Sidebar {...sidebarProps} />

                {/* Content area */}
                <main className="flex-1 overflow-hidden">{children}</main>
            </div>

            {/* Status bar */}
            <StatusBar {...statusBarProps} />

            {/* Extra content (dialogs, etc.) */}
            {extraContent}
        </div>
    )
}
