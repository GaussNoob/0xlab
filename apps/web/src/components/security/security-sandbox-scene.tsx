"use client";

import * as THREE from "three";
import { useEffect, useRef } from "react";
import { malwareTimeline } from "./security-lab-model";

type SandboxEvent = (typeof malwareTimeline)[number];

interface SecuritySandboxSceneProps {
  readonly event: SandboxEvent;
  readonly encrypted: boolean;
  readonly exfil: boolean;
}

interface SceneNode {
  readonly group: THREE.Group;
  readonly core: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  readonly halo: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>;
}

interface Route {
  readonly curve: THREE.CatmullRomCurve3;
  readonly color: number;
  readonly line: THREE.Line<THREE.BufferGeometry, THREE.LineDashedMaterial>;
}

function createLabel(text: string, color: string, width: number): THREE.Sprite {
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 640;
  labelCanvas.height = 128;
  const context = labelCanvas.getContext("2d");
  if (context) {
    context.font = "700 38px 'Cascadia Code', Consolas, monospace";
    context.textAlign = "center";
    context.fillStyle = color;
    context.fillText(text, labelCanvas.width / 2, 72);
  }
  const texture = new THREE.CanvasTexture(labelCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(width, width / 5, 1);
  return sprite;
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

function makeNode(label: string, position: readonly [number, number, number], color: number, width = 1.7): SceneNode {
  const group = new THREE.Group();
  group.position.set(...position);
  const core = new THREE.Mesh(
    new THREE.BoxGeometry(width, 1.02, 0.82, 2, 2, 2),
    new THREE.MeshStandardMaterial({ color: 0x151f28, emissive: color, emissiveIntensity: 0.14, metalness: 0.36, roughness: 0.46 })
  );
  core.castShadow = true;
  group.add(core);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(core.geometry),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.82 })
  );
  group.add(edges);
  const halo = new THREE.Mesh(
    new THREE.BoxGeometry(width * 1.18, 1.2, 1.02),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.035, side: THREE.BackSide, depthWrite: false })
  );
  group.add(halo);
  const text = createLabel(label, "#c9d5dd", Math.max(1.6, width * 1.65));
  text.position.set(0, -0.92, 0.04);
  group.add(text);
  return { group, core, halo };
}

function makeRoute(from: THREE.Vector3, to: THREE.Vector3, color: number, lift: number): Route {
  const curve = new THREE.CatmullRomCurve3([
    from,
    new THREE.Vector3(from.x * 0.54, from.y + lift, 0.45),
    new THREE.Vector3(to.x * 0.54, to.y + lift, 0.45),
    to
  ]);
  const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(48));
  const material = new THREE.LineDashedMaterial({ color, dashSize: 0.14, gapSize: 0.1, transparent: true, opacity: 0.56 });
  const line = new THREE.Line(geometry, material);
  line.computeLineDistances();
  return { curve, color, line };
}

function activityRoute(event: SandboxEvent, encrypted: boolean, exfil: boolean): "c2" | "files" | "edr" {
  if (exfil) return "c2";
  if (encrypted || event.event.includes("File") || event.event.includes("Config")) return "files";
  if (event.event.includes("Connection") || event.event.includes("Command")) return "c2";
  return "edr";
}

export function SecuritySandboxScene({ event, encrypted, exfil }: SecuritySandboxSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ event, encrypted, exfil });
  stateRef.current = { event, encrypted, exfil };

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const sceneHost = host;
    const sceneCanvas = canvas;

    const renderer = new THREE.WebGLRenderer({ canvas: sceneCanvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.setClearColor(0x090d12, 1);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x090d12, 0.043);
    const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 100);
    const world = new THREE.Group();
    scene.add(world);

    const grid = new THREE.GridHelper(20, 30, 0x4a3147, 0x182027);
    grid.position.y = -0.78;
    world.add(grid);
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(10.2, 64),
      new THREE.MeshStandardMaterial({ color: 0x0e141b, metalness: 0.24, roughness: 0.82 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.8;
    floor.receiveShadow = true;
    world.add(floor);

    const starPositions = new Float32Array(270);
    for (let index = 0; index < starPositions.length; index += 3) {
      starPositions[index] = ((index * 13) % 33) - 16;
      starPositions[index + 1] = ((index * 7) % 22) * 0.28;
      starPositions[index + 2] = ((index * 19) % 31) - 15;
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    world.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0x6b7f91, size: 0.038, transparent: true, opacity: 0.58, depthWrite: false })));

    scene.add(new THREE.HemisphereLight(0xd1e3ff, 0x080a0d, 1.22));
    const keyLight = new THREE.DirectionalLight(0xf4a9d7, 2.45);
    keyLight.position.set(4, 11, 7);
    keyLight.castShadow = true;
    scene.add(keyLight);
    const cyanLight = new THREE.PointLight(0x67c7f3, 15, 15, 2);
    cyanLight.position.set(-5, 2.5, 3);
    scene.add(cyanLight);

    const processNode = makeNode("LAB-SAMPLE", [0, 0.75, 0], 0xf08bd2, 2.15);
    const c2Node = makeNode("LOOPBACK C2", [-5.1, 0.45, 0.1], 0x67c7f3, 1.84);
    const filesNode = makeNode("FAKE FILES", [5.05, 0.42, 0.1], 0xe9b96e, 1.85);
    const edrNode = makeNode("MINI EDR", [0, 4.1, 0.3], 0x71e6c1, 1.72);
    world.add(processNode.group, c2Node.group, filesNode.group, edrNode.group);

    const routes = {
      c2: makeRoute(new THREE.Vector3(-0.95, 0.8, 0), new THREE.Vector3(-4.2, 0.45, 0.1), 0x67c7f3, 0.78),
      files: makeRoute(new THREE.Vector3(1.02, 0.72, 0), new THREE.Vector3(4.14, 0.42, 0.1), 0xe9b96e, 0.64),
      edr: makeRoute(new THREE.Vector3(0, 1.28, 0), new THREE.Vector3(0, 3.52, 0.3), 0x71e6c1, 0.6)
    };
    Object.values(routes).forEach((route) => world.add(route.line));

    const fileCores: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>[] = [];
    for (let index = 0; index < 3; index += 1) {
      const file = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.48, 0.16),
        new THREE.MeshStandardMaterial({ color: 0xb9cad4, emissive: 0x233442, emissiveIntensity: 0.18, metalness: 0.16, roughness: 0.54 })
      );
      file.position.set(4.72 + index * 0.33, 0.76, 0.52);
      file.rotation.z = (index - 1) * 0.12;
      world.add(file);
      fileCores.push(file);
    }

    const activityParticle = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0x67c7f3, transparent: true, opacity: 0.96 })
    );
    world.add(activityParticle);
    const alertRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.48, 0.045, 10, 48),
      new THREE.MeshBasicMaterial({ color: 0xf08bd2, transparent: true, opacity: 0.48 })
    );
    alertRing.rotation.x = Math.PI / 2;
    alertRing.position.set(0, -0.72, 0);
    world.add(alertRing);

    let dragging = false;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let orbitYaw = 0;
    let orbitPitch = 0;
    let cameraDistance = 13.2;

    function onPointerDown(event: PointerEvent): void {
      dragging = true;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      sceneCanvas.setPointerCapture(event.pointerId);
      sceneCanvas.style.cursor = "grabbing";
    }

    function onPointerMove(event: PointerEvent): void {
      if (!dragging) return;
      orbitYaw += (event.clientX - lastPointerX) * 0.006;
      orbitPitch = THREE.MathUtils.clamp(orbitPitch + (event.clientY - lastPointerY) * 0.0034, -0.18, 0.22);
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
      cameraDistance = THREE.MathUtils.clamp(cameraDistance + event.deltaY * 0.009, 9.8, 18.2);
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
      renderer.setSize(Math.max(1, bounds.width), Math.max(1, bounds.height), false);
      camera.aspect = Math.max(1, bounds.width) / Math.max(1, bounds.height);
      camera.updateProjectionMatrix();
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(sceneHost);
    resize();

    const clock = new THREE.Clock();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let animationFrame = 0;

    function render(): void {
      const state = stateRef.current;
      const elapsed = clock.getElapsedTime();
      const currentRoute = routes[activityRoute(state.event, state.encrypted, state.exfil)];
      const routeProgress = reduceMotion ? 0.56 : (elapsed * (state.exfil ? 0.24 : 0.16)) % 1;
      activityParticle.position.copy(currentRoute.curve.getPointAt(state.exfil ? 1 - routeProgress : routeProgress));
      const particleMaterial = activityParticle.material as THREE.MeshBasicMaterial;
      particleMaterial.color.setHex(state.encrypted || state.exfil ? 0xf08bd2 : currentRoute.color);

      Object.entries(routes).forEach(([routeId, route]) => {
        route.line.material.opacity = routeId === activityRoute(state.event, state.encrypted, state.exfil) ? 0.96 : 0.22;
      });
      const eventPulse = reduceMotion ? 0.42 : 0.42 + Math.sin(elapsed * 3.2) * 0.2;
      processNode.core.material.emissiveIntensity = eventPulse;
      processNode.halo.material.opacity = eventPulse * 0.18;
      c2Node.halo.material.opacity = currentRoute === routes.c2 ? 0.16 : 0.035;
      filesNode.halo.material.opacity = currentRoute === routes.files ? 0.16 : 0.035;
      edrNode.halo.material.opacity = currentRoute === routes.edr ? 0.16 : 0.035;
      fileCores.forEach((file) => {
        file.material.color.setHex(state.encrypted ? 0xf08bd2 : 0xb9cad4);
        file.material.emissive.setHex(state.encrypted ? 0x6d174f : 0x233442);
        file.rotation.y = reduceMotion ? 0 : elapsed * 0.26;
      });
      alertRing.material.color.setHex(state.encrypted || state.exfil ? 0xf08bd2 : 0x71e6c1);
      alertRing.scale.setScalar(reduceMotion ? 1 : 1 + Math.sin(elapsed * 2.6) * 0.025);
      world.rotation.y += ((orbitYaw + (reduceMotion ? 0 : Math.sin(elapsed * 0.15) * 0.018)) - world.rotation.y) * 0.055;
      world.rotation.x += (orbitPitch - world.rotation.x) * 0.055;
      camera.position.z += (cameraDistance - camera.position.z) * 0.065;
      camera.position.y = 4.6;
      camera.lookAt(0, 1.1, 0);
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(render);
    }

    render();

    return () => {
      window.cancelAnimationFrame(animationFrame);
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
    <div className="sl-sandbox-scene" ref={hostRef} data-alert={encrypted || exfil}>
      <canvas ref={canvasRef} aria-label="Mapa 3D do sandbox de segurança" />
      <div className="sl-scene-status"><i /><span>LIVE SANDBOX GRAPH</span><small>THREE.JS · GPU</small></div>
      <div className="sl-scene-event" aria-live="polite">
        <span>{event.t}</span>
        <strong>{event.event}</strong>
        <code>{event.api}</code>
      </div>
      <div className="sl-scene-help">ARRASTE PARA ORBITAR · SCROLL PARA ZOOM · SEM PROCESSOS REAIS</div>
    </div>
  );
}
