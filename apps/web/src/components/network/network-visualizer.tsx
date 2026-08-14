"use client";

import {
  Activity,
  ArrowDown,
  ArrowRight,
  Binary,
  Boxes,
  Braces,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clock3,
  Code2,
  Cpu,
  Globe2,
  Layers3,
  ListTree,
  Network,
  Pause,
  Play,
  Radio,
  RefreshCw,
  RotateCcw,
  Router,
  Send,
  Server,
  Settings2,
  ShieldCheck,
  TerminalSquare,
  WifiOff
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  buildNetworkTrace,
  formatPacketHex,
  NETWORK_PRESETS,
  type NetworkActor,
  type NetworkConfig,
  type NetworkPresetId,
  type NetworkTrace,
  type NetworkTraceEvent,
  type PacketLayer,
  type SimulatedPacket
} from "./network-simulator";

type NetworkView = "topology" | "encapsulation" | "flow" | "sockets";
type SocketApi = "posix" | "winsock";

const ACTORS: readonly { readonly id: NetworkActor; readonly label: string; readonly detail: string; readonly icon: typeof Cpu }[] = [
  { id: "client-app", label: "App", detail: "client", icon: Code2 },
  { id: "client-kernel", label: "Kernel", detail: "client", icon: Cpu },
  { id: "client-nic", label: "NIC", detail: "client", icon: Radio },
  { id: "router", label: "Router", detail: "L3", icon: Router },
  { id: "server-nic", label: "NIC", detail: "server", icon: Radio },
  { id: "server-kernel", label: "Kernel", detail: "server", icon: Cpu },
  { id: "server-app", label: "App", detail: "server", icon: Server }
] as const;

const VIEW_TABS: readonly { readonly id: NetworkView; readonly label: string; readonly icon: typeof Network }[] = [
  { id: "topology", label: "Topology", icon: Network },
  { id: "encapsulation", label: "Encapsulation", icon: Layers3 },
  { id: "flow", label: "Packet flow", icon: ListTree },
  { id: "sockets", label: "Socket API", icon: TerminalSquare }
] as const;

function clampNumber(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function socketSource(trace: NetworkTrace, api: SocketApi, config: NetworkConfig): readonly { readonly code: string; readonly token: string }[] {
  if (trace.protocol === "TCP") {
    return api === "posix" ? [
      { code: "int fd = socket(AF_INET, SOCK_STREAM, 0);", token: "socket(" },
      { code: `connect(fd, ${config.serverIp}:${config.serverPort}, ...);`, token: "connect(" },
      { code: `send(fd, buffer, ${new TextEncoder().encode(config.payload).length}, 0);`, token: "send(" },
      { code: "ssize_t n = recv(fd, buffer, capacity, 0);", token: "recv(" },
      { code: "shutdown(fd, SHUT_WR);", token: "shutdown(" },
      { code: "close(fd);", token: "close(" }
    ] : [
      { code: "WSAStartup(MAKEWORD(2, 2), &wsa);", token: "WSAStartup" },
      { code: "SOCKET s = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);", token: "socket(" },
      { code: `connect(s, ${config.serverIp}:${config.serverPort}, ...);`, token: "connect(" },
      { code: `send(s, buffer, ${new TextEncoder().encode(config.payload).length}, 0);`, token: "send(" },
      { code: "int n = recv(s, buffer, capacity, 0);", token: "recv(" },
      { code: "shutdown(s, SD_SEND);", token: "shutdown(" },
      { code: "closesocket(s);", token: "close(" },
      { code: "WSACleanup();", token: "release" }
    ];
  }

  const socketType = trace.protocol === "UDP" ? "SOCK_DGRAM, IPPROTO_UDP" : "SOCK_DGRAM, IPPROTO_ICMP";
  return api === "posix" ? [
    { code: `int fd = socket(AF_INET, ${socketType});`, token: "socket(" },
    { code: "sendto(fd, message, length, 0, &target, sizeof target);", token: "sendto(" },
    { code: "ssize_t n = recvfrom(fd, reply, capacity, 0, &peer, &len);", token: "recvfrom(" },
    { code: "close(fd);", token: "close(" }
  ] : [
    { code: "WSAStartup(MAKEWORD(2, 2), &wsa);", token: "WSAStartup" },
    { code: `SOCKET s = socket(AF_INET, ${socketType});`, token: "socket(" },
    { code: "sendto(s, message, length, 0, &target, sizeof target);", token: "sendto(" },
    { code: "int n = recvfrom(s, reply, capacity, 0, &peer, &len);", token: "recvfrom(" },
    { code: "closesocket(s);", token: "close(" },
    { code: "WSACleanup();", token: "release" }
  ];
}

export function NetworkVisualizer() {
  const [config, setConfig] = useState<NetworkConfig>({ ...NETWORK_PRESETS[0]!.config });
  const [view, setView] = useState<NetworkView>("topology");
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selectedLayerId, setSelectedLayerId] = useState<PacketLayer["id"]>("transport");
  const [socketApi, setSocketApi] = useState<SocketApi>("posix");
  const trace = useMemo(() => buildNetworkTrace(config), [config]);
  const safeStepIndex = Math.min(stepIndex, Math.max(0, trace.events.length - 1));
  const event = trace.events[safeStepIndex] ?? trace.events[0]!;

  useEffect(() => {
    setStepIndex(0);
    setPlaying(false);
  }, [trace.fingerprint]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setStepIndex((current) => {
      if (current >= trace.events.length - 1) {
        setPlaying(false);
        return current;
      }
      return current + 1;
    }), 1_250);
    return () => window.clearInterval(timer);
  }, [playing, trace.events.length]);

  function choosePreset(id: NetworkPresetId) {
    const preset = NETWORK_PRESETS.find((item) => item.id === id);
    if (preset) setConfig({ ...preset.config });
  }

  function updateConfig<Key extends keyof NetworkConfig>(key: Key, value: NetworkConfig[Key]) {
    setConfig((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="network-lab-shell">
      <header className="network-lab-header">
        <div className="network-title">
          <span className="network-mark"><Network size={16} /></span>
          <div><span>NETWORK LAB</span><strong>Packet &amp; Protocol Workbench</strong></div>
        </div>
        <div className="network-trace-meta">
          <span><CircleDot size={9} />TRACE {trace.fingerprint.toUpperCase()}</span>
          <span><ShieldCheck size={10} />EDUCATIONAL SIMULATION</span>
          <span><WifiOff size={10} />NO REAL NETWORK TRAFFIC</span>
        </div>
      </header>

      <nav className="network-view-tabs" aria-label="Ferramentas do Network Lab">
        {VIEW_TABS.map(({ id, label, icon: Icon }) => <button type="button" key={id} data-active={view === id} onClick={() => setView(id)}><Icon size={13} /><span>{label}</span></button>)}
        <span className="network-tabs-spacer" />
        <div className="network-live-summary"><i data-protocol={trace.protocol}>{trace.protocol}</i><span>{trace.packetCount} packets</span><span>{trace.wireBytes} modeled bytes</span><span>MTU {config.mtu}</span></div>
      </nav>

      <section className="network-workbench">
        <ScenarioBuilder config={config} trace={trace} onChoosePreset={choosePreset} onUpdate={updateConfig} />

        <main className="network-stage">
          {view === "topology" ? <TopologyView event={event} trace={trace} config={config} /> : null}
          {view === "encapsulation" ? <EncapsulationView packet={event.packet} selectedLayerId={selectedLayerId} onSelectLayer={setSelectedLayerId} /> : null}
          {view === "flow" ? <FlowView trace={trace} currentIndex={safeStepIndex} onSelect={setStepIndex} /> : null}
          {view === "sockets" ? <SocketView trace={trace} config={config} event={event} api={socketApi} onApiChange={setSocketApi} /> : null}
        </main>

        <PacketInspector event={event} selectedLayerId={selectedLayerId} onSelectLayer={setSelectedLayerId} />
      </section>

      <footer className="network-controls">
        <div className="network-transport">
          <button type="button" aria-label="Reiniciar trace" onClick={() => { setStepIndex(0); setPlaying(false); }}><RotateCcw size={13} /></button>
          <button type="button" aria-label="Passo anterior" disabled={safeStepIndex === 0} onClick={() => { setStepIndex((value) => Math.max(0, value - 1)); setPlaying(false); }}><ChevronLeft size={14} /></button>
          <button className="network-play" type="button" onClick={() => setPlaying((value) => !value)}>{playing ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}{playing ? "Pause" : "Play trace"}</button>
          <button type="button" aria-label="Próximo passo" disabled={safeStepIndex === trace.events.length - 1} onClick={() => { setStepIndex((value) => Math.min(trace.events.length - 1, value + 1)); setPlaying(false); }}><ChevronRight size={14} /></button>
        </div>
        <div className="network-timeline" aria-label="Linha do tempo dos pacotes">
          {trace.events.map((item) => <button type="button" key={item.id} data-complete={item.index <= safeStepIndex} data-current={item.index === safeStepIndex} data-packet={Boolean(item.packet)} title={`${item.index + 1}. ${item.title}`} onClick={() => { setStepIndex(item.index); setPlaying(false); }}><i /><span>{String(item.index + 1).padStart(2, "0")}</span><small>{item.phase}</small></button>)}
        </div>
        <div className="network-step-count"><span>STEP</span><strong>{String(safeStepIndex + 1).padStart(2, "0")} / {String(trace.events.length).padStart(2, "0")}</strong><small>T+{event.elapsedMs} ms · modeled</small></div>
      </footer>
    </div>
  );
}

interface ScenarioBuilderProps {
  readonly config: NetworkConfig;
  readonly trace: NetworkTrace;
  readonly onChoosePreset: (id: NetworkPresetId) => void;
  readonly onUpdate: <Key extends keyof NetworkConfig>(key: Key, value: NetworkConfig[Key]) => void;
}

function ScenarioBuilder({ config, trace, onChoosePreset, onUpdate }: ScenarioBuilderProps) {
  return (
    <aside className="network-scenario-panel">
      <header><Settings2 size={12} /><strong>TRACE BUILDER</strong><small>editable</small></header>
      <section className="network-presets">
        <span>SCENARIO</span>
        <div>{NETWORK_PRESETS.map((preset) => <button type="button" key={preset.id} data-active={config.preset === preset.id} title={preset.description} onClick={() => onChoosePreset(preset.id)}><strong>{preset.name}</strong><small>{preset.protocol}</small></button>)}</div>
      </section>
      <section className="network-config-form">
        <label><span>Client IPv4</span><input aria-label="Client IPv4" value={config.clientIp} spellCheck={false} onChange={(input) => onUpdate("clientIp", input.target.value)} /></label>
        <label><span>Server IPv4</span><input aria-label="Server IPv4" value={config.serverIp} spellCheck={false} onChange={(input) => onUpdate("serverIp", input.target.value)} /></label>
        <div>
          <label><span>Client port</span><input aria-label="Client port" type="number" disabled={config.preset === "icmp"} value={config.clientPort} onChange={(input) => onUpdate("clientPort", clampNumber(input.target.value, 0))} /></label>
          <label><span>Server port</span><input aria-label="Server port" type="number" disabled={config.preset === "icmp"} value={config.serverPort} onChange={(input) => onUpdate("serverPort", clampNumber(input.target.value, 0))} /></label>
        </div>
        <label><span>MTU (bytes)</span><input aria-label="MTU em bytes" type="number" min={68} max={9000} value={config.mtu} onChange={(input) => onUpdate("mtu", clampNumber(input.target.value, 1500))} /></label>
        <label className="network-payload-field"><span>Application payload</span><textarea aria-label="Application payload" value={config.payload} spellCheck={false} onChange={(input) => onUpdate("payload", input.target.value)} /></label>
      </section>
      <section className="network-model-stats">
        <header><Activity size={11} /><span>MODEL OUTPUT</span></header>
        <dl><div><dt>Transport</dt><dd>{trace.protocol}</dd></div><div><dt>MSS / max data</dt><dd>{trace.mss} B</dd></div><div><dt>Packets</dt><dd>{trace.packetCount}</dd></div><div><dt>Wire bytes</dt><dd>{trace.wireBytes} B</dd></div></dl>
      </section>
      {trace.warnings.length ? <section className="network-warnings">{trace.warnings.map((warning) => <p key={warning}><CircleDot size={8} />{warning}</p>)}</section> : <section className="network-valid"><CheckCircle2 size={11} /><span>Scenario model is internally valid.</span></section>}
    </aside>
  );
}

function TopologyView({ event, trace, config }: { readonly event: NetworkTraceEvent; readonly trace: NetworkTrace; readonly config: NetworkConfig }) {
  return (
    <div className="network-topology-view" aria-label="Topologia interativa da rede">
      <header className="network-stage-header"><div><Network size={12} /><strong>LOGICAL PACKET PATH</strong></div><span>RFC 5737 documentation addresses · simulated route</span></header>
      <div className="network-endpoint-state client"><span>CLIENT SOCKET</span><strong>{event.clientState}</strong><code>{config.clientIp}{trace.protocol === "ICMP" ? "" : `:${config.clientPort}`}</code></div>
      <div className="network-endpoint-state server"><span>SERVER SOCKET</span><strong>{event.serverState}</strong><code>{config.serverIp}{trace.protocol === "ICMP" ? "" : `:${config.serverPort}`}</code></div>
      <div className="network-path">
        {ACTORS.map(({ id, label, detail, icon: Icon }, index) => <div className="network-path-part" key={id}>{index ? <div className="network-path-link"><ArrowRight size={12} /></div> : null}<article data-active={event.actor === id} title={`${detail} ${label}`}><span><Icon size={15} /></span><strong>{label}</strong><small>{detail}</small></article></div>)}
        {event.packet ? <div key={event.id} className="network-moving-packet" data-direction={event.packet.direction}><Send size={11} /><strong>{event.packet.label}</strong><small>{event.packet.totalBytes} B</small></div> : null}
      </div>
      <div className="network-route-facts"><span><Globe2 size={11} />IPv4 route</span><code>{config.clientIp} → 192.0.2.1 → 198.51.100.1 → {config.serverIp}</code><span><Boxes size={11} />MTU {config.mtu} · no real interfaces</span></div>
      <section className="network-current-event" data-packet={Boolean(event.packet)}>
        <span>{String(event.index + 1).padStart(2, "0")}</span>
        <div><small>{event.phase}</small><h2>{event.title}</h2><p>{event.detail}</p></div>
        <dl><div><dt>Application</dt><dd>{event.socketCall}</dd></div><div><dt>Kernel</dt><dd>{event.kernelAction}</dd></div></dl>
      </section>
    </div>
  );
}

function EncapsulationView({ packet, selectedLayerId, onSelectLayer }: { readonly packet: SimulatedPacket | undefined; readonly selectedLayerId: PacketLayer["id"]; readonly onSelectLayer: (id: PacketLayer["id"]) => void }) {
  if (!packet) return <NetworkEmpty icon={<Layers3 size={24} />} title="No packet in this event" detail="Advance to a timeline step marked with a packet dot to inspect encapsulation." />;
  const layer = packet.layers.find((item) => item.id === selectedLayerId) ?? packet.layers[1]!;
  return (
    <div className="network-encapsulation-view" aria-label="Inspector de encapsulamento">
      <header className="network-stage-header"><div><Layers3 size={12} /><strong>ENCAPSULATION STACK</strong></div><span>{packet.direction} · {packet.totalBytes} modeled bytes</span></header>
      <div className="encapsulation-canvas">
        <div className="encapsulation-nested">
          {[...packet.layers].reverse().map((item, index) => <button type="button" key={item.id} data-layer={item.id} data-active={item.id === layer.id} onClick={() => onSelectLayer(item.id)} style={{ inset: `${index * 31}px` }}><span>{item.name}</span><strong>{item.protocol}</strong><code>{item.totalBytes} B</code><small>{item.headerBytes.length ? `${item.headerBytes.length} B header` : `${item.payloadBytes} B payload`}</small></button>)}
        </div>
        <div className="encapsulation-direction"><span>APPLICATION BYTES</span>{packet.direction === "outbound" ? <ArrowDown size={15} /> : <RefreshCw size={15} />}<span>{packet.direction === "outbound" ? "ENCAPSULATE" : "DECAPSULATE"}</span></div>
      </div>
      <section className="network-layer-detail">
        <header><div><span>{layer.name}</span><strong>{layer.protocol}</strong></div><code>{layer.unit} · {layer.totalBytes} B</code></header>
        <div>{layer.fields.map((field) => <dl key={field.label}><dt>{field.label}</dt><dd data-accent={field.accent}>{field.value}</dd></dl>)}</div>
        <footer><span>HEADER BYTES</span><code>{layer.headerBytes.length ? layer.headerBytes.map((byte) => byte.toString(16).padStart(2, "0")).join(" ") : "No separate header at this layer"}</code></footer>
      </section>
    </div>
  );
}

function FlowView({ trace, currentIndex, onSelect }: { readonly trace: NetworkTrace; readonly currentIndex: number; readonly onSelect: (index: number) => void }) {
  return (
    <div className="network-flow-view" aria-label="Fluxo temporal de pacotes">
      <header className="network-stage-header"><div><ListTree size={12} /><strong>SEQUENCE &amp; KERNEL STATE</strong></div><span>{trace.events.length} observable educational events</span></header>
      <div className="network-flow-head"><span>TIME</span><span>CLIENT</span><span>NETWORK</span><span>SERVER</span><span>STATE / API</span></div>
      <div className="network-flow-rows">
        {trace.events.map((item) => {
          const outbound = item.packet?.direction === "outbound";
          const inbound = item.packet?.direction === "inbound";
          return <button type="button" key={item.id} data-current={item.index === currentIndex} data-packet={Boolean(item.packet)} onClick={() => onSelect(item.index)}><time>T+{String(item.elapsedMs).padStart(3, "0")}</time><div className="flow-client">{!inbound ? <i /> : null}<span>{item.actor.startsWith("client") ? item.phase : ""}</span></div><div className="flow-wire">{item.packet ? <><ArrowRight data-direction={item.packet.direction} size={15} /><strong>{item.packet.label}</strong><small>{item.packet.totalBytes} B</small></> : <span>kernel / app event</span>}</div><div className="flow-server">{!outbound ? <i /> : null}<span>{item.actor.startsWith("server") ? item.phase : ""}</span></div><div className="flow-state"><strong>{item.clientState} / {item.serverState}</strong><code>{item.socketCall}</code></div></button>;
        })}
      </div>
    </div>
  );
}

function SocketView({ trace, config, event, api, onApiChange }: { readonly trace: NetworkTrace; readonly config: NetworkConfig; readonly event: NetworkTraceEvent; readonly api: SocketApi; readonly onApiChange: (api: SocketApi) => void }) {
  const lines = socketSource(trace, api, config);
  return (
    <div className="network-socket-view" aria-label="Comparador de APIs de socket">
      <header className="network-stage-header"><div><TerminalSquare size={12} /><strong>SOCKET API → KERNEL STATE</strong></div><div className="socket-api-switch"><button type="button" data-active={api === "posix"} onClick={() => onApiChange("posix")}>POSIX</button><button type="button" data-active={api === "winsock"} onClick={() => onApiChange("winsock")}>Winsock</button></div></header>
      <div className="socket-workspace">
        <section className="socket-code-panel">
          <header><Code2 size={11} /><span>{api === "posix" ? "client.c · Linux/POSIX" : "client.c · Windows/Winsock"}</span></header>
          <pre>{lines.map((line, index) => <code key={line.code} data-active={event.socketCall.includes(line.token)}><span>{String(index + 1).padStart(2, "0")}</span>{line.code}</code>)}</pre>
          <footer><Braces size={11} /><span>Conceptual API mapping · editable scenario values are inserted above.</span></footer>
        </section>
        <section className="socket-boundary-panel">
          <article data-active={event.actor.endsWith("app")}><span>USER SPACE</span><strong>{event.socketCall}</strong><small>application-visible operation</small></article>
          <ArrowDown size={15} />
          <article data-active={event.actor.includes("kernel")}><span>SYSCALL / WINSOCK BOUNDARY</span><strong>{event.kernelAction}</strong><small>modeled kernel transition</small></article>
          <ArrowDown size={15} />
          <article data-active={Boolean(event.packet)}><span>PROTOCOL STACK</span><strong>{event.packet ? `${event.packet.protocol} · ${event.packet.totalBytes} bytes` : "no packet emitted"}</strong><small>routing, queues and transport state</small></article>
          <dl><div><dt>Client state</dt><dd>{event.clientState}</dd></div><div><dt>Server state</dt><dd>{event.serverState}</dd></div></dl>
        </section>
      </div>
    </div>
  );
}

function PacketInspector({ event, selectedLayerId, onSelectLayer }: { readonly event: NetworkTraceEvent; readonly selectedLayerId: PacketLayer["id"]; readonly onSelectLayer: (id: PacketLayer["id"]) => void }) {
  const packet = event.packet;
  const layer = packet?.layers.find((item) => item.id === selectedLayerId) ?? packet?.layers[1];
  return (
    <aside className="network-packet-inspector">
      <header><Binary size={12} /><strong>PACKET INSPECTOR</strong><small>{packet ? packet.id : "no packet"}</small></header>
      {packet ? <>
        <section className="network-packet-summary"><div><span>{packet.protocol}</span><strong>{packet.label}</strong></div><small>{packet.direction} · {packet.source} → {packet.destination}</small><dl><div><dt>Frame</dt><dd>{packet.totalBytes} B</dd></div><div><dt>Payload</dt><dd>{packet.payloadBytes} B</dd></div></dl></section>
        <section className="network-layer-tabs">{packet.layers.map((item) => <button type="button" key={item.id} data-active={item.id === layer?.id} onClick={() => onSelectLayer(item.id)}><span>{item.name}</span><strong>{item.protocol}</strong><code>{item.totalBytes} B</code></button>)}</section>
        {layer ? <section className="network-field-list"><header><span>{layer.protocol} FIELDS</span><small>source-derived model</small></header>{layer.fields.map((field) => <div key={field.label}><span>{field.label}</span><code data-accent={field.accent}>{field.value}</code></div>)}</section> : null}
        {packet.protocol === "TCP" ? <section className="network-flag-bits"><span>TCP FLAGS</span><div>{["CWR", "ECE", "URG", "ACK", "PSH", "RST", "SYN", "FIN"].map((flag) => <i key={flag} data-set={packet.flags.includes(flag)}>{flag}</i>)}</div></section> : null}
        <section className="network-hex"><header><span>SIMULATED FRAME BYTES</span><small>checksum fields = 00 00</small></header><pre>{formatPacketHex(packet.bytes).slice(0, 8).map((line) => <code key={line}>{line}</code>)}</pre></section>
        <section className="network-provenance"><ShieldCheck size={11} /><p><strong>EDUCATIONAL SIMULATION</strong> Bytes determinísticos; checksums não calculados, FCS omitido e nenhum pacote foi transmitido.</p></section>
      </> : <div className="network-inspector-empty"><Network size={22} /><strong>No packet in this event</strong><span>{event.title}</span><code>{event.socketCall}</code><p>Application and kernel events can change socket state without placing bytes on the wire.</p></div>}
    </aside>
  );
}

function NetworkEmpty({ icon, title, detail }: { readonly icon: ReactNode; readonly title: string; readonly detail: string }) {
  return <div className="network-empty-state">{icon}<strong>{title}</strong><p>{detail}</p></div>;
}
