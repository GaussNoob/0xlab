export const PLAYER_OFFSETS = {
  x: 0x00,
  y: 0x04,
  z: 0x08,
  health: 0x0c,
  armor: 0x10
} as const;

export const PLAYER_SIZE = 20;
export const LAB_BASE = 0x140001000;
export const MAX_HEALTH = 100;
export const MAX_STEP_PER_SECOND = 12;

export type GameSecurityView = "arena" | "chains" | "world" | "input" | "hook" | "anticheat" | "network" | "challenges";

export const gameSecurityViews: readonly { id: GameSecurityView; label: string }[] = [
  { id: "arena", label: "Arena / Memory" },
  { id: "chains", label: "Pointer Chain" },
  { id: "world", label: "World / Aim" },
  { id: "input", label: "Input System" },
  { id: "hook", label: "Hook Lab" },
  { id: "anticheat", label: "Mini Anti-Cheat" },
  { id: "network", label: "Packets / Replay" },
  { id: "challenges", label: "Challenges" }
];

export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface LabPlayer {
  readonly id: string;
  readonly name: string;
  readonly position: Vec3;
  readonly health: number;
  readonly armor: number;
  readonly address: number;
}

export interface PointerNode {
  readonly name: string;
  readonly address: number;
  readonly offset: string;
  readonly value: string;
}

export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
  readonly visible: boolean;
  readonly ndcX: number;
  readonly ndcY: number;
  readonly clipW: number;
}

export interface AimSample {
  readonly dx: number;
  readonly dy: number;
  readonly dz: number;
  readonly distance: number;
  readonly yaw: number;
  readonly pitch: number;
  readonly los: boolean;
}

export type AcVerdict = "Ok" | "Integrity" | "ImpossibleHeal" | "SpeedHack" | "SuspiciousInput";

export interface Telemetry {
  readonly health: number;
  readonly x: number;
  readonly y: number;
  readonly dt: number;
  readonly hadInput: boolean;
}

export interface LabPacket {
  readonly seq: number;
  readonly type: "MOVE" | "SHOOT" | "STATE" | "REJECT";
  readonly length: number;
  readonly payload: string;
  readonly checksum: string;
  readonly accepted: boolean;
  readonly reason: string;
}

export interface ReplayEvent {
  readonly time: string;
  readonly label: string;
  readonly detail: string;
}

export interface Challenge {
  readonly id: string;
  readonly level: string;
  readonly title: string;
  readonly prompt: string;
  readonly reveal: string;
}

export function encodePlayer(player: Pick<LabPlayer, "position" | "health" | "armor">): Uint8Array {
  const buffer = new ArrayBuffer(PLAYER_SIZE);
  const view = new DataView(buffer);
  view.setFloat32(PLAYER_OFFSETS.x, player.position.x, true);
  view.setFloat32(PLAYER_OFFSETS.y, player.position.y, true);
  view.setFloat32(PLAYER_OFFSETS.z, player.position.z, true);
  view.setInt32(PLAYER_OFFSETS.health, player.health, true);
  view.setInt32(PLAYER_OFFSETS.armor, player.armor, true);
  return new Uint8Array(buffer);
}

export function hexDump(bytes: Uint8Array, base = 0): string {
  const lines: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 8) {
    const slice = [...bytes.slice(offset, offset + 8)].map((byte) => byte.toString(16).padStart(2, "0")).join(" ");
    lines.push(`${(base + offset).toString(16).padStart(8, "0")}  ${slice}`);
  }
  return lines.join("\n");
}

export function fnv1a(bytes: Uint8Array): string {
  let hash = 0x811c9dc5;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function integrityHash(player: Pick<LabPlayer, "position" | "health" | "armor">, mode: "health-only" | "full-struct"): string {
  if (mode === "health-only") {
    const view = new DataView(new ArrayBuffer(4));
    view.setInt32(0, player.health, true);
    return fnv1a(new Uint8Array(view.buffer));
  }
  return fnv1a(encodePlayer(player));
}

export function length(a: Vec3): number {
  return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function distance(a: Vec3, b: Vec3): number {
  return length(sub(a, b));
}

export function aimSample(from: Vec3, to: Vec3, obstacleZ: number | null = null): AimSample {
  const delta = sub(to, from);
  const dist = length(delta);
  const horiz = Math.hypot(delta.x, delta.z);
  const yaw = Math.atan2(delta.x, delta.z);
  const pitch = Math.atan2(delta.y, horiz || 1e-6);
  if (obstacleZ === null) {
    return { dx: delta.x, dy: delta.y, dz: delta.z, distance: dist, yaw, pitch, los: true };
  }
  const tHit = (obstacleZ - from.z) / (delta.z || 1e-6);
  const los = !(tHit > 0.04 && tHit < 0.96 && dist > 0.2);
  return { dx: delta.x, dy: delta.y, dz: delta.z, distance: dist, yaw, pitch, los };
}

export function worldToScreen(point: Vec3, camera: Vec3, yaw: number, width: number, height: number, fov = 1.05): ScreenPoint {
  const dx = point.x - camera.x;
  const dy = point.y - camera.y;
  const dz = point.z - camera.z;
  const cos = Math.cos(-yaw);
  const sin = Math.sin(-yaw);
  const vx = dx * cos - dz * sin;
  const vz = dx * sin + dz * cos;
  const clipW = vz;
  if (vz <= 0.12) {
    return { x: width / 2, y: height / 2, visible: false, ndcX: 0, ndcY: 0, clipW };
  }
  const f = 1 / Math.tan(fov / 2);
  const aspect = width / Math.max(1, height);
  const ndcX = (vx / vz) * f / aspect;
  const ndcY = (dy / vz) * f;
  const x = (ndcX * 0.5 + 0.5) * width;
  const y = (1 - (ndcY * 0.5 + 0.5)) * height;
  const visible = ndcX >= -1 && ndcX <= 1 && ndcY >= -1 && ndcY <= 1;
  return { x, y, visible, ndcX, ndcY, clipW };
}

export function checkAntiCheat(prev: Telemetry, now: Telemetry, strong: boolean): { verdict: AcVerdict; explanation: string } {
  if (now.health < 0 || now.health > MAX_HEALTH) {
    return { verdict: "Integrity", explanation: "Health left the legal range [0, 100] without a documented heal/damage event in the lab sim." };
  }
  if (now.health > prev.health + 1) {
    return { verdict: "ImpossibleHeal", explanation: "Health increased faster than the lab heal rate. The Mini AC treats this as an integrity/behavior event, not a real-game bypass." };
  }
  if (!now.hadInput && (Math.abs(now.x - prev.x) > 0.4 || Math.abs(now.y - prev.y) > 0.4)) {
    return { verdict: "SuspiciousInput", explanation: "Position changed without a matching input event in this lab window — the command/state contract broke." };
  }
  if (!strong) {
    return { verdict: "Ok", explanation: "Naive Educational Anti-Cheat only checked health. Position/speed invariants are still unenforced — that is the weakness to patch." };
  }
  const dx = now.x - prev.x;
  const dy = now.y - prev.y;
  const maxStep = MAX_STEP_PER_SECOND * Math.max(now.dt, 1 / 60);
  if (dx * dx + dy * dy > maxStep * maxStep) {
    return { verdict: "SpeedHack", explanation: "Displacement exceeded vmax·dt on the authoritative lab sim. Strong mode adds the missing speed sanity check." };
  }
  return { verdict: "Ok", explanation: "Strong Educational Anti-Cheat: health range, heal rate, input correlation and speed all held for this tick." };
}

export function packetChecksum(seq: number, type: LabPacket["type"], payload: string): string {
  const bytes = new TextEncoder().encode(`${seq}|${type}|${payload}`);
  return fnv1a(bytes);
}

export function buildPacket(seq: number, type: Exclude<LabPacket["type"], "REJECT">, payload: string, lastSeq: number, prev: Vec3): LabPacket {
  const checksum = packetChecksum(seq, type, payload);
  const length = 8 + payload.length;
  if (seq !== lastSeq + 1) {
    return { seq, type: "REJECT", length, payload, checksum, accepted: false, reason: `sequence ${seq} != ${lastSeq + 1}` };
  }
  if (type === "MOVE") {
    const match = payload.match(/x=(-?\d+(?:\.\d+)?),z=(-?\d+(?:\.\d+)?)/);
    const x = match ? Number(match[1]) : prev.x;
    const z = match ? Number(match[2]) : prev.z;
    const dx = x - prev.x;
    const dz = z - prev.z;
    if (dx * dx + dz * dz > 4) {
      return { seq, type: "REJECT", length, payload, checksum, accepted: false, reason: "sanity: displacement > 2 units" };
    }
  }
  return { seq, type, length, payload, checksum, accepted: true, reason: "accepted by lab server" };
}

export function pointerChain(player: LabPlayer, index: number): readonly PointerNode[] {
  const gameState = LAB_BASE;
  const manager = LAB_BASE + 0x220;
  const list = LAB_BASE + 0x480;
  const entity = player.address;
  const position = entity + PLAYER_OFFSETS.x;
  return [
    { name: "GameState", address: gameState, offset: "+0x20", value: `PlayerManager* ${hexAddr(manager)}` },
    { name: "PlayerManager", address: manager, offset: "+0x08", value: `Player** ${hexAddr(list)}` },
    { name: `list[${index}]`, address: list + index * 8, offset: `+0x${(index * 8).toString(16)}`, value: `Player* ${hexAddr(entity)}` },
    { name: "Player", address: entity, offset: "+0x00", value: `Position ${hexAddr(position)}` },
    { name: "Position.x", address: position, offset: "+0x00", value: player.position.x.toFixed(2) },
    { name: "Health", address: entity + PLAYER_OFFSETS.health, offset: "+0x0C", value: String(player.health) }
  ];
}

export function hexAddr(value: number): string {
  return `0x${value.toString(16).toUpperCase()}`;
}

export function formatYaw(radians: number): string {
  return `${((radians * 180) / Math.PI).toFixed(1)}°`;
}

export const initialEntities: readonly LabPlayer[] = [
  { id: "local", name: "LAB_PLAYER", position: { x: 0, y: 1.2, z: 0 }, health: 100, armor: 50, address: LAB_BASE + 0x800 },
  { id: "e1", name: "TRAINING_DRONE_A", position: { x: 4.2, y: 1.2, z: 6.1 }, health: 80, armor: 0, address: LAB_BASE + 0x880 },
  { id: "e2", name: "TRAINING_DRONE_B", position: { x: -3.4, y: 1.2, z: 8.4 }, health: 60, armor: 10, address: LAB_BASE + 0x900 }
];

export const hookSteps = ["Original ApplyDamage", "Hook trampoline", "Lab logger", "Resume original"] as const;

export const challenges: readonly Challenge[] = [
  {
    id: "pos",
    level: "01",
    title: "Encontre a posição do player",
    prompt: "No Arena Lab, identifique os offsets de X/Y/Z e prove com um movimento que só esses floats mudam.",
    reveal: "Player.x +0x00, y +0x04, z +0x08 no bloco 0x140001800. WASD altera X/Z; Y permanece 1.20 neste lab 2.5D."
  },
  {
    id: "struct",
    level: "02",
    title: "Descubra a estrutura da entity",
    prompt: "Recupere sizeof e os campos de uma entity da lista usando a pointer chain.",
    reveal: "20 bytes: 3×float + health + armor. list[i] = PlayerManager+0x08 + i*8, depois Player+0x0C = health."
  },
  {
    id: "distance",
    level: "03",
    title: "Identifique o cálculo de distância",
    prompt: "No World Lab, confira distance() entre LAB_PLAYER e DRONE_A e descreva o lowering para mul/add.",
    reveal: "distance = sqrt(dx²+dy²+dz²). O listing educacional usa mulsd/addsd; o overlay mostra o mesmo número."
  },
  {
    id: "camera",
    level: "04",
    title: "Como a câmera transforma coordenadas",
    prompt: "Projete DRONE_A e anote world → view → NDC → pixels. Gire até clip.w ≤ 0.",
    reveal: "View rotaciona pelo yaw da câmera; perspectiva divide por z de view. w≤0 rejeita pontos atrás da câmera."
  },
  {
    id: "update",
    level: "05",
    title: "Função de update do player",
    prompt: "Correlacione um evento de input com a escrita de posição no mesmo tick.",
    reveal: "tick: Input → velocity → position. Sem evento de input, Mini AC marca SuspiciousInput se a posição pular."
  },
  {
    id: "ac",
    level: "06",
    title: "Por que o anti-cheat detectou",
    prompt: "Mutar health e um teleport no modo naive vs strong. Explique hit, miss e o patch.",
    reveal: "Naive só valida health. Teleport passa. Strong adiciona vmax·dt. O exercício é endurecer o AC fictício, não evadir produtos reais."
  },
  {
    id: "fp",
    level: "07",
    title: "Reduza falsos positivos",
    prompt: "Mova com WASD no modo strong e ajuste a interpretação se um alerta ilegítimo aparecer.",
    reveal: "dt pequeno demais ou vmax baixo acusam movimento legal. O patch correto usa dt do frame e o mesmo step do sim."
  }
];
