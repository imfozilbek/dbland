import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface EditorSettings {
    fontSize: number
    tabSize: number
    wordWrap: boolean
    minimap: boolean
}

export interface AppSettings {
    theme: "light" | "dark" | "system"
    language: "en" | "ru"
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
        },
    ),
)
