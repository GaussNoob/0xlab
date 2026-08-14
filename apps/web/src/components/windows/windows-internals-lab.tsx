"use client";

import {
  AppWindow,
  ArrowDown,
  ArrowRight,
  Binary,
  Box,
  Cpu,
  File,
  HardDrive,
  Layers3,
  Lock,
  MemoryStick,
  MessageSquare,
  Play,
  Plus,
  RotateCcw,
  Shield,
  Trash2,
  Workflow
} from "lucide-react";
import { useEffect, useState } from "react";

type ViewId = "memory" | "pe" | "messages" | "process";

const baseRegions = [
  { id: "kernel", start: "0xFFFF8000`00000000", end: "0xFFFFFFFF`FFFFFFFF", label: "Kernel space", kind: "kernel", size: "128 TB", protection: "supervisor only", note: "Inacessível diretamente em user mode." },
  { id: "stack", start: "0x0000007F`FDE00000", end: "0x0000007F`FDFFFFFF", label: "Thread stack", kind: "stack", size: "2 MB", protection: "PAGE_READWRITE + guard", note: "Cada thread possui sua própria stack." },
  { id: "reserved", start: "0x0000021A`41000000", end: "0x0000021A`41FFFFFF", label: "Reserved range", kind: "reserved", size: "16 MB", protection: "PAGE_NOACCESS", note: "Endereços reservados, ainda sem backing físico." },
  { id: "heap", start: "0x0000021A`2C000000", end: "0x0000021A`2C3FFFFF", label: "Process heap", kind: "heap", size: "4 MB", protection: "PAGE_READWRITE", note: "Gerenciado pelo heap allocator sobre páginas virtuais." },
  { id: "dll", start: "0x00007FFB`12000000", end: "0x00007FFB`121AFFFF", label: "kernel32.dll", kind: "dll", size: "1.7 MB", protection: "mixed by section", note: "Imagem PE mapeada pelo loader." },
  { id: "exe", start: "0x00000001`40000000", end: "0x00000001`4000FFFF", label: "0xlab-demo.exe", kind: "exe", size: "64 KB", protection: "RX / RW by section", note: "Executable image; entry point is inside .text." }
] as const;

const peNodes = [
  { id: "dos", offset: "0x0000", size: "64 B", title: "DOS Header", signature: "MZ", fields: ["e_magic = 0x5A4D", "e_lfanew = 0x000000F8"], note: "e_lfanew aponta para a assinatura PE." },
  { id: "stub", offset: "0x0040", size: "184 B", title: "DOS Stub", signature: "program", fields: ["legacy compatibility stub"], note: "Mantém compatibilidade histórica; não é o entry point da imagem moderna." },
  { id: "pe", offset: "0x00F8", size: "4 B", title: "PE Signature", signature: "PE\\0\\0", fields: ["0x00004550"], note: "Valida o início dos NT Headers." },
  { id: "coff", offset: "0x00FC", size: "20 B", title: "COFF Header", signature: "AMD64", fields: ["Machine = 0x8664", "NumberOfSections = 6", "Characteristics = executable"], note: "Descreve arquitetura, quantidade de sections e atributos do arquivo." },
  { id: "optional", offset: "0x0110", size: "240 B", title: "Optional Header", signature: "PE32+", fields: ["ImageBase = 0x140000000", "AddressOfEntryPoint = 0x1000", "SectionAlignment = 0x1000", "DataDirectory[16]"], note: "Apesar do nome, é essencial para executáveis carregáveis." },
  { id: "sections", offset: "0x0200", size: "240 B", title: "Section Table", signature: "6 entries", fields: [".text  RVA 0x1000  RX", ".rdata RVA 0x3000 R", ".data  RVA 0x5000 RW", ".pdata · .rsrc · .reloc"], note: "Traduz o layout em disco para regiões mapeadas na imagem." }
] as const;

const apiFamilies = [
  { title: "Process", apis: "CreateProcess · OpenProcess · GetProcessId · TerminateProcess", bridge: "EXE → loader → EPROCESS → virtual address space" },
  { title: "Thread", apis: "CreateThread · ExitThread · WaitForSingleObject", bridge: "start routine → ETHREAD → scheduler → CPU" },
  { title: "Sync", apis: "CreateMutex · CreateEvent · CreateSemaphore · CriticalSection", bridge: "shared state → waitable object / user lock → ordered access" },
  { title: "Files", apis: "CreateFile · ReadFile · WriteFile · CloseHandle", bridge: "HANDLE → I/O manager → filesystem → storage driver" },
  { title: "DLL", apis: "LoadLibrary · GetProcAddress · FreeLibrary", bridge: "DLL search → image mapping → imports/exports → function address" }
] as const;

export function WindowsInternalsLab() {
  const [view, setView] = useState<ViewId>("memory");
  const [selectedRegion, setSelectedRegion] = useState("reserved");
  const [allocated, setAllocated] = useState(false);
  const [executable, setExecutable] = useState(false);
  const [selectedPe, setSelectedPe] = useState("optional");
  const [messages, setMessages] = useState(["WM_CREATE", "WM_SIZE 1280×720", "WM_PAINT"]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search).get("view");
    if (query === "pe" || query === "messages" || query === "process" || query === "memory") setView(query);
  }, []);

  const regions = allocated ? [
    baseRegions[0]!, baseRegions[1]!,
    { id: "allocation", start: "0x0000021A`41000000", end: "0x0000021A`4100FFFF", label: "Lab allocation", kind: "allocation", size: "64 KB", protection: executable ? "PAGE_EXECUTE_READ" : "PAGE_READWRITE", note: "MEM_RESERVE | MEM_COMMIT: uma região privada do processo." },
    { ...baseRegions[2]!, start: "0x0000021A`41010000", size: "15.94 MB" },
    ...baseRegions.slice(3)
  ] : baseRegions;
  const activeRegion = regions.find((region) => region.id === selectedRegion) ?? regions[2]!;
  const activePe = peNodes.find((node) => node.id === selectedPe) ?? peNodes[0]!;

  function addMessage(message: string) {
    setMessages((current) => [...current.slice(-5), message]);
  }

  function changeView(next: ViewId) {
    setView(next);
    const url = new URL(window.location.href);
    url.searchParams.set("view", next);
    window.history.replaceState({}, "", url);
  }

  return (
    <div className="windows-lab-shell">
      <header className="windows-lab-header">
        <div><span className="eyebrow">Windows API / Internals Lab</span><h1>Do HANDLE ao objeto do kernel.</h1></div>
        <div className="win-lab-status"><span><Shield size={11} /> own-process model</span><span><Cpu size={11} /> Windows x64</span><span><Binary size={11} /> PE32+</span></div>
      </header>
      <nav className="windows-lab-tabs" aria-label="Ferramentas Windows">
        <button type="button" data-active={view === "memory"} onClick={() => changeView("memory")}><MemoryStick size={13} />Virtual Memory</button>
        <button type="button" data-active={view === "pe"} onClick={() => changeView("pe")}><Binary size={13} />PE Explorer</button>
        <button type="button" data-active={view === "messages"} onClick={() => changeView("messages")}><AppWindow size={13} />Message Loop</button>
        <button type="button" data-active={view === "process"} onClick={() => changeView("process")}><Workflow size={13} />Process / Thread</button>
      </nav>

      {view === "memory" ? <section className="virtual-memory-workbench">
        <aside className="vm-address-rail"><header>VIRTUAL ADDRESS SPACE <span>user process</span></header><div className="address-ruler"><span>0xFFFFFFFF`FFFFFFFF</span><i /><span>0x00000000`00000000</span></div></aside>
        <div className="vm-region-map">
          <header><span>REGION MAP</span><small>not to physical scale · x64 educational model</small></header>
          <div>{regions.map((region) => <button type="button" data-kind={region.kind} data-active={selectedRegion === region.id} onClick={() => setSelectedRegion(region.id)} key={`${region.id}-${region.start}`}><span><code>{region.start}</code><code>{region.end}</code></span><strong>{region.label}</strong><small>{region.size}</small>{selectedRegion === region.id ? <ArrowRight size={12} /> : null}</button>)}</div>
        </div>
        <aside className="vm-inspector"><header><MemoryStick size={12} /><span>REGION INSPECTOR</span></header><div className="vm-region-title"><i data-kind={activeRegion.kind} /><div><span>{activeRegion.kind.toUpperCase()}</span><strong>{activeRegion.label}</strong></div></div><dl><div><dt>Base address</dt><dd>{activeRegion.start}</dd></div><div><dt>End address</dt><dd>{activeRegion.end}</dd></div><div><dt>Region size</dt><dd>{activeRegion.size}</dd></div><div><dt>State</dt><dd>{activeRegion.kind === "reserved" ? "MEM_RESERVE" : "MEM_COMMIT"}</dd></div><div><dt>Protection</dt><dd>{activeRegion.protection}</dd></div></dl><p>{activeRegion.note}</p><div className="vm-page-model"><span>PAGE TABLE WALK</span><div><b>VA</b><ArrowRight size={9} /><b>PML4</b><ArrowRight size={9} /><b>PDPT</b><ArrowRight size={9} /><b>PD</b><ArrowRight size={9} /><b>PT</b><ArrowRight size={9} /><b>PFN</b></div></div></aside>
        <footer className="vm-controls"><div><button className="button-primary" type="button" onClick={() => { setAllocated(true); setSelectedRegion("allocation"); }} disabled={allocated}><Plus size={12} />VirtualAlloc · reserve + commit</button><button className="button-secondary" type="button" onClick={() => setExecutable((value) => !value)} disabled={!allocated}><Lock size={12} />VirtualProtect · {executable ? "RW" : "RX"}</button><button className="button-secondary" type="button" onClick={() => { setAllocated(false); setExecutable(false); setSelectedRegion("reserved"); }} disabled={!allocated}><Trash2 size={12} />VirtualFree · release</button></div><code>{allocated ? `VirtualAlloc(nullptr, 0x10000, MEM_RESERVE | MEM_COMMIT, ${executable ? "PAGE_EXECUTE_READ" : "PAGE_READWRITE"})` : "// allocate a 64 KiB region to trace reserve, commit and protection"}</code></footer>
      </section> : null}

      {view === "pe" ? <section className="pe-workbench">
        <aside className="pe-file-map"><header><File size={12} /><span>0xlab-demo.exe</span><small>12.5 KiB</small></header><div>{peNodes.map((node) => <button type="button" data-active={node.id === selectedPe} onClick={() => setSelectedPe(node.id)} key={node.id}><code>{node.offset}</code><span><strong>{node.title}</strong><small>{node.size}</small></span></button>)}</div></aside>
        <div className="pe-structure"><header><span>PORTABLE EXECUTABLE STRUCTURE</span><small>file layout → image layout</small></header><div className="pe-flow-line">{peNodes.map((node, index) => <span data-active={node.id === selectedPe} key={node.id}><button type="button" onClick={() => setSelectedPe(node.id)}><code>{node.signature}</code><b>{node.title}</b></button>{index < peNodes.length - 1 ? <ArrowDown size={12} /> : null}</span>)}</div></div>
        <aside className="pe-inspector"><header><Binary size={12} /><span>HEADER INSPECTOR</span></header><div><span>{activePe.offset} · {activePe.size}</span><h2>{activePe.title}</h2><p>{activePe.note}</p>{activePe.fields.map((field) => <code key={field}>{field}</code>)}</div><section><span>ADDRESS TRANSLATION</span><p><code>VA = ImageBase + RVA</code></p><p><code>0x140001000 = 0x140000000 + 0x1000</code></p></section></aside>
        <footer className="pe-sections"><span>SECTIONS</span>{[[".text", "RX", "code"], [".rdata", "R", "constants / imports"], [".data", "RW", "initialized data"], [".bss", "RW", "zero-initialized"], [".rsrc", "R", "resources"], [".reloc", "R", "base relocations"]].map(([name, mode, note]) => <p key={name}><code>{name}</code><b>{mode}</b><span>{note}</span></p>)}</footer>
      </section> : null}

      {view === "messages" ? <section className="message-loop-workbench">
        <div className="message-flow"><header><MessageSquare size={12} /><span>MESSAGE DELIVERY</span></header>{["Windows / input", "Thread message queue", "GetMessage", "TranslateMessage", "DispatchMessage", "WndProc(HWND, msg, wParam, lParam)"].map((node, index, all) => <div key={node}><span data-active={index === all.length - 1}>{node}</span>{index < all.length - 1 ? <ArrowDown size={12} /> : null}</div>)}</div>
        <div className="window-preview"><header><span>0xLAB · Win32 window</span><button type="button" onClick={() => addMessage("WM_CLOSE")} aria-label="Fechar janela">×</button></header><div onMouseMove={() => messages.at(-1) !== "WM_MOUSEMOVE" && addMessage("WM_MOUSEMOVE")}><h2>Window procedure monitor</h2><p>Cada interação se transforma em uma mensagem entregue à thread que criou a janela.</p><button type="button" onClick={() => addMessage("WM_LBUTTONDOWN")}>Native BUTTON</button><input aria-label="Input Win32" placeholder="Edit control" onKeyDown={(event) => addMessage(`WM_KEYDOWN · VK_${event.key.toUpperCase()}`)} /><span>Resize observer → WM_SIZE</span></div></div>
        <aside className="message-monitor"><header>EVENT MONITOR <button type="button" onClick={() => setMessages([])}><RotateCcw size={10} /></button></header><div>{messages.length ? messages.map((message, index) => <p key={`${message}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><code>{message}</code></p>) : <span className="empty-log">Interact with the window preview</span>}</div><section><span>WNDPROC SWITCH</span>{["WM_CREATE", "WM_PAINT", "WM_SIZE", "WM_KEYDOWN / UP", "WM_MOUSEMOVE", "WM_LBUTTONDOWN", "WM_CLOSE", "WM_DESTROY"].map((message) => <code key={message}>{message}</code>)}</section></aside>
        <footer className="message-projects"><strong>PROJECT SEQUENCE</strong>{["Simple window", "Button + input", "Menu", "Text editor", "Hex viewer", "Event monitor"].map((project, index) => <span key={project}><b>{index + 1}</b>{project}</span>)}</footer>
      </section> : null}

      {view === "process" ? <section className="process-workbench">
        <div className="process-model"><header><Workflow size={12} /><span>PROCESS MODEL · 0xlab-demo.exe</span></header><div className="process-node root"><Cpu size={15} /><strong>Process #4820</strong><span>virtual address space + handle table</span></div><div className="process-branches"><article><span>THREADS</span><div><b>TID 4824 · UI</b><small>running · CPU 2</small></div><div><b>TID 4831 · worker</b><small>waiting · event #A8</small></div></article><article><span>HANDLES</span><div><b>0x44 · File</b><small>log.bin</small></div><div><b>0xA8 · Event</b><small>manual reset</small></div></article><article><span>MODULES</span><div><b>0xlab-demo.exe</b><small>image base 0x140000000</small></div><div><b>kernel32.dll</b><small>mapped image</small></div></article></div></div>
        <aside className="sync-model"><header><Lock size={12} /><span>SYNCHRONIZATION TRACE</span></header><div><span>Thread A</span><code>WaitForSingleObject(event)</code><i /><code>blocked</code><ArrowDown size={11} /><span>Thread B</span><code>SetEvent(event)</code><i className="active" /><code>scheduler wakes A</code></div><p><strong>Race condition</strong> duas threads acessam estado sem ordem definida.</p><p><strong>Deadlock</strong> dependência circular impede progresso.</p></aside>
        <div className="win-api-cards">{apiFamilies.map((family) => <article key={family.title}><header><span>{family.title}</span><Play size={10} /></header><code>{family.apis}</code><p>{family.bridge}</p></article>)}</div>
      </section> : null}
    </div>
  );
}
