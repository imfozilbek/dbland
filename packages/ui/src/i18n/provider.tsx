import { useEffect } from "react"
import { I18nextProvider, useTranslation } from "react-i18next"
import { useSettingsStore } from "../stores/settings-store"
import { i18n, initI18n, type Locale } from "./index"

interface I18nProviderProps {
    children: React.ReactNode
}

/**
 * Boots i18next with the locale stored in the settings store and keeps
 * `i18n.language` in sync as the user picks a different language in
 * Settings → General. Mount once near the root of the React tree
 * (typically inside ThemeProvider).
 */
export function I18nProvider({ children }: I18nProviderProps): JSX.Element {
    const language = useSettingsStore((state) => state.settings.language)

    // Make sure i18n is bootstrapped with the persisted locale before the
    // first paint. After that we just call changeLanguage on the singleton.
    initI18n(language)

    useEffect(() => {
        if (i18n.language !== language) {
            void i18n.changeLanguage(language)
        }
    }, [language])

    return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}

/**
 * Tiny ergonomic wrapper around `useTranslation` so component code can
 * read `const t = useT()` without picking a namespace each time. The
 * "common" namespace is the only one we ship — keeping the keys grouped
 * by surface inside it (sidebar.*, toolbar.*, settings.*, …).
 */
export function useT(): ReturnType<typeof useTranslation>["t"] {
    return useTranslation("common").t
}

/** Re-export i18n's locale type for the rest of the app. */
export type { Locale }
