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

interface SettingsState {
    settings: AppSettings
    updateSettings: (settings: Partial<AppSettings>) => void
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

            updateSettings: (newSettings: Partial<AppSettings>) => {
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
