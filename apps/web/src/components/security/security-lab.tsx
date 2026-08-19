"use client";

import {
  ArrowRight,
  Binary,
  Bug,
  Cpu,
  FileSearch,
  FlaskConical,
  Keyboard,
  Lock,
  MemoryStick,
  Network,
  Radar,
  Shield,
  Terminal
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BUFFER_SIZE,
  c2Commands,
  challenges,
  compilerFlags,
  edrRules,
  fakeBrowserProfile,
  fakeFiles,
  fuzzCorpus,
  malwareTimeline,
  parseLabFrame,
  runC2,
  securityLabViews,
  simulateStackOverflow,
  syntheticPe,
  yaraRule,
  type SecurityLabView
} from "./security-lab-model";
import { SecuritySandboxScene } from "./security-sandbox-scene";

function hexToBytes(hex: string): Uint8Array {
  const compact = hex.replace(/\s+/g, "");
  const bytes = new Uint8Array(compact.length / 2);
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = Number.parseInt(compact.slice(index * 2, index * 2 + 2), 16);
  return bytes;
}

export function SecurityLab() {
  const [view, setView] = useState<SecurityLabView>("corruption");
  const [input, setInput] = useState("AAAAAAAAAAAA");
  const [secure, setSecure] = useState(false);
  const [enabledFlags, setEnabledFlags] = useState<readonly string[]>(["-fstack-protector-strong", "-fsanitize=address"]);
  const [fuzzId, setFuzzId] = useState("mut-oversize");
  const [patchedParser, setPatchedParser] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(0);
  const [c2Log, setC2Log] = useState<readonly string[]>(["agent connected  127.0.0.1:17447"]);
  const [encrypted, setEncrypted] = useState(false);
  const [exfil, setExfil] = useState(false);
  const [localKeys, setLocalKeys] = useState("");
  const [yaraHit, setYaraHit] = useState<string | null>(null);
  const [revealId, setRevealId] = useState<string | null>(null);
  const [importId, setImportId] = useState(0);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search).get("view");
    if (securityLabViews.some((item) => item.id === query)) setView(query as SecurityLabView);
  }, []);

  const overflow = useMemo(() => simulateStackOverflow(input, secure), [input, secure]);
  const fuzzCase = fuzzCorpus.find((item) => item.id === fuzzId) ?? fuzzCorpus[2]!;
  const fuzzResult = parseLabFrame(hexToBytes(fuzzCase.hex), patchedParser);
  const peImport = syntheticPe.imports[importId] ?? syntheticPe.imports[0]!;
  const event = malwareTimeline[selectedEvent] ?? malwareTimeline[0]!;

  function changeView(next: SecurityLabView) {
    setView(next);
    const url = new URL(window.location.href);
    url.searchParams.set("view", next);
    window.history.replaceState({}, "", url);
  }

  function sendC2(command: string) {
    setC2Log((current) => [...current.slice(-10), `> ${command}`, runC2(command)]);
  }

  function toggleFlag(flag: string) {
    setEnabledFlags((current) => current.includes(flag) ? current.filter((item) => item !== flag) : [...current, flag]);
  }

  return (
    <div className="security-lab-shell">
      <header className="security-lab-header">
        <div className="security-title">
          <i aria-hidden="true"><Shield size={14} /></i>
          <div>
            <strong>SECURITY LAB</strong>
            <h1>Entenda. Quebre no lab. Observe. Corrija. Detecte.</h1>
          </div>
        </div>
        <div className="security-lab-status">
          <span data-ok="true"><Shield size={10} /> Disposable sandbox</span>
          <span><Lock size={10} /> net=none</span>
          <span><Cpu size={10} /> C / C++ / ASM</span>
          <span>synthetic only</span>
        </div>
      </header>

      <nav className="security-lab-tabs" aria-label="Ferramentas de segurança">
        {securityLabViews.map((item) => (
          <button type="button" data-active={view === item.id} aria-pressed={view === item.id} onClick={() => changeView(item.id)} key={item.id}>
            {item.label}
          </button>
        ))}
        <div className="security-tabs-spacer" />
        <small>FAKE_TOKEN_123 · no host FS</small>
      </nav>

      {view === "corruption" ? (
        <section className="security-workbench sl-split">
          <div className="sl-panel" aria-label="Modelo educacional de stack overflow">
            <header className="sl-head">
              <span>STACK FRAME · x86-64</span>
              <small data-tone={secure ? "ok" : "hot"}>{secure ? "bounded copy" : "vulnerable strcpy"}</small>
            </header>
            <div className="stack-frame">
              {(["return-address", "saved-rbp", "buffer"] as const).map((region) => {
                const hit = region === "return-address" ? overflow.retHit && !secure : region === "saved-rbp" ? overflow.rbpHit && !secure : overflow.spilled > 0 && !secure;
                return (
                  <article data-region={region} data-hit={hit} key={region}>
                    <span>{region === "buffer" ? `buffer[${BUFFER_SIZE}]` : region === "saved-rbp" ? "saved RBP" : "return address"}</span>
                    <div>
                      {overflow.slots.filter((slot) => slot.region === region).map((slot) => (
                        <code data-filled={Boolean(slot.byte)} data-overwritten={slot.overwritten && !secure} key={slot.id}>{slot.byte ?? "·"}</code>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
            <footer className="sl-legend">
              <i data-kind="fill" /> occupied
              <i data-kind="spill" /> would be affected
              <span>input → buffer → {secure ? "bounds check" : "spill / ASan"}</span>
            </footer>
          </div>
          <aside className="sl-panel sl-inspector">
            <header className="sl-head"><MemoryStick size={12} /><span>EXPERIMENT</span></header>
            <label className="sl-field">
              Input
              <input aria-label="Input do overflow educacional" value={input} onChange={(event) => setInput(event.target.value.slice(0, 32))} />
            </label>
            <button className="sl-btn" type="button" data-kind={secure ? "ghost" : "primary"} onClick={() => setSecure((value) => !value)}>
              {secure ? "Ver versão vulnerável" : "Ver versão segura"}
            </button>
            <dl className="sl-kv">
              <div><dt>copied</dt><dd>{Math.min(input.length, secure ? BUFFER_SIZE - 1 : input.length)} B</dd></div>
              <div><dt>saved RBP</dt><dd data-warn={overflow.rbpHit && !secure}>{overflow.rbpHit && !secure ? "would be affected" : "intact"}</dd></div>
              <div><dt>return addr</dt><dd data-warn={overflow.retHit && !secure}>{overflow.retHit && !secure ? "would be affected" : "intact"}</dd></div>
            </dl>
            <pre className="sl-console">{secure ? "Nenhum store fora do objeto. bounded_copy restaurou o invariante espacial." : overflow.asan ?? "Dentro do buffer — aumente o input para ver o spill educacional."}</pre>
            <div className="sl-triad">
              <p><b>Attacker</b> o bound quebra: o comprimento vem da origem</p>
              <p><b>Defender</b> ASan marca o primeiro store ilegal</p>
              <p><b>Developer</b> destino declara cap; teste com 32 A</p>
            </div>
            <Link className="sl-btn" data-kind="ghost" href="/labs/low-level">Open in Low-Level Lab <ArrowRight size={12} /></Link>
          </aside>
        </section>
      ) : null}

      {view === "compiler" ? (
        <section className="security-workbench sl-split">
          <div className="sl-panel">
            <header className="sl-head"><Binary size={12} /><span>COMPILER FLAGS</span><small>own programs only</small></header>
            <div className="sl-flag-list">
              {compilerFlags.map((item) => (
                <button type="button" data-on={enabledFlags.includes(item.flag)} onClick={() => toggleFlag(item.flag)} key={item.flag}>
                  <code>{item.flag}</code>
                  <span>{item.covers}</span>
                </button>
              ))}
            </div>
          </div>
          <aside className="sl-panel sl-inspector">
            <header className="sl-head"><span>BINARY IMPACT</span></header>
            <div className="sl-scroll">
              {compilerFlags.filter((item) => enabledFlags.includes(item.flag)).map((item) => (
                <article className="sl-note" key={item.flag}>
                  <code>{item.flag}</code>
                  <p>{item.binary}</p>
                  <small>{item.limit}</small>
                </article>
              ))}
              {enabledFlags.length === 0 ? <p className="sl-empty">Nenhuma flag ativa.</p> : null}
            </div>
            <Link className="sl-btn" data-kind="ghost" href="/labs/compiler">Compiler Explorer <ArrowRight size={12} /></Link>
          </aside>
        </section>
      ) : null}

      {view === "fuzzing" ? (
        <section className="security-workbench sl-split">
          <div className="sl-panel">
            <header className="sl-head"><Bug size={12} /><span>CORPUS</span><small>max_frame = 64</small></header>
            <ol className="sl-flow">
              {["Input", "Fuzzer", "Crash", "ASAN", "Fix"].map((step) => <li key={step}>{step}</li>)}
            </ol>
            <div className="sl-corpus">
              {fuzzCorpus.map((item) => (
                <button type="button" data-active={item.id === fuzzId} data-crash={item.crash} onClick={() => setFuzzId(item.id)} key={item.id}>
                  <strong>{item.id}</strong>
                  <code>{item.hex}</code>
                  <small>{item.coverage}%</small>
                </button>
              ))}
            </div>
          </div>
          <aside className="sl-panel sl-inspector">
            <header className="sl-head"><span>HARNESS</span></header>
            <p className="sl-copy">{fuzzCase.note}</p>
            <p className="sl-status" data-status={fuzzResult.status}><b>{fuzzResult.status}</b> {fuzzResult.detail}</p>
            <button className="sl-btn" type="button" data-kind="primary" onClick={() => setPatchedParser((value) => !value)}>
              {patchedParser ? "Reabrir parser vulnerável" : "Aplicar patch max_frame=64"}
            </button>
            <Link className="sl-btn" data-kind="ghost" href="/projects/sres-fuzz-parser">Projeto: parser <ArrowRight size={12} /></Link>
          </aside>
        </section>
      ) : null}

      {view === "analysis" ? (
        <section className="security-workbench sl-quad">
          <article className="sl-panel">
            <header className="sl-head"><FileSearch size={12} /><span>{syntheticPe.name}</span><small>{syntheticPe.architecture}</small></header>
            <dl className="sl-kv">
              <div><dt>hash</dt><dd>{syntheticPe.hash}</dd></div>
              <div><dt>base</dt><dd>{syntheticPe.imageBase}</dd></div>
              <div><dt>entry</dt><dd>{syntheticPe.entryPoint}</dd></div>
            </dl>
            <div className="sl-chips">
              {syntheticPe.flags.map((flag) => (
                <span key={flag.name}><b>{flag.name}</b> {flag.value}</span>
              ))}
            </div>
          </article>
          <article className="sl-panel">
            <header className="sl-head"><span>SECTIONS</span></header>
            <div className="sl-rows">
              {syntheticPe.sections.map((section) => (
                <p key={section.name}><code>{section.name}</code><b>{section.flags}</b><span>{section.entropy}</span><small>{section.note}</small></p>
              ))}
            </div>
          </article>
          <article className="sl-panel">
            <header className="sl-head"><span>IMPORTS</span><small>API ≠ malware</small></header>
            <p className="sl-copy">Uma API não é maliciosa por natureza. O contexto decide.</p>
            <div className="sl-import-list">
              {syntheticPe.imports.map((item, index) => (
                <button type="button" data-active={index === importId} onClick={() => setImportId(index)} key={item.name}>
                  <small>{item.dll}</small>
                  <code>{item.name}</code>
                </button>
              ))}
            </div>
            <div className="sl-note">
              <p><b>Legítimo</b> {peImport.legitimate}</p>
              <p><b>Amostra</b> {peImport.labUse}</p>
            </div>
          </article>
          <article className="sl-panel">
            <header className="sl-head"><span>STRINGS</span></header>
            <div className="sl-rows">
              {syntheticPe.strings.map((item) => (
                <p key={item.value}><span>{item.kind}</span><code>{item.value}</code></p>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      {view === "malware" ? (
        <section className="security-workbench sl-malware">
          <aside className="sl-panel sl-timeline-col">
            <header className="sl-head"><Radar size={12} /><span>TIMELINE</span></header>
            <ol className="sl-timeline">
              {malwareTimeline.map((item, index) => (
                <li key={item.t}>
                  <button type="button" data-active={index === selectedEvent} onClick={() => setSelectedEvent(index)}>
                    <code>{item.t.replace("00:00.", "")}</code>
                    <strong>{item.event}</strong>
                  </button>
                </li>
              ))}
            </ol>
            <label className="sl-timeline-scrubber">
              <span>replay cursor</span>
              <input aria-label="Cursor da linha do tempo" type="range" min={0} max={Math.max(0, malwareTimeline.length - 1)} value={selectedEvent} onChange={(event) => setSelectedEvent(Number(event.target.value))} />
            </label>
            <footer className="sl-event-detail">
              <span>{event.api}</span>
              <p>{event.detail}</p>
              <Link href="/labs/low-level">Low-Level Lab <ArrowRight size={11} /></Link>
            </footer>
          </aside>
          <div className="sl-panel sl-c2">
            <header className="sl-head"><Network size={12} /><span>SANDBOX BEHAVIOR MAP</span><small>127.0.0.1:17447</small></header>
            <SecuritySandboxScene event={event} encrypted={encrypted} exfil={exfil} />
            <div className="sl-c2-actions">
              {c2Commands.map((command) => (
                <button type="button" onClick={() => sendC2(command)} key={command}>{command}</button>
              ))}
            </div>
            <pre className="sl-console sl-c2-log">{c2Log.join("\n")}</pre>
          </div>
          <div className="sl-malware-side">
            <article className="sl-panel">
              <header className="sl-head"><span>RANSOMWARE SIM</span><small>sandbox files</small></header>
              <div className="sl-files">
                {fakeFiles.map((file) => (
                  <p data-enc={encrypted} key={file.name}>
                    <code>{file.name}</code>
                    <b>{encrypted ? "encrypted" : file.state}</b>
                  </p>
                ))}
              </div>
              <button className="sl-btn" type="button" data-kind="ghost" onClick={() => setEncrypted((value) => !value)}>
                {encrypted ? "Restaurar backup" : "Simular cifragem"}
              </button>
            </article>
            <article className="sl-panel">
              <header className="sl-head"><span>INFOSTEALER SIM</span><small>fake profile</small></header>
              <dl className="sl-kv">
                <div><dt>user</dt><dd>{fakeBrowserProfile.username}</dd></div>
                <div><dt>token</dt><dd>{fakeBrowserProfile.token}</dd></div>
                <div><dt>pass</dt><dd>{fakeBrowserProfile.password}</dd></div>
              </dl>
              <button className="sl-btn" type="button" data-kind="ghost" onClick={() => setExfil(true)}>Simular exfil local</button>
              {exfil ? <p className="sl-ok">POST 127.0.0.1/lab-exfil · nenhum browser real</p> : null}
              <label className="sl-field">
                <span><Keyboard size={11} /> input monitor</span>
                <input aria-label="Monitor de input do laboratório" value={localKeys} onChange={(event) => setLocalKeys(event.target.value)} placeholder="somente esta caixa" />
              </label>
            </article>
          </div>
        </section>
      ) : null}

      {view === "detection" ? (
        <section className="security-workbench sl-split">
          <article className="sl-panel">
            <header className="sl-head"><Shield size={12} /><span>MINI EDR</span><small>lab processes only</small></header>
            <div className="sl-rules">
              {edrRules.map((rule) => (
                <p key={rule.id}>
                  <code>{rule.id}</code>
                  <strong>{rule.name}</strong>
                  <span>{rule.when}</span>
                  <small>{rule.action}</small>
                </p>
              ))}
            </div>
          </article>
          <article className="sl-panel">
            <header className="sl-head"><span>YARA</span><small>lab-sample.exe</small></header>
            <pre className="sl-console sl-yara">{yaraRule}</pre>
            <button className="sl-btn" type="button" data-kind="primary" onClick={() => setYaraHit("MATCH · MZ + FAKE_TOKEN_123 + demo@example.local")}>
              Testar amostra sintética
            </button>
            {yaraHit ? <p className="sl-ok">{yaraHit}</p> : null}
          </article>
        </section>
      ) : null}

      {view === "challenges" ? (
        <section className="security-workbench sl-challenges">
          {challenges.map((challenge) => (
            <article className="sl-panel" key={challenge.id}>
              <header className="sl-head"><span>{challenge.kind}</span></header>
              <h2>{challenge.title}</h2>
              <p className="sl-copy">{challenge.prompt}</p>
              <ol className="sl-flow">
                {["Run", "Inspect", "Cause", "Patch"].map((step) => <li key={step}>{step}</li>)}
              </ol>
              <button className="sl-btn" type="button" data-kind="ghost" onClick={() => setRevealId(challenge.id)}>Revelar gabarito</button>
              {revealId === challenge.id ? <p className="sl-ok">{challenge.reveal}</p> : null}
            </article>
          ))}
        </section>
      ) : null}

      <footer className="security-lab-footer">
        <FlaskConical size={12} />
        <span>Understand → Break → Observe → Fix → Detect</span>
        <div>
          <Link href="/learn/security-research">Trilha</Link>
          <Link href="/labs/low-level"><Terminal size={11} />Low-Level</Link>
          <Link href="/labs/memory">Memory</Link>
          <Link href="/labs/assembly">Assembly</Link>
          <Link href="/labs/windows">Windows</Link>
          <Link href="/labs/network">Network</Link>
        </div>
      </footer>
    </div>
  );
}
