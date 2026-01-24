import * as React from "react"
import { cn } from "../../lib/utils"

export interface InputProps extends React.ComponentProps<"input"> {
    error?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, error, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    "flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm shadow-sm transition-all duration-150",
                    "placeholder:text-muted-foreground",
                    "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    "disabled:cursor-not-allowed disabled:opacity-50",
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
Input.displayName = "Input"

export { Input }
