import { useState } from "react"
import { ArrowRight, Database, Plus, Upload, Zap } from "lucide-react"
import { ConnectionManagerDialog, useConnectionStore } from "@dbland/ui"

export function HomePage(): JSX.Element {
    const [dialogOpen, setDialogOpen] = useState(false)
    const { loadConnections } = useConnectionStore()

    return (
        <div className="flex h-full items-center justify-center p-8 relative overflow-hidden">
            {/* Subtle background glow */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl" />

            <div className="max-w-3xl w-full space-y-12 text-center relative z-10">
                {/* Hero section */}
                <div className="space-y-6 animate-fadeInUp">
                    {/* Icon */}
                    <div className="relative inline-flex">
                        <div className="absolute inset-0 bg-emerald-500/20 rounded-2xl blur-xl animate-pulse-glow" />
                        <div className="relative p-4 rounded-2xl bg-[#1C1C1C] border border-[#262626]">
                            <Database className="h-12 w-12 text-[#3ECF8E]" />
                        </div>
                    </div>

                    {/* Title */}
                    <div className="space-y-3">
                        <h1 className="text-5xl font-bold tracking-tight">
                            Welcome to <span className="text-[#3ECF8E]">DBLand</span>
                        </h1>
                        <p className="text-lg text-[#8F8F8F] max-w-xl mx-auto">
                            Modern NoSQL database client for MongoDB and Redis. Fast, beautiful, and
                            powerful.
                        </p>
                    </div>
                </div>

                {/* Action cards */}
                <div
                    className="grid gap-4 sm:grid-cols-2 animate-fadeInUp"
                    style={{ animationDelay: "100ms" }}
                >
                    {/* New Connection Card */}
                    <button
                        onClick={() => {
                            setDialogOpen(true)
                        }}
                        className="group relative p-6 rounded-lg bg-[#1C1C1C] border border-[#262626] hover:border-[#3ECF8E]/50 transition-all duration-200 text-left"
                    >
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-lg bg-[#3ECF8E]/10 text-[#3ECF8E] group-hover:bg-[#3ECF8E]/15 transition-colors">
                                <Plus className="h-6 w-6" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                                    New Connection
                                    <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[#3ECF8E]" />
                                </h3>
                                <p className="text-sm text-[#8F8F8F]">
                                    Connect to MongoDB or Redis database
                                </p>
                            </div>
                        </div>
                    </button>

                    {/* Import Card */}
                    <button className="group relative p-6 rounded-lg bg-[#1C1C1C] border border-[#262626] hover:border-[#8F8F8F]/30 transition-all duration-200 text-left">
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-lg bg-[#262626] text-[#8F8F8F] group-hover:bg-[#2A2A2A] transition-colors">
                                <Upload className="h-6 w-6" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                                    Import Connections
                                    <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                </h3>
                                <p className="text-sm text-[#8F8F8F]">
                                    Import from MongoDB Compass, TablePlus
                                </p>
                            </div>
                        </div>
                    </button>
                </div>

                {/* Quick start hint */}
                <div className="animate-fadeInUp" style={{ animationDelay: "200ms" }}>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1C1C1C] border border-[#262626] text-sm text-[#8F8F8F]">
                        <Zap className="h-4 w-4 text-[#F5A524]" />
                        <span>Press</span>
                        <kbd className="px-2 py-0.5 rounded bg-[#262626] text-white font-mono text-xs">
                            ⌘ K
                        </kbd>
                        <span>to open command palette</span>
                    </div>
                </div>

                {/* Recent connections */}
                <div className="space-y-4 animate-fadeInUp" style={{ animationDelay: "300ms" }}>
                    <h2 className="text-sm font-medium text-[#8F8F8F] uppercase tracking-wider">
                        Recent Connections
                    </h2>
                    <div className="p-8 rounded-lg border border-dashed border-[#262626] bg-[#1C1C1C]/50">
                        <p className="text-[#525252]">
                            No recent connections. Create one to get started.
                        </p>
                    </div>
                </div>
            </div>

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
