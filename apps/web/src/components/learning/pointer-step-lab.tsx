"use client";

import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

const STEPS = [
  {
    label: "Declaração",
    line: 1,
    title: "x recebe armazenamento na stack",
    detail: "O compilador reserva 4 bytes para um int neste modelo. O nome x passa a designar esse objeto.",
    xValue: 10,
    pointerVisible: false
  },
  {
    label: "Endereço",
    line: 2,
    title: "&x produz o endereço de x",
    detail: "ptr ocupa seus próprios 8 bytes. Seu valor é 0x7ffe1000: o endereço do primeiro byte de x.",
    xValue: 10,
    pointerVisible: true
  },
  {
    label: "Dereference",
    line: 3,
    title: "*ptr acessa o objeto apontado",
    detail: "O endereço guardado em ptr é seguido. A escrita acontece nos bytes de x, não dentro de ptr.",
    xValue: 20,
    pointerVisible: true
  },
  {
    label: "Estado final",
    line: 3,
    title: "Dois objetos, uma relação",
    detail: "x vale 20; ptr continua valendo 0x7ffe1000. Alterar o alvo não altera o endereço armazenado.",
    xValue: 20,
    pointerVisible: true
  }
] as const;

export function PointerStepLab() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const current = STEPS[step] ?? STEPS[0];

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setStep((value) => {
        if (value >= STEPS.length - 1) {
          setPlaying(false);
          return value;
        }
        return value + 1;
      });
    }, 1_800);
    return () => window.clearInterval(timer);
  }, [playing]);

  return (
    <section className="pointer-step-lab" aria-label="Visualização interativa de ponteiro">
      <header className="lab-panel-header">
        <div>
          <span className="eyebrow">Live model</span>
          <h3>Endereço → valor → mutação</h3>
        </div>
        <div className="lab-window-meta">
          <span>x86_64</span><span>little endian</span><span>frame #0</span>
        </div>
      </header>

      <div className="pointer-lab-grid">
        <div className="trace-source">
          <div className="trace-source-label">main.c</div>
          {[
            "int x = 10;",
            "int *ptr = &x;",
            "*ptr = 20;"
          ].map((line, index) => (
            <div className="trace-code-line" data-active={current.line === index + 1} key={line}>
              <span>{index + 1}</span>
              <code>{line}</code>
            </div>
          ))}
          <div className="trace-explanation">
            <span className="trace-step-number">0{step + 1}</span>
            <div><strong>{current.title}</strong><p>{current.detail}</p></div>
          </div>
        </div>

        <div className="memory-stage">
          <div className="memory-stage-title"><span>STACK</span><small>main · 16 bytes modeled</small></div>
          <svg className="pointer-wire" viewBox="0 0 520 250" aria-hidden="true" preserveAspectRatio="none">
            <defs>
              <marker id="pointer-arrow" markerHeight="7" markerWidth="7" orient="auto" refX="5" refY="3.5">
                <path d="M0,0 L0,7 L6,3.5 z" fill="var(--accent)" />
              </marker>
            </defs>
            <path
              className="pointer-wire-path"
              data-visible={current.pointerVisible}
              d="M 334 186 C 455 185, 454 68, 346 68"
              markerEnd="url(#pointer-arrow)"
            />
          </svg>
          <MemoryCell
            address="0x7ffe1000"
            bytes={current.xValue === 10 ? "0a 00 00 00" : "14 00 00 00"}
            label="x"
            type="int · 4 B"
            value={String(current.xValue)}
            changed={step === 2}
            className="cell-x"
          />
          <MemoryCell
            address="0x7ffe0ff8"
            bytes={current.pointerVisible ? "00 10 fe 7f 00 00 00 00" : "— — — — — — — —"}
            label="ptr"
            type="int* · 8 B"
            value={current.pointerVisible ? "0x7ffe1000" : "uninitialized"}
            muted={!current.pointerVisible}
            className="cell-ptr"
          />
          <div className="stack-direction"><span>high addresses</span><i /><span>low addresses</span></div>
        </div>
      </div>

      <footer className="trace-controls">
        <button type="button" onClick={() => { setStep(0); setPlaying(false); }} aria-label="Reiniciar">
          <RotateCcw size={13} />
        </button>
        <button type="button" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0} aria-label="Passo anterior">
          <ChevronLeft size={14} />
        </button>
        <button className="trace-play" type="button" onClick={() => setPlaying((value) => !value)} aria-label={playing ? "Pausar" : "Reproduzir"}>
          {playing ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
          {playing ? "Pausar" : "Executar trace"}
        </button>
        <button type="button" onClick={() => setStep((value) => Math.min(STEPS.length - 1, value + 1))} disabled={step === STEPS.length - 1} aria-label="Próximo passo">
          <ChevronRight size={14} />
        </button>
        <div className="trace-timeline" aria-label={`Passo ${step + 1} de ${STEPS.length}`}>
          {STEPS.map((item, index) => (
            <button
              type="button"
              className="timeline-step"
              data-active={index <= step}
              onClick={() => { setStep(index); setPlaying(false); }}
              key={item.label}
              title={item.label}
            />
          ))}
        </div>
        <span className="trace-count">{step + 1} / {STEPS.length}</span>
      </footer>
    </section>
  );
}

interface MemoryCellProps {
  readonly address: string;
  readonly bytes: string;
  readonly label: string;
  readonly type: string;
  readonly value: string;
  readonly changed?: boolean;
  readonly muted?: boolean;
  readonly className: string;
}

function MemoryCell({ address, bytes, label, type, value, changed, muted, className }: MemoryCellProps) {
  return (
    <div className={`memory-cell ${className}`} data-changed={changed} data-muted={muted}>
      <span className="cell-address">{address}</span>
      <div className="cell-body">
        <div className="cell-identity"><strong>{label}</strong><small>{type}</small></div>
        <code className="cell-value">{value}</code>
      </div>
      <span className="cell-bytes">{bytes}</span>
    </div>
  );
}

