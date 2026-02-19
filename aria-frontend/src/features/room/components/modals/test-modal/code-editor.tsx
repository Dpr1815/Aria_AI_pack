import { useRef, useCallback } from "react";
import MonacoEditor, { type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";

/* ─────────────────────────────────────────────
 * CodeEditor
 * ─────────────────────────────────────────────
 * Monaco editor wrapper themed to the Pack
 * design system. Registers a custom dark theme
 * on mount that uses the surface/text palette.
 *
 * Provides sensible defaults per language and
 * a loading state consistent with the app.
 * ───────────────────────────────────────────── */

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
}

/** Map display names (from BE) to Monaco language identifiers. */
const LANGUAGE_MAP: Record<string, string> = {
  typescript: "typescript",
  javascript: "javascript",
  python: "python",
  java: "java",
  cpp: "cpp",
  "c++": "cpp",
  csharp: "csharp",
  "c#": "csharp",
  go: "go",
  rust: "rust",
  ruby: "ruby",
  php: "php",
  kotlin: "kotlin",
  swift: "swift",
  scala: "scala",
  r: "r",
  sql: "sql",
  html: "html",
  css: "css",
};

/** Starter templates per language. */
const DEFAULT_CODE: Record<string, string> = {
  typescript: `function main(): void {\n  // Write your TypeScript code here\n  console.log("Hello, World!");\n}\n\nmain();`,
  javascript: `function main() {\n  // Write your JavaScript code here\n  console.log("Hello, World!");\n}\n\nmain();`,
  python: `def main():\n    # Write your Python code here\n    print("Hello, World!")\n\n\nif __name__ == "__main__":\n    main()`,
  java: `public class Main {\n    public static void main(String[] args) {\n        // Write your Java code here\n        System.out.println("Hello, World!");\n    }\n}`,
  cpp: `#include <iostream>\n\nint main() {\n    // Write your C++ code here\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}`,
  csharp: `using System;\n\nclass Program {\n    static void Main(string[] args) {\n        // Write your C# code here\n        Console.WriteLine("Hello, World!");\n    }\n}`,
  go: `package main\n\nimport "fmt"\n\nfunc main() {\n    // Write your Go code here\n    fmt.Println("Hello, World!")\n}`,
  rust: `fn main() {\n    // Write your Rust code here\n    println!("Hello, World!");\n}`,
  ruby: `def main\n  # Write your Ruby code here\n  puts "Hello, World!"\nend\n\nmain`,
  php: `<?php\nfunction main() {\n    // Write your PHP code here\n    echo "Hello, World!";\n}\n\nmain();\n?>`,
  kotlin: `fun main() {\n    // Write your Kotlin code here\n    println("Hello, World!")\n}`,
  swift: `func main() {\n    // Write your Swift code here\n    print("Hello, World!")\n}\n\nmain()`,
  scala: `object Main {\n    def main(args: Array[String]): Unit = {\n        // Write your Scala code here\n        println("Hello, World!")\n    }\n}`,
  r: `main <- function() {\n    # Write your R code here\n    print("Hello, World!")\n}\n\nmain()`,
  sql: `-- Write your SQL query here\nSELECT 1;`,
};

/** Custom dark theme matching the Pack palette. */
const PACK_THEME_NAME = "pack-dark";

function definePackTheme(monaco: Parameters<OnMount>[1]) {
  monaco.editor.defineTheme(PACK_THEME_NAME, {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6b6b85", fontStyle: "italic" },
      { token: "keyword", foreground: "f97316" },
      { token: "string", foreground: "4ade80" },
      { token: "number", foreground: "38bdf8" },
      { token: "type", foreground: "fb923c" },
      { token: "function", foreground: "60a5fa" },
      { token: "variable", foreground: "eeeef0" },
      { token: "operator", foreground: "a0a0b8" },
    ],
    colors: {
      "editor.background": "#333254",
      "editor.foreground": "#eeeef0",
      "editor.lineHighlightBackground": "#3c3b5e",
      "editor.selectionBackground": "#f9731640",
      "editor.inactiveSelectionBackground": "#f9731620",
      "editorCursor.foreground": "#f97316",
      "editorLineNumber.foreground": "#6b6b85",
      "editorLineNumber.activeForeground": "#a0a0b8",
      "editorIndentGuide.background": "#ffffff10",
      "editorIndentGuide.activeBackground": "#ffffff20",
      "editorWidget.background": "#464568",
      "editorWidget.border": "#ffffff20",
      "editorSuggestWidget.background": "#464568",
      "editorSuggestWidget.border": "#ffffff10",
      "editorSuggestWidget.selectedBackground": "#3c3b5e",
      "input.background": "#3c3b5e",
      "input.border": "#ffffff20",
      "input.foreground": "#eeeef0",
      "scrollbar.shadow": "#00000000",
      "scrollbarSlider.background": "#ffffff10",
      "scrollbarSlider.hoverBackground": "#ffffff20",
      "scrollbarSlider.activeBackground": "#ffffff30",
    },
  });
}

export function CodeEditor({ value, onChange, language }: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const monacoLang = resolveLanguage(language);
  const placeholder = DEFAULT_CODE[monacoLang] ?? "";

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    definePackTheme(monaco);
    monaco.editor.setTheme(PACK_THEME_NAME);
    editor.focus();
  }, []);

  const handleChange = useCallback(
    (val: string | undefined) => {
      onChange(val ?? "");
    },
    [onChange],
  );

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Language badge */}
      <div className="flex items-center border-b border-border bg-surface-overlay/60 px-4 py-2">
        <span className="rounded-button bg-primary-light px-2.5 py-1 font-mono text-xs font-medium text-primary">
          {language}
        </span>
      </div>

      {/* Editor */}
      <div className="min-h-0 flex-1">
        <MonacoEditor
          height="100%"
          language={monacoLang}
          theme={PACK_THEME_NAME}
          value={value || placeholder}
          onChange={handleChange}
          onMount={handleMount}
          loading={
            <div className="flex h-full items-center justify-center bg-surface">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          }
          options={{
            fontSize: 14,
            fontFamily: "var(--font-mono)",
            minimap: { enabled: false },
            automaticLayout: true,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            tabSize: 2,
            renderWhitespace: "selection",
            smoothScrolling: true,
            cursorSmoothCaretAnimation: "on",
            cursorBlinking: "smooth",
            bracketPairColorization: { enabled: true },
            padding: { top: 16, bottom: 16 },
            renderValidationDecorations: "off",
            renderControlCharacters: false,
          }}
        />
      </div>
    </div>
  );
}

/* ── Helpers ── */

function resolveLanguage(language: string): string {
  const normalized = language.toLowerCase().trim();
  return LANGUAGE_MAP[normalized] ?? normalized;
}
