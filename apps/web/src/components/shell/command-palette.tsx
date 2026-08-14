"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { commandItems } from "./navigation";

interface CommandPaletteProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return commandItems;
    return commandItems.filter((item) => `${item.label} ${item.group}`.toLowerCase().includes(normalized));
  }, [query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="command-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Paleta de comandos"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="command-input-wrap">
          <Search size={16} color="var(--text-tertiary)" />
          <input
            className="command-input"
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Digite um módulo, ferramenta ou ação…"
          />
          <kbd className="keycap">ESC</kbd>
        </div>
        <div className="command-results">
          <div className="command-section-label">Resultados</div>
          {filtered.map(({ label, href, icon: Icon, group }) => (
            <Link className="command-result" href={href} key={`${group}-${label}`} onClick={onClose}>
              <Icon size={15} strokeWidth={1.6} />
              <span className="command-result-copy">
                <span>{label}</span>
                <small>{group}</small>
              </span>
              <span>↵</span>
            </Link>
          ))}
          {filtered.length === 0 ? <div className="empty-inline">Nenhum comando encontrado.</div> : null}
        </div>
      </section>
    </div>
  );
}

