import { useState } from "react"
import { ArrowRight, Database, Plus } from "lucide-react"
import { ConnectionManagerDialog, useConnectionStore, useT } from "@dbland/ui"

export function HomePage(): JSX.Element {
    const t = useT()
    const [dialogOpen, setDialogOpen] = useState(false)
    const { connections, loadConnections } = useConnectionStore()

    const recent = connections.slice(0, 5)

    return (
        <div className="relative flex h-full items-center justify-center overflow-hidden p-8">
            {/* Diagonal grid + soft accent — atmosphere, not decoration */}
            <div
                aria-hidden="true"
                className="absolute inset-0 opacity-[0.04]"
                style={{
                    backgroundImage:
                        "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
                    backgroundSize: "32px 32px",
                }}
            />
            <div
                aria-hidden="true"
                className="absolute left-1/2 top-1/3 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-[var(--primary)]/[0.06] blur-3xl"
            />

            <div className="relative z-10 w-full max-w-3xl space-y-12">
                {/* Hero */}
                <div className="space-y-6 animate-fadeInUp">
                    <div className="relative inline-flex">
                        <div className="absolute inset-0 rounded-2xl bg-[var(--primary)]/15 blur-xl animate-pulse-glow" />
                        <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                            <Database className="h-12 w-12 text-[var(--primary)]" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h1 className="text-5xl font-bold tracking-tight text-[var(--foreground)]">
                            DBLand
                        </h1>
                        <p className="max-w-xl text-base text-[var(--muted-foreground)]">
                            {t("home.tagline")}
                        </p>
                        <div className="flex items-center gap-3 pt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]/70">
                            <span className="h-px w-8 bg-[var(--border)]" />
                            <span>{t("home.ready")}</span>
                            <span className="h-px flex-1 bg-[var(--border)]" />
                        </div>
                    </div>
                </div>

                {/* Primary CTA */}
                <div className="animate-fadeInUp" style={{ animationDelay: "100ms" }}>
                    <button
                        onClick={() => {
                            setDialogOpen(true)
                        }}
                        className="group relative flex w-full items-center gap-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 text-left transition-all duration-200 hover:border-[var(--primary)]/50 hover:bg-[var(--popover)]"
                    >
                        <div className="rounded-lg bg-[var(--primary)]/10 p-3 text-[var(--primary)] transition-colors group-hover:bg-[var(--primary)]/15">
                            <Plus className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                            <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
                                {t("home.newConnection")}
                                <ArrowRight className="h-4 w-4 -translate-x-2 text-[var(--primary)] opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                            </h2>
                            <p className="text-sm text-[var(--muted-foreground)]">
                                {t("home.newConnectionDescription")}
                            </p>
                        </div>
                    </button>
                </div>

                {/* Recent connections — actionable, not decorative */}
                <div className="space-y-4 animate-fadeInUp" style={{ animationDelay: "200ms" }}>
                    <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]/80">
                        {t("home.recent")}
                    </h3>
                    {recent.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--card)]/40 p-6 text-center">
                            <p className="text-sm text-[var(--muted-foreground)]">
                                {t("home.noRecent")}
                            </p>
                            <p className="mt-1 text-xs text-[var(--muted-foreground)]/70">
                                {t("home.noRecentHint")}
                            </p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)]">
                            {recent.map((c) => (
                                <li key={c.id}>
                                    <button
                                        type="button"
                                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--popover)]"
                                    >
                                        <span
                                            aria-hidden="true"
                                            className={
                                                c.type === "mongodb"
                                                    ? "h-2 w-2 rounded-full bg-[var(--mongodb)]"
                                                    : "h-2 w-2 rounded-full bg-[var(--redis)]"
                                            }
                                        />
                                        <span className="flex-1 truncate text-sm text-[var(--foreground)]">
                                            {c.name}
                                        </span>
                                        <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
                                            {c.host}:{c.port}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
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
