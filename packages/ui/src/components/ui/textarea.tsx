import * as React from "react"
import { cn } from "../../lib/utils"

export interface TextareaProps extends React.ComponentProps<"textarea"> {
    error?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, error, ...props }, ref) => {
        return (
            <textarea
                className={cn(
                    "flex min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm transition-all duration-150",
                    "placeholder:text-muted-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    "resize-y",
                    error
                        ? "border-destructive focus-visible:ring-destructive"
                        : "border-input hover:border-primary/50",
                    className,
                )}
                ref={ref}
                {...props}
            />
        )
    },
)
Textarea.displayName = "Textarea"

export { Textarea }
