"use client";

import { Box, Braces, ChevronLeft, ChevronRight, CircleDot, Cpu, Layers3, Pause, Play, RotateCcw, ScanLine } from "lucide-react";
import { useEffect, useState } from "react";
import { MemoryConceptWorkbench, type MemoryConceptToolId } from "./memory-concept-workbench";
import { MemoryScene, type SceneEdge, type SceneObject } from "./memory-scene";

type ScenarioId = "basic" | "array" | "double";
type MemoryToolId = "pointer" | MemoryConceptToolId;

const toolHeadings: Readonly<Record<MemoryToolId, { title: string; model: string }>> = {
  pointer: { title: "Veja o endereço. Siga o ponteiro.", model: "x86_64 pointer model" },
  "stack-heap": { title: "Stack, heap e lifetime sem caixas-pretas.", model: "process memory model" },
  allocator: { title: "Veja o allocator decidir cada byte.", model: "arena / free-list model" },
  bugs: { title: "Encontre a primeira operação inválida.", model: "sanitizer-guided model" }
};

interface ScenarioStep {
  readonly line: number;
  readonly label: string;
  readonly note: string;
  readonly objects: readonly SceneObject[];
  readonly edge?: SceneEdge;
  readonly registers: Readonly<Record<string, string>>;
}

interface Scenario {
  readonly label: string;
  readonly description: string;
  readonly lines: readonly string[];
  readonly steps: readonly ScenarioStep[];
}

const scenarios: Record<ScenarioId, Scenario> = {
  basic: {
    label: "Ponteiro básico",
    description: "Address-of, armazenamento do endereço e escrita indireta.",
    lines: ["int x = 10;", "int *ptr = &x;", "*ptr = 20;"],
    steps: [
      {
        line: 1, label: "x construído", note: "Quatro bytes representam o inteiro 10 na stack.",
        objects: [{ id: "x", label: "x", address: "0x7ffe1000", value: "10", position: [-1.4, 1, 0] }],
        registers: { RAX: "0x0000000a", RBP: "0x7ffe1040", RSP: "0x7ffe0fe0", RIP: "main+0x08" }
      },
      {
        line: 2, label: "ptr recebe &x", note: "ptr é outro objeto. Seus oito bytes guardam 0x7ffe1000.",
        objects: [
          { id: "x", label: "x", address: "0x7ffe1000", value: "10", position: [-1.4, 1, 0] },
          { id: "ptr", label: "ptr", address: "0x7ffe0ff8", value: "0x7ffe1000", position: [1.1, -1, 0], tone: "pointer" }
        ],
        edge: { from: "ptr", to: "x" },
        registers: { RAX: "0x7ffe1000", RBP: "0x7ffe1040", RSP: "0x7ffe0fe0", RIP: "main+0x11" }
      },
      {
        line: 3, label: "escrita indireta", note: "O endereço em ptr é carregado; 20 é escrito no objeto localizado ali.",
        objects: [
          { id: "x", label: "x", address: "0x7ffe1000", value: "20", position: [-1.4, 1, 0] },
          { id: "ptr", label: "ptr", address: "0x7ffe0ff8", value: "0x7ffe1000", position: [1.1, -1, 0], tone: "pointer" }
        ],
        edge: { from: "ptr", to: "x" },
        registers: { RAX: "0x7ffe1000", RBP: "0x7ffe1040", RSP: "0x7ffe0fe0", RIP: "main+0x18" }
      }
    ]
  },
  array: {
    label: "Aritmética em array",
    description: "Incrementar int* avança sizeof(int), não um byte.",
    lines: ["int values[3] = {4, 8, 15};", "int *p = values;", "p += 1;", "*p = 99;"],
    steps: [
      {
        line: 1, label: "array contíguo", note: "Três ints ocupam 12 bytes consecutivos.",
        objects: [
          { id: "v0", label: "values[0]", address: "0x7ffe2000", value: "4", position: [-3.4, 0.9, 0], width: 2.2 },
          { id: "v1", label: "values[1]", address: "0x7ffe2004", value: "8", position: [-0.8, 0.9, 0], width: 2.2 },
          { id: "v2", label: "values[2]", address: "0x7ffe2008", value: "15", position: [1.8, 0.9, 0], width: 2.2 }
        ], registers: { RAX: "0x00000004", RBP: "0x7ffe2040", RSP: "0x7ffe1fd0", RIP: "main+0x0c" }
      },
      {
        line: 2, label: "decay para &values[0]", note: "Neste contexto, values é convertido para ponteiro ao primeiro elemento.",
        objects: [
          { id: "v0", label: "values[0]", address: "0x7ffe2000", value: "4", position: [-3.4, 0.9, 0], width: 2.2 },
          { id: "v1", label: "values[1]", address: "0x7ffe2004", value: "8", position: [-0.8, 0.9, 0], width: 2.2 },
          { id: "v2", label: "values[2]", address: "0x7ffe2008", value: "15", position: [1.8, 0.9, 0], width: 2.2 },
          { id: "p", label: "p", address: "0x7ffe1ff8", value: "0x7ffe2000", position: [2.6, -1.1, 0], width: 2.6, tone: "pointer" }
        ], edge: { from: "p", to: "v0" }, registers: { RAX: "0x7ffe2000", RBP: "0x7ffe2040", RSP: "0x7ffe1fd0", RIP: "main+0x14" }
      },
      {
        line: 3, label: "p avança 4 bytes", note: "O tipo int* determina a escala. O novo valor é 0x7ffe2004.",
        objects: [
          { id: "v0", label: "values[0]", address: "0x7ffe2000", value: "4", position: [-3.4, 0.9, 0], width: 2.2 },
          { id: "v1", label: "values[1]", address: "0x7ffe2004", value: "8", position: [-0.8, 0.9, 0], width: 2.2 },
          { id: "v2", label: "values[2]", address: "0x7ffe2008", value: "15", position: [1.8, 0.9, 0], width: 2.2 },
          { id: "p", label: "p", address: "0x7ffe1ff8", value: "0x7ffe2004", position: [2.6, -1.1, 0], width: 2.6, tone: "pointer" }
        ], edge: { from: "p", to: "v1" }, registers: { RAX: "0x7ffe2004", RBP: "0x7ffe2040", RSP: "0x7ffe1fd0", RIP: "main+0x1b" }
      },
      {
        line: 4, label: "segundo elemento muda", note: "A escrita chega a values[1]; os elementos vizinhos permanecem intactos.",
        objects: [
          { id: "v0", label: "values[0]", address: "0x7ffe2000", value: "4", position: [-3.4, 0.9, 0], width: 2.2 },
          { id: "v1", label: "values[1]", address: "0x7ffe2004", value: "99", position: [-0.8, 0.9, 0], width: 2.2 },
          { id: "v2", label: "values[2]", address: "0x7ffe2008", value: "15", position: [1.8, 0.9, 0], width: 2.2 },
          { id: "p", label: "p", address: "0x7ffe1ff8", value: "0x7ffe2004", position: [2.6, -1.1, 0], width: 2.6, tone: "pointer" }
        ], edge: { from: "p", to: "v1" }, registers: { RAX: "0x7ffe2004", RBP: "0x7ffe2040", RSP: "0x7ffe1fd0", RIP: "main+0x22" }
      }
    ]
  },
  double: {
    label: "Ponteiro para ponteiro",
    description: "Duas indireções atravessam dois objetos ponteiro.",
    lines: ["int x = 7;", "int *p = &x;", "int **pp = &p;", "**pp = 42;"],
    steps: [
      { line: 1, label: "x construído", note: "O objeto alvo começa com valor 7.", objects: [{ id: "x", label: "x", address: "0x7ffe3000", value: "7", position: [-2.6, 1.1, 0] }], registers: { RAX: "0x00000007", RBP: "0x7ffe3050", RSP: "0x7ffe2fc0", RIP: "main+0x07" } },
      { line: 2, label: "primeiro nível", note: "p aponta para x.", objects: [{ id: "x", label: "x", address: "0x7ffe3000", value: "7", position: [-2.6, 1.1, 0] }, { id: "p", label: "p", address: "0x7ffe2ff8", value: "0x7ffe3000", position: [0, 0, 0], tone: "pointer" }], edge: { from: "p", to: "x" }, registers: { RAX: "0x7ffe3000", RBP: "0x7ffe3050", RSP: "0x7ffe2fc0", RIP: "main+0x10" } },
      { line: 3, label: "segundo nível", note: "pp guarda o endereço de p, não o endereço de x.", objects: [{ id: "x", label: "x", address: "0x7ffe3000", value: "7", position: [-3.3, 1.2, 0], width: 2.7 }, { id: "p", label: "p", address: "0x7ffe2ff8", value: "0x7ffe3000", position: [0, 0.25, 0], width: 2.7, tone: "pointer" }, { id: "pp", label: "pp", address: "0x7ffe2ff0", value: "0x7ffe2ff8", position: [3, -1.1, 0], width: 2.7, tone: "pointer" }], edge: { from: "pp", to: "p" }, registers: { RAX: "0x7ffe2ff8", RBP: "0x7ffe3050", RSP: "0x7ffe2fc0", RIP: "main+0x19" } },
      { line: 4, label: "dupla indireção", note: "*pp encontra p; **pp encontra x; a escrita altera x para 42.", objects: [{ id: "x", label: "x", address: "0x7ffe3000", value: "42", position: [-3.3, 1.2, 0], width: 2.7 }, { id: "p", label: "p", address: "0x7ffe2ff8", value: "0x7ffe3000", position: [0, 0.25, 0], width: 2.7, tone: "pointer" }, { id: "pp", label: "pp", address: "0x7ffe2ff0", value: "0x7ffe2ff8", position: [3, -1.1, 0], width: 2.7, tone: "pointer" }], edge: { from: "p", to: "x" }, registers: { RAX: "0x7ffe3000", RBP: "0x7ffe3050", RSP: "0x7ffe2fc0", RIP: "main+0x24" } }
    ]
  }
};

export function MemoryVisualizer() {
  const [activeTool, setActiveTool] = useState<MemoryToolId>("pointer");
  const [scenarioId, setScenarioId] = useState<ScenarioId>("basic");
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const scenario = scenarios[scenarioId];
  const step = scenario.steps[stepIndex] ?? scenario.steps[0]!;

  useEffect(() => {
    const requested = new URL(window.location.href).searchParams.get("tool");
    if (requested && requested in toolHeadings) setActiveTool(requested as MemoryToolId);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setStepIndex((current) => {
      if (current >= scenario.steps.length - 1) { setPlaying(false); return current; }
      return current + 1;
    }), 1_700);
    return () => window.clearInterval(timer);
  }, [playing, scenario.steps.length]);

  function selectScenario(id: ScenarioId) {
    setScenarioId(id);
    setStepIndex(0);
    setPlaying(false);
  }

  function selectTool(id: MemoryToolId) {
    setActiveTool(id);
    setPlaying(false);
    const url = new URL(window.location.href);
    if (id === "pointer") url.searchParams.delete("tool");
    else url.searchParams.set("tool", id);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  return (
    <div className="memory-lab-shell">
      <header className="lab-tool-header">
        <div><span className="eyebrow">Memory Visualizer</span><h1>{toolHeadings[activeTool].title}</h1></div>
        <div className="lab-tool-meta"><span><CircleDot size={10} /> deterministic trace</span><span><Cpu size={10} /> {toolHeadings[activeTool].model}</span></div>
      </header>

      <nav className="lab-tool-tabs" aria-label="Ferramentas de memória">
        <button type="button" data-active={activeTool === "pointer"} aria-pressed={activeTool === "pointer"} onClick={() => selectTool("pointer")}><ScanLine size={13} />Pointer playground</button>
        <button type="button" data-active={activeTool === "stack-heap"} aria-pressed={activeTool === "stack-heap"} onClick={() => selectTool("stack-heap")}><Layers3 size={13} />Stack / Heap</button>
        <button type="button" data-active={activeTool === "allocator"} aria-pressed={activeTool === "allocator"} onClick={() => selectTool("allocator")}><Box size={13} />Allocator</button>
        <button type="button" data-active={activeTool === "bugs"} aria-pressed={activeTool === "bugs"} onClick={() => selectTool("bugs")}><Braces size={13} />Memory bugs</button>
      </nav>

      {activeTool === "pointer" ? <>
      <section className="memory-workbench">
        <aside className="scenario-panel">
          <div className="scenario-heading"><span>Scenarios</span><small>03 loaded</small></div>
          {(Object.keys(scenarios) as ScenarioId[]).map((id, index) => (
            <button className="scenario-button" type="button" data-active={scenarioId === id} onClick={() => selectScenario(id)} key={id}>
              <span>0{index + 1}</span><div><strong>{scenarios[id].label}</strong><small>{scenarios[id].description}</small></div>
            </button>
          ))}
          <div className="scenario-source">
            <header><span>{scenarioId}.c</span><small>source model</small></header>
            {scenario.lines.map((line, index) => (
              <div data-active={step.line === index + 1} key={line}><span>{index + 1}</span><code>{line}</code></div>
            ))}
          </div>
        </aside>

        <div className="memory-viewport">
          <MemoryScene objects={step.objects} {...(step.edge === undefined ? {} : { edge: step.edge })} />
          <div className="step-callout"><span>{String(stepIndex + 1).padStart(2, "0")}</span><div><strong>{step.label}</strong><p>{step.note}</p></div></div>
        </div>

        <aside className="inspector-panel">
          <header><span>Inspector</span><small>live state</small></header>
          <section className="inspector-section">
            <h3>Objects</h3>
            {step.objects.map((object) => (
              <div className="inspector-object" key={object.id}>
                <span className="object-tone" data-tone={object.tone ?? "value"} />
                <div><strong>{object.label}</strong><small>{object.address}</small></div>
                <code>{object.value}</code>
              </div>
            ))}
          </section>
          <section className="inspector-section registers-list">
            <h3>Registers</h3>
            {Object.entries(step.registers).map(([register, value]) => <div key={register}><span>{register}</span><code>{value}</code></div>)}
          </section>
          <section className="inspector-section region-map">
            <h3>Process memory</h3>
            <div><span>0x7fff…</span><b className="stack-region">STACK</b></div>
            <div><span>↓</span><i>free virtual space</i></div>
            <div><span>0x5555…</span><b>HEAP</b></div>
            <div><span>0x0040…</span><b>TEXT / GLOBALS</b></div>
          </section>
        </aside>
      </section>

      <footer className="memory-controls">
        <div className="memory-transport">
          <button type="button" onClick={() => { setStepIndex(0); setPlaying(false); }} title="Reiniciar"><RotateCcw size={13} /></button>
          <button type="button" onClick={() => setStepIndex((value) => Math.max(0, value - 1))} disabled={stepIndex === 0}><ChevronLeft size={14} /></button>
          <button className="memory-play" type="button" onClick={() => setPlaying((value) => !value)}>{playing ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}{playing ? "Pause" : "Run trace"}</button>
          <button type="button" onClick={() => setStepIndex((value) => Math.min(scenario.steps.length - 1, value + 1))} disabled={stepIndex === scenario.steps.length - 1}><ChevronRight size={14} /></button>
        </div>
        <div className="memory-scrubber">
          {scenario.steps.map((item, index) => <button type="button" data-active={index <= stepIndex} onClick={() => { setStepIndex(index); setPlaying(false); }} key={item.label}><i /><span>{item.label}</span></button>)}
        </div>
        <span className="memory-step-count">STEP {stepIndex + 1}:{scenario.steps.length}</span>
      </footer>
      </> : <MemoryConceptWorkbench toolId={activeTool} />}
    </div>
  );
}
