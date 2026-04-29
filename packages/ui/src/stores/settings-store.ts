import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Locale } from "../i18n"

export interface EditorSettings {
    fontSize: number
    tabSize: number
    wordWrap: boolean
    minimap: boolean
}

export interface AppSettings {
    theme: "light" | "dark" | "system"
    /** Locale code. Single source of truth lives in the i18n module —
     *  adding a third language is one type change there, not two. */
    language: Locale
    autoSave: boolean
    confirmDelete: boolean
    editor: EditorSettings
}

/**
 * Top-level settings excluding the nested `editor` block. Callers
 * routing through `updateSettings` shallow-merge by design; permitting
 * a partial `editor` object here would silently nuke the other editor
 * fields (the spread `{ ...state.settings, editor }` replaces the
 * whole sub-object, not merges it). The type now blocks that at the
 * call site — `updateEditorSettings` is the only path that mutates
 * editor-block fields.
 */
type FlatSettings = Omit<AppSettings, "editor">

interface SettingsState {
    settings: AppSettings
    updateSettings: (settings: Partial<FlatSettings>) => void
    updateEditorSettings: (editor: Partial<EditorSettings>) => void
    resetSettings: () => void
}

const defaultSettings: AppSettings = {
    theme: "system",
    language: "en",
    autoSave: true,
    confirmDelete: true,
    editor: {
        fontSize: 14,
        tabSize: 4,
        wordWrap: true,
        minimap: false,
    },
}

/**
 * Schema version for the persisted settings blob. Bump every time the
 * shape of `AppSettings` (or any nested block) changes in a way that
 * old persisted data can't be read as-is. The matching `migrate`
 * callback below upgrades older blobs in place.
 *
 * Versions:
 *   1 — initial release (theme, language, autoSave, confirmDelete, editor.{fontSize,tabSize,wordWrap,minimap})
 */
const SETTINGS_VERSION = 1

/**
 * Best-effort migration from older persisted settings blobs.
 *
 * zustand calls this with `(persistedState, fromVersion)` whenever the
 * stored version is below `SETTINGS_VERSION`. Returning the same
 * object shape (with any new fields filled from defaults) keeps the
 * user's customisations through schema changes — without this, a
 * version bump would force-reset everyone's preferences.
 *
 * The current single version is the baseline, so the migrate is a
 * no-op cast through `unknown`. Future versions will replace the body
 * with field-by-field upgrades.
 */
function migrateSettings(persistedState: unknown, _fromVersion: number): SettingsState {
    return persistedState as SettingsState
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            settings: defaultSettings,

            updateSettings: (newSettings: Partial<FlatSettings>) => {
                set((state) => ({
                    settings: {
                        ...state.settings,
                        ...newSettings,
                    },
                }))
            },

            updateEditorSettings: (editor: Partial<EditorSettings>) => {
                set((state) => ({
                    settings: {
                        ...state.settings,
                        editor: {
                            ...state.settings.editor,
                            ...editor,
                        },
                    },
                }))
            },

            resetSettings: () => {
                set({ settings: defaultSettings })
            },
        }),
        {
            name: "dbland-settings",
            version: SETTINGS_VERSION,
            migrate: migrateSettings,
        },
    ),
)
