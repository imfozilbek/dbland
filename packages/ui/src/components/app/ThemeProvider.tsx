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

        root.classList.remove("light", "dark")

        if (theme === "system") {
            const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light"

            root.classList.add(systemTheme)
            return
        }

        root.classList.add(theme)
    }, [theme])

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
