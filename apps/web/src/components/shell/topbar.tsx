"use client";

import { Bell, Command, Search, Type } from "lucide-react";
import { usePathname } from "next/navigation";

const contextByPath: Record<string, string> = {
  "/": "workbench / resume",
  "/learn": "learn / curriculum",
  "/learn/c/pointers": "c-core / pointers / address-and-indirection",
  "/learn/c/c-pointers/pointers": "c / pointers / modelo-de-memória",
  "/playground": "playground / main.c",
  "/labs/memory": "labs / memory-visualizer",
  "/labs/network": "labs / network-visualizer",
  "/labs/low-level": "labs / low-level / untitled-experiment",
  "/projects": "projects / catalog",
  "/progress": "progress / overview"
};

interface TopbarProps {
  readonly onOpenCommand: () => void;
  readonly onCycleTextScale: () => void;
  readonly textScale: "comfortable" | "large" | "extra-large";
}

export function Topbar({ onOpenCommand, onCycleTextScale, textScale }: TopbarProps) {
  const pathname = usePathname();
  const context = contextByPath[pathname] ?? "workspace";

  return (
    <header className="topbar">
      <LinkBrand />
      <div className="topbar-context" aria-label="Contexto atual">
        <span>~/</span>
        <strong>{context}</strong>
      </div>
      <div className="topbar-actions">
        <button className="text-scale-trigger" type="button" onClick={onCycleTextScale} aria-label={`Escala de texto: ${textScale}. Alternar tamanho`} title="Alternar escala de texto">
          <Type size={14} /><span>{textScale === "comfortable" ? "100%" : textScale === "large" ? "+2" : "+4"}</span>
        </button>
        <button className="command-trigger" type="button" onClick={onOpenCommand}>
          <Search size={13} />
          <span>Ir para arquivo, módulo ou ferramenta</span>
          <kbd className="keycap">Ctrl K</kbd>
        </button>
        <button className="icon-button" type="button" aria-label="Notificações">
          <Bell size={15} strokeWidth={1.6} />
        </button>
      </div>
    </header>
  );
}

function LinkBrand() {
  return (
    <a className="topbar-brand" href="/" aria-label="0xLAB, início">
      <span className="brand-mark">0x</span>
      <span className="brand-copy">LAB</span>
      <span className="brand-channel">// systems</span>
      <Command className="sr-only" />
    </a>
  );
}
