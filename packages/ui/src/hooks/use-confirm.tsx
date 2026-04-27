import { useCallback, useRef, useState } from "react"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "../components/ui/alert-dialog"

export interface ConfirmOptions {
    title: string
    description?: string
    confirmLabel?: string
    cancelLabel?: string
    destructive?: boolean
}

interface PendingPrompt extends ConfirmOptions {
    resolve: (confirmed: boolean) => void
}

/**
 * Replacement for `window.confirm()` that renders an accessible Radix
 * AlertDialog. Returns a tuple of `[confirm, dialog]` — call `confirm(opts)`
 * to ask, render `{dialog}` once at the bottom of the component tree.
 *
 * The native dialog blocks the renderer thread, breaks tests under
 * jsdom and looks like a 1995 popup; this hook replaces it without
 * pulling sonner's non-modal flow into destructive paths where modality
 * matters.
 */
export function useConfirm(): readonly [(opts: ConfirmOptions) => Promise<boolean>, JSX.Element] {
    const [open, setOpen] = useState(false)
    const [prompt, setPrompt] = useState<PendingPrompt | null>(null)
    const pendingRef = useRef<PendingPrompt | null>(null)

    const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
        return new Promise<boolean>((resolve) => {
            const next: PendingPrompt = { ...opts, resolve }
            pendingRef.current = next
            setPrompt(next)
            setOpen(true)
        })
    }, [])

    const settle = (value: boolean): void => {
        const current = pendingRef.current
        pendingRef.current = null
        setOpen(false)
        if (current) {
            current.resolve(value)
        }
    }

    const dialog = (
        <AlertDialog
            open={open}
            onOpenChange={(next) => {
                if (!next) {
                    settle(false)
                }
            }}
        >
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{prompt?.title ?? ""}</AlertDialogTitle>
                    {prompt?.description && (
                        <AlertDialogDescription>{prompt.description}</AlertDialogDescription>
                    )}
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel
                        onClick={() => {
                            settle(false)
                        }}
                    >
                        {prompt?.cancelLabel ?? "Cancel"}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => {
                            settle(true)
                        }}
                        className={
                            prompt?.destructive
                                ? "bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:bg-[var(--destructive)]/90"
                                : undefined
                        }
                    >
                        {prompt?.confirmLabel ?? "Confirm"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )

    return [confirm, dialog] as const
}
