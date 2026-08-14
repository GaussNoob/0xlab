"use client";

import * as THREE from "three";
import { useEffect, useRef } from "react";

export interface SceneObject {
  readonly id: string;
  readonly label: string;
  readonly address: string;
  readonly value: string;
  readonly position: readonly [number, number, number];
  readonly width?: number;
  readonly tone?: "value" | "pointer" | "inactive";
}

export interface SceneEdge {
  readonly from: string;
  readonly to: string;
}

interface MemorySceneProps {
  readonly objects: readonly SceneObject[];
  readonly edge?: SceneEdge;
}

function createLabel(text: string, color: string, scale = 1): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = "500 42px 'Cascadia Code', Consolas, monospace";
    context.fillStyle = color;
    context.textAlign = "center";
    context.fillText(text, 256, 77);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(3.5 * scale, 0.875 * scale, 1);
  return sprite;
}

export function MemoryScene({ objects, edge }: MemorySceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;
    const container = host;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x090c10, 0.038);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 3.5, 13);
    camera.lookAt(0, 0.2, 0);

    const grid = new THREE.GridHelper(20, 40, 0x26303a, 0x151b22);
    grid.position.y = -2.15;
    grid.position.z = -1;
    scene.add(grid);

    const stackLabel = createLabel("STACK  /  main()", "#68737f", 0.72);
    stackLabel.position.set(-4.4, 2.65, 0);
    scene.add(stackLabel);

    const objectGroups = new Map<string, THREE.Group>();
    for (const object of objects) {
      const group = new THREE.Group();
      group.position.set(...object.position);
      const width = object.width ?? 3.4;
      const color = object.tone === "pointer" ? 0x67c7f3 : object.tone === "inactive" ? 0x343d47 : 0x71e6c1;
      const geometry = new THREE.BoxGeometry(width, 1.25, 0.72);
      const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: object.tone === "inactive" ? 0.035 : 0.07 });
      const mesh = new THREE.Mesh(geometry, material);
      group.add(mesh);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({ color, transparent: true, opacity: object.tone === "inactive" ? 0.22 : 0.72 }));
      group.add(edges);

      const name = createLabel(`${object.label}  ${object.value}`, object.tone === "pointer" ? "#67c7f3" : "#dce3e9", 0.72);
      name.position.set(0, 0.14, 0.42);
      group.add(name);
      const address = createLabel(object.address, "#596570", 0.43);
      address.position.set(0, -0.43, 0.43);
      group.add(address);
      scene.add(group);
      objectGroups.set(object.id, group);
    }

    let pointerMaterial: THREE.LineDashedMaterial | null = null;
    if (edge) {
      const from = objectGroups.get(edge.from);
      const to = objectGroups.get(edge.to);
      if (from && to) {
        const start = from.position.clone().add(new THREE.Vector3(-1.65, 0.1, 0));
        const end = to.position.clone().add(new THREE.Vector3(1.75, 0.1, 0));
        const midY = Math.max(start.y, end.y) + 1.4;
        const curve = new THREE.CatmullRomCurve3([
          start,
          new THREE.Vector3(start.x - 1.1, midY, 0),
          new THREE.Vector3(end.x + 1.2, midY, 0),
          end
        ]);
        const points = curve.getPoints(70);
        pointerMaterial = new THREE.LineDashedMaterial({ color: 0x71e6c1, dashSize: 0.18, gapSize: 0.11, transparent: true, opacity: 0.9 });
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), pointerMaterial);
        line.computeLineDistances();
        scene.add(line);
        const tangent = curve.getTangent(1).normalize();
        const arrow = new THREE.ConeGeometry(0.12, 0.34, 8);
        const arrowMesh = new THREE.Mesh(arrow, new THREE.MeshBasicMaterial({ color: 0x71e6c1 }));
        arrowMesh.position.copy(end);
        arrowMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
        scene.add(arrowMesh);
      }
    }

    function resize() {
      const { width, height } = container.getBoundingClientRect();
      renderer.setSize(Math.max(1, width), Math.max(1, height), false);
      camera.aspect = Math.max(1, width) / Math.max(1, height);
      camera.updateProjectionMatrix();
    }
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    let frame = 0;
    let raf = 0;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function render() {
      frame += 1;
      if (pointerMaterial && !reduceMotion) pointerMaterial.opacity = 0.72 + Math.sin(frame * 0.04) * 0.18;
      if (!reduceMotion) camera.position.x = Math.sin(frame * 0.002) * 0.15;
      camera.lookAt(0, 0.2, 0);
      renderer.render(scene, camera);
      raf = window.requestAnimationFrame(render);
    }
    render();

    return () => {
      window.cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.LineSegments) {
          child.geometry.dispose();
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material) => material.dispose());
        }
        if (child instanceof THREE.Sprite) {
          child.material.map?.dispose();
          child.material.dispose();
        }
      });
      renderer.dispose();
    };
  }, [objects, edge]);

  return (
    <div className="memory-three-host" ref={hostRef}>
      <canvas ref={canvasRef} aria-label="Visualização tridimensional do frame de memória" />
      <div className="three-axis"><span>Y</span><i /><b>X</b></div>
      <div className="three-mode">PERSPECTIVE · EDUCATIONAL MODEL</div>
    </div>
  );
}
