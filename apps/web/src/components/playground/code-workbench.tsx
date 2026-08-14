"use client";

import Editor, { type BeforeMount, type Monaco, type OnMount } from "@monaco-editor/react";
import type { CompilerDiagnostic, CreateExecutionResponse, ExecutionJob, ExecutionResult, Language } from "@0xlab/contracts";
import {
  AlertTriangle,
  Braces,
  Check,
  ChevronDown,
  CircleStop,
  Clock3,
  Copy,
  FileCode2,
  FilePlus2,
  FolderOpen,
  Gauge,
  LoaderCircle,
  Minus,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Trash2,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { editor as MonacoEditor } from "monaco-editor";
import { installCCppIntelliSense } from "@/components/playground/c-cpp-intellisense";

interface WorkspaceFile {
  readonly id: string;
  readonly name: string;
  readonly content: string;
}

interface ImportedLessonCode {
  readonly source?: unknown;
  readonly filename?: unknown;
  readonly language?: unknown;
  readonly destination?: unknown;
}

const C_TEMPLATE = `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int numbers[5] = { 2, 4, 8, 16, 32 };
    int *cursor = numbers;

    for (size_t i = 0; i < 5; ++i) {
        printf("numbers[%zu] @ %p = %d\\n",
               i, (void *)(cursor + i), *(cursor + i));
    }

    return EXIT_SUCCESS;
}`;

const CPP_TEMPLATE = `#include <iostream>
#include <memory>
#include <vector>

int main() {
    auto values = std::make_unique<std::vector<int>>(
        std::initializer_list<int>{2, 4, 8, 16, 32}
    );

    for (const int value : *values) {
        std::cout << value << '\\n';
    }
}`;

const FLAG_GROUPS = [
  ["-Wall", "-Wextra", "-Wpedantic"],
  ["-g", "-O0", "-O2"],
  ["-fsanitize=address", "-fsanitize=undefined"]
] as const;

type OutputTab = "terminal" | "problems" | "analysis";
type TargetPlatform = "linux" | "windows";

export function CodeWorkbench() {
  const [language, setLanguage] = useState<Language>("c");
  const [target, setTarget] = useState<TargetPlatform>("linux");
  const [compiler, setCompiler] = useState("gcc");
  const [flags, setFlags] = useState<string[]>(["-Wall", "-Wextra", "-Wpedantic", "-g", "-O0", "-std=c17"]);
  const [files, setFiles] = useState<WorkspaceFile[]>([{ id: "main", name: "main.c", content: C_TEMPLATE }]);
  const [activeFileId, setActiveFileId] = useState("main");
  const [outputTab, setOutputTab] = useState<OutputTab>("terminal");
  const [job, setJob] = useState<ExecutionJob | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editorFontSize, setEditorFontSize] = useState(16);
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const activeFile = files.find((file) => file.id === activeFileId) ?? files[0];
  const result = job?.result;
  const diagnostics = result?.diagnostics ?? [];

  const defineTheme: BeforeMount = useCallback((monaco) => {
    monaco.editor.defineTheme("0xlab-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "56616C", fontStyle: "italic" },
        { token: "keyword", foreground: "B6A0F8" },
        { token: "number", foreground: "E9B96E" },
        { token: "string", foreground: "89D185" },
        { token: "type", foreground: "67C7F3" }
      ],
      colors: {
        "editor.background": "#090C10",
        "editor.foreground": "#C7CFD8",
        "editorLineNumber.foreground": "#3F4852",
        "editorLineNumber.activeForeground": "#8A949F",
        "editorCursor.foreground": "#71E6C1",
        "editor.selectionBackground": "#23483E66",
        "editor.lineHighlightBackground": "#FFFFFF08",
        "editorIndentGuide.background1": "#1B222B",
        "editorIndentGuide.activeBackground1": "#303A45",
        "editorError.foreground": "#F27B7B",
        "editorWarning.foreground": "#E9B96E",
        "editorGutter.background": "#090C10",
        "minimap.background": "#090C10",
        "editorSuggestWidget.background": "#111820",
        "editorSuggestWidget.border": "#34414E",
        "editorSuggestWidget.foreground": "#D8E1EA",
        "editorSuggestWidget.focusHighlightForeground": "#71E6C1",
        "editorSuggestWidget.highlightForeground": "#67C7F3",
        "editorSuggestWidget.selectedBackground": "#20362F",
        "editorHoverWidget.background": "#111820",
        "editorHoverWidget.border": "#34414E",
        "editorWidget.background": "#111820",
        "editorWidget.border": "#34414E"
      }
    });
  }, []);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    installCCppIntelliSense(monaco);
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.addAction({
      id: "0xlab.run",
      label: "0xLAB: Compile and run",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: () => { document.getElementById("run-code")?.click(); }
    });
    editor.focus();
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor?.getModel();
    if (!editor || !monaco || !model) return;
    const markers = diagnostics
      .filter((diagnostic) => !diagnostic.file || diagnostic.file === activeFile?.name)
      .map((diagnostic) => ({
        severity: diagnostic.severity === "error" ? monaco.MarkerSeverity.Error : diagnostic.severity === "warning" ? monaco.MarkerSeverity.Warning : monaco.MarkerSeverity.Info,
        message: diagnostic.message,
        startLineNumber: diagnostic.line ?? 1,
        startColumn: diagnostic.column ?? 1,
        endLineNumber: diagnostic.line ?? 1,
        endColumn: (diagnostic.column ?? 1) + 1
      }));
    monaco.editor.setModelMarkers(model, "0xlab-compiler", markers);
  }, [activeFile?.name, diagnostics]);

  useEffect(() => {
    const saved = Number.parseInt(window.localStorage.getItem("0xlab.editor-font-size") ?? "", 10);
    if (Number.isFinite(saved) && saved >= 14 && saved <= 24) setEditorFontSize(saved);
  }, []);

  useEffect(() => {
    const serialized = window.sessionStorage.getItem("0xlab.code-import");
    if (!serialized) return;
    try {
      const imported = JSON.parse(serialized) as ImportedLessonCode;
      if (imported.destination !== "playground" || typeof imported.source !== "string") return;
      const importedLanguage: Language = imported.language === "cpp" ? "cpp" : "c";
      const fallbackName = importedLanguage === "cpp" ? "lesson.cpp" : "lesson.c";
      const importedName = typeof imported.filename === "string" && /\.(c|cc|cpp|cxx)$/i.test(imported.filename)
        ? imported.filename.replace(/[^a-zA-Z0-9._-]/g, "_")
        : fallbackName;
      setLanguage(importedLanguage);
      setCompiler(importedLanguage === "c" ? "gcc" : "g++");
      setFlags(importedLanguage === "c"
        ? ["-Wall", "-Wextra", "-Wpedantic", "-g", "-O0", "-std=c17"]
        : ["-Wall", "-Wextra", "-Wpedantic", "-g", "-O0", "-std=c++23"]);
      setFiles([{ id: "lesson-import", name: importedName, content: imported.source }]);
      setActiveFileId("lesson-import");
      setJob(null);
      setRequestError(null);
    } catch {
      // A malformed handoff should never prevent the playground from opening.
    } finally {
      window.sessionStorage.removeItem("0xlab.code-import");
    }
  }, []);

  function changeEditorFontSize(delta: number) {
    setEditorFontSize((current) => {
      const next = Math.max(14, Math.min(24, current + delta));
      window.localStorage.setItem("0xlab.editor-font-size", String(next));
      return next;
    });
    editorRef.current?.focus();
  }

  function resetEditorFontSize() {
    setEditorFontSize(16);
    window.localStorage.setItem("0xlab.editor-font-size", "16");
    editorRef.current?.focus();
  }

  function showEditorSuggestions() {
    editorRef.current?.focus();
    editorRef.current?.trigger("0xlab", "editor.action.triggerSuggest", {});
  }

  function updateActiveFile(content = "") {
    setFiles((current) => current.map((file) => file.id === activeFileId ? { ...file, content } : file));
  }

  function changeLanguage(nextLanguage: Language) {
    if (nextLanguage === language) return;
    setLanguage(nextLanguage);
    setCompiler(nextLanguage === "c" ? "gcc" : "g++");
    setFlags(nextLanguage === "c"
      ? ["-Wall", "-Wextra", "-Wpedantic", "-g", "-O0", "-std=c17"]
      : ["-Wall", "-Wextra", "-Wpedantic", "-g", "-O0", "-std=c++23"]);
    setFiles([{ id: "main", name: nextLanguage === "c" ? "main.c" : "main.cpp", content: nextLanguage === "c" ? C_TEMPLATE : CPP_TEMPLATE }]);
    setActiveFileId("main");
    setJob(null);
    setRequestError(null);
  }

  function addFile() {
    const extension = language === "c" ? "c" : "cpp";
    const index = files.length + 1;
    const file: WorkspaceFile = { id: crypto.randomUUID(), name: `module_${index}.${extension}`, content: "" };
    setFiles((current) => [...current, file]);
    setActiveFileId(file.id);
  }

  function removeFile(id: string) {
    if (files.length === 1) return;
    const remaining = files.filter((file) => file.id !== id);
    setFiles(remaining);
    if (activeFileId === id) setActiveFileId(remaining[0]?.id ?? "main");
  }

  function toggleFlag(flag: string) {
    const exclusiveGroups = [
      ["-O0", "-O1", "-O2"],
      ["-std=c17", "-std=c23"],
      ["-std=c++17", "-std=c++20", "-std=c++23"]
    ];
    setFlags((current) => {
      if (current.includes(flag)) return current.filter((item) => item !== flag);
      const exclusive = exclusiveGroups.find((group) => group.includes(flag));
      const withoutConflict = exclusive ? current.filter((item) => !exclusive.includes(item)) : current;
      return [...withoutConflict, flag];
    });
  }

  async function runCode() {
    if (target === "windows" || isRunning) return;
    setIsRunning(true);
    setRequestError(null);
    setJob(null);
    setOutputTab("terminal");
    try {
      const response = await fetch("/api/executions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          language,
          compiler,
          target: "linux",
          files: files.map(({ name, content }) => ({ name, content })),
          flags,
          stdin: ""
        })
      });
      const created = await response.json() as CreateExecutionResponse | { error?: string };
      if (!response.ok || !("jobId" in created)) throw new Error("error" in created ? created.error : "Execution could not be created.");

      for (let attempt = 0; attempt < 90; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 350));
        const pollResponse = await fetch(`/api/executions/${created.jobId}`, { cache: "no-store" });
        const nextJob = await pollResponse.json() as ExecutionJob | { error?: string };
        if (!pollResponse.ok || !("status" in nextJob)) throw new Error("error" in nextJob ? nextJob.error : "Execution status unavailable.");
        setJob(nextJob);
        if (nextJob.status === "completed" || nextJob.status === "failed") {
          if (nextJob.result?.diagnostics.length) setOutputTab("problems");
          else if (nextJob.result?.analysis.category !== "success") setOutputTab("analysis");
          return;
        }
      }
      throw new Error("Execution status timed out.");
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Unable to execute code.");
    } finally {
      setIsRunning(false);
    }
  }

  const activeModelPath = activeFile ? `file:///${activeFile.name}` : "file:///main.c";

  return (
    <div className="ide-shell">
      <header className="ide-toolbar">
        <div className="segmented-control" aria-label="Linguagem">
          <button type="button" data-active={language === "c"} onClick={() => changeLanguage("c")}>C</button>
          <button type="button" data-active={language === "cpp"} onClick={() => changeLanguage("cpp")}>C++</button>
        </div>
        <div className="toolbar-divider" />
        <label className="toolbar-select"><span className="sr-only">Compilador</span>
          <select value={compiler} onChange={(event) => setCompiler(event.target.value)}>
            {(language === "c" ? ["gcc", "clang"] : ["g++", "clang++"]).map((item) => <option key={item}>{item}</option>)}
          </select><ChevronDown size={11} />
        </label>
        <div className="segmented-control target-control" aria-label="Ambiente">
          <button type="button" data-active={target === "linux"} onClick={() => setTarget("linux")}>Linux</button>
          <button type="button" data-active={target === "windows"} onClick={() => setTarget("windows")}>Windows</button>
        </div>
        <button className="flags-trigger" type="button" data-active={showSettings} onClick={() => setShowSettings((value) => !value)}>
          <Settings2 size={13} /> Flags <span>{flags.length}</span>
        </button>
        <span className="toolbar-spacer" />
        <span className="sandbox-indicator"><ShieldCheck size={12} /> ephemeral · net off</span>
        <button className="run-button" id="run-code" type="button" onClick={runCode} disabled={isRunning || target === "windows"}>
          {isRunning ? <LoaderCircle className="spin" size={13} /> : <Play size={12} fill="currentColor" />}
          {isRunning ? (job?.status === "queued" ? "Na fila" : "Executando") : "Compilar e executar"}
          <kbd>Ctrl ↵</kbd>
        </button>
      </header>

      {showSettings ? (
        <div className="flags-panel">
          <span>Compiler flags</span>
          <div className="flag-groups">
            {FLAG_GROUPS.map((group, index) => (
              <div className="flag-group" key={index}>
                {group.map((flag) => (
                  <button type="button" data-active={flags.includes(flag)} onClick={() => toggleFlag(flag)} key={flag}>
                    {flags.includes(flag) ? <Check size={9} /> : <Plus size={9} />}{flag}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <code>{compiler} {flags.join(" ")} [sources] -o program</code>
        </div>
      ) : null}

      {target === "windows" ? (
        <div className="target-notice"><AlertTriangle size={13} /><span>O conteúdo Win32 está disponível para comparação, mas execução nativa requer um worker Windows isolado. Nenhuma compatibilidade é simulada.</span></div>
      ) : null}

      <div className="ide-body">
        <aside className="file-explorer">
          <header><span>Workspace</span><button type="button" onClick={addFile} title="Novo arquivo"><FilePlus2 size={12} /></button></header>
          <div className="explorer-folder"><ChevronDown size={10} /><FolderOpen size={12} /><span>pointer-lab</span></div>
          <div className="explorer-files">
            {files.map((file) => (
              <button type="button" data-active={activeFileId === file.id} onClick={() => setActiveFileId(file.id)} key={file.id}>
                <FileCode2 size={12} /><span>{file.name}</span>
                {files.length > 1 ? <X className="file-remove" size={10} onClick={(event) => { event.stopPropagation(); removeFile(file.id); }} /> : null}
              </button>
            ))}
          </div>
          <div className="explorer-outline"><span>Outline</span><small>main() <b>fn</b></small></div>
        </aside>

        <section className="editor-stack">
          <div className="editor-tabs">
            {files.map((file) => (
              <button type="button" data-active={activeFileId === file.id} onClick={() => setActiveFileId(file.id)} key={file.id}>
                <span className="file-language">{language === "c" ? "C" : "C+"}</span>{file.name}
                {file.content !== (language === "c" ? C_TEMPLATE : CPP_TEMPLATE) ? <i /> : null}
              </button>
            ))}
            <span className="editor-tabs-spacer" />
            <div className="editor-assistance" aria-label="Ferramentas do editor">
              <button className="intellisense-indicator" type="button" onClick={showEditorSuggestions} aria-label={`Mostrar sugestões do IntelliSense ${language === "c" ? "C" : "C++"}`}><Sparkles size={11} /> IntelliSense {language === "c" ? "C17/C23" : "C++17–23"}<kbd>Ctrl Space</kbd></button>
              <div className="editor-font-control" aria-label="Tamanho da fonte do código">
                <button id="editor-font-decrease" type="button" onClick={() => changeEditorFontSize(-1)} disabled={editorFontSize <= 14} aria-label="Diminuir fonte do editor"><Minus size={12} /></button>
                <button type="button" onClick={resetEditorFontSize} title="Restaurar para 16 px" aria-label={`Fonte do editor: ${editorFontSize} pixels. Restaurar para 16`}>{editorFontSize}px</button>
                <button id="editor-font-increase" type="button" onClick={() => changeEditorFontSize(1)} disabled={editorFontSize >= 24} aria-label="Aumentar fonte do editor"><Plus size={12} /></button>
              </div>
            </div>
          </div>
          <div className="monaco-wrap">
            <Editor
              beforeMount={defineTheme}
              onMount={handleMount}
              height="100%"
              language={language === "c" ? "c" : "cpp"}
              path={activeModelPath}
              theme="0xlab-dark"
              value={activeFile?.content ?? ""}
              onChange={(value) => updateActiveFile(value ?? "")}
              options={{
                automaticLayout: true,
                bracketPairColorization: { enabled: true },
                fontFamily: "JetBrains Mono, Cascadia Code, Consolas, monospace",
                fontSize: editorFontSize,
                fontLigatures: true,
                fontWeight: "450",
                letterSpacing: .15,
                lineHeight: Math.round(editorFontSize * 1.62),
                minimap: { enabled: true, renderCharacters: false, maxColumn: 100, scale: 1 },
                padding: { top: 17, bottom: 17 },
                renderLineHighlight: "all",
                smoothScrolling: true,
                tabSize: 4,
                wordWrap: "off",
                glyphMargin: true,
                folding: true,
                stickyScroll: { enabled: true, maxLineCount: 4 },
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on",
                cursorWidth: 2,
                mouseWheelZoom: true,
                quickSuggestions: { other: "on", comments: "off", strings: "off" },
                suggestOnTriggerCharacters: true,
                acceptSuggestionOnEnter: "smart",
                tabCompletion: "on",
                snippetSuggestions: "top",
                suggestSelection: "first",
                wordBasedSuggestions: "currentDocument",
                parameterHints: { enabled: true, cycle: true },
                suggest: { preview: true, showKeywords: true, showSnippets: true, showFunctions: true, showStructs: true },
                scrollBeyondLastLine: false
              }}
            />
          </div>
        </section>
      </div>

      <OutputPanel
        diagnostics={diagnostics}
        error={requestError}
        isRunning={isRunning}
        job={job}
        result={result}
        tab={outputTab}
        onTab={setOutputTab}
        onClear={() => { setJob(null); setRequestError(null); }}
      />
    </div>
  );
}

interface OutputPanelProps {
  readonly diagnostics: readonly CompilerDiagnostic[];
  readonly error: string | null;
  readonly isRunning: boolean;
  readonly job: ExecutionJob | null;
  readonly result: ExecutionResult | undefined;
  readonly tab: OutputTab;
  readonly onTab: (tab: OutputTab) => void;
  readonly onClear: () => void;
}

function OutputPanel({ diagnostics, error, isRunning, job, result, tab, onTab, onClear }: OutputPanelProps) {
  const terminalText = useMemo(() => {
    if (error) return `0xlab: ${error}\n\nO código não foi executado.`;
    if (isRunning) return `$ job ${job?.id?.slice(0, 8) ?? "pending"}\n${job?.status ?? "Enviando ao runner isolado…"}`;
    if (!result) return "$ pronto — Ctrl+Enter compila e executa no sandbox real\n$ rede desativada · filesystem efêmero · timeout 15s";
    const sections = [
      result.compileStdout,
      result.compileStderr,
      result.stdout,
      result.stderr
    ].filter(Boolean);
    return sections.join("\n") || "[program produced no output]";
  }, [error, isRunning, job, result]);

  return (
    <section className="output-panel" id="diagnostics">
      <header className="output-tabs">
        <button type="button" data-active={tab === "terminal"} onClick={() => onTab("terminal")}><TerminalSquare size={11} />Terminal</button>
        <button type="button" data-active={tab === "problems"} onClick={() => onTab("problems")}><AlertTriangle size={11} />Problems <span>{diagnostics.length}</span></button>
        <button type="button" data-active={tab === "analysis"} onClick={() => onTab("analysis")}><Gauge size={11} />Análise</button>
        <span className="output-spacer" />
        {result ? <span className="execution-metrics"><Clock3 size={10} />{result.durationMs} ms · exit {result.runExitCode ?? result.compileExitCode}</span> : null}
        <button className="output-icon" type="button" onClick={onClear} title="Limpar"><Trash2 size={11} /></button>
      </header>
      <div className="output-body">
        {tab === "terminal" ? <pre className={error ? "terminal-error" : ""}><code>{terminalText}</code></pre> : null}
        {tab === "problems" ? (
          diagnostics.length ? <div className="problems-list">{diagnostics.map((diagnostic, index) => <DiagnosticRow diagnostic={diagnostic} key={`${diagnostic.message}-${index}`} />)}</div>
            : <div className="output-empty"><Check size={14} />Nenhum diagnóstico do compilador.</div>
        ) : null}
        {tab === "analysis" ? (
          result ? <AnalysisView result={result} /> : <div className="output-empty"><Gauge size={14} />Execute o programa para gerar uma análise baseada em evidências.</div>
        ) : null}
      </div>
      <footer className="output-status">
        <span data-state={result?.analysis.category ?? (error ? "error" : "idle")}><i />{result ? result.analysis.headline : error ? "runner unavailable" : "ready"}</span>
        <span>{result?.truncated ? "output truncated · " : ""}UTF-8</span>
      </footer>
    </section>
  );
}

function DiagnosticRow({ diagnostic }: { diagnostic: CompilerDiagnostic }) {
  return (
    <div className="diagnostic-row" data-severity={diagnostic.severity}>
      <AlertTriangle size={12} /><span>{diagnostic.message}</span>
      <code>{diagnostic.file ?? "source"}:{diagnostic.line ?? 1}:{diagnostic.column ?? 1}</code>
    </div>
  );
}

function AnalysisView({ result }: { result: ExecutionResult }) {
  return (
    <div className="analysis-view" data-category={result.analysis.category}>
      <div className="analysis-headline">
        {result.analysis.category === "success" ? <Check size={18} /> : <AlertTriangle size={18} />}
        <div><strong>{result.analysis.headline}</strong><p>{result.analysis.summary}</p></div>
      </div>
      <div className="analysis-facts">
        <span>compile<strong>{result.compileExitCode === 0 ? "ok" : `exit ${result.compileExitCode}`}</strong></span>
        <span>program<strong>{result.runExitCode === null ? "not run" : `exit ${result.runExitCode}`}</strong></span>
        <span>runtime<strong>{result.durationMs} ms</strong></span>
        <span>timeout<strong>{result.timedOut ? "yes" : "no"}</strong></span>
      </div>
      <ul>{result.analysis.suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}</ul>
    </div>
  );
}
