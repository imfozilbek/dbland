import { type BeforeMount, Editor, type OnMount } from "@monaco-editor/react"
import { useEffect, useRef } from "react"
import * as monaco from "monaco-editor"
import type { QueryLanguage } from "../../stores/query-store"

export interface QueryEditorProps {
    value: string
    onChange: (value: string) => void
    onExecute?: () => void
    language: QueryLanguage
    readOnly?: boolean
    height?: string
}

/**
 * DBLand custom Monaco theme definition.
 * Colors based on brand guidelines (.skills/brand-guidelines/SKILL.md).
 */
const dblandDarkTheme: monaco.editor.IStandaloneThemeData = {
    base: "vs-dark",
    inherit: true,
    rules: [
        // Syntax highlighting tokens
        { token: "keyword", foreground: "FF7B72", fontStyle: "bold" },
        { token: "string", foreground: "A5D6FF" },
        { token: "string.key.json", foreground: "79C0FF" },
        { token: "string.value.json", foreground: "A5D6FF" },
        { token: "number", foreground: "FFA657" },
        { token: "number.json", foreground: "FFA657" },
        { token: "comment", foreground: "8B949E", fontStyle: "italic" },
        { token: "operator", foreground: "FF7B72" },
        { token: "delimiter", foreground: "E6EDF3" },
        { token: "delimiter.bracket", foreground: "E6EDF3" },
        { token: "delimiter.array", foreground: "E6EDF3" },
        // MongoDB-specific tokens
        { token: "type", foreground: "A371F7" },
        { token: "constant", foreground: "79C0FF" },
        { token: "variable", foreground: "E6EDF3" },
        // Boolean values
        { token: "keyword.json", foreground: "FF7B72" },
    ],
    colors: {
        // Editor background - brand bg-primary
        "editor.background": "#0D1117",
        // Text color - brand text-primary
        "editor.foreground": "#E6EDF3",
        // Active line highlight - brand bg-secondary
        "editor.lineHighlightBackground": "#161B2280",
        "editor.lineHighlightBorder": "#30363D40",
        // Selection - brand accent-blue with transparency
        "editor.selectionBackground": "#264F7880",
        "editor.selectionHighlightBackground": "#58A6FF30",
        "editor.inactiveSelectionBackground": "#264F7850",
        // Cursor - brand accent-blue
        "editorCursor.foreground": "#58A6FF",
        // Line numbers - brand text-muted
        "editorLineNumber.foreground": "#6E7681",
        "editorLineNumber.activeForeground": "#E6EDF3",
        // Gutter
        "editorGutter.background": "#0D1117",
        // Indentation guides
        "editorIndentGuide.background": "#30363D",
        "editorIndentGuide.activeBackground": "#58A6FF50",
        // Widgets (autocomplete, hover)
        "editorWidget.background": "#161B22",
        "editorWidget.border": "#30363D",
        "editorWidget.foreground": "#E6EDF3",
        // Suggest widget (autocomplete dropdown)
        "editorSuggestWidget.background": "#161B22",
        "editorSuggestWidget.border": "#30363D",
        "editorSuggestWidget.foreground": "#E6EDF3",
        "editorSuggestWidget.highlightForeground": "#58A6FF",
        "editorSuggestWidget.selectedBackground": "#30363D",
        // Hover widget
        "editorHoverWidget.background": "#161B22",
        "editorHoverWidget.border": "#30363D",
        // Scrollbar
        "scrollbarSlider.background": "#30363D80",
        "scrollbarSlider.hoverBackground": "#8B949E50",
        "scrollbarSlider.activeBackground": "#8B949E80",
        // Bracket matching
        "editorBracketMatch.background": "#58A6FF30",
        "editorBracketMatch.border": "#58A6FF",
        // Word highlight
        "editor.wordHighlightBackground": "#58A6FF20",
        "editor.wordHighlightStrongBackground": "#58A6FF30",
        // Find/replace
        "editor.findMatchBackground": "#FFA65730",
        "editor.findMatchHighlightBackground": "#FFA65720",
        // Input fields
        "input.background": "#0D1117",
        "input.border": "#30363D",
        "input.foreground": "#E6EDF3",
        "inputOption.activeBackground": "#58A6FF30",
        // Dropdown
        "dropdown.background": "#161B22",
        "dropdown.border": "#30363D",
        "dropdown.foreground": "#E6EDF3",
        // List (autocomplete items)
        "list.hoverBackground": "#21262D",
        "list.activeSelectionBackground": "#30363D",
        "list.activeSelectionForeground": "#E6EDF3",
        "list.focusBackground": "#30363D",
        "list.highlightForeground": "#58A6FF",
        // Focus border
        focusBorder: "#58A6FF",
    },
}

/**
 * Light theme variant for the editor.
 */
const dblandLightTheme: monaco.editor.IStandaloneThemeData = {
    base: "vs",
    inherit: true,
    rules: [
        { token: "keyword", foreground: "CF222E", fontStyle: "bold" },
        { token: "string", foreground: "0A3069" },
        { token: "string.key.json", foreground: "0550AE" },
        { token: "string.value.json", foreground: "0A3069" },
        { token: "number", foreground: "953800" },
        { token: "number.json", foreground: "953800" },
        { token: "comment", foreground: "656D76", fontStyle: "italic" },
        { token: "operator", foreground: "CF222E" },
        { token: "delimiter", foreground: "1F2328" },
        { token: "type", foreground: "8250DF" },
        { token: "constant", foreground: "0550AE" },
        { token: "variable", foreground: "1F2328" },
        { token: "keyword.json", foreground: "CF222E" },
    ],
    colors: {
        "editor.background": "#FFFFFF",
        "editor.foreground": "#1F2328",
        "editor.lineHighlightBackground": "#F6F8FA",
        "editor.lineHighlightBorder": "#D0D7DE40",
        "editor.selectionBackground": "#0969DA30",
        "editor.selectionHighlightBackground": "#0969DA20",
        "editorCursor.foreground": "#0969DA",
        "editorLineNumber.foreground": "#8C959F",
        "editorLineNumber.activeForeground": "#1F2328",
        "editorGutter.background": "#FFFFFF",
        "editorIndentGuide.background": "#D0D7DE",
        "editorIndentGuide.activeBackground": "#0969DA50",
        "editorWidget.background": "#FFFFFF",
        "editorWidget.border": "#D0D7DE",
        "editorWidget.foreground": "#1F2328",
        "editorSuggestWidget.background": "#FFFFFF",
        "editorSuggestWidget.border": "#D0D7DE",
        "editorSuggestWidget.foreground": "#1F2328",
        "editorSuggestWidget.highlightForeground": "#0969DA",
        "editorSuggestWidget.selectedBackground": "#EAEEF2",
        "editorHoverWidget.background": "#FFFFFF",
        "editorHoverWidget.border": "#D0D7DE",
        "scrollbarSlider.background": "#D0D7DE80",
        "scrollbarSlider.hoverBackground": "#8C959F50",
        "editorBracketMatch.background": "#0969DA30",
        "editorBracketMatch.border": "#0969DA",
        "editor.wordHighlightBackground": "#0969DA20",
        "editor.findMatchBackground": "#95380030",
        "editor.findMatchHighlightBackground": "#95380020",
        "input.background": "#FFFFFF",
        "input.border": "#D0D7DE",
        "input.foreground": "#1F2328",
        "dropdown.background": "#FFFFFF",
        "dropdown.border": "#D0D7DE",
        "dropdown.foreground": "#1F2328",
        "list.hoverBackground": "#F6F8FA",
        "list.activeSelectionBackground": "#EAEEF2",
        "list.activeSelectionForeground": "#1F2328",
        focusBorder: "#0969DA",
    },
}

/**
 * Query editor component with Monaco Editor integration.
 * Supports MongoDB (JSON-like) and Redis (CLI) syntax highlighting.
 * Uses custom DBLand theme matching brand guidelines.
 */
export function QueryEditor({
    value,
    onChange,
    onExecute,
    language,
    readOnly = false,
    height = "300px",
}: QueryEditorProps): JSX.Element {
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)

    /**
     * Register custom themes before editor mounts.
     */
    const handleEditorWillMount: BeforeMount = (monacoInstance) => {
        // Register DBLand dark theme
        monacoInstance.editor.defineTheme("dbland-dark", dblandDarkTheme)
        // Register DBLand light theme
        monacoInstance.editor.defineTheme("dbland-light", dblandLightTheme)
    }

    const handleEditorDidMount: OnMount = (editor) => {
        editorRef.current = editor

        // Register keyboard shortcuts
        editor.addCommand(
            // Cmd+Enter or Ctrl+Enter
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
            () => {
                if (onExecute) {
                    onExecute()
                }
            },
        )

        // Focus editor
        editor.focus()
    }

    const handleEditorChange = (newValue: string | undefined): void => {
        onChange(newValue ?? "")
    }

    // Get Monaco language based on query language
    const monacoLanguage = language === "mongodb" ? "json" : "plaintext"

    useEffect(() => {
        // Update editor read-only state when readOnly prop changes
        if (editorRef.current) {
            editorRef.current.updateOptions({ readOnly })
        }
    }, [readOnly])

    return (
        <div
            className="border border-border rounded-md overflow-hidden bg-background"
            data-monaco-editor
        >
            <Editor
                height={height}
                language={monacoLanguage}
                value={value}
                onChange={handleEditorChange}
                beforeMount={handleEditorWillMount}
                onMount={handleEditorDidMount}
                theme="dbland-dark"
                options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: "'Geist Mono', 'SF Mono', 'Fira Code', Consolas, monospace",
                    fontLigatures: true,
                    lineNumbers: "on",
                    wordWrap: "on",
                    scrollBeyondLastLine: false,
                    readOnly,
                    tabSize: 4,
                    insertSpaces: true,
                    automaticLayout: true,
                    padding: { top: 8, bottom: 8 },
                    lineHeight: 20,
                    letterSpacing: 0.5,
                    cursorBlinking: "smooth",
                    cursorSmoothCaretAnimation: "on",
                    smoothScrolling: true,
                    renderLineHighlight: "all",
                    renderWhitespace: "selection",
                    bracketPairColorization: {
                        enabled: true,
                    },
                    suggest: {
                        showKeywords: true,
                        showSnippets: true,
                    },
                    quickSuggestions: {
                        other: true,
                        comments: false,
                        strings: false,
                    },
                }}
            />
        </div>
    )
}
