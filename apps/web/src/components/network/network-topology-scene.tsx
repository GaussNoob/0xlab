"use client";

import * as THREE from "three";
import { useEffect, useRef } from "react";
import type { NetworkActor, NetworkTrace, NetworkTraceEvent } from "./network-simulator";

interface NetworkTopologySceneProps {
  readonly event: NetworkTraceEvent;
  readonly trace: NetworkTrace;
  readonly playing: boolean;
}

interface ActorDefinition {
  readonly id: NetworkActor;
  readonly label: string;
  readonly detail: string;
  readonly position: readonly [number, number, number];
}

interface ActorHandle {
  readonly group: THREE.Group;
  readonly core: THREE.Mesh<THREE.OctahedronGeometry, THREE.MeshStandardMaterial>;
  readonly ring: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  readonly beacon: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshBasicMaterial>;
}

interface ContextLabelHandle {
  readonly sprite: THREE.Sprite;
  readonly canvas: HTMLCanvasElement;
  readonly context: CanvasRenderingContext2D | null;
  readonly texture: THREE.CanvasTexture;
}

const ACTORS: readonly ActorDefinition[] = [
  { id: "client-app", label: "CLIENT APP", detail: "application", position: [-7.2, 0.35, 0] },
  { id: "client-kernel", label: "CLIENT KERNEL", detail: "socket state", position: [-5.1, -0.2, 0.34] },
  { id: "client-nic", label: "CLIENT NIC", detail: "link", position: [-3.15, 0.22, 0] },
  { id: "router", label: "ROUTER", detail: "layer 3", position: [0, 0.86, -0.16] },
  { id: "server-nic", label: "SERVER NIC", detail: "link", position: [3.15, 0.22, 0] },
  { id: "server-kernel", label: "SERVER KERNEL", detail: "socket state", position: [5.1, -0.2, 0.34] },
  { id: "server-app", label: "SERVER APP", detail: "application", position: [7.2, 0.35, 0] }
] as const;

const TRACE_STEP_MS = 1_250;

function createLabel(title: string, detail: string, color: string, width: number): THREE.Sprite {
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 640;
  labelCanvas.height = 176;
  const context = labelCanvas.getContext("2d");
  if (context) {
    context.textAlign = "center";
    context.fillStyle = color;
    context.font = "700 34px 'Cascadia Code', Consolas, monospace";
    context.fillText(title, labelCanvas.width / 2, 72);
    context.fillStyle = "#72818d";
    context.font = "500 26px 'Cascadia Code', Consolas, monospace";
    context.fillText(detail, labelCanvas.width / 2, 120);
  }
  const texture = new THREE.CanvasTexture(labelCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(width, width / 3.65, 1);
  return sprite;
}

function createContextLabel(): ContextLabelHandle {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 224;
  const context = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(6.8, 1.49, 1);
  return { sprite, canvas, context, texture };
}

function updateContextLabel(handle: ContextLabelHandle, event: NetworkTraceEvent, trace: NetworkTrace): void {
  const { canvas, context, texture } = handle;
  if (!context) return;
  const accent = trace.protocol === "TCP" ? "#71e6c1" : trace.protocol === "UDP" ? "#67c7f3" : "#e9b96e";
  const packetHeadline = event.packet
    ? `${trace.protocol}  /  ${event.packet.label}  /  ${event.packet.totalBytes} B`
    : `${trace.protocol}  /  ${event.phase}  /  NO WIRE PACKET`;
  const routeDetail = event.packet
    ? `${event.packet.direction.toUpperCase()}  ·  CLIENT → SERVER POSITION ${Math.round(event.location * 100)}%`
    : `LOGICAL STATE  ·  CLIENT → SERVER POSITION ${Math.round(event.location * 100)}%`;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(8, 13, 17, 0.78)";
  context.fillRect(28, 20, canvas.width - 56, canvas.height - 40);
  context.strokeStyle = `${accent}99`;
  context.lineWidth = 3;
  context.strokeRect(28, 20, canvas.width - 56, canvas.height - 40);
  context.textAlign = "center";
  context.fillStyle = accent;
  context.font = "700 36px 'Cascadia Code', Consolas, monospace";
  context.fillText(packetHeadline, canvas.width / 2, 96);
  context.fillStyle = "#80909b";
  context.font = "500 25px 'Cascadia Code', Consolas, monospace";
  context.fillText(routeDetail, canvas.width / 2, 148);
  texture.needsUpdate = true;
}

function disposeScene(scene: THREE.Scene): void {
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.LineSegments || child instanceof THREE.Points) {
      child.geometry.dispose();
      const materialList = Array.isArray(child.material) ? child.material : [child.material];
      materialList.forEach((material) => material.dispose());
    }
    if (child instanceof THREE.Sprite) {
      child.material.map?.dispose();
      child.material.dispose();
    }
  });
}

function protocolColor(protocol: NetworkTrace["protocol"]): number {
  if (protocol === "TCP") return 0x71e6c1;
  if (protocol === "UDP") return 0x67c7f3;
  return 0xe9b96e;
}

export function NetworkTopologyScene({ event, trace, playing }: NetworkTopologySceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ event, trace, playing });
  stateRef.current = { event, trace, playing };

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const sceneHost = host;
    const sceneCanvas = canvas;

    const renderer = new THREE.WebGLRenderer({ canvas: sceneCanvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x090d12, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.16;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x090d12, 0.038);
    const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 100);
    const world = new THREE.Group();
    scene.add(world);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(13.6, 64),
      new THREE.MeshStandardMaterial({ color: 0x0e151b, metalness: 0.25, roughness: 0.84 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.16;
    world.add(floor);
    const grid = new THREE.GridHelper(28, 42, 0x27414a, 0x172027);
    grid.position.y = -1.14;
    world.add(grid);

    const starPositions = new Float32Array(330);
    for (let index = 0; index < starPositions.length; index += 3) {
      starPositions[index] = ((index * 11) % 45) - 22;
      starPositions[index + 1] = 0.1 + ((index * 17) % 27) * 0.2;
      starPositions[index + 2] = ((index * 23) % 43) - 21;
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    world.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0x5c7280, size: 0.036, transparent: true, opacity: 0.6, depthWrite: false })));

    scene.add(new THREE.HemisphereLight(0xc5e8f6, 0x090c10, 1.32));
    const keyLight = new THREE.DirectionalLight(0xb6fff0, 2.3);
    keyLight.position.set(1, 9, 7);
    scene.add(keyLight);
    const routeLight = new THREE.PointLight(0x67c7f3, 13, 17, 2);
    routeLight.position.set(0, 2.2, 3);
    scene.add(routeLight);

    const actorHandles = new Map<NetworkActor, ActorHandle>();
    const routePoints: THREE.Vector3[] = [];
    for (const actor of ACTORS) {
      const group = new THREE.Group();
      group.position.set(...actor.position);
      const core = new THREE.Mesh(
        new THREE.OctahedronGeometry(actor.id === "router" ? 0.72 : 0.56, 1),
        new THREE.MeshStandardMaterial({ color: 0x17242c, emissive: 0x1a5360, emissiveIntensity: 0.12, metalness: 0.38, roughness: 0.4 })
      );
      group.add(core);
      const shell = new THREE.LineSegments(
        new THREE.EdgesGeometry(core.geometry),
        new THREE.LineBasicMaterial({ color: 0x4d6876, transparent: true, opacity: 0.76 })
      );
      group.add(shell);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(actor.id === "router" ? 0.85 : 0.68, 0.042, 8, 32),
        new THREE.MeshBasicMaterial({ color: 0x67c7f3, transparent: true, opacity: 0.22 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -0.67;
      group.add(ring);
      const beaconHeight = actor.position[1] + 1.12;
      const beacon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, beaconHeight, 6),
        new THREE.MeshBasicMaterial({ color: 0x486673, transparent: true, opacity: 0.08 })
      );
      beacon.position.y = -beaconHeight / 2;
      group.add(beacon);
      const label = createLabel(actor.label, actor.detail, "#d1e2ea", actor.id === "router" ? 2.95 : 2.62);
      label.position.y = 1.18;
      group.add(label);
      world.add(group);
      actorHandles.set(actor.id, { group, core, ring, beacon });
      routePoints.push(new THREE.Vector3(...actor.position));
    }

    const routeCurve = new THREE.CatmullRomCurve3(routePoints, false, "centripetal");
    const sampledRoutePoints = routeCurve.getPoints(180);
    const routeGeometry = new THREE.BufferGeometry().setFromPoints(sampledRoutePoints);
    const routeMaterial = new THREE.LineDashedMaterial({ color: 0x67c7f3, dashSize: 0.16, gapSize: 0.1, transparent: true, opacity: 0.54 });
    const route = new THREE.Line(routeGeometry, routeMaterial);
    route.computeLineDistances();
    world.add(route);

    const routeProgressGeometry = new THREE.BufferGeometry().setFromPoints(sampledRoutePoints);
    const routeProgressMaterial = new THREE.LineBasicMaterial({ color: 0x71e6c1, transparent: true, opacity: 0.92 });
    const routeProgress = new THREE.Line(routeProgressGeometry, routeProgressMaterial);
    world.add(routeProgress);

    const packetGroup = new THREE.Group();
    const packet = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.19, 2),
      new THREE.MeshBasicMaterial({ color: 0x71e6c1, transparent: true, opacity: 0.98 })
    );
    packetGroup.add(packet);
    const packetHalo = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 16, 10),
      new THREE.MeshBasicMaterial({ color: 0x71e6c1, transparent: true, opacity: 0.08, side: THREE.BackSide, depthWrite: false })
    );
    packetGroup.add(packetHalo);
    const packetPointer = new THREE.Mesh(
      new THREE.ConeGeometry(0.11, 0.28, 10),
      new THREE.MeshBasicMaterial({ color: 0x71e6c1, transparent: true, opacity: 0.92 })
    );
    packetPointer.position.y = 0.35;
    packetGroup.add(packetPointer);
    world.add(packetGroup);

    const contextLabel = createContextLabel();
    contextLabel.sprite.position.set(0, 2.82, 0.2);
    world.add(contextLabel.sprite);

    let dragging = false;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let orbitYaw = 0;
    let orbitPitch = 0;
    let cameraDistance = 17.2;
    let fitDistance = 17.2;

    function onPointerDown(event: PointerEvent): void {
      dragging = true;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      sceneCanvas.setPointerCapture(event.pointerId);
      sceneCanvas.style.cursor = "grabbing";
    }

    function onPointerMove(event: PointerEvent): void {
      if (!dragging) return;
      orbitYaw += (event.clientX - lastPointerX) * 0.0056;
      orbitPitch = THREE.MathUtils.clamp(orbitPitch + (event.clientY - lastPointerY) * 0.0034, -0.14, 0.2);
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
    }

    function onPointerUp(event: PointerEvent): void {
      dragging = false;
      if (sceneCanvas.hasPointerCapture(event.pointerId)) sceneCanvas.releasePointerCapture(event.pointerId);
      sceneCanvas.style.cursor = "grab";
    }

    function onWheel(event: WheelEvent): void {
      event.preventDefault();
      cameraDistance = THREE.MathUtils.clamp(cameraDistance + event.deltaY * 0.01, 13.6, 26);
    }

    sceneCanvas.style.cursor = "grab";
    sceneCanvas.addEventListener("pointerdown", onPointerDown);
    sceneCanvas.addEventListener("pointermove", onPointerMove);
    sceneCanvas.addEventListener("pointerup", onPointerUp);
    sceneCanvas.addEventListener("pointercancel", onPointerUp);
    sceneCanvas.addEventListener("pointerleave", onPointerUp);
    sceneCanvas.addEventListener("wheel", onWheel, { passive: false });

    function resize(): void {
      const bounds = sceneHost.getBoundingClientRect();
      const width = Math.max(1, bounds.width);
      const height = Math.max(1, bounds.height);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      fitDistance = THREE.MathUtils.clamp(9.1 / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect), 16.5, 26);
      camera.updateProjectionMatrix();
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(sceneHost);
    resize();

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let animationFrame = 0;
    let lastEventKey = `${stateRef.current.trace.fingerprint}:${stateRef.current.event.id}`;
    let lastPlaying = stateRef.current.playing;
    let lastContextKey = "";
    let displayedLocation = THREE.MathUtils.clamp(stateRef.current.event.location, 0, 1);
    let targetLocation = displayedLocation;
    let transitionFrom = displayedLocation;
    let transitionStartedAt = performance.now();
    let lastPacketDirection = stateRef.current.event.packet?.direction;
    const packetDirection = new THREE.Vector3();
    const upAxis = new THREE.Vector3(0, 1, 0);
    const targetScale = new THREE.Vector3();

    function render(now: number): void {
      animationFrame = 0;
      const state = stateRef.current;
      const elapsed = now * 0.001;
      const accent = protocolColor(state.trace.protocol);
      const nextLocation = THREE.MathUtils.clamp(state.event.location, 0, 1);
      const eventKey = `${state.trace.fingerprint}:${state.event.id}`;

      if (eventKey !== lastEventKey) {
        const nextDirection = state.event.packet?.direction;
        const reversesDirection = Boolean(nextDirection && lastPacketDirection && nextDirection !== lastPacketDirection);
        const contradictsDirection = nextDirection === "outbound"
          ? displayedLocation > nextLocation
          : nextDirection === "inbound" ? displayedLocation < nextLocation : false;
        transitionFrom = nextDirection && (reversesDirection || contradictsDirection)
          ? nextDirection === "outbound" ? 0.02 : 0.98
          : displayedLocation;
        displayedLocation = transitionFrom;
        targetLocation = nextLocation;
        transitionStartedAt = now;
        if (!state.playing || reduceMotion) displayedLocation = targetLocation;
        lastEventKey = eventKey;
        lastPacketDirection = nextDirection;
      } else if (lastPlaying && !state.playing) {
        targetLocation = nextLocation;
        displayedLocation = targetLocation;
        transitionFrom = targetLocation;
      }
      lastPlaying = state.playing;

      if (state.playing && !reduceMotion && displayedLocation !== targetLocation) {
        const linearProgress = THREE.MathUtils.clamp((now - transitionStartedAt) / TRACE_STEP_MS, 0, 1);
        const smoothProgress = linearProgress * linearProgress * (3 - 2 * linearProgress);
        displayedLocation = THREE.MathUtils.lerp(transitionFrom, targetLocation, smoothProgress);
      } else if (!state.playing || reduceMotion) {
        displayedLocation = targetLocation;
      }

      packetGroup.position.copy(routeCurve.getPointAt(displayedLocation));
      packetDirection.copy(routeCurve.getTangentAt(displayedLocation));
      if (state.event.packet?.direction === "inbound") packetDirection.multiplyScalar(-1);
      packetGroup.quaternion.setFromUnitVectors(upAxis, packetDirection.normalize());
      packetGroup.visible = Boolean(state.event.packet);
      const packetMaterial = packet.material as THREE.MeshBasicMaterial;
      packetMaterial.color.setHex(accent);
      const haloMaterial = packetHalo.material as THREE.MeshBasicMaterial;
      haloMaterial.color.setHex(accent);
      packetHalo.scale.setScalar(reduceMotion ? 1 : 1 + Math.sin(elapsed * 5) * 0.16);
      (packetPointer.material as THREE.MeshBasicMaterial).color.setHex(accent);
      routeMaterial.color.setHex(accent);
      routeMaterial.opacity = state.event.packet ? 0.94 : 0.62;
      routeProgressMaterial.color.setHex(accent);
      routeProgressMaterial.opacity = state.event.packet ? 0.96 : 0.42;
      const progressIndex = Math.round(displayedLocation * (sampledRoutePoints.length - 1));
      if (state.event.packet?.direction === "inbound") {
        routeProgressGeometry.setDrawRange(progressIndex, sampledRoutePoints.length - progressIndex);
      } else {
        routeProgressGeometry.setDrawRange(0, Math.max(2, progressIndex + 1));
      }

      const contextKey = `${state.trace.fingerprint}:${state.event.id}`;
      if (contextKey !== lastContextKey) {
        updateContextLabel(contextLabel, state.event, state.trace);
        lastContextKey = contextKey;
      }

      ACTORS.forEach((actor, index) => {
        const handle = actorHandles.get(actor.id);
        if (!handle) return;
        const active = actor.id === state.event.actor;
        const actorLocation = index / Math.max(1, ACTORS.length - 1);
        const visited = state.event.packet?.direction === "inbound"
          ? actorLocation >= displayedLocation
          : actorLocation <= displayedLocation;
        handle.core.material.color.setHex(active ? 0x29434f : visited ? 0x203b45 : 0x1b2b34);
        handle.core.material.emissive.setHex(active ? accent : visited ? 0x3c7480 : 0x24434e);
        handle.core.material.emissiveIntensity = active ? 0.82 : visited ? 0.36 : 0.18;
        handle.ring.material.color.setHex(active ? accent : 0x4c7180);
        handle.ring.material.opacity = active ? 0.94 : visited ? 0.44 : 0.16;
        handle.beacon.material.color.setHex(active ? accent : 0x486673);
        handle.beacon.material.opacity = active ? 0.86 : visited ? 0.32 : 0.08;
        const scale = active && !reduceMotion ? 1.1 + Math.sin(elapsed * 3.8) * 0.06 : 1;
        targetScale.setScalar(scale);
        handle.group.scale.lerp(targetScale, 0.14);
        if (active && !reduceMotion) handle.ring.rotation.z += 0.012;
      });

      world.rotation.y += ((orbitYaw + (reduceMotion ? 0 : Math.sin(elapsed * 0.14) * 0.018)) - world.rotation.y) * 0.055;
      world.rotation.x += (orbitPitch - world.rotation.x) * 0.055;
      camera.position.z += (Math.max(cameraDistance, fitDistance) - camera.position.z) * 0.065;
      camera.position.y = 5.6;
      camera.lookAt(0, 0.55, 0);
      renderer.render(scene, camera);
      if (!document.hidden) animationFrame = window.requestAnimationFrame(render);
    }

    function onVisibilityChange(): void {
      if (document.hidden) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
        return;
      }
      const currentState = stateRef.current;
      displayedLocation = THREE.MathUtils.clamp(currentState.event.location, 0, 1);
      targetLocation = displayedLocation;
      transitionFrom = displayedLocation;
      lastEventKey = `${currentState.trace.fingerprint}:${currentState.event.id}`;
      if (!animationFrame) animationFrame = window.requestAnimationFrame(render);
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      resizeObserver.disconnect();
      sceneCanvas.removeEventListener("pointerdown", onPointerDown);
      sceneCanvas.removeEventListener("pointermove", onPointerMove);
      sceneCanvas.removeEventListener("pointerup", onPointerUp);
      sceneCanvas.removeEventListener("pointercancel", onPointerUp);
      sceneCanvas.removeEventListener("pointerleave", onPointerUp);
      sceneCanvas.removeEventListener("wheel", onWheel);
      disposeScene(scene);
      renderer.dispose();
    };
  }, []);

  return (
    <div className="network-topology-scene" ref={hostRef} data-protocol={trace.protocol} data-playing={playing} data-step={event.index + 1} data-location={event.location}>
      <canvas ref={canvasRef} aria-label="Topologia interativa da rede" />
      <div className="network-scene-status" data-playing={playing}><i /><span>{playing ? "TRACE RUNNING" : "TRACE PAUSED"}</span><small>STEP {String(event.index + 1).padStart(2, "0")} · {event.packet ? `${event.packet.label} · ${event.packet.direction}` : "KERNEL / APP STATE"}</small></div>
      <div className="network-scene-help">DRAG ORBIT · SCROLL ZOOM · ABSOLUTE CLIENT → SERVER COORDINATES</div>
      <p className="network-scene-announcement" role="status" aria-live="polite" aria-atomic="true">Etapa {event.index + 1}: {event.title}. {event.packet ? `Pacote ${event.packet.label}, direção ${event.packet.direction}, posição ${Math.round(event.location * 100)} por cento.` : `Nenhum pacote no enlace; posição lógica ${Math.round(event.location * 100)} por cento.`}</p>
    </div>
  );
}
