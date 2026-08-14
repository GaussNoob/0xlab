"use client";

import type { CompilerDiagnostic } from "@0xlab/contracts";
import Editor, { type BeforeMount, type Monaco, type OnMount } from "@monaco-editor/react";
import { useCallback, useEffect, useRef } from "react";
import type { editor as MonacoEditor } from "monaco-editor";
import { installCCppIntelliSense } from "@/components/playground/c-cpp-intellisense";
import type { LabFile } from "./types";

interface LabEditorProps {
  readonly file: LabFile;
  readonly diagnostics: readonly CompilerDiagnostic[];
  readonly breakpoints: readonly number[];
  readonly highlightedLine?: number | undefined;
  readonly fontSize: number;
  readonly onChange: (content: string) => void;
  readonly onToggleBreakpoint: (line: number) => void;
  readonly onRun: () => void;
}

function languageFor(file: LabFile): string {
  if (file.language === "cpp") return "cpp";
  if (file.language === "asm") return "0xlab-asm";
  return "c";
}

export function LabEditor({ file, diagnostics, breakpoints, highlightedLine, fontSize, onChange, onToggleBreakpoint, onRun }: LabEditorProps) {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationRef = useRef<MonacoEditor.IEditorDecorationsCollection | null>(null);
  const toggleRef = useRef(onToggleBreakpoint);
  const runRef = useRef(onRun);
  toggleRef.current = onToggleBreakpoint;
  runRef.current = onRun;

  const beforeMount: BeforeMount = useCallback((monaco) => {
    installCCppIntelliSense(monaco);
    if (!monaco.languages.getLanguages().some((language) => language.id === "0xlab-asm")) {
      monaco.languages.register({ id: "0xlab-asm", aliases: ["Assembly", "asm"], extensions: [".asm", ".s"] });
      monaco.languages.setMonarchTokensProvider("0xlab-asm", {
        ignoreCase: true,
        tokenizer: {
          root: [
            [/;.*$/, "comment"],
            [/^\s*[A-Za-z_.$][\w.$]*:/, "type.identifier"],
            [/\b(?:mov|lea|push|pop|add|sub|imul|idiv|xor|and|or|cmp|test|inc|dec|call|ret|jmp|je|jne|jz|jnz|jg|jl|nop|syscall)\b/, "keyword"],
            [/\b(?:rax|rbx|rcx|rdx|rsi|rdi|rsp|rbp|r8|r9|r10|r11|r12|r13|r14|r15|eax|ebx|ecx|edx|esi|edi|esp|ebp)\b/, "variable.predefined"],
            [/\b0x[\da-f]+\b|\b\d+\b/, "number"],
            [/[\[\]]/, "delimiter.square"]
          ]
        }
      });
      monaco.languages.setLanguageConfiguration("0xlab-asm", {
        comments: { lineComment: ";" },
        brackets: [["[", "]"], ["(", ")"]],
        autoClosingPairs: [{ open: "[", close: "]" }, { open: "(", close: ")" }]
      });
    }
    monaco.editor.defineTheme("0xlab-low-level", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "55616D", fontStyle: "italic" },
        { token: "keyword", foreground: "C4A7E7" },
        { token: "number", foreground: "E8B86D" },
        { token: "string", foreground: "87D190" },
        { token: "type", foreground: "67C7F3" },
        { token: "variable.predefined", foreground: "71E6C1" }
      ],
      colors: {
        "editor.background": "#090c10",
        "editor.foreground": "#cbd3dc",
        "editorLineNumber.foreground": "#3f4954",
        "editorLineNumber.activeForeground": "#91a0ad",
        "editorCursor.foreground": "#71e6c1",
        "editor.selectionBackground": "#244c4266",
        "editor.lineHighlightBackground": "#ffffff07",
        "editorGutter.background": "#090c10",
        "editorBracketMatch.background": "#71e6c122",
        "editorBracketMatch.border": "#71e6c155",
        "minimap.background": "#090c10",
        "scrollbarSlider.background": "#34414e55",
        "scrollbarSlider.hoverBackground": "#44546488"
      }
    });
  }, []);

  const onMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    decorationRef.current = editor.createDecorationsCollection();
    editor.onMouseDown((event) => {
      if (event.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN && event.target.position) {
        toggleRef.current(event.target.position.lineNumber);
      }
    });
    editor.addAction({
      id: "0xlab.low-level.run",
      label: "0xLAB: Build / run current experiment",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: () => runRef.current()
    });
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !decorationRef.current) return;
    const decorations: MonacoEditor.IModelDeltaDecoration[] = [
      ...breakpoints.map((line) => ({
        range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
        options: { isWholeLine: false, glyphMarginClassName: "ll-breakpoint-glyph", glyphMarginHoverMessage: { value: `Breakpoint · ${file.name}:${line}` } }
      })),
      ...(highlightedLine ? [{
        range: { startLineNumber: highlightedLine, startColumn: 1, endLineNumber: highlightedLine, endColumn: 1 },
        options: { isWholeLine: true, className: "ll-execution-line", glyphMarginClassName: "ll-instruction-glyph" }
      }] : [])
    ];
    decorationRef.current.set(decorations);
    if (highlightedLine) editor.revealLineInCenterIfOutsideViewport(highlightedLine);
  }, [breakpoints, file.name, highlightedLine]);

  useEffect(() => {
    const monaco = monacoRef.current;
    const model = editorRef.current?.getModel();
    if (!monaco || !model) return;
    monaco.editor.setModelMarkers(model, "0xlab-native-compiler", diagnostics
      .filter((diagnostic) => !diagnostic.file || diagnostic.file === file.name)
      .map((diagnostic) => ({
        severity: diagnostic.severity === "error" ? monaco.MarkerSeverity.Error : diagnostic.severity === "warning" ? monaco.MarkerSeverity.Warning : monaco.MarkerSeverity.Info,
        message: diagnostic.message,
        startLineNumber: diagnostic.line ?? 1,
        startColumn: diagnostic.column ?? 1,
        endLineNumber: diagnostic.line ?? 1,
        endColumn: (diagnostic.column ?? 1) + 1
      })));
  }, [diagnostics, file.name]);

  return (
    <Editor
      beforeMount={beforeMount}
      onMount={onMount}
      path={`file:///${file.name}`}
      language={languageFor(file)}
      value={file.content}
      onChange={(value) => onChange(value ?? "")}
      theme="0xlab-low-level"
      options={{
        automaticLayout: true,
        bracketPairColorization: { enabled: true },
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        fontFamily: "'JetBrains Mono', 'Cascadia Code', Consolas, monospace",
        fontLigatures: true,
        fontSize,
        glyphMargin: true,
        lineHeight: Math.round(fontSize * 1.58),
        minimap: { enabled: true, renderCharacters: false, maxColumn: 72, scale: 0.75 },
        mouseWheelZoom: true,
        multiCursorModifier: "alt",
        padding: { top: 8, bottom: 8 },
        renderWhitespace: "selection",
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        suggest: { showWords: true },
        tabSize: 4,
        wordWrap: "off"
      }}
    />
  );
}
