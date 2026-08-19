"use client";

import { Check, Copy, ExternalLink, MousePointer2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export interface CodeLineExplanation {
  readonly line: number;
  readonly title: string;
  readonly detail: string;
  readonly effect?: string;
}

export type CodeDestination = "playground" | "low-level" | "compiler" | "memory" | "network" | "windows" | "graphics" | "security" | "game-security";

interface CodeBlockProps {
  readonly code: string;
  readonly language?: string | undefined;
  readonly filename?: string | undefined;
  readonly highlightedLines?: readonly number[] | undefined;
  readonly lineExplanations?: readonly CodeLineExplanation[] | undefined;
  readonly openIn?: CodeDestination | undefined;
  readonly actionLabel?: string | undefined;
}

const KEYWORDS = new Set([
  "int", "char", "void", "return", "const", "sizeof", "struct", "if", "else", "for", "while", "NULL"
]);

function tokenize(line: string) {
  return line.split(/(\s+|\b|(?=[*&=;()[\]{}])|(?<=[*&=;()[\]{}]))/).map((token, index) => {
    let className = "";
    if (KEYWORDS.has(token)) className = "token-keyword";
    else if (/^\d+$/.test(token)) className = "token-number";
    else if (/^\/\//.test(token)) className = "token-comment";
    else if (/^".*"$/.test(token)) className = "token-string";
    return <span className={className} key={`${token}-${index}`}>{token}</span>;
  });
}

const destinationByKind: Readonly<Record<CodeDestination, string>> = {
  playground: "/playground?source=lesson",
  "low-level": "/labs/low-level?source=lesson",
  compiler: "/labs/compiler?source=lesson",
  memory: "/labs/memory?source=lesson",
  network: "/labs/network?source=lesson",
  windows: "/labs/windows?source=lesson",
  graphics: "/labs/graphics?source=lesson",
  security: "/labs/security?source=lesson",
  "game-security": "/labs/game-security?source=lesson"
};

export function CodeBlock({
  code,
  language = "c",
  filename,
  highlightedLines = [],
  lineExplanations = [],
  openIn,
  actionLabel
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [selectedLine, setSelectedLine] = useState(lineExplanations[0]?.line ?? null);
  const router = useRouter();
  const lines = code.trim().split("\n");
  const explanations = useMemo(
    () => new Map(lineExplanations.map((explanation) => [explanation.line, explanation])),
    [lineExplanations]
  );
  const selectedExplanation = selectedLine === null ? undefined : explanations.get(selectedLine);

  async function copyCode() {
    await navigator.clipboard.writeText(code.trim());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }

  function openCode() {
    if (!openIn) return;
    if (openIn === "playground" || openIn === "low-level" || openIn === "compiler") {
      window.sessionStorage.setItem("0xlab.code-import", JSON.stringify({
        source: code.trim(),
        filename: filename ?? `lesson.${language}`,
        language: language === "cpp" || /\.(cpp|cc|cxx)$/i.test(filename ?? "") ? "cpp" : language === "asm" ? "asm" : "c",
        destination: openIn
      }));
    }
    router.push(destinationByKind[openIn]);
  }

  return (
    <figure className="code-block">
      <figcaption className="code-block-header">
        <span className="code-file"><span className="file-c">{language.toUpperCase().slice(0, 5)}</span>{filename ?? `snippet.${language}`}</span>
        <span className="code-block-actions">
          {openIn ? (
            <button className="code-open" type="button" onClick={openCode}>
              <ExternalLink size={11} />{actionLabel ?? (openIn === "playground" ? "Open in Playground" : "Open in Lab")}
            </button>
          ) : null}
          <button className="code-copy" type="button" onClick={copyCode} aria-label="Copiar código">
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "copiado" : "copiar"}
          </button>
        </span>
      </figcaption>
      <pre className="code-lines" aria-label={`Código ${language}`} data-explainable={lineExplanations.length > 0}>
        {lines.map((line, index) => (
          <code
            className="code-line"
            data-highlighted={highlightedLines.includes(index + 1)}
            data-explained={selectedLine === index + 1}
            data-selectable={explanations.has(index + 1)}
            key={`${index}-${line}`}
            onClick={explanations.has(index + 1) ? () => setSelectedLine(index + 1) : undefined}
            onKeyDown={explanations.has(index + 1) ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setSelectedLine(index + 1);
              }
            } : undefined}
            role={explanations.has(index + 1) ? "button" : undefined}
            tabIndex={explanations.has(index + 1) ? 0 : undefined}
          >
            <span className="line-number">{String(index + 1).padStart(2, "0")}</span>
            <span className="line-content">{tokenize(line)}</span>
          </code>
        ))}
      </pre>
      {selectedExplanation ? (
        <figcaption className="code-line-explanation" aria-live="polite">
          <MousePointer2 size={13} />
          <span className="explained-line">L{String(selectedExplanation.line).padStart(2, "0")}</span>
          <div>
            <strong>{selectedExplanation.title}</strong>
            <p>{selectedExplanation.detail}</p>
            {selectedExplanation.effect ? <small><b>Estado após a linha</b>{selectedExplanation.effect}</small> : null}
          </div>
        </figcaption>
      ) : null}
    </figure>
  );
}
