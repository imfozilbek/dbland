import { useEffect } from "react"

export interface KeyboardShortcut {
    key: string
    ctrlOrCmd?: boolean
    shift?: boolean
    alt?: boolean
    handler: () => void
    description: string
}

const isMac = typeof window !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]): void {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent): void => {
            for (const shortcut of shortcuts) {
                const ctrlOrCmdPressed = isMac ? event.metaKey : event.ctrlKey

                const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase()
                const ctrlMatches = shortcut.ctrlOrCmd ? ctrlOrCmdPressed : !ctrlOrCmdPressed
                const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey
                const altMatches = shortcut.alt ? event.altKey : !event.altKey

                if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
                    event.preventDefault()
                    shortcut.handler()
                    break
                }
            }
        }

        window.addEventListener("keydown", handleKeyDown)

        return () => {
            window.removeEventListener("keydown", handleKeyDown)
        }
    }, [shortcuts])
}

export const getShortcutLabel = (shortcut: KeyboardShortcut): string => {
    const parts: string[] = []

    if (shortcut.ctrlOrCmd) {
        parts.push(isMac ? "⌘" : "Ctrl")
    }

    if (shortcut.shift) {
        parts.push(isMac ? "⇧" : "Shift")
    }

    if (shortcut.alt) {
        parts.push(isMac ? "⌥" : "Alt")
    }

    parts.push(shortcut.key.toUpperCase())

    return parts.join(isMac ? "" : "+")
}
