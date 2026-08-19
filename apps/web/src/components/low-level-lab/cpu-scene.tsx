"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type {
  CTraceEvent,
  CpuState,
  RegisterName,
  SimulationEvent,
  SourceVisualModel,
  SourceVisualNode,
  VisualizerKind
} from "./types";

interface CpuSceneProps {
  readonly kind: VisualizerKind;
  readonly state: CpuState;
  readonly event?: SimulationEvent | undefined;
  readonly cEvent?: CTraceEvent | undefined;
  readonly model: SourceVisualModel;
  readonly animate: boolean;
}

function labelSprite(text: string, color = "#9ba5b1", width = 2.3): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = color;
    context.textAlign = "center";
    context.textBaseline = "middle";

    const maxTextWidth = canvas.width - 28;
    const preferredSize = 50;
    context.font = `650 ${preferredSize}px 'Cascadia Code', Consolas, monospace`;
    const measuredWidth = Math.max(1, context.measureText(text).width);
    const fittedSize = Math.max(18, Math.min(preferredSize, Math.floor(preferredSize * maxTextWidth / measuredWidth)));
    context.font = `650 ${fittedSize}px 'Cascadia Code', Consolas, monospace`;
    context.fillText(text, canvas.width / 2, canvas.height / 2, maxTextWidth);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(width, width / 3.25, 1);
  return sprite;
}

function block(
  scene: THREE.Scene,
  label: string,
  position: [number, number, number],
  size: [number, number, number],
  active = false,
  color = 0x67c7f3
): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(...size);
  const material = new THREE.MeshStandardMaterial({
    color: active ? color : 0x151c24,
    emissive: active ? color : 0x000000,
    emissiveIntensity: active ? 0.22 : 0,
    metalness: 0.2,
    roughness: 0.55,
    transparent: true,
    opacity: active ? 0.92 : 0.82
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  scene.add(mesh);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({ color: active ? color : 0x34414e, transparent: true, opacity: 0.8 }));
  mesh.add(edges);
  const labelObject = labelSprite(label, active ? "#f1fff9" : "#c0cad3", Math.max(1.8, size[0] * 1.02));
  labelObject.position.set(0, 0, size[2] / 2 + 0.03);
  mesh.add(labelObject);
  return mesh;
}

function line(scene: THREE.Scene, from: [number, number, number], to: [number, number, number], active = false): void {
  const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...from), new THREE.Vector3(...to)]);
  const material = new THREE.LineBasicMaterial({ color: active ? 0x71e6c1 : 0x293542, transparent: true, opacity: active ? 0.95 : 0.55 });
  scene.add(new THREE.Line(geometry, material));
}

function shortLabel(value: string, maxLength = 27): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function nodeLabel(node: SourceVisualNode): string {
  return shortLabel(node.value && node.value !== "?" ? `${node.label} = ${node.value}` : node.label);
}

function addModelHeader(scene: THREE.Scene, model: SourceVisualModel): void {
  const title = labelSprite(`SOURCE MODEL ${model.fingerprint.toUpperCase()}`, "#71e6c1", 4.8);
  title.position.set(0, 2.38, 0);
  scene.add(title);
  const summary = labelSprite(shortLabel(model.title, 52), "#687783", 4.8);
  summary.position.set(0, 2.02, 0);
  scene.add(summary);
}

function addEmptyModel(scene: THREE.Scene, title: string, detail: string): void {
  block(scene, title, [0, 0.25, 0], [4.8, 0.82, 1.05], false, 0x67c7f3);
  const note = labelSprite(detail, "#687783", 4.5);
  note.position.set(0, -0.65, 0);
  scene.add(note);
}

function addCpu(scene: THREE.Scene, state: CpuState, model: SourceVisualModel, event?: SimulationEvent): void {
  const stages = ["FETCH", "DECODE", "EXECUTE", "MEMORY", "WRITE BACK"];
  const activeStage = (event?.stage ?? "fetch").replace("-", " ").toUpperCase();
  stages.forEach((stage, index) => {
    const x = (index - 2) * 1.58;
    block(scene, stage, [x, 0.8, 0], [1.25, 0.62, 0.72], stage === activeStage, stage === "EXECUTE" ? 0xe9b96e : 0x71e6c1);
    if (index < stages.length - 1) line(scene, [x + 0.63, 0.8, 0], [x + 0.95, 0.8, 0], index === stages.indexOf(activeStage));
  });

  block(scene, "ALU", [0, -0.48, 0.02], [2.15, 0.75, 1.05], event?.stage === "execute", 0xe9b96e);
  line(scene, [0, 0.47, 0], [0, -0.1, 0], event?.stage === "execute");

  const registerGeometry = new THREE.BoxGeometry(0.62, 0.22, 0.52);
  const registerMaterial = new THREE.MeshStandardMaterial({ color: 0x1a2730, roughness: 0.6, metalness: 0.18 });
  const changedMaterial = new THREE.MeshStandardMaterial({ color: 0x42b995, emissive: 0x1b6d59, emissiveIntensity: 0.35 });
  const availableNames: readonly RegisterName[] = ["RAX", "RBX", "RCX", "RDX", "RSI", "RDI", "RSP", "RBP", "R8", "R9", "R10", "R11", "R12", "R13", "R14", "R15"];
  const names = model.registers.length
    ? availableNames.filter((name) => model.registers.includes(name)).slice(0, 8)
    : availableNames.slice(0, 8);
  names.forEach((name, index) => {
    const changed = event?.changedRegisters.includes(name) ?? false;
    const mesh = new THREE.Mesh(registerGeometry, changed ? changedMaterial : registerMaterial);
    mesh.position.set(-2.65 + (index % 4) * 1.75, -1.56 - Math.floor(index / 4) * 0.58, 0);
    scene.add(mesh);
    const label = labelSprite(`${name} ${state.registers[name].toString(16).toUpperCase().padStart(2, "0")}`, changed ? "#c8ffed" : "#7f8b97", 1.18);
    label.position.set(mesh.position.x, mesh.position.y, 0.3);
    scene.add(label);
  });
  addModelHeader(scene, model);
}

function addStack(scene: THREE.Scene, state: CpuState, model: SourceVisualModel, event?: SimulationEvent): void {
  if (state.stack.length) {
    state.stack.slice(0, 8).forEach((cell, index) => {
      const y = -1.9 + index * 0.5;
      const active = event?.memoryRead?.includes(cell.address.toString(16)) || event?.memoryWrite?.includes(cell.address.toString(16));
      block(scene, `${cell.label} · ${cell.value.toString(16).toUpperCase()}`, [0, y, -index * 0.06], [4.8, 0.38, 1.55], Boolean(active), 0xb6a0f8);
    });
  } else {
    const nodeMap = new Map(model.nodes.map((node) => [node.id, node]));
    const nodes = model.stackNodeIds.map((id) => nodeMap.get(id)).filter((node): node is SourceVisualNode => Boolean(node)).slice(0, 8);
    if (!nodes.length) addEmptyModel(scene, "NO STACK OBJECTS", "No declarations or stack operations in current source");
    nodes.forEach((node, index) => {
      const y = 1.45 - index * 0.52;
      block(scene, nodeLabel(node), [0, y, -index * 0.06], [4.8, 0.4, 1.45], node.line === event?.instruction.line, 0xb6a0f8);
    });
  }
  const high = labelSprite("HIGH ADDRESS", "#68737f", 2.2);
  high.position.set(0, 2.55, 0);
  scene.add(high);
  const low = labelSprite("LOW ADDRESS ↓", "#68737f", 2.2);
  low.position.set(0, -2.35, 0);
  scene.add(low);
  const provenance = labelSprite(`SOURCE MODEL ${model.fingerprint.toUpperCase()} · NO NATIVE ADDRESSES`, "#52606c", 4.5);
  provenance.position.set(0, -2.02, 0);
  scene.add(provenance);
}

function addHeap(scene: THREE.Scene, model: SourceVisualModel, cEvent?: CTraceEvent): void {
  const nodeMap = new Map(model.nodes.map((node) => [node.id, node]));
  const allocations = model.heapNodeIds.map((id) => nodeMap.get(id)).filter((node): node is SourceVisualNode => Boolean(node));
  if (!allocations.length) {
    addEmptyModel(scene, "NO HEAP ALLOCATION", "Add malloc, calloc or realloc to the current source");
    addModelHeader(scene, model);
    return;
  }
  const cells = allocations.flatMap((allocation) => model.memoryCells.filter((cell) => cell.ownerId === allocation.id)).slice(0, 12);
  cells.forEach((cell, index) => {
    const column = index % 6;
    const row = Math.floor(index / 6);
    const allocation = nodeMap.get(cell.ownerId);
    const freed = cell.status === "freed" || allocation?.status === "freed";
    block(scene, shortLabel(`${cell.label}: ${cell.value}`, 18), [-3.15 + column * 1.26, 0.6 - row * 1.28, 0], [1.08, 0.92, 1.05], freed || (cEvent?.kind === "write" && cell.status === "active"), freed ? 0xf27b7b : 0x71e6c1);
  });
  if (!cells.length) allocations.slice(0, 4).forEach((allocation, index) => {
    block(scene, nodeLabel(allocation), [-2.4 + index * 1.6, 0.15, 0], [1.4, 1.05, 1.1], allocation.status === "freed", allocation.status === "freed" ? 0xf27b7b : 0x71e6c1);
  });
  const titleText = allocations.map((allocation) => `${allocation.label}${allocation.status === "freed" ? " · FREED" : ""}`).join(" · ");
  const title = labelSprite(shortLabel(titleText, 48), allocations.some((allocation) => allocation.status === "freed") ? "#f27b7b" : "#71e6c1", 5.5);
  title.position.set(0, 1.62, 0);
  scene.add(title);
  const note = labelSprite("Abstract source layout · no native address assigned", "#68737f", 4.8);
  note.position.set(0, -1.65, 0);
  scene.add(note);
  addModelHeader(scene, model);
}

function addPointers(scene: THREE.Scene, model: SourceVisualModel, cEvent?: CTraceEvent): void {
  const nodeMap = new Map(model.nodes.map((node) => [node.id, node]));
  const selectedIds = new Set(model.pointerNodeIds);
  for (let pass = 0; pass < 3; pass += 1) {
    model.edges.forEach((edge) => { if (selectedIds.has(edge.from)) selectedIds.add(edge.to); });
  }
  const selected = [...selectedIds].map((id) => nodeMap.get(id)).filter((node): node is SourceVisualNode => Boolean(node)).slice(0, 12);
  const fallback = model.stackNodeIds.map((id) => nodeMap.get(id)).filter((node): node is SourceVisualNode => Boolean(node)).slice(0, 8);
  const visible = selected.length ? selected : fallback;
  if (!visible.length) {
    addEmptyModel(scene, "NO POINTER RELATION", "Declare a pointer or use register operands in current source");
    addModelHeader(scene, model);
    return;
  }
  const positions = new Map<string, [number, number, number]>();
  visible.forEach((node, index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    const position: [number, number, number] = [-2.65 + column * 2.65, 1.25 - row * 1.05, 0];
    positions.set(node.id, position);
    const active = node.status === "freed" || cEvent?.line === node.line || cEvent?.source.includes(node.label) === true;
    block(scene, nodeLabel(node), position, [2.15, 0.68, 0.82], active, node.status === "freed" ? 0xf27b7b : node.kind === "field" ? 0x67c7f3 : 0x71e6c1);
  });
  model.edges.forEach((edge) => {
    const from = positions.get(edge.from);
    const to = positions.get(edge.to);
    if (from && to) line(scene, from, to, true);
  });
  addModelHeader(scene, model);
}

function addMemory(scene: THREE.Scene, state: CpuState, model: SourceVisualModel, event?: SimulationEvent): void {
  const entries = Object.entries(state.memory).slice(0, 12);
  if (entries.length) {
    entries.forEach(([address, value], index) => {
      const column = index % 4;
      const row = Math.floor(index / 4);
      const active = event?.memoryRead?.includes(address) || event?.memoryWrite?.includes(address);
      block(scene, `${address.slice(-4)} · ${value.toString(16).padStart(2, "0")}`, [-2.85 + column * 1.9, 1.15 - row * 1.05, 0], [1.58, 0.72, 0.78], Boolean(active), 0x67c7f3);
    });
  } else if (model.memoryCells.length) {
    model.memoryCells.slice(0, 12).forEach((cell, index) => {
      const column = index % 4;
      const row = Math.floor(index / 4);
      block(scene, shortLabel(`+${cell.offset} · ${cell.value}`, 18), [-2.85 + column * 1.9, 1.15 - row * 1.05, 0], [1.58, 0.72, 0.78], cell.status !== "uninitialized", cell.status === "freed" ? 0xf27b7b : 0x67c7f3);
    });
  } else {
    addEmptyModel(scene, "NO MEMORY CELLS", "Arrays, structs and memory operands appear here");
  }
  addModelHeader(scene, model);
}

function addCfg(scene: THREE.Scene, model: SourceVisualModel, event?: SimulationEvent): void {
  const nodeMap = new Map(model.nodes.map((node) => [node.id, node]));
  const nodes = model.cfgNodeIds.map((id) => nodeMap.get(id)).filter((node): node is SourceVisualNode => Boolean(node)).slice(0, 7);
  if (!nodes.length) {
    addEmptyModel(scene, "NO CONTROL FLOW", "Add a function or Assembly instruction to the current source");
    addModelHeader(scene, model);
    return;
  }
  const positions = new Map<string, [number, number, number]>();
  nodes.forEach((node, index) => {
    const branchOffset = node.kind === "branch" ? (index % 2 === 0 ? -1.25 : 1.25) : 0;
    const position: [number, number, number] = [branchOffset, 1.55 - index * 0.6, 0];
    positions.set(node.id, position);
    block(scene, shortLabel(node.label, 24), position, [2.5, 0.44, 0.68], node.line === event?.instruction.line, 0xb6a0f8);
  });
  model.edges.forEach((edge) => {
    const from = positions.get(edge.from);
    const to = positions.get(edge.to);
    if (from && to) line(scene, from, to, edge.label === "branch");
  });
  addModelHeader(scene, model);
}

export function CpuScene({ kind, state, event, cEvent, model, animate }: CpuSceneProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d12);
    scene.fog = new THREE.FogExp2(0x090d12, 0.055);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 1.1, 10.5);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.replaceChildren(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xbcd2e8, 1.35));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(4, 7, 8);
    scene.add(key);
    const accent = new THREE.PointLight(0x71e6c1, 12, 15);
    accent.position.set(-4, 1, 4);
    scene.add(accent);

    if (kind === "cpu") addCpu(scene, state, model, event);
    else if (kind === "stack") addStack(scene, state, model, event);
    else if (kind === "heap") addHeap(scene, model, cEvent);
    else if (kind === "pointers") addPointers(scene, model, cEvent);
    else if (kind === "memory") addMemory(scene, state, model, event);
    else addCfg(scene, model, event);

    const grid = new THREE.GridHelper(18, 28, 0x24313c, 0x121a21);
    grid.position.y = -2.7;
    grid.rotation.x = kind === "cpu" ? 0 : Math.PI / 2;
    scene.add(grid);

    let yaw = 0;
    let pitch = -0.05;
    let zoom = 10.5;
    let dragging = false;
    let previousX = 0;
    let previousY = 0;
    const onPointerDown = (pointerEvent: PointerEvent) => {
      dragging = true;
      previousX = pointerEvent.clientX;
      previousY = pointerEvent.clientY;
      renderer.domElement.setPointerCapture(pointerEvent.pointerId);
    };
    const onPointerMove = (pointerEvent: PointerEvent) => {
      if (!dragging) return;
      yaw += (pointerEvent.clientX - previousX) * 0.006;
      pitch = Math.max(-0.65, Math.min(0.65, pitch + (pointerEvent.clientY - previousY) * 0.004));
      previousX = pointerEvent.clientX;
      previousY = pointerEvent.clientY;
    };
    const onPointerUp = () => { dragging = false; };
    const onWheel = (wheelEvent: WheelEvent) => {
      wheelEvent.preventDefault();
      zoom = Math.max(6.5, Math.min(16, zoom + wheelEvent.deltaY * 0.008));
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      renderer.setSize(Math.max(1, width), Math.max(1, height), false);
      camera.aspect = Math.max(1, width) / Math.max(1, height);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    let frame = 0;
    const render = () => {
      frame = window.requestAnimationFrame(render);
      if (animate && !dragging) yaw += 0.0007;
      camera.position.set(Math.sin(yaw) * zoom, 1.1 + Math.sin(pitch) * 4, Math.cos(yaw) * zoom);
      camera.lookAt(0, -0.2, 0);
      renderer.render(scene, camera);
    };
    render();

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.LineSegments) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
        if (object instanceof THREE.Sprite) {
          object.material.map?.dispose();
          object.material.dispose();
        }
      });
      renderer.dispose();
      host.replaceChildren();
    };
  }, [animate, cEvent, event, kind, model, state]);

  return <div className="ll-cpu-scene" ref={hostRef} data-model-fingerprint={model.fingerprint} aria-label={`Visualização 3D interativa: ${kind}`} />;
}
