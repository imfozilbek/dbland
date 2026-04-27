import * as React from "react"
import { cn } from "../../lib/utils"

export interface EmptyStateProps {
    /** Icon to display above the headline (already sized — usually `<Icon className="h-6 w-6" />`). */
    icon?: React.ReactNode
    /** Short, declarative headline ("No documents found"). */
    title: string
    /** Optional secondary line — explain why nothing is here, or what the user can do next. */
    description?: React.ReactNode
    /** Optional primary action (a `<Button>` or similar). */
    action?: React.ReactNode
    /** Pass `compact` for inline empty states inside dialogs / panels. */
    size?: "default" | "compact"
    className?: string
}

/**
 * Replaces the bare "No X found" centered text scattered across the app.
 *
 * Always provides a quiet visual anchor (icon in a tinted surface), a clear
 * headline, and — when relevant — context or a next-step action. The "AI
 * default" of dropping a single grey line into the middle of an empty area
 * makes the workspace feel broken; this gives an empty state a presence
 * without dominating the surface.
 */
export function EmptyState({
    icon,
    title,
    description,
    action,
    size = "default",
    className,
}: EmptyStateProps): JSX.Element {
    const compact = size === "compact"
    return (
        <div
            role="status"
            className={cn(
                "flex flex-col items-center justify-center gap-3 text-center",
                compact ? "p-4" : "p-8",
                className,
            )}
        >
            {icon && (
                <div
                    aria-hidden="true"
                    className={cn(
                        "flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)]",
                        compact ? "h-8 w-8" : "h-10 w-10",
                    )}
                >
                    {icon}
                </div>
            )}
            <div className="space-y-1">
                <p
                    className={cn(
                        "font-medium text-[var(--foreground)]",
                        compact ? "text-sm" : "text-sm",
                    )}
                >
                    {title}
                </p>
                {description && (
                    <p className="max-w-xs text-xs text-[var(--muted-foreground)]">{description}</p>
                )}
            </div>
            {action && <div className="pt-1">{action}</div>}
        </div>
    )
}
