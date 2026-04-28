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
                    "group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px]",
                    "transition-all duration-150",
                    "hover:bg-accent",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                    isActive && ["bg-accent", "border-l-2 border-l-primary", "font-medium"],
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
                    <span className="flex h-3.5 w-3.5 items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors">
                        {icon}
                    </span>
                ) : null}

                {/* Label */}
                <span className="flex-1 truncate text-left">{label}</span>

                {/* Badge */}
                {badge !== undefined && (
                    <span className="text-[11px] tabular-nums text-muted-foreground px-1.5 py-0.5 rounded bg-secondary">
                        {badge}
                    </span>
                )}

                {/* Actions (visible on hover) */}
                {actions && (
                    <span className="opacity-0 transition-opacity duration-150 group-hover:opacity-100">
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
                    {/*
                      Radix forwards onClick / aria-expanded / aria-controls
                      onto the child, but the child is a <div> (we can't use
                      a real <button> because the actions slot contains
                      nested buttons, which is invalid HTML). So we have to
                      manually wire up the rest of the button affordance —
                      role, tabIndex, and Space/Enter activation — otherwise
                      keyboard users can't expand connections in the tree.
                    */}
                    <div
                        role="button"
                        tabIndex={0}
                        className={cn(
                            "group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px]",
                            "transition-all duration-150",
                            "hover:bg-accent",
                            "cursor-pointer select-none",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                            isActive && ["bg-accent", "border-l-2 border-l-primary"],
                        )}
                        style={{ paddingLeft }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault()
                                onOpenChange?.(!open)
                            }
                        }}
                    >
                        {/* Chevron */}
                        <ChevronRight
                            className={cn(
                                "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                                "group-data-[state=open]:rotate-90",
                                "group-hover:text-foreground",
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
                                className="flex-1 truncate text-left font-medium hover:text-primary transition-colors"
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
                            <span className="text-[11px] tabular-nums text-muted-foreground px-1.5 py-0.5 rounded bg-secondary">
                                {badge}
                            </span>
                        )}

                        {/* Status Indicator */}
                        {statusIndicator}

                        {/* Actions (visible on hover) */}
                        {actions && (
                            <span
                                className="opacity-0 transition-opacity duration-150 group-hover:opacity-100"
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
                className={cn("py-2 text-[12px] italic text-muted-foreground", className)}
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
