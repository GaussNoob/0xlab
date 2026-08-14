export type NetworkPresetId = "http" | "dns" | "echo" | "icmp";
export type TransportProtocol = "TCP" | "UDP" | "ICMP";
export type PacketDirection = "outbound" | "inbound";
export type NetworkActor = "client-app" | "client-kernel" | "client-nic" | "router" | "server-nic" | "server-kernel" | "server-app";

export interface NetworkConfig {
  readonly preset: NetworkPresetId;
  readonly clientIp: string;
  readonly serverIp: string;
  readonly clientPort: number;
  readonly serverPort: number;
  readonly mtu: number;
  readonly payload: string;
}

export interface NetworkPreset {
  readonly id: NetworkPresetId;
  readonly name: string;
  readonly protocol: string;
  readonly description: string;
  readonly config: NetworkConfig;
}

export interface PacketField {
  readonly label: string;
  readonly value: string;
  readonly accent?: boolean;
}

export interface PacketLayer {
  readonly id: "application" | "transport" | "internet" | "link";
  readonly name: string;
  readonly protocol: string;
  readonly unit: string;
  readonly headerBytes: readonly number[];
  readonly payloadBytes: number;
  readonly totalBytes: number;
  readonly fields: readonly PacketField[];
}

export interface SimulatedPacket {
  readonly id: string;
  readonly direction: PacketDirection;
  readonly protocol: TransportProtocol;
  readonly label: string;
  readonly flags: readonly string[];
  readonly source: string;
  readonly destination: string;
  readonly sequence?: number;
  readonly acknowledgment?: number;
  readonly payloadPreview: string;
  readonly payloadBytes: number;
  readonly totalBytes: number;
  readonly layers: readonly PacketLayer[];
  readonly bytes: readonly number[];
  readonly checksumStatus: "not-calculated";
}

export interface NetworkTraceEvent {
  readonly id: string;
  readonly index: number;
  readonly elapsedMs: number;
  readonly phase: string;
  readonly title: string;
  readonly detail: string;
  readonly actor: NetworkActor;
  readonly location: number;
  readonly clientState: string;
  readonly serverState: string;
  readonly socketCall: string;
  readonly kernelAction: string;
  readonly packet?: SimulatedPacket;
}

export interface NetworkTrace {
  readonly fingerprint: string;
  readonly protocol: TransportProtocol;
  readonly events: readonly NetworkTraceEvent[];
  readonly packetCount: number;
  readonly wireBytes: number;
  readonly warnings: readonly string[];
  readonly mss: number;
}

export const NETWORK_PRESETS: readonly NetworkPreset[] = [
  {
    id: "http",
    name: "HTTP GET",
    protocol: "HTTP / TCP",
    description: "Handshake, request, response e encerramento TCP.",
    config: {
      preset: "http",
      clientIp: "192.0.2.10",
      serverIp: "198.51.100.20",
      clientPort: 51842,
      serverPort: 8080,
      mtu: 1500,
      payload: "GET /systems HTTP/1.1\r\nHost: lab.local\r\n\r\n"
    }
  },
  {
    id: "dns",
    name: "DNS query",
    protocol: "DNS / UDP",
    description: "Consulta e resposta sem conexão de transporte.",
    config: {
      preset: "dns",
      clientIp: "192.0.2.10",
      serverIp: "198.51.100.53",
      clientPort: 53000,
      serverPort: 53,
      mtu: 1500,
      payload: "A lab.example"
    }
  },
  {
    id: "echo",
    name: "TCP echo",
    protocol: "Custom / TCP",
    description: "Stream TCP customizável com segmentação por MSS.",
    config: {
      preset: "echo",
      clientIp: "192.0.2.10",
      serverIp: "198.51.100.20",
      clientPort: 49152,
      serverPort: 9000,
      mtu: 576,
      payload: "hello from 0xLAB"
    }
  },
  {
    id: "icmp",
    name: "ICMP echo",
    protocol: "ICMP / IPv4",
    description: "Echo request/reply sem portas ou socket de stream.",
    config: {
      preset: "icmp",
      clientIp: "192.0.2.10",
      serverIp: "198.51.100.20",
      clientPort: 0,
      serverPort: 0,
      mtu: 1500,
      payload: "0xLAB ping payload"
    }
  }
] as const;

const encoder = new TextEncoder();

function hashText(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function isIpv4(value: string): boolean {
  const parts = value.split(".");
  return parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
}

function ipv4Bytes(value: string): number[] {
  if (!isIpv4(value)) return [0, 0, 0, 0];
  return value.split(".").map(Number);
}

function u16(value: number): number[] {
  const normalized = Math.max(0, Math.min(0xffff, Math.trunc(value)));
  return [(normalized >>> 8) & 0xff, normalized & 0xff];
}

function u32(value: number): number[] {
  const normalized = value >>> 0;
  return [(normalized >>> 24) & 0xff, (normalized >>> 16) & 0xff, (normalized >>> 8) & 0xff, normalized & 0xff];
}

function tcpFlagMask(flags: readonly string[]): number {
  const values: Readonly<Record<string, number>> = { FIN: 0x01, SYN: 0x02, RST: 0x04, PSH: 0x08, ACK: 0x10, URG: 0x20, ECE: 0x40, CWR: 0x80 };
  return flags.reduce((mask, flag) => mask | (values[flag] ?? 0), 0);
}

function preview(bytes: readonly number[]): string {
  const text = new TextDecoder().decode(Uint8Array.from(bytes)).replace(/[\r\n\t]+/g, " ").trim();
  if (!text) return "no application payload";
  return text.length > 58 ? `${text.slice(0, 57)}…` : text;
}

interface PacketInput {
  readonly id: string;
  readonly config: NetworkConfig;
  readonly protocol: TransportProtocol;
  readonly direction: PacketDirection;
  readonly label: string;
  readonly flags?: readonly string[];
  readonly sequence?: number;
  readonly acknowledgment?: number;
  readonly payload?: readonly number[];
}

function makePacket(input: PacketInput): SimulatedPacket {
  const payload = [...(input.payload ?? [])];
  const outbound = input.direction === "outbound";
  const sourceIp = outbound ? input.config.clientIp : input.config.serverIp;
  const destinationIp = outbound ? input.config.serverIp : input.config.clientIp;
  const sourcePort = outbound ? input.config.clientPort : input.config.serverPort;
  const destinationPort = outbound ? input.config.serverPort : input.config.clientPort;
  const flags = input.flags ?? [];

  let transportHeader: number[];
  let transportFields: PacketField[];
  if (input.protocol === "TCP") {
    transportHeader = [
      ...u16(sourcePort), ...u16(destinationPort),
      ...u32(input.sequence ?? 0), ...u32(input.acknowledgment ?? 0),
      0x50, tcpFlagMask(flags), ...u16(64240), 0x00, 0x00, 0x00, 0x00
    ];
    transportFields = [
      { label: "Source port", value: String(sourcePort) },
      { label: "Destination port", value: String(destinationPort) },
      { label: "Sequence", value: String(input.sequence ?? 0) },
      { label: "Acknowledgment", value: String(input.acknowledgment ?? 0) },
      { label: "Flags", value: flags.join(" ") || "none", accent: true },
      { label: "Window", value: "64240" },
      { label: "Checksum", value: "00 00 · not calculated" }
    ];
  } else if (input.protocol === "UDP") {
    transportHeader = [...u16(sourcePort), ...u16(destinationPort), ...u16(8 + payload.length), 0x00, 0x00];
    transportFields = [
      { label: "Source port", value: String(sourcePort) },
      { label: "Destination port", value: String(destinationPort) },
      { label: "Datagram length", value: `${8 + payload.length} B` },
      { label: "Checksum", value: "00 00 · not calculated" }
    ];
  } else {
    const reply = input.direction === "inbound";
    transportHeader = [reply ? 0x00 : 0x08, 0x00, 0x00, 0x00, 0x0a, 0xb0, 0x00, 0x01];
    transportFields = [
      { label: "Type", value: reply ? "0 · Echo reply" : "8 · Echo request", accent: true },
      { label: "Code", value: "0" },
      { label: "Identifier", value: "0x0ab0" },
      { label: "Sequence", value: "1" },
      { label: "Checksum", value: "00 00 · not calculated" }
    ];
  }

  const protocolNumber = input.protocol === "TCP" ? 6 : input.protocol === "UDP" ? 17 : 1;
  const ipTotalLength = 20 + transportHeader.length + payload.length;
  const internetHeader = [
    0x45, 0x00, ...u16(ipTotalLength), 0x12, 0x34, 0x40, 0x00,
    64, protocolNumber, 0x00, 0x00, ...ipv4Bytes(sourceIp), ...ipv4Bytes(destinationIp)
  ];
  const linkHeader = outbound
    ? [0x02, 0x00, 0x00, 0x00, 0x00, 0x02, 0x02, 0x00, 0x00, 0x00, 0x00, 0x01, 0x08, 0x00]
    : [0x02, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x00, 0x00, 0x00, 0x00, 0x02, 0x08, 0x00];
  const bytes = [...linkHeader, ...internetHeader, ...transportHeader, ...payload];
  const applicationProtocol = input.config.preset === "http" ? "HTTP/1.1" : input.config.preset === "dns" ? "DNS" : input.config.preset === "echo" ? "ECHO" : "DATA";
  const sourceEndpoint = input.protocol === "ICMP" ? sourceIp : `${sourceIp}:${sourcePort}`;
  const destinationEndpoint = input.protocol === "ICMP" ? destinationIp : `${destinationIp}:${destinationPort}`;

  return {
    id: input.id,
    direction: input.direction,
    protocol: input.protocol,
    label: input.label,
    flags,
    source: sourceEndpoint,
    destination: destinationEndpoint,
    ...(input.sequence === undefined ? {} : { sequence: input.sequence }),
    ...(input.acknowledgment === undefined ? {} : { acknowledgment: input.acknowledgment }),
    payloadPreview: preview(payload),
    payloadBytes: payload.length,
    totalBytes: bytes.length,
    layers: [
      {
        id: "application",
        name: "Application",
        protocol: applicationProtocol,
        unit: "message",
        headerBytes: [],
        payloadBytes: payload.length,
        totalBytes: payload.length,
        fields: [
          { label: "Payload", value: preview(payload) },
          { label: "Length", value: `${payload.length} B` }
        ]
      },
      {
        id: "transport",
        name: "Transport",
        protocol: input.protocol,
        unit: input.protocol === "UDP" ? "datagram" : input.protocol === "ICMP" ? "message" : "segment",
        headerBytes: transportHeader,
        payloadBytes: payload.length,
        totalBytes: transportHeader.length + payload.length,
        fields: transportFields
      },
      {
        id: "internet",
        name: "Internet",
        protocol: "IPv4",
        unit: "packet",
        headerBytes: internetHeader,
        payloadBytes: transportHeader.length + payload.length,
        totalBytes: ipTotalLength,
        fields: [
          { label: "Source", value: sourceIp },
          { label: "Destination", value: destinationIp },
          { label: "TTL", value: "64" },
          { label: "Protocol", value: `${protocolNumber} · ${input.protocol}` },
          { label: "Total length", value: `${ipTotalLength} B` },
          { label: "Checksum", value: "00 00 · not calculated" }
        ]
      },
      {
        id: "link",
        name: "Link",
        protocol: "Ethernet II",
        unit: "frame",
        headerBytes: linkHeader,
        payloadBytes: ipTotalLength,
        totalBytes: bytes.length,
        fields: [
          { label: "Source MAC", value: outbound ? "02:00:00:00:00:01" : "02:00:00:00:00:02" },
          { label: "Destination MAC", value: outbound ? "02:00:00:00:00:02" : "02:00:00:00:00:01" },
          { label: "EtherType", value: "0x0800 · IPv4" },
          { label: "Frame length", value: `${bytes.length} B (FCS omitted)` }
        ]
      }
    ],
    bytes,
    checksumStatus: "not-calculated"
  };
}

function chunkBytes(bytes: readonly number[], size: number): number[][] {
  if (!bytes.length) return [[]];
  const chunks: number[][] = [];
  for (let index = 0; index < bytes.length; index += size) chunks.push(bytes.slice(index, index + size));
  return chunks;
}

function collectWarnings(config: NetworkConfig): string[] {
  const warnings: string[] = [];
  if (!isIpv4(config.clientIp)) warnings.push("Client IPv4 is invalid; header bytes use 0.0.0.0 until corrected.");
  if (!isIpv4(config.serverIp)) warnings.push("Server IPv4 is invalid; header bytes use 0.0.0.0 until corrected.");
  if (config.preset !== "icmp" && (config.clientPort < 1 || config.clientPort > 65535)) warnings.push("Client port must be between 1 and 65535.");
  if (config.preset !== "icmp" && (config.serverPort < 1 || config.serverPort > 65535)) warnings.push("Server port must be between 1 and 65535.");
  if (config.mtu < 68 || config.mtu > 9000) warnings.push("MTU outside the supported educational range (68–9000 bytes).");
  if (!config.payload.length) warnings.push("Application payload is empty; control packets can still be inspected.");
  return warnings;
}

export function buildNetworkTrace(config: NetworkConfig): NetworkTrace {
  const events: NetworkTraceEvent[] = [];
  const warnings = collectWarnings(config);
  const protocol: TransportProtocol = config.preset === "dns" ? "UDP" : config.preset === "icmp" ? "ICMP" : "TCP";
  const safeMtu = Math.max(68, Math.min(9000, Math.trunc(config.mtu) || 1500));
  const mss = protocol === "TCP" ? Math.max(1, safeMtu - 40) : Math.max(1, safeMtu - 28);
  let elapsed = 0;
  let packetSerial = 0;
  let clientState = protocol === "TCP" ? "CLOSED" : "READY";
  let serverState = protocol === "TCP" ? "LISTEN" : "READY";

  const push = (event: Omit<NetworkTraceEvent, "id" | "index" | "elapsedMs" | "clientState" | "serverState"> & { readonly clientState?: string; readonly serverState?: string; readonly delay?: number }) => {
    elapsed += event.delay ?? (events.length ? 18 : 0);
    clientState = event.clientState ?? clientState;
    serverState = event.serverState ?? serverState;
    events.push({
      id: `event-${events.length}`,
      index: events.length,
      elapsedMs: elapsed,
      phase: event.phase,
      title: event.title,
      detail: event.detail,
      actor: event.actor,
      location: event.location,
      clientState,
      serverState,
      socketCall: event.socketCall,
      kernelAction: event.kernelAction,
      ...(event.packet === undefined ? {} : { packet: event.packet })
    });
  };

  const packet = (input: Omit<PacketInput, "id" | "config" | "protocol">) => makePacket({
    ...input,
    id: `packet-${packetSerial++}`,
    config,
    protocol
  });

  if (protocol === "TCP") {
    push({ phase: "SOCKET", title: "Socket criado", detail: "A aplicação pede ao kernel um endpoint TCP. Nenhum pacote foi enviado.", actor: "client-app", location: 0.02, socketCall: "socket(AF_INET, SOCK_STREAM, 0)", kernelAction: "allocate socket object", delay: 0 });
    push({ phase: "CONNECT", title: "connect() inicia a conexão", detail: "O kernel escolhe a porta local e prepara o TCP control block.", actor: "client-kernel", location: 0.12, socketCall: "connect(fd, server, addrlen)", kernelAction: "CLOSED → SYN-SENT", clientState: "SYN-SENT" });
    push({ phase: "SYN", title: "SYN atravessa a rede", detail: "O primeiro segmento sincroniza o número de sequência do cliente.", actor: "router", location: 0.5, socketCall: "connect() · blocked/pending", kernelAction: "route lookup → encapsulate → transmit", packet: packet({ direction: "outbound", label: "SYN", flags: ["SYN"], sequence: 1000, acknowledgment: 0 }) });
    push({ phase: "SYN-RECEIVED", title: "Servidor recebe SYN", detail: "O kernel cria uma conexão semiaberta na fila SYN.", actor: "server-kernel", location: 0.88, socketCall: "listen_fd · kernel event", kernelAction: "LISTEN → SYN-RECEIVED", serverState: "SYN-RECEIVED" });
    push({ phase: "SYN-ACK", title: "Servidor responde SYN-ACK", detail: "O servidor confirma seq 1000 e anuncia sua sequência inicial.", actor: "router", location: 0.5, socketCall: "listen_fd · kernel response", kernelAction: "transmit SYN+ACK", packet: packet({ direction: "inbound", label: "SYN ACK", flags: ["SYN", "ACK"], sequence: 7000, acknowledgment: 1001 }) });
    push({ phase: "ACK", title: "Cliente envia ACK", detail: "O terceiro segmento conclui o handshake no cliente.", actor: "client-kernel", location: 0.2, socketCall: "connect() → 0", kernelAction: "SYN-SENT → ESTABLISHED", clientState: "ESTABLISHED", packet: packet({ direction: "outbound", label: "ACK", flags: ["ACK"], sequence: 1001, acknowledgment: 7001 }) });
    push({ phase: "ACCEPT", title: "Servidor aceita a conexão", detail: "A conexão sai da fila de accept e recebe um novo file descriptor.", actor: "server-app", location: 0.98, socketCall: "accept(listen_fd, …) → client_fd", kernelAction: "SYN-RECEIVED → ESTABLISHED", serverState: "ESTABLISHED" });

    const payload = [...encoder.encode(config.payload)];
    const chunks = chunkBytes(payload, mss);
    let sequence = 1001;
    chunks.forEach((chunk, index) => {
      push({
        phase: chunks.length > 1 ? `DATA ${index + 1}/${chunks.length}` : "DATA",
        title: chunks.length > 1 ? `Segmento ${index + 1} de ${chunks.length}` : config.preset === "http" ? "HTTP request" : "Dados enviados",
        detail: `${chunk.length} byte(s) de aplicação são transportados pelo stream TCP.`,
        actor: "router",
        location: 0.52,
        socketCall: `send(fd, buffer + ${sequence - 1001}, ${chunk.length}, 0)`,
        kernelAction: `copy to send buffer → segment by MSS ${mss}`,
        packet: packet({ direction: "outbound", label: config.preset === "http" ? "HTTP REQUEST" : "PSH ACK", flags: ["PSH", "ACK"], sequence, acknowledgment: 7001, payload: chunk })
      });
      sequence += chunk.length;
    });
    push({ phase: "RECV", title: "Servidor lê o stream", detail: "TCP entrega uma sequência de bytes; limites de send não são preservados.", actor: "server-app", location: 0.98, socketCall: "recv(client_fd, buffer, capacity, 0)", kernelAction: "copy receive buffer → user buffer" });

    const responseBytes = [...encoder.encode(config.preset === "http" ? "HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nOK" : config.payload)];
    push({ phase: "RESPONSE", title: config.preset === "http" ? "HTTP response" : "Echo response", detail: "A resposta usa o mesmo stream full-duplex no sentido oposto.", actor: "router", location: 0.48, socketCall: `send(client_fd, response, ${responseBytes.length}, 0)`, kernelAction: "enqueue → segment → transmit", packet: packet({ direction: "inbound", label: config.preset === "http" ? "HTTP 200" : "ECHO", flags: ["PSH", "ACK"], sequence: 7001, acknowledgment: sequence, payload: responseBytes }) });
    push({ phase: "FIN", title: "Cliente inicia shutdown", detail: "FIN encerra apenas o fluxo de envio do cliente.", actor: "router", location: 0.5, socketCall: "shutdown(fd, SHUT_WR)", kernelAction: "ESTABLISHED → FIN-WAIT-1", clientState: "FIN-WAIT-1", packet: packet({ direction: "outbound", label: "FIN ACK", flags: ["FIN", "ACK"], sequence, acknowledgment: 7001 + responseBytes.length }) });
    push({ phase: "CLOSE", title: "Conexão encerrada", detail: "O modelo resume os ACK/FIN finais e libera os objetos de socket.", actor: "client-kernel", location: 0.12, socketCall: "close(fd) / closesocket(s)", kernelAction: "release socket state", clientState: "CLOSED", serverState: "CLOSED" });
  } else if (protocol === "UDP") {
    push({ phase: "SOCKET", title: "Socket UDP criado", detail: "UDP não executa handshake e não mantém estado de conexão obrigatório.", actor: "client-app", location: 0.02, socketCall: "socket(AF_INET, SOCK_DGRAM, 0)", kernelAction: "allocate datagram socket", delay: 0 });
    const queryBytes = [...encoder.encode(config.payload)];
    push({ phase: "QUERY", title: "DNS query", detail: "A consulta inteira cabe em um datagrama UDP neste cenário.", actor: "router", location: 0.5, socketCall: `sendto(fd, query, ${queryBytes.length}, 0, dns, …)`, kernelAction: "build UDP datagram → IPv4 route", packet: packet({ direction: "outbound", label: "DNS QUERY", payload: queryBytes }) });
    push({ phase: "PARSE", title: "Servidor interpreta a consulta", detail: "O processo recebe um datagrama com fronteira de mensagem preservada.", actor: "server-app", location: 0.98, socketCall: "recvfrom(fd, buffer, capacity, 0, …)", kernelAction: "demultiplex by destination port" });
    const responseBytes = [...encoder.encode("A lab.example → 198.51.100.20 · TTL 300")];
    push({ phase: "RESPONSE", title: "DNS response", detail: "A resposta retorna em um novo datagrama independente.", actor: "router", location: 0.5, socketCall: `sendto(fd, answer, ${responseBytes.length}, 0, client, …)`, kernelAction: "build UDP datagram → reverse route", packet: packet({ direction: "inbound", label: "DNS RESPONSE", payload: responseBytes }) });
    push({ phase: "CLOSE", title: "Socket fechado", detail: "Não existe FIN em UDP; close libera apenas o socket local.", actor: "client-app", location: 0.02, socketCall: "close(fd)", kernelAction: "release datagram socket", clientState: "CLOSED", serverState: "READY" });
  } else {
    push({ phase: "SOCKET", title: "Socket ICMP aberto", detail: "O laboratório modela o pedido lógico; privilégios variam em sistemas reais.", actor: "client-app", location: 0.02, socketCall: "socket(AF_INET, SOCK_DGRAM, IPPROTO_ICMP)", kernelAction: "allocate ICMP endpoint", delay: 0 });
    const payload = [...encoder.encode(config.payload)];
    push({ phase: "ECHO REQUEST", title: "ICMP Echo Request", detail: "A mensagem usa IPv4 diretamente, sem TCP/UDP e sem portas.", actor: "router", location: 0.5, socketCall: `sendto(fd, echo, ${payload.length}, 0, target, …)`, kernelAction: "route lookup → transmit", packet: packet({ direction: "outbound", label: "ICMP ECHO REQUEST", payload }) });
    push({ phase: "ECHO REPLY", title: "ICMP Echo Reply", detail: "O destino devolve identificador, sequência e payload.", actor: "router", location: 0.5, socketCall: "recvfrom(fd, reply, capacity, 0, …)", kernelAction: "ICMP demultiplex → wake receiver", packet: packet({ direction: "inbound", label: "ICMP ECHO REPLY", payload }) });
    push({ phase: "DONE", title: "Round trip concluído", detail: "A linha do tempo mostra o caminho lógico, não mede latência real.", actor: "client-app", location: 0.02, socketCall: "close(fd)", kernelAction: "release ICMP endpoint", clientState: "CLOSED", serverState: "READY" });
  }

  const packets = events.flatMap((event) => event.packet ? [event.packet] : []);
  return {
    fingerprint: hashText(JSON.stringify(config)),
    protocol,
    events,
    packetCount: packets.length,
    wireBytes: packets.reduce((sum, current) => sum + current.totalBytes, 0),
    warnings,
    mss
  };
}

export function formatPacketHex(bytes: readonly number[], columns = 16): readonly string[] {
  const lines: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += columns) {
    const chunk = bytes.slice(offset, offset + columns);
    const hex = chunk.map((byte) => byte.toString(16).padStart(2, "0")).join(" ").padEnd(columns * 3 - 1, " ");
    const ascii = chunk.map((byte) => byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : ".").join("");
    lines.push(`${offset.toString(16).padStart(4, "0")}  ${hex}  ${ascii}`);
  }
  return lines;
}
