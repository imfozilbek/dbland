import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import { en } from "./locales/en"
import { ru } from "./locales/ru"

export type Locale = "en" | "ru"

const RESOURCES = {
    en: { common: en },
    ru: { common: ru },
} as const

let initialised = false

/**
 * Boot i18next with our two locales and a default of English. Idempotent —
 * `<I18nProvider>` calls this from useEffect, but a parallel test setup
 * could call it too without exploding.
 */
export function initI18n(initialLocale: Locale = "en"): typeof i18n {
    if (initialised) {
        return i18n
    }
    void i18n.use(initReactI18next).init({
        resources: RESOURCES,
        lng: initialLocale,
        fallbackLng: "en",
        defaultNS: "common",
        interpolation: {
            escapeValue: false, // React already escapes
        },
        returnNull: false,
    })
    initialised = true
    return i18n
}

export { i18n }
export { I18nProvider, useT } from "./provider"
