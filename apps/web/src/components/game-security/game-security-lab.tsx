"use client";

import {
  Activity,
  Box,
  Crosshair,
  Cpu,
  FlaskConical,
  Gamepad2,
  Keyboard,
  Lock,
  MemoryStick,
  MousePointer2,
  Radar,
  Shield,
  Terminal
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import {
  aimSample,
  buildPacket,
  challenges,
  checkAntiCheat,
  encodePlayer,
  formatYaw,
  gameSecurityViews,
  hexAddr,
  hexDump,
  hookSteps,
  initialEntities,
  integrityHash,
  PLAYER_OFFSETS,
  pointerChain,
  type AcVerdict,
  type GameSecurityView,
  type LabPacket,
  type LabPlayer,
  type ReplayEvent,
  type Telemetry,
  worldToScreen
} from "./game-security-lab-model";
import { GameWorldScene } from "./game-world-scene";

interface AcEvent {
  readonly id: number;
  readonly verdict: AcVerdict;
  readonly explanation: string;
}

type InputMode = "polling" | "event-driven";
type ObservedInputKey = "w" | "a" | "s" | "d" | "space";

interface InputVector {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

interface InputObserverEvent {
  readonly id: number;
  readonly frame: number;
  readonly source: "KEY" | "MOUSE" | "SYSTEM";
  readonly detail: string;
}

const inputKeyCodes: Readonly<Record<string, ObservedInputKey>> = {
  KeyW: "w",
  KeyA: "a",
  KeyS: "s",
  KeyD: "d",
  Space: "space"
};

const emptyObservedKeys: Readonly<Record<ObservedInputKey, boolean>> = {
  w: false,
  a: false,
  s: false,
  d: false,
  space: false
};

function movementVector(pressed: Readonly<Record<ObservedInputKey, boolean>>): InputVector {
  const x = Number(pressed.d) - Number(pressed.a);
  const z = Number(pressed.w) - Number(pressed.s);
  const magnitude = Math.hypot(x, z) || 1;
  return {
    x: x / magnitude,
    y: pressed.space ? 1 : 0,
    z: z / magnitude
  };
}

function cloneEntities(list: readonly LabPlayer[]): LabPlayer[] {
  return list.map((item) => ({ ...item, position: { ...item.position } }));
}

function patchPlayer(list: readonly LabPlayer[], id: string, patch: Partial<Omit<LabPlayer, "id" | "name" | "address">>): LabPlayer[] {
  return list.map((item) => item.id === id ? { ...item, ...patch, position: patch.position ?? item.position } : item);
}

export function GameSecurityLab() {
  const [view, setView] = useState<GameSecurityView>("arena");
  const [entities, setEntities] = useState<LabPlayer[]>(() => cloneEntities(initialEntities));
  const [paused, setPaused] = useState(false);
  const [selectedId, setSelectedId] = useState("e1");
  const [yaw, setYaw] = useState(0);
  const [strongAc, setStrongAc] = useState(false);
  const [integrityMode, setIntegrityMode] = useState<"health-only" | "full-struct">("health-only");
  const [hooked, setHooked] = useState(false);
  const [hookLog, setHookLog] = useState<readonly string[]>(["hook idle · lab process only"]);
  const [packets, setPackets] = useState<readonly LabPacket[]>([]);
  const [lastSeq, setLastSeq] = useState(0);
  const [replay, setReplay] = useState<readonly ReplayEvent[]>([{ time: "00:00", label: "Spawn", detail: "LAB_PLAYER at origin" }]);
  const [replayIndex, setReplayIndex] = useState(0);
  const [revealId, setRevealId] = useState<string | null>(null);
  const [inputLog, setInputLog] = useState<readonly string[]>([]);
  const [acEvents, setAcEvents] = useState<readonly AcEvent[]>([]);
  const [obstacle, setObstacle] = useState(false);
  const [showRay, setShowRay] = useState(true);
  const [showBoxes, setShowBoxes] = useState(true);
  const [keys, setKeys] = useState<Record<string, boolean>>({});
  const [inputMode, setInputMode] = useState<InputMode>("polling");
  const [observedKeys, setObservedKeys] = useState<Record<ObservedInputKey, boolean>>({ ...emptyObservedKeys });
  const [inputVector, setInputVector] = useState<InputVector>({ x: 0, y: 0, z: 0 });
  const [mouseDelta, setMouseDelta] = useState({ x: 0, y: 0 });
  const [inputFrame, setInputFrame] = useState(0);
  const [inputTick, setInputTick] = useState(0);
  const [jumpCount, setJumpCount] = useState(0);
  const [jumpPulse, setJumpPulse] = useState(false);
  const [inputEvents, setInputEvents] = useState<readonly InputObserverEvent[]>([
    { id: 0, frame: 0, source: "SYSTEM", detail: "observer ready · focus capture surface" }
  ]);
  const [sceneSize, setSceneSize] = useState({ width: 320, height: 180 });
  const prevRef = useRef<Telemetry>({ health: 100, x: 0, y: 0, dt: 1 / 30, hadInput: false });
  const tickRef = useRef(0);
  const keysRef = useRef(keys);
  const strongRef = useRef(strongAc);
  const inputSurfaceRef = useRef<HTMLDivElement>(null);
  const observedKeysRef = useRef(observedKeys);
  const inputFrameRef = useRef(0);
  const inputEventIdRef = useRef(0);
  const pendingMouseRef = useRef({ x: 0, y: 0 });
  const lastMouseLogRef = useRef(0);
  const jumpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  keysRef.current = keys;
  strongRef.current = strongAc;
  observedKeysRef.current = observedKeys;

  const local = entities.find((item) => item.id === "local") ?? entities[0]!;
  const selected = entities.find((item) => item.id === selectedId) ?? entities[1]!;
  const selectedIndex = Math.max(0, entities.findIndex((item) => item.id === selected.id));
  const bytes = encodePlayer(selected);
  const chain = pointerChain(selected, selectedIndex);
  const camera = { x: local.position.x, y: 1.6, z: local.position.z - 4 };
  const projected = worldToScreen(selected.position, camera, yaw, sceneSize.width, sceneSize.height);
  const aim = aimSample(local.position, selected.position, obstacle ? 3 : null);
  const hashNow = integrityHash(local, integrityMode);
  const hashBaseline = useMemo(() => integrityHash(initialEntities[0]!, integrityMode), [integrityMode]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search).get("view");
    if (gameSecurityViews.some((item) => item.id === query)) setView(query as GameSecurityView);
  }, []);

  useEffect(() => {
    if (view !== "input") return;
    const frame = window.requestAnimationFrame(() => inputSurfaceRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [view]);

  useEffect(() => {
    if (view !== "input") return;
    let animationFrame = 0;
    const sample = () => {
      inputFrameRef.current += 1;
      const frame = inputFrameRef.current;
      if (inputMode === "polling" && frame % 3 === 0) {
        const nextVector = movementVector(observedKeysRef.current);
        setInputVector((current) => current.x === nextVector.x && current.y === nextVector.y && current.z === nextVector.z ? current : nextVector);
        const pending = pendingMouseRef.current;
        if (pending.x !== 0 || pending.y !== 0) setMouseDelta({ ...pending });
        pendingMouseRef.current = { x: 0, y: 0 };
      }
      if (frame % 3 === 0) {
        setInputFrame(frame);
        setInputTick(Math.floor(frame / 2));
      }
      animationFrame = window.requestAnimationFrame(sample);
    };
    animationFrame = window.requestAnimationFrame(sample);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [inputMode, view]);

  useEffect(() => () => {
    if (jumpTimerRef.current) clearTimeout(jumpTimerRef.current);
  }, []);

  useEffect(() => {
    function down(event: KeyboardEvent) {
      const editable = event.target instanceof HTMLElement && event.target.matches("input, textarea, select, [contenteditable='true']");
      if (editable || (view !== "arena" && view !== "world")) return;
      if (["w", "a", "s", "d"].includes(event.key.toLowerCase())) {
        event.preventDefault();
        setKeys((current) => ({ ...current, [event.key.toLowerCase()]: true }));
      }
    }
    function up(event: KeyboardEvent) {
      setKeys((current) => ({ ...current, [event.key.toLowerCase()]: false }));
    }
    function clearKeys() {
      setKeys({});
    }
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clearKeys);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clearKeys);
    };
  }, [view]);

  useEffect(() => {
    if (paused) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      tickRef.current += 1;
      const pressed = keysRef.current;
      const speed = 6;
      const hadInput = Boolean(pressed.w || pressed.s || pressed.a || pressed.d);
      if (hadInput) {
        setEntities((current) => {
          const player = current.find((item) => item.id === "local");
          if (!player) return current;
          let x = player.position.x;
          let z = player.position.z;
          if (pressed.w) z += speed * dt;
          if (pressed.s) z -= speed * dt;
          if (pressed.a) x -= speed * dt;
          if (pressed.d) x += speed * dt;
          const next = { health: player.health, x, y: z, dt, hadInput: true };
          const verdict = checkAntiCheat(prevRef.current, next, strongRef.current);
          prevRef.current = next;
          if (verdict.verdict !== "Ok") {
            queueMicrotask(() => {
              setAcEvents((events) => [{ id: tickRef.current, ...verdict }, ...events].slice(0, 6));
            });
          }
          if (tickRef.current % 12 === 0) {
            queueMicrotask(() => {
              setInputLog((log) => [`f${tickRef.current}  MOVE  x=${x.toFixed(2)} z=${z.toFixed(2)}`, ...log].slice(0, 8));
            });
          }
          return patchPlayer(current, "local", { position: { x, y: player.position.y, z } });
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [paused]);

  function appendInputEvent(source: InputObserverEvent["source"], detail: string) {
    inputEventIdRef.current += 1;
    const event = { id: inputEventIdRef.current, frame: inputFrameRef.current, source, detail };
    setInputEvents((events) => [event, ...events].slice(0, 12));
  }

  function applyObservedKey(key: ObservedInputKey, pressed: boolean) {
    const next = { ...observedKeysRef.current, [key]: pressed };
    observedKeysRef.current = next;
    setObservedKeys(next);
    if (inputMode === "event-driven") setInputVector(movementVector(next));
  }

  function observeKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const key = inputKeyCodes[event.code];
    if (!key) return;
    event.preventDefault();
    if (event.repeat) return;
    applyObservedKey(key, true);
    appendInputEvent("KEY", `${key === "space" ? "SPACE" : key.toUpperCase()} DOWN → ${inputMode === "polling" ? "state bit=1" : "command emitted"}`);
    if (key === "space") {
      setJumpCount((count) => count + 1);
      setJumpPulse(true);
      if (jumpTimerRef.current) clearTimeout(jumpTimerRef.current);
      jumpTimerRef.current = setTimeout(() => setJumpPulse(false), 320);
    }
  }

  function observeKeyUp(event: ReactKeyboardEvent<HTMLDivElement>) {
    const key = inputKeyCodes[event.code];
    if (!key) return;
    event.preventDefault();
    applyObservedKey(key, false);
    appendInputEvent("KEY", `${key === "space" ? "SPACE" : key.toUpperCase()} UP → ${inputMode === "polling" ? "state bit=0" : "release emitted"}`);
  }

  function observePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const dx = Math.round(event.nativeEvent.movementX);
    const dy = Math.round(event.nativeEvent.movementY);
    if (dx === 0 && dy === 0) return;
    pendingMouseRef.current = {
      x: pendingMouseRef.current.x + dx,
      y: pendingMouseRef.current.y + dy
    };
    if (inputMode === "event-driven") setMouseDelta({ x: dx, y: dy });
    const now = performance.now();
    if (now - lastMouseLogRef.current > 90) {
      lastMouseLogRef.current = now;
      appendInputEvent("MOUSE", `Δx ${dx >= 0 ? "+" : ""}${dx} · Δy ${dy >= 0 ? "+" : ""}${dy}`);
    }
  }

  function clearObservedInput() {
    const next = { ...emptyObservedKeys };
    observedKeysRef.current = next;
    pendingMouseRef.current = { x: 0, y: 0 };
    setObservedKeys(next);
    setInputVector({ x: 0, y: 0, z: 0 });
    setMouseDelta({ x: 0, y: 0 });
    appendInputEvent("SYSTEM", "capture focus released · state cleared");
  }

  function selectInputMode(next: InputMode) {
    setInputMode(next);
    setInputVector(movementVector(observedKeysRef.current));
    appendInputEvent("SYSTEM", `${next === "polling" ? "render loop polls state each frame" : "browser events emit commands immediately"}`);
  }

  function changeView(next: GameSecurityView) {
    if (next === "world" && selectedId === "local") {
      const firstTarget = entities.find((entity) => entity.id !== "local");
      if (firstTarget) setSelectedId(firstTarget.id);
    }
    setView(next);
    const url = new URL(window.location.href);
    url.searchParams.set("view", next);
    window.history.replaceState({}, "", url);
  }

  function pushReplay(label: string, detail: string) {
    const time = `00:${String(Math.min(59, replay.length)).padStart(2, "0")}`;
    setReplay((events) => {
      const next = [...events, { time, label, detail }];
      setReplayIndex(next.length - 1);
      return next;
    });
  }

  function pokeHealth(value: number) {
    setEntities((current) => patchPlayer(current, "local", { health: value }));
    const prev = prevRef.current;
    const verdict = checkAntiCheat(prev, { ...prev, health: value, hadInput: false }, strongAc);
    setAcEvents((events) => [{ id: Date.now(), ...verdict }, ...events].slice(0, 6));
    pushReplay("Memory poke", `health ${prev.health} → ${value} (research tool)`);
  }

  function teleport() {
    const nextPos = { x: 28, y: local.position.y, z: local.position.z };
    setEntities((current) => patchPlayer(current, "local", { position: nextPos }));
    const prev = prevRef.current;
    const now = { health: local.health, x: 28, y: prev.y, dt: 1 / 30, hadInput: false };
    const verdict = checkAntiCheat(prev, now, strongAc);
    prevRef.current = now;
    setAcEvents((events) => [{ id: Date.now(), ...verdict }, ...events].slice(0, 6));
    pushReplay("Teleport poke", "x=28 with hadInput=false — command/state correlation test");
  }

  function speedBurst() {
    const nextX = local.position.x + 3;
    const nextPos = { x: nextX, y: local.position.y, z: local.position.z };
    setEntities((current) => patchPlayer(current, "local", { position: nextPos }));
    const prev = prevRef.current;
    const now = { health: local.health, x: nextX, y: prev.y, dt: 1 / 30, hadInput: true };
    const verdict = checkAntiCheat(prev, now, strongAc);
    prevRef.current = now;
    setAcEvents((events) => [{ id: Date.now(), ...verdict }, ...events].slice(0, 6));
    pushReplay("Fast input burst", "input present, but displacement exceeds vmax·dt in strong mode");
  }

  function fireDamage() {
    const amount = 10;
    const before = local.health;
    const after = Math.max(0, before - amount);
    if (hooked) setHookLog((log) => [`ApplyDamage(${before}, ${amount}) → ${after}`, ...log].slice(0, 10));
    setEntities((current) => patchPlayer(current, "local", { health: after }));
    pushReplay("Shoot", `ApplyDamage ${amount}`);
  }

  function sendMove(payload: string) {
    const packet = buildPacket(lastSeq + 1, "MOVE", payload, lastSeq, local.position);
    setPackets((list) => [packet, ...list].slice(0, 8));
    if (packet.accepted) {
      setLastSeq((seq) => seq + 1);
      const match = payload.match(/x=(-?\d+(?:\.\d+)?),z=(-?\d+(?:\.\d+)?)/);
      if (match) {
        const x = Number(match[1]);
        const z = Number(match[2]);
        setEntities((current) => patchPlayer(current, "local", { position: { x, y: local.position.y, z } }));
      }
    }
    pushReplay(packet.accepted ? "Packet MOVE" : "Packet REJECT", packet.reason);
  }

  const latestAc = acEvents[0];

  return (
    <div className="gsl-shell">
      <header className="gsl-header">
        <div className="gsl-title">
          <i aria-hidden="true"><Gamepad2 size={14} /></i>
          <div>
            <strong>GAME SECURITY LAB</strong>
            <h1>Understand the game. Research the process. Detect. Harden.</h1>
          </div>
        </div>
        <div className="gsl-status">
          <span data-ok="true"><Shield size={10} /> Lab games only</span>
          <span><Lock size={10} /> no live titles</span>
          <span><MemoryStick size={10} /> C / C++ / ASM</span>
          <span>RESEARCH / DEBUG</span>
        </div>
      </header>

      <nav className="gsl-tabs" aria-label="Ferramentas de game security">
        {gameSecurityViews.map((item) => (
          <button type="button" data-active={view === item.id} aria-pressed={view === item.id} onClick={() => changeView(item.id)} key={item.id}>
            {item.label}
          </button>
        ))}
        <div className="gsl-tabs-spacer" />
        <small>own binaries · fictional AC</small>
      </nav>

      {view === "arena" ? (
        <section className="gsl-workbench gsl-split">
          <article className="gsl-panel">
            <header className="gsl-head"><span>ARENA</span><small>WASD · educational process</small></header>
            <ol className="gsl-flow">
              {["Input", "Update", "Physics", "State", "Render", "Present"].map((step) => <li key={step}>{step}</li>)}
            </ol>
            <div className="gsl-arena-stage">
              <GameWorldScene
                entities={entities}
                selectedId={selectedId}
                camera={camera}
                yaw={yaw}
                showRay
                showBoxes={false}
                obstacle={obstacle}
                mode="arena"
                onSelectEntity={setSelectedId}
                onViewportChange={setSceneSize}
              />
              <div className="gsl-arena-readout" aria-live="polite">
                <span><b>LOCAL</b> {local.position.x.toFixed(1)}, {local.position.z.toFixed(1)}</span>
                <span><b>TARGET</b> {selected.name} · {aim.distance.toFixed(1)}m</span>
                <span data-alert={!aim.los}><b>LoS</b> {aim.los ? "CLEAR" : "BLOCKED"}</span>
              </div>
            </div>
            <div className="gsl-actions">
              <button className="gsl-btn" data-kind="ghost" type="button" onClick={() => setPaused((value) => !value)}>{paused ? "Resume loop" : "Pause loop"}</button>
              <button className="gsl-btn" data-kind="ghost" type="button" onClick={() => pokeHealth(Math.max(0, local.health - 25))}>Poke health</button>
              <button className="gsl-btn" data-kind="primary" type="button" onClick={fireDamage}>ApplyDamage</button>
            </div>
          </article>
          <article className="gsl-panel gsl-inspector">
            <header className="gsl-head"><span>ENTITY MEMORY</span><small>{selected.name} · {hexAddr(selected.address)}</small></header>
            <div className="gsl-inspector-targets" aria-label="Memory inspector target">
              {entities.map((entity, index) => (
                <button type="button" data-active={entity.id === selected.id} onClick={() => setSelectedId(entity.id)} key={entity.id}>
                  <span>{entity.id === "local" ? "LOCAL" : `ENTITY ${index}`}</span>
                  <code>{hexAddr(entity.address)}</code>
                </button>
              ))}
            </div>
            <dl className="gsl-kv">
              <div><dt>+0x00 X</dt><dd>{selected.position.x.toFixed(2)}</dd></div>
              <div><dt>+0x04 Y</dt><dd>{selected.position.y.toFixed(2)}</dd></div>
              <div><dt>+0x08 Z</dt><dd>{selected.position.z.toFixed(2)}</dd></div>
              <div><dt>+0x0C HP</dt><dd data-warn={selected.health !== 100}>{selected.health}</dd></div>
              <div><dt>+0x10 AR</dt><dd>{selected.armor}</dd></div>
            </dl>
            <pre className="gsl-console">{hexDump(bytes, selected.address)}</pre>
            {selected.id !== "local" ? (
              <button className="gsl-inspect-local" type="button" onClick={() => setSelectedId("local")}>← Voltar ao LOCAL</button>
            ) : null}
            <p className="gsl-note">O inspector acompanha a seleção da arena. Este Player fictício está no heap educacional em {hexAddr(selected.address)}; offsets mudam entre builds.</p>
          </article>
        </section>
      ) : null}

      {view === "chains" ? (
        <section className="gsl-workbench gsl-split">
          <article className="gsl-panel">
            <header className="gsl-head"><span>POINTER CHAIN</span><small>{selected.name} · list[{selectedIndex}]</small></header>
            <div className="gsl-chain-targets" aria-label="Pointer chain entity">
              {entities.map((entity, index) => (
                <button type="button" data-active={entity.id === selected.id} onClick={() => setSelectedId(entity.id)} key={entity.id}>
                  <b>{entity.id === "local" ? "LOCAL" : `E${index}`}</b>
                  <span>{entity.name}</span>
                  <code>{hexAddr(entity.address)}</code>
                </button>
              ))}
            </div>
            <ol className="gsl-chain">
              {chain.map((node) => (
                <li key={node.name}>
                  <strong>{node.name}</strong>
                  <code>{hexAddr(node.address)}</code>
                  <span>{node.offset}</span>
                  <small>{node.value}</small>
                </li>
              ))}
            </ol>
          </article>
          <article className="gsl-panel">
            <header className="gsl-head"><span>LAYOUT</span><small>sizeof(Player)=20</small></header>
            <div className="gsl-offsets">
              {Object.entries(PLAYER_OFFSETS).map(([field, offset]) => (
                <p key={field}><code>+0x{offset.toString(16).padStart(2, "0")}</code><strong>{field}</strong></p>
              ))}
            </div>
            <p className="gsl-copy">Cada seta é um load. list[i] usa stride 8. Descoberta de layout só neste binário.</p>
          </article>
        </section>
      ) : null}

      {view === "world" ? (
        <section className="gsl-workbench gsl-world">
          <article className="gsl-panel">
            <header className="gsl-head"><Box size={12} /><span>3D WORLD</span><small>Three.js · lab entities</small></header>
            <GameWorldScene
              entities={entities}
              selectedId={selectedId}
              camera={camera}
              yaw={yaw}
              showRay={showRay}
              showBoxes={showBoxes}
              obstacle={obstacle}
              mode="analysis"
              screenPoint={projected}
              targetEntity={selected}
              lineOfSight={aim.los}
              aimYaw={aim.yaw}
              aimPitch={aim.pitch}
              onSelectEntity={setSelectedId}
              onViewportChange={setSceneSize}
            />
            <div className="gsl-actions">
              <label>camera yaw {formatYaw(yaw)} <input type="range" min={-1.2} max={1.2} step={0.02} value={yaw} onChange={(event) => setYaw(Number(event.target.value))} /></label>
              <button className="gsl-btn" data-kind="ghost" type="button" onClick={() => setShowRay((value) => !value)}>Ray</button>
              <button className="gsl-btn" data-kind="ghost" type="button" onClick={() => setShowBoxes((value) => !value)}>AABB / frustum</button>
              <button className="gsl-btn" data-kind="ghost" type="button" onClick={() => setObstacle((value) => !value)}>Obstacle LoS</button>
            </div>
          </article>
          <article className="gsl-panel">
            <header className="gsl-head"><Crosshair size={12} /><span>W2S / AIM MATH</span><small>RESEARCH</small></header>
            <div className="gsl-entity-list">
              {entities.filter((item) => item.id !== "local").map((item) => (
                <button type="button" data-active={item.id === selectedId} onClick={() => setSelectedId(item.id)} key={item.id}>
                  <code>{item.name}</code>
                  <span>{item.position.x.toFixed(1)}, {item.position.z.toFixed(1)} · hp {item.health}</span>
                </button>
              ))}
            </div>
            <ol className="gsl-flow">
              {["3D World", "Camera", "Projection", "2D Screen"].map((step) => <li key={step}>{step}</li>)}
            </ol>
            <dl className="gsl-kv">
              <div><dt>clip.w</dt><dd>{projected.clipW.toFixed(2)}</dd></div>
              <div><dt>NDC</dt><dd>{projected.ndcX.toFixed(2)}, {projected.ndcY.toFixed(2)}</dd></div>
              <div><dt>screen</dt><dd>{projected.visible ? `${projected.x.toFixed(0)}, ${projected.y.toFixed(0)}` : "behind / clipped"}</dd></div>
              <div><dt>distance</dt><dd>{aim.distance.toFixed(2)}</dd></div>
              <div><dt>yaw</dt><dd>{formatYaw(aim.yaw)}</dd></div>
              <div><dt>pitch</dt><dd>{formatYaw(aim.pitch)}</dd></div>
              <div><dt>LoS</dt><dd data-warn={!aim.los}>{aim.los ? "clear" : "blocked by lab obstacle"}</dd></div>
            </dl>
            <p className="gsl-note">Overlay e ângulos descrevem o simulador. Não há assistência contra jogadores reais.</p>
          </article>
        </section>
      ) : null}

      {view === "input" ? (
        <section className="gsl-workbench gsl-input-layout">
          <article className="gsl-panel">
            <header className="gsl-head">
              <Keyboard size={13} />
              <span>LAB INPUT OBSERVER</span>
              <small>browser events · focused surface only</small>
            </header>
            <ol className="gsl-input-pipeline" aria-label="Input pipeline">
              {["Device", "Browser queue", inputMode === "polling" ? "Frame poll" : "Event dispatch", "Game command"].map((step, index) => (
                <li data-active={index === 2} key={step}><b>0{index + 1}</b><span>{step}</span></li>
              ))}
            </ol>
            <div
              className="gsl-input-capture"
              ref={inputSurfaceRef}
              tabIndex={0}
              aria-label="Input observer do Game Security Lab"
              onKeyDown={observeKeyDown}
              onKeyUp={observeKeyUp}
              onBlur={clearObservedInput}
              onPointerDown={(event) => event.currentTarget.focus()}
              onPointerMove={observePointerMove}
            >
              <div className="gsl-input-scope">
                <span><i />CAPTURE ACTIVE</span>
                <small>Foque aqui · WASD + Space · mova o mouse nesta área</small>
              </div>
              <div className="gsl-input-matrix" aria-label="Matriz de teclas observadas">
                <span className="gsl-input-key" data-key="w" data-active={observedKeys.w}>W<small>+Z</small></span>
                <span className="gsl-input-key" data-key="a" data-active={observedKeys.a}>A<small>−X</small></span>
                <span className="gsl-input-key" data-key="s" data-active={observedKeys.s}>S<small>−Z</small></span>
                <span className="gsl-input-key" data-key="d" data-active={observedKeys.d}>D<small>+X</small></span>
                <span className="gsl-input-key" data-key="space" data-active={observedKeys.space}>SPACE<small>JUMP</small></span>
              </div>
              <div className="gsl-input-visuals">
                <div className="gsl-mouse-pad">
                  <MousePointer2 size={14} />
                  <span
                    className="gsl-mouse-dot"
                    style={{ transform: `translate(${Math.max(-34, Math.min(34, mouseDelta.x))}px, ${Math.max(-22, Math.min(22, mouseDelta.y))}px)` }}
                  />
                  <small>mouse Δ {mouseDelta.x >= 0 ? "+" : ""}{mouseDelta.x} / {mouseDelta.y >= 0 ? "+" : ""}{mouseDelta.y}</small>
                </div>
                <div className="gsl-jump-signal" data-active={jumpPulse || observedKeys.space}>
                  <span><Gamepad2 size={18} /></span>
                  <b>JUMP IMPULSE</b>
                  <small>Space reconhecido · count {jumpCount}</small>
                </div>
              </div>
            </div>
            <div className="gsl-input-telemetry" aria-live="polite">
              <div><span>FRAME</span><strong>{inputFrame.toString().padStart(5, "0")}</strong><small>requestAnimationFrame</small></div>
              <div><span>SIM TICK</span><strong>{inputTick.toString().padStart(5, "0")}</strong><small>2 frames / tick</small></div>
              <div><span>MOVE VECTOR</span><strong>{inputVector.x.toFixed(2)} / {inputVector.y.toFixed(2)} / {inputVector.z.toFixed(2)}</strong><small>x / jump / z</small></div>
              <div><span>DELIVERY</span><strong>{inputMode === "polling" ? "POLLING" : "EVENT"}</strong><small>{inputMode === "polling" ? "state sampled by loop" : "command on browser event"}</small></div>
            </div>
          </article>
          <article className="gsl-panel">
            <header className="gsl-head"><Activity size={13} /><span>INPUT TELEMETRY</span><small>{inputEvents.length}/12 events</small></header>
            <div className="gsl-input-mode" role="group" aria-label="Input delivery model">
              <button type="button" aria-pressed={inputMode === "polling"} data-active={inputMode === "polling"} onClick={() => selectInputMode("polling")}>
                <Cpu size={14} /><span><b>Polling</b><small>loop reads held state</small></span>
              </button>
              <button type="button" aria-pressed={inputMode === "event-driven"} data-active={inputMode === "event-driven"} onClick={() => selectInputMode("event-driven")}>
                <Activity size={14} /><span><b>Event-driven</b><small>handler emits command</small></span>
              </button>
            </div>
            <div className="gsl-input-log" aria-label="Input event log">
              {inputEvents.map((event) => (
                <p key={event.id}>
                  <code>f{event.frame.toString().padStart(5, "0")}</code>
                  <b data-source={event.source}>{event.source}</b>
                  <span>{event.detail}</span>
                </p>
              ))}
            </div>
            <p className="gsl-input-contract">
              <Lock size={12} />
              <span><b>Escopo explícito:</b> eventos DOM desta superfície focada. Sem hooks globais, leitura de outros processos ou captura fora do laboratório.</span>
            </p>
          </article>
        </section>
      ) : null}

      {view === "hook" ? (
        <section className="gsl-workbench gsl-split">
          <article className="gsl-panel">
            <header className="gsl-head"><span>INTERNAL vs EXTERNAL</span><small>lab processes</small></header>
            <div className="gsl-triad">
              <p><b>Internal</b> — módulo no mesmo address space do Arena. Ponteiros crus. Crash compartilhado.</p>
              <p><b>External</b> — outro processo do laboratório lê via API de debug. Isolation maior, race com o frame.</p>
              <p><b>Boundary</b> — um VA do jogo não é um ponteiro válido no tool até o par lab-game/lab-tool.</p>
            </div>
            <ol className="gsl-flow">
              {hookSteps.map((step, index) => <li key={`${index}-${step}`} data-on={hooked}>{step}</li>)}
            </ol>
            <div className="gsl-actions">
              <button className="gsl-btn" data-kind="primary" type="button" onClick={() => setHooked(true)}>Install lab hook</button>
              <button className="gsl-btn" data-kind="ghost" type="button" onClick={() => setHooked(false)}>Remove hook</button>
              <button className="gsl-btn" data-kind="ghost" type="button" onClick={fireDamage}>Call ApplyDamage</button>
            </div>
          </article>
          <article className="gsl-panel">
            <header className="gsl-head"><span>LOGGER</span><small>{hooked ? "armed" : "idle"}</small></header>
            <pre className="gsl-console">{hookLog.join("\n")}</pre>
            <p className="gsl-copy">DLL/IAT/trampoline são conceitos. O alvo é sempre o binário do laboratório — nunca um anti-cheat real.</p>
          </article>
        </section>
      ) : null}

      {view === "anticheat" ? (
        <section className="gsl-workbench gsl-split">
          <article className="gsl-panel">
            <header className="gsl-head"><Radar size={12} /><span>MINI ANTI-CHEAT</span><small>{strongAc ? "strong" : "naive"}</small></header>
            <ol className="gsl-flow">
              {["Game", "Telemetry", "Detection", "Explanation"].map((step) => <li key={step}>{step}</li>)}
            </ol>
            <dl className="gsl-kv">
              <div><dt>integrity</dt><dd data-warn={hashNow !== hashBaseline}>{hashNow === hashBaseline ? "match" : "changed"} {hashNow}</dd></div>
              <div><dt>mode</dt><dd>{integrityMode}</dd></div>
              <div><dt>verdict</dt><dd data-warn={latestAc && latestAc.verdict !== "Ok"}>{latestAc?.verdict ?? "Ok"}</dd></div>
            </dl>
            <div className="gsl-actions">
              <button className="gsl-btn" data-kind="ghost" type="button" onClick={() => setStrongAc((value) => !value)}>{strongAc ? "Use naive AC" : "Patch AC (strong)"}</button>
              <button className="gsl-btn" data-kind="ghost" type="button" onClick={() => setIntegrityMode((mode) => mode === "health-only" ? "full-struct" : "health-only")}>
                Hash {integrityMode === "health-only" ? "→ full struct" : "→ health only"}
              </button>
              <button className="gsl-btn" data-kind="primary" type="button" onClick={() => pokeHealth(150)}>Illegal health</button>
              <button className="gsl-btn" data-kind="ghost" type="button" onClick={teleport}>Teleport poke</button>
              <button className="gsl-btn" data-kind="ghost" type="button" onClick={speedBurst}>Fast input burst</button>
            </div>
            <p className="gsl-note">Bypass research defensivo: teleport sem input testa SuspiciousInput; burst com input testa vmax·dt/SpeedHack no modo strong. Corrija somente o AC fictício.</p>
          </article>
          <article className="gsl-panel">
            <header className="gsl-head"><span>EVENTS</span><small>lab processes only</small></header>
            <div className="gsl-timeline">
              {acEvents.length === 0 ? <p className="gsl-empty">Sem detecção neste tick. Mova, poke ou teleporte.</p> : acEvents.map((event) => (
                <p key={event.id}>
                  <code>{event.verdict}</code>
                  <span>{event.explanation}</span>
                </p>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      {view === "network" ? (
        <section className="gsl-workbench gsl-split">
          <article className="gsl-panel">
            <header className="gsl-head"><span>AUTHORITATIVE SERVER</span><small>loopback</small></header>
            <ol className="gsl-flow">
              {["Client", "TCP/UDP lab", "Validate", "State"].map((step) => <li key={step}>{step}</li>)}
            </ol>
            <div className="gsl-actions">
              <button className="gsl-btn" data-kind="primary" type="button" onClick={() => sendMove(`x=${(local.position.x + 0.4).toFixed(2)},z=${local.position.z.toFixed(2)}`)}>Honest MOVE</button>
              <button className="gsl-btn" data-kind="ghost" type="button" onClick={() => sendMove("x=99,z=0")}>Impossible MOVE</button>
              <button className="gsl-btn" data-kind="ghost" type="button" onClick={() => {
                const packet = buildPacket(lastSeq, "MOVE", "x=0.1,z=0", lastSeq, local.position);
                setPackets((list) => [packet, ...list].slice(0, 8));
                pushReplay("Replay seq", packet.reason);
              }}>Duplicate seq</button>
            </div>
            <div className="gsl-packets">
              {packets.map((packet, index) => (
                <p data-ok={packet.accepted} key={`${packet.seq}-${index}`}>
                  <code>{packet.accepted ? packet.type : "REJECT"}</code>
                  <span>seq {packet.seq} · len {packet.length} · crc {packet.checksum}</span>
                  <small>{packet.payload} — {packet.reason}</small>
                </p>
              ))}
            </div>
          </article>
          <article className="gsl-panel">
            <header className="gsl-head"><span>REPLAY</span><small>{replay[replayIndex]?.time}</small></header>
            <input className="gsl-slider" type="range" min={0} max={Math.max(0, replay.length - 1)} value={replayIndex} onChange={(event) => setReplayIndex(Number(event.target.value))} />
            <dl className="gsl-kv">
              <div><dt>event</dt><dd>{replay[replayIndex]?.label}</dd></div>
              <div><dt>detail</dt><dd>{replay[replayIndex]?.detail}</dd></div>
            </dl>
            <div className="gsl-timeline">
              {replay.map((event, index) => (
                <button type="button" data-active={index === replayIndex} onClick={() => setReplayIndex(index)} key={`${event.time}-${event.label}`}>
                  <code>{event.time}</code>
                  <span>{event.label}</span>
                </button>
              ))}
            </div>
            <pre className="gsl-console">{inputLog.join("\n") || "input observer: only this lab window"}</pre>
          </article>
        </section>
      ) : null}

      {view === "challenges" ? (
        <section className="gsl-workbench gsl-challenges">
          {challenges.map((challenge) => (
            <article className="gsl-panel" key={challenge.id}>
              <header className="gsl-head"><span>LEVEL {challenge.level}</span></header>
              <h2>{challenge.title}</h2>
              <p className="gsl-copy">{challenge.prompt}</p>
              <button className="gsl-btn" data-kind="ghost" type="button" onClick={() => setRevealId(challenge.id)}>Revelar gabarito</button>
              {revealId === challenge.id ? <p className="gsl-ok">{challenge.reveal}</p> : null}
            </article>
          ))}
        </section>
      ) : null}

      <footer className="gsl-footer">
        <FlaskConical size={12} />
        <span>Understand → Memory → Binary → Assembly → Research tool → Detection → Harden</span>
        <div>
          <Link href="/learn/game-security">Trilha</Link>
          <Link href="/labs/low-level"><Terminal size={11} />Low-Level</Link>
          <Link href="/labs/memory">Memory</Link>
          <Link href="/labs/graphics">Graphics</Link>
          <Link href="/labs/security">Security</Link>
        </div>
      </footer>
    </div>
  );
}
