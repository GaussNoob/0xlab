"use client";

import * as THREE from "three";
import { useEffect, useRef, useState } from "react";
import type { BlockState, MemoryBlock, MemoryLink, MemoryRegion } from "./memory-concept-types";

interface MemoryArchitectureSceneProps {
  readonly blocks: readonly MemoryBlock[];
  readonly links: readonly MemoryLink[];
  readonly toolId: "stack-heap" | "allocator" | "bugs";
  readonly stepKey: string;
}

const regionColors: Readonly<Record<MemoryRegion, number>> = {
  stack: 0x71e6c1,
  heap: 0x67c7f3,
  metadata: 0xaf8bff
};

const regionLabels: Readonly<Record<MemoryRegion, string>> = {
  stack: "STACK",
  heap: "HEAP / ARENA",
  metadata: "ALLOCATOR METADATA"
};

function stateColor(region: MemoryRegion, state: BlockState): number {
  if (state === "danger") return 0xe76c7a;
  if (state === "freed") return 0x4d5964;
  if (state === "padding") return 0xaf8bff;
  if (state === "unreachable") return 0xe0ae61;
  if (state === "changed") return region === "stack" ? 0x8affd8 : 0x79dcff;
  return regionColors[region];
}

function byteWeight(size: string): number {
  const bytes = Number.parseInt(size.match(/\d+/)?.[0] ?? "16", 10);
  return Math.max(1.2, Math.min(3.4, Math.log2(bytes + 1) * 0.58));
}

function createTextSprite(title: string, subtitle: string, color: string, scale: number): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 192;
  const context = canvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.textAlign = "center";
    context.shadowColor = "rgba(0,0,0,.9)";
    context.shadowBlur = 12;
    context.fillStyle = color;
    context.font = "600 38px 'Cascadia Code', Consolas, monospace";
    context.fillText(title.length > 24 ? `${title.slice(0, 22)}…` : title, 320, 82);
    context.shadowBlur = 7;
    context.fillStyle = "#71808d";
    context.font = "500 22px 'Cascadia Code', Consolas, monospace";
    context.fillText(subtitle.length > 35 ? `${subtitle.slice(0, 33)}…` : subtitle, 320, 126);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, opacity: .95 }));
  sprite.scale.set(3.5 * scale, 1.05 * scale, 1);
  return sprite;
}

function deterministicUnit(index: number, salt: number): number {
  const value = Math.sin(index * 91.73 + salt * 47.11) * 43758.5453;
  return value - Math.floor(value);
}

export function MemoryArchitectureScene({ blocks, links, toolId, stepKey }: MemoryArchitectureSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hovered = blocks.find((block) => block.id === hoveredId);

  useEffect(() => {
    setHoveredId(null);
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.setClearColor(0x090c10, 0);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x090c10, .026);
    const camera = new THREE.PerspectiveCamera(40, 1, .1, 100);
    camera.position.set(0, 8.7, 14.5);
    camera.lookAt(0, .15, 0);

    scene.add(new THREE.HemisphereLight(0x9bdcff, 0x0a0d11, 1.25));
    const keyLight = new THREE.DirectionalLight(0xb9ffe9, 3.2);
    keyLight.position.set(-5, 9, 7);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x8d6bff, 24, 24, 2);
    rimLight.position.set(7, 5, -5);
    scene.add(rimLight);
    const cyanLight = new THREE.PointLight(0x45bfff, 16, 22, 2);
    cyanLight.position.set(-7, 2, 4);
    scene.add(cyanLight);

    const grid = new THREE.GridHelper(32, 48, 0x26333e, 0x151b22);
    grid.position.y = -.48;
    scene.add(grid);

    const starsGeometry = new THREE.BufferGeometry();
    const stars = new Float32Array(150 * 3);
    for (let index = 0; index < 150; index += 1) {
      stars[index * 3] = (deterministicUnit(index, 1) - .5) * 28;
      stars[index * 3 + 1] = deterministicUnit(index, 2) * 7 + .5;
      stars[index * 3 + 2] = (deterministicUnit(index, 3) - .5) * 20;
    }
    starsGeometry.setAttribute("position", new THREE.BufferAttribute(stars, 3));
    const starsMaterial = new THREE.PointsMaterial({ color: 0x5f778b, size: .035, transparent: true, opacity: .48, depthWrite: false });
    scene.add(new THREE.Points(starsGeometry, starsMaterial));

    const world = new THREE.Group();
    world.position.y = -.1;
    scene.add(world);

    const regions: readonly MemoryRegion[] = toolId === "allocator"
      ? ["heap", "metadata"]
      : ["stack", "heap", "metadata"];
    const regionZ = new Map<MemoryRegion, number>();
    regions.forEach((region, index) => regionZ.set(region, (index - (regions.length - 1) / 2) * 4.15));

    const platformGeometry = new THREE.BoxGeometry(14.4, .16, 2.65);
    for (const region of regions) {
      const z = regionZ.get(region)!;
      const color = regionColors[region];
      const platformMaterial = new THREE.MeshStandardMaterial({ color: 0x111820, emissive: color, emissiveIntensity: .045, metalness: .25, roughness: .72, transparent: true, opacity: .92 });
      const platform = new THREE.Mesh(platformGeometry, platformMaterial);
      platform.position.set(0, -.24, z);
      world.add(platform);

      const edgeGeometry = new THREE.EdgesGeometry(platformGeometry);
      const edgeMaterial = new THREE.LineBasicMaterial({ color, transparent: true, opacity: .28 });
      const platformEdges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      platformEdges.position.copy(platform.position);
      world.add(platformEdges);

      const regionLabel = createTextSprite(regionLabels[region], `${blocks.filter((block) => block.region === region).length} live visual blocks`, `#${color.toString(16).padStart(6, "0")}`, .62);
      regionLabel.position.set(-4.45, .28, z + .92);
      world.add(regionLabel);

      const addressRailGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-6.65, -.08, z - 1.05),
        new THREE.Vector3(6.65, -.08, z - 1.05)
      ]);
      const addressRail = new THREE.Line(addressRailGeometry, new THREE.LineDashedMaterial({ color, dashSize: .18, gapSize: .13, transparent: true, opacity: .26 }));
      addressRail.computeLineDistances();
      world.add(addressRail);
    }

    interface AnimatedBlock {
      readonly group: THREE.Group;
      readonly mesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshPhysicalMaterial>;
      readonly glow: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>;
      readonly baseY: number;
      readonly targetOpacity: number;
      readonly delay: number;
      readonly state: BlockState;
    }

    const animatedBlocks: AnimatedBlock[] = [];
    const objectGroups = new Map<string, THREE.Group>();
    const interactiveMeshes: THREE.Mesh<THREE.BoxGeometry, THREE.MeshPhysicalMaterial>[] = [];
    let animationIndex = 0;

    for (const region of regions) {
      const regionBlocks = blocks.filter((block) => block.region === region);
      if (regionBlocks.length === 0) continue;
      const weights = regionBlocks.map((item) => byteWeight(item.size));
      const rawTotal = weights.reduce((sum, value) => sum + value, 0);
      const gap = .18;
      const available = 11.8 - gap * Math.max(0, regionBlocks.length - 1);
      const scale = Math.min(1, available / rawTotal);
      const widths = weights.map((weight) => Math.max(.9, weight * scale));
      const total = widths.reduce((sum, value) => sum + value, 0) + gap * Math.max(0, widths.length - 1);
      let cursor = -total / 2;

      regionBlocks.forEach((item, index) => {
        const width = widths[index]!;
        const height = item.state === "changed" || item.state === "danger" ? 1.04 : .82;
        const depth = 1.48;
        const color = stateColor(item.region, item.state);
        const targetOpacity = item.state === "freed" ? .34 : item.state === "padding" ? .48 : .88;
        const geometry = new THREE.BoxGeometry(width, height, depth, 2, 1, 2);
        const material = new THREE.MeshPhysicalMaterial({
          color,
          emissive: color,
          emissiveIntensity: item.state === "changed" || item.state === "danger" ? .42 : .13,
          metalness: .22,
          roughness: .3,
          clearcoat: .72,
          clearcoatRoughness: .24,
          transparent: true,
          opacity: 0
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData.blockId = item.id;
        mesh.userData.baseEmissive = material.emissiveIntensity;

        const group = new THREE.Group();
        const baseY = .34 + height / 2;
        group.position.set(cursor + width / 2, baseY - .7, regionZ.get(region)!);
        group.add(mesh);

        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({ color, transparent: true, opacity: item.state === "freed" ? .28 : .84 }));
        group.add(edges);

        const glowGeometry = new THREE.BoxGeometry(width * 1.08, height * 1.16, depth * 1.1);
        const glowMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, side: THREE.BackSide, depthWrite: false });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        group.add(glow);

        const label = createTextSprite(item.label, `${item.address} · ${item.size}`, item.state === "danger" ? "#ff8e9b" : "#dce6ee", Math.max(.48, Math.min(.8, width / 2.4)));
        label.position.set(0, height / 2 + .48, .05);
        group.add(label);

        world.add(group);
        objectGroups.set(item.id, group);
        interactiveMeshes.push(mesh);
        animatedBlocks.push({ group, mesh, glow, baseY, targetOpacity, delay: animationIndex * .07, state: item.state });
        animationIndex += 1;
        cursor += width + gap;
      });
    }

    interface FlowParticle {
      readonly mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
      readonly curve: THREE.CatmullRomCurve3;
      readonly offset: number;
      readonly speed: number;
    }
    const flowParticles: FlowParticle[] = [];

    links.forEach((link, linkIndex) => {
      const from = objectGroups.get(link.from);
      const to = objectGroups.get(link.to);
      if (!from || !to) return;
      const color = link.state === "dangling" ? 0xe76c7a : 0x71e6c1;
      const start = from.position.clone().add(new THREE.Vector3(0, .8, 0));
      const end = to.position.clone().add(new THREE.Vector3(0, .8, 0));
      const lift = Math.max(start.y, end.y) + 1.25 + linkIndex * .16;
      const curve = new THREE.CatmullRomCurve3([
        start,
        new THREE.Vector3(start.x, lift, start.z),
        new THREE.Vector3((start.x + end.x) / 2, lift + .35, (start.z + end.z) / 2),
        new THREE.Vector3(end.x, lift, end.z),
        end
      ]);
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 48, .032, 7, false),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: link.state === "dangling" ? .68 : .54, depthWrite: false })
      );
      world.add(tube);

      for (let particleIndex = 0; particleIndex < 3; particleIndex += 1) {
        const particle = new THREE.Mesh(new THREE.SphereGeometry(.075, 10, 8), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .96 }));
        world.add(particle);
        flowParticles.push({ mesh: particle, curve, offset: particleIndex / 3 + linkIndex * .11, speed: link.state === "dangling" ? .08 : .13 });
      }
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(3, 3);
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let userYaw = 0;
    let userPitch = 0;
    let pointerYaw = 0;
    let pointerPitch = 0;
    let cameraDistance = 14.5;
    let localHovered: THREE.Mesh<THREE.BoxGeometry, THREE.MeshPhysicalMaterial> | null = null;

    function updateHover(clientX: number, clientY: number) {
      const bounds = canvas!.getBoundingClientRect();
      pointer.x = ((clientX - bounds.left) / Math.max(1, bounds.width)) * 2 - 1;
      pointer.y = -((clientY - bounds.top) / Math.max(1, bounds.height)) * 2 + 1;
      pointerYaw = pointer.x * .075;
      pointerPitch = -pointer.y * .025;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(interactiveMeshes, false)[0]?.object as typeof localHovered | undefined;
      if (hit === localHovered) return;
      if (localHovered) localHovered.userData.hovered = false;
      localHovered = hit ?? null;
      if (localHovered) localHovered.userData.hovered = true;
      canvas!.style.cursor = localHovered ? "pointer" : dragging ? "grabbing" : "grab";
      setHoveredId(localHovered?.userData.blockId as string | undefined ?? null);
    }

    function onPointerDown(event: PointerEvent) {
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      canvas!.setPointerCapture(event.pointerId);
      canvas!.style.cursor = "grabbing";
    }

    function onPointerMove(event: PointerEvent) {
      if (dragging) {
        userYaw += (event.clientX - lastX) * .006;
        userPitch = THREE.MathUtils.clamp(userPitch + (event.clientY - lastY) * .0035, -.16, .22);
        lastX = event.clientX;
        lastY = event.clientY;
      }
      updateHover(event.clientX, event.clientY);
    }

    function onPointerUp(event: PointerEvent) {
      dragging = false;
      if (canvas!.hasPointerCapture(event.pointerId)) canvas!.releasePointerCapture(event.pointerId);
      canvas!.style.cursor = localHovered ? "pointer" : "grab";
    }

    function onPointerLeave() {
      dragging = false;
      pointerYaw = 0;
      pointerPitch = 0;
      if (localHovered) localHovered.userData.hovered = false;
      localHovered = null;
      setHoveredId(null);
      canvas!.style.cursor = "grab";
    }

    function onWheel(event: WheelEvent) {
      event.preventDefault();
      cameraDistance = THREE.MathUtils.clamp(cameraDistance + event.deltaY * .009, 10.5, 19);
    }

    canvas.style.cursor = "grab";
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerLeave);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    function resize() {
      const { width, height } = host!.getBoundingClientRect();
      renderer.setSize(Math.max(1, width), Math.max(1, height), false);
      camera.aspect = Math.max(1, width) / Math.max(1, height);
      camera.updateProjectionMatrix();
    }
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    const clock = new THREE.Clock();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;

    function render() {
      const elapsed = clock.getElapsedTime();
      const targetYaw = userYaw + (reduceMotion ? 0 : pointerYaw + Math.sin(elapsed * .18) * .018);
      const targetPitch = userPitch + (reduceMotion ? 0 : pointerPitch);
      world.rotation.y += (targetYaw - world.rotation.y) * .055;
      world.rotation.x += (targetPitch - world.rotation.x) * .055;
      camera.position.z += (cameraDistance - camera.position.z) * .06;
      camera.lookAt(0, .15, 0);

      animatedBlocks.forEach((item) => {
        const progress = reduceMotion ? 1 : THREE.MathUtils.clamp((elapsed - item.delay) / .5, 0, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        item.group.position.y = item.baseY - (1 - eased) * .72;
        item.mesh.material.opacity = item.targetOpacity * eased;
        const hoveredNow = item.mesh.userData.hovered === true;
        const pulse = item.state === "danger" || item.state === "changed" ? .5 + Math.sin(elapsed * 3.4 + item.delay) * .25 : .12;
        item.mesh.material.emissiveIntensity += ((hoveredNow ? .82 : item.mesh.userData.baseEmissive) - item.mesh.material.emissiveIntensity) * .14;
        item.glow.material.opacity = progress * (hoveredNow ? .2 : pulse * .11);
        const targetScale = hoveredNow ? 1.045 : 1;
        item.group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), .12);
      });

      if (!reduceMotion) {
        flowParticles.forEach((particle) => {
          const t = (elapsed * particle.speed + particle.offset) % 1;
          particle.mesh.position.copy(particle.curve.getPointAt(t));
          particle.mesh.material.opacity = .55 + Math.sin(t * Math.PI) * .4;
        });
      } else {
        flowParticles.forEach((particle) => particle.mesh.position.copy(particle.curve.getPointAt(particle.offset % 1)));
      }

      renderer.render(scene, camera);
      raf = window.requestAnimationFrame(render);
    }
    render();

    return () => {
      window.cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("wheel", onWheel);
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.LineSegments || child instanceof THREE.Points) {
          child.geometry.dispose();
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material) => material.dispose());
        }
        if (child instanceof THREE.Sprite) {
          child.material.map?.dispose();
          child.material.dispose();
        }
      });
      platformGeometry.dispose();
      renderer.dispose();
    };
  }, [blocks, links, stepKey, toolId]);

  return (
    <div className="memory-architecture-host" ref={hostRef}>
      <canvas ref={canvasRef} aria-label="Visualização 3D interativa da arquitetura de memória" />
      <div className="memory-3d-status"><i /><span>LIVE MEMORY MODEL</span><small>THREE.JS · GPU</small></div>
      <div className="memory-3d-legend">
        <span data-tone="stack">Stack</span><span data-tone="heap">Heap</span><span data-tone="metadata">Metadata</span><span data-tone="danger">Invalid</span>
      </div>
      <div className="memory-3d-help">ARRASTE PARA ORBITAR · SCROLL PARA ZOOM · HOVER PARA INSPECIONAR</div>
      {hovered ? <div className="memory-3d-tooltip" data-state={hovered.state}><span>{hovered.region.toUpperCase()}</span><strong>{hovered.label}</strong><code>{hovered.address} · {hovered.size}</code><p>{hovered.value}</p></div> : null}
    </div>
  );
}
