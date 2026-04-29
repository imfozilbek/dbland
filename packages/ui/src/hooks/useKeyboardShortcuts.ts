import { useEffect, useRef } from "react"

export interface KeyboardShortcut {
    key: string
    ctrlOrCmd?: boolean
    shift?: boolean
    alt?: boolean
    handler: () => void
    description: string
}

const isMac = typeof window !== "undefined" && navigator.platform.toUpperCase().includes("MAC")

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]): void {
    // Hold the latest shortcut list in a ref so the keydown listener
    // attaches once and survives re-renders. The previous version
    // depended on `shortcuts` directly — every parent render that
    // built a fresh inline array (which is most call sites) tore down
    // and re-attached the global window listener, losing key presses
    // mid-cycle and producing a steady stream of GC pressure on long
    // sessions.
    const shortcutsRef = useRef(shortcuts)
    shortcutsRef.current = shortcuts

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent): void => {
            for (const shortcut of shortcutsRef.current) {
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
    }, [])
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
