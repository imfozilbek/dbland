import * as React from "react"
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"
import { ChevronRight, Loader2 } from "lucide-react"
import { cn } from "../../lib/utils"

/* -----------------------------------------------------------------------------
 * Tree Container
 * -------------------------------------------------------------------------- */

interface TreeProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
}

const Tree = React.forwardRef<HTMLDivElement, TreeProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <div ref={ref} className={cn("space-y-0.5", className)} {...props}>
                {children}
            </div>
        )
    },
)
Tree.displayName = "Tree"

/* -----------------------------------------------------------------------------
 * TreeItem - Leaf node (no children)
 * -------------------------------------------------------------------------- */

interface TreeItemProps extends React.HTMLAttributes<HTMLButtonElement> {
    icon?: React.ReactNode
    label: string
    badge?: string | number
    isLoading?: boolean
    isActive?: boolean
    actions?: React.ReactNode
    level?: number
}

const TreeItem = React.forwardRef<HTMLButtonElement, TreeItemProps>(
    ({ className, icon, label, badge, isLoading, isActive, actions, level = 0, ...props }, ref) => {
        const paddingLeft = 12 + level * 16

        return (
            <button
                ref={ref}
                className={cn(
                    "group flex w-full items-center gap-2 rounded-md px-2 py-1 text-[13px]",
                    "transition-colors duration-150",
                    "hover:bg-muted",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    isActive && "bg-muted font-medium",
                    className,
                )}
                style={{ paddingLeft }}
                {...props}
            >
                {/* Spacer for chevron alignment */}
                <span className="w-3.5" />

                {/* Icon */}
                {isLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                ) : icon ? (
                    <span className="flex h-3.5 w-3.5 items-center justify-center text-muted-foreground">
                        {icon}
                    </span>
                ) : null}

                {/* Label */}
                <span className="flex-1 truncate text-left">{label}</span>

                {/* Badge */}
                {badge !== undefined && (
                    <span className="text-[11px] tabular-nums text-muted-foreground">{badge}</span>
                )}

                {/* Actions (visible on hover) */}
                {actions && (
                    <span className="opacity-0 transition-opacity group-hover:opacity-100">
                        {actions}
                    </span>
                )}
            </button>
        )
    },
)
TreeItem.displayName = "TreeItem"

/* -----------------------------------------------------------------------------
 * TreeGroup - Expandable node with children
 * -------------------------------------------------------------------------- */

interface TreeGroupProps {
    icon?: React.ReactNode
    label: string
    badge?: string | number
    statusIndicator?: React.ReactNode
    defaultOpen?: boolean
    open?: boolean
    isLoading?: boolean
    isActive?: boolean
    actions?: React.ReactNode
    level?: number
    children?: React.ReactNode
    onOpenChange?: (open: boolean) => void
    onLabelClick?: () => void
}

const TreeGroup = React.forwardRef<HTMLDivElement, TreeGroupProps>(
    (
        {
            icon,
            label,
            badge,
            statusIndicator,
            defaultOpen,
            open,
            isLoading,
            isActive,
            actions,
            level = 0,
            children,
            onOpenChange,
            onLabelClick,
        },
        ref,
    ) => {
        const paddingLeft = 12 + level * 16

        return (
            <CollapsiblePrimitive.Root
                ref={ref}
                defaultOpen={defaultOpen}
                open={open}
                onOpenChange={onOpenChange}
            >
                <CollapsiblePrimitive.Trigger asChild>
                    <div
                        className={cn(
                            "group flex w-full items-center gap-2 rounded-md px-2 py-1 text-[13px]",
                            "transition-colors duration-150",
                            "hover:bg-muted",
                            "cursor-pointer select-none",
                            isActive && "bg-muted",
                        )}
                        style={{ paddingLeft }}
                    >
                        {/* Chevron */}
                        <ChevronRight
                            className={cn(
                                "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150",
                                "group-data-[state=open]:rotate-90",
                            )}
                        />

                        {/* Icon */}
                        {isLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        ) : icon ? (
                            <span className="flex h-3.5 w-3.5 items-center justify-center">
                                {icon}
                            </span>
                        ) : null}

                        {/* Clickable Label */}
                        {onLabelClick ? (
                            <span
                                className="flex-1 truncate text-left font-medium hover:underline"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onLabelClick()
                                }}
                            >
                                {label}
                            </span>
                        ) : (
                            <span className="flex-1 truncate text-left font-medium">{label}</span>
                        )}

                        {/* Badge */}
                        {badge !== undefined && (
                            <span className="text-[11px] tabular-nums text-muted-foreground">
                                {badge}
                            </span>
                        )}

                        {/* Status Indicator */}
                        {statusIndicator}

                        {/* Actions (visible on hover) */}
                        {actions && (
                            <span
                                className="opacity-0 transition-opacity group-hover:opacity-100"
                                onClick={(e) => {
                                    e.stopPropagation()
                                }}
                            >
                                {actions}
                            </span>
                        )}
                    </div>
                </CollapsiblePrimitive.Trigger>

                <CollapsiblePrimitive.Content className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                    {children}
                </CollapsiblePrimitive.Content>
            </CollapsiblePrimitive.Root>
        )
    },
)
TreeGroup.displayName = "TreeGroup"

/* -----------------------------------------------------------------------------
 * TreeEmpty - Placeholder when no children
 * -------------------------------------------------------------------------- */

interface TreeEmptyProps extends React.HTMLAttributes<HTMLDivElement> {
    level?: number
}

const TreeEmpty = React.forwardRef<HTMLDivElement, TreeEmptyProps>(
    ({ className, level = 0, children, ...props }, ref) => {
        const paddingLeft = 12 + level * 16 + 20 // +20 for chevron + icon space

        return (
            <div
                ref={ref}
                className={cn("py-1 text-[12px] italic text-muted-foreground", className)}
                style={{ paddingLeft }}
                {...props}
            >
                {children}
            </div>
        )
    },
)
TreeEmpty.displayName = "TreeEmpty"

export { Tree, TreeItem, TreeGroup, TreeEmpty }
export type { TreeProps, TreeItemProps, TreeGroupProps, TreeEmptyProps }
