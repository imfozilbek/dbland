import * as React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useSettingsStore } from "../../stores/settings-store"

type Theme = "dark" | "light" | "system"

interface ThemeProviderProps {
    children: React.ReactNode
    defaultTheme?: Theme
}

interface ThemeProviderState {
    theme: Theme
    setTheme: (theme: Theme) => void
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined)

export function ThemeProvider({
    children,
    defaultTheme = "system",
}: ThemeProviderProps): JSX.Element {
    const { settings, updateSettings } = useSettingsStore()
    const [theme, setThemeState] = useState<Theme>(settings.theme || defaultTheme)

    useEffect(() => {
        const root = window.document.documentElement
        const apply = (resolved: "light" | "dark"): void => {
            root.classList.remove("light", "dark")
            root.classList.add(resolved)
        }

        if (theme !== "system") {
            apply(theme)
            return
        }

        // Follow the OS theme for "system" — and keep following it.
        // Reading matchMedia once at mount left the app stuck on the
        // theme that was active when ThemeProvider first ran; toggling
        // dark mode in macOS at night did nothing until reload.
        const media = window.matchMedia("(prefers-color-scheme: dark)")
        const onChange = (e: MediaQueryListEvent): void => {
            apply(e.matches ? "dark" : "light")
        }
        apply(media.matches ? "dark" : "light")
        media.addEventListener("change", onChange)
        return () => {
            media.removeEventListener("change", onChange)
        }
    }, [theme])

    // Keep local `theme` in sync if some other code path writes
    // settings.theme directly (e.g. a programmatic restore on
    // start-up). Without this the rest of the UI shows the new theme
    // after one render but the document-root class still reflects the
    // previous value.
    useEffect(() => {
        if (settings.theme && settings.theme !== theme) {
            setThemeState(settings.theme)
        }
    }, [settings.theme, theme])

    const setTheme = (newTheme: Theme): void => {
        setThemeState(newTheme)
        updateSettings({ theme: newTheme })
    }

    const value = {
        theme,
        setTheme,
    }

    return <ThemeProviderContext.Provider value={value}>{children}</ThemeProviderContext.Provider>
}

export const useTheme = (): ThemeProviderState => {
    const context = useContext(ThemeProviderContext)

    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider")
    }

    return context
}
