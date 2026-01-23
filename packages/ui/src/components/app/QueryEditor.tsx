import { Editor, type OnMount } from "@monaco-editor/react"
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
 * Query editor component with Monaco Editor integration.
 * Supports MongoDB (JSON-like) and Redis (CLI) syntax highlighting.
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
        <div className="border rounded-md overflow-hidden">
            <Editor
                height={height}
                language={monacoLanguage}
                value={value}
                onChange={handleEditorChange}
                onMount={handleEditorDidMount}
                theme="vs-dark"
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: "on",
                    wordWrap: "on",
                    scrollBeyondLastLine: false,
                    readOnly,
                    tabSize: 4,
                    insertSpaces: true,
                    automaticLayout: true,
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
