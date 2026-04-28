import { cn } from "../../lib/utils"

/**
 * Skeleton placeholder for content that's still loading.
 *
 * Uses the workspace's `.animate-shimmer` keyframes (defined in
 * `index.css`) — a sweeping highlight from left to right — instead
 * of Tailwind's default `animate-pulse`, which makes the whole block
 * fade in and out and reads as "broken render" more than "loading".
 * Falls back to `animate-pulse` when the user prefers reduced motion.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
    return (
        <div
            role="status"
            aria-live="polite"
            aria-busy="true"
            className={cn(
                "animate-shimmer rounded-md bg-[var(--muted)] motion-reduce:animate-pulse motion-reduce:bg-[var(--muted)]",
                className,
            )}
            {...props}
        />
    )
}

export { Skeleton }
