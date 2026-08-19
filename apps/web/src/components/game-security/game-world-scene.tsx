"use client";

import * as THREE from "three";
import { useEffect, useRef } from "react";
import { formatYaw, type LabPlayer, type ScreenPoint, type Vec3 } from "./game-security-lab-model";

type SceneMode = "arena" | "analysis";

interface GameWorldSceneProps {
  readonly entities: readonly LabPlayer[];
  readonly selectedId: string;
  readonly camera: Vec3;
  readonly yaw: number;
  readonly showRay: boolean;
  readonly showBoxes: boolean;
  readonly obstacle: boolean;
  readonly mode?: SceneMode;
  readonly screenPoint?: ScreenPoint;
  readonly targetEntity?: LabPlayer;
  readonly lineOfSight?: boolean;
  readonly aimYaw?: number;
  readonly aimPitch?: number;
  readonly onSelectEntity?: (id: string) => void;
  readonly onViewportChange?: (size: { width: number; height: number }) => void;
}

interface EntityHandle {
  readonly group: THREE.Group;
  readonly body: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>;
  readonly halo: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  readonly helper: THREE.BoxHelper;
}

function createLabel(text: string, color: string, width: number): THREE.Sprite {
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 640;
  labelCanvas.height = 128;
  const context = labelCanvas.getContext("2d");
  if (context) {
    context.font = "700 42px 'Cascadia Code', Consolas, monospace";
    context.textAlign = "center";
    context.fillStyle = color;
    context.fillText(text, labelCanvas.width / 2, 74);
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

function entityColor(entity: LabPlayer, selectedId: string): number {
  if (entity.id === "local") return 0xf0b429;
  return entity.id === selectedId ? 0xff8a5b : 0x67c7f3;
}

export function GameWorldScene({
  entities,
  selectedId,
  camera,
  yaw,
  showRay,
  showBoxes,
  obstacle,
  mode = "analysis",
  screenPoint,
  targetEntity,
  lineOfSight,
  aimYaw,
  aimPitch,
  onSelectEntity,
  onViewportChange
}: GameWorldSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef({ width: 320, height: 180 });
  const stateRef = useRef({ entities, selectedId, camera, yaw, showRay, showBoxes, obstacle, mode, onSelectEntity, onViewportChange });
  stateRef.current = { entities, selectedId, camera, yaw, showRay, showBoxes, obstacle, mode, onSelectEntity, onViewportChange };

  useEffect(() => {
    const host = hostRef.current!;
    const canvas = canvasRef.current!;
    if (!host || !canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.setClearColor(0x090d12, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x090d12, 0.034);
    const renderCamera = new THREE.PerspectiveCamera(43, 1, 0.1, 100);
    const world = new THREE.Group();
    scene.add(world);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(16, 64),
      new THREE.MeshStandardMaterial({ color: 0x0f151b, metalness: 0.22, roughness: 0.82 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    world.add(floor);

    const grid = new THREE.GridHelper(28, 36, 0x4d3b1f, 0x1c2228);
    grid.position.y = 0.01;
    world.add(grid);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(7.8, 7.86, 96),
      new THREE.MeshBasicMaterial({ color: 0xf0b429, transparent: true, opacity: 0.34, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    world.add(ring);

    const outerDeck = new THREE.Mesh(
      new THREE.CylinderGeometry(15.7, 16.2, 0.38, 64, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x111a20, emissive: 0x172025, emissiveIntensity: 0.18, metalness: 0.58, roughness: 0.34, side: THREE.DoubleSide })
    );
    outerDeck.position.y = 0.15;
    world.add(outerDeck);

    const architecture = new THREE.Group();
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2;
      const pylon = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 2.8, 0.42),
        new THREE.MeshStandardMaterial({ color: 0x162129, emissive: index % 2 === 0 ? 0x34260d : 0x102b38, emissiveIntensity: 0.44, metalness: 0.62, roughness: 0.34 })
      );
      pylon.position.set(Math.sin(angle) * 11.8, 1.4, Math.cos(angle) * 11.8);
      pylon.rotation.y = angle;
      pylon.castShadow = true;
      architecture.add(pylon);

      const beacon = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.8, 0.5),
        new THREE.MeshBasicMaterial({ color: index % 2 === 0 ? 0xf0b429 : 0x67c7f3, transparent: true, opacity: 0.66 })
      );
      beacon.position.set(Math.sin(angle) * 11.52, 1.58, Math.cos(angle) * 11.52);
      beacon.rotation.y = angle;
      architecture.add(beacon);
    }
    world.add(architecture);

    const axisMaterial = new THREE.MeshBasicMaterial({ color: 0x67c7f3, transparent: true, opacity: 0.08, depthWrite: false });
    const xLane = new THREE.Mesh(new THREE.PlaneGeometry(22, 0.12), axisMaterial);
    xLane.rotation.x = -Math.PI / 2;
    xLane.position.y = 0.026;
    world.add(xLane);
    const zLane = xLane.clone();
    zLane.rotation.z = Math.PI / 2;
    world.add(zLane);

    const starPositions = new Float32Array(360);
    for (let index = 0; index < starPositions.length; index += 3) {
      starPositions[index] = ((index * 17) % 37) - 18;
      starPositions[index + 1] = 1.4 + ((index * 11) % 25) * 0.22;
      starPositions[index + 2] = ((index * 23) % 41) - 20;
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    world.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0x577283, size: 0.042, transparent: true, opacity: 0.7, depthWrite: false })));

    scene.add(new THREE.HemisphereLight(0xaed7ff, 0x090d12, 1.28));
    const keyLight = new THREE.DirectionalLight(0xffcf7f, 2.6);
    keyLight.position.set(7, 13, 5);
    keyLight.castShadow = true;
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x67c7f3, 18, 21, 2);
    rimLight.position.set(-7, 4.5, 2);
    scene.add(rimLight);

    const obstacle = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 2.2, 0.38),
      new THREE.MeshStandardMaterial({ color: 0x33424f, emissive: 0x17222b, transparent: true, opacity: 0.72, metalness: 0.12, roughness: 0.58 })
    );
    obstacle.position.set(0, 1.1, 3);
    obstacle.castShadow = true;
    world.add(obstacle);

    const cameraIndicator = new THREE.Group();
    const cameraCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 0.76, 4),
      new THREE.MeshBasicMaterial({ color: 0xf0b429, wireframe: true, transparent: true, opacity: 0.94 })
    );
    cameraCone.rotation.x = Math.PI / 2;
    cameraIndicator.add(cameraCone);
    const cameraLabel = createLabel("SIM CAMERA", "#f5c85a", 1.85);
    cameraLabel.position.set(0, 0.86, 0);
    cameraIndicator.add(cameraLabel);
    world.add(cameraIndicator);

    const rayGeometry = new THREE.BufferGeometry();
    rayGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
    const ray = new THREE.Line(rayGeometry, new THREE.LineDashedMaterial({ color: 0xf0b429, dashSize: 0.22, gapSize: 0.14, transparent: true, opacity: 0.94 }));
    ray.computeLineDistances();
    world.add(ray);
    const rayMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 14, 10),
      new THREE.MeshBasicMaterial({ color: 0xffe4a2, transparent: true, opacity: 0.95 })
    );
    world.add(rayMarker);

    const entityHandles = new Map<string, EntityHandle>();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(3, 3);
    const focus = new THREE.Vector3();
    const nextFocus = new THREE.Vector3();
    const targetPosition = new THREE.Vector3();

    function createEntity(entity: LabPlayer): EntityHandle {
      const group = new THREE.Group();
      group.userData.entityId = entity.id;
      const pedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.64, 0.75, 0.15, 20),
        new THREE.MeshStandardMaterial({ color: 0x121b22, metalness: 0.42, roughness: 0.44 })
      );
      pedestal.position.y = 0.075;
      group.add(pedestal);
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(entity.id === "local" ? 0.34 : 0.29, entity.id === "local" ? 0.4 : 0.33, entity.id === "local" ? 1.12 : 0.82, 12),
        new THREE.MeshStandardMaterial({ color: entityColor(entity, selectedId), emissive: entityColor(entity, selectedId), emissiveIntensity: 0.14, metalness: 0.24, roughness: 0.42 })
      );
      body.position.y = entity.id === "local" ? 0.65 : 0.48;
      body.castShadow = true;
      body.userData.entityId = entity.id;
      group.add(body);
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(entity.id === "local" ? 0.27 : 0.21, 14, 10),
        new THREE.MeshStandardMaterial({ color: 0xdceaf2, emissive: 0x1c2831, emissiveIntensity: 0.2, roughness: 0.3 })
      );
      head.position.y = entity.id === "local" ? 1.35 : 0.99;
      head.castShadow = true;
      head.userData.entityId = entity.id;
      group.add(head);
      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(entity.id === "local" ? 0.56 : 0.47, 0.045, 10, 36),
        new THREE.MeshBasicMaterial({ color: entityColor(entity, selectedId), transparent: true, opacity: 0.4 })
      );
      halo.rotation.x = Math.PI / 2;
      halo.position.y = 0.11;
      group.add(halo);
      const label = createLabel(entity.name.toUpperCase(), entity.id === "local" ? "#f7d36a" : "#b9d9e8", entity.id === "local" ? 2.25 : 1.92);
      label.position.y = entity.id === "local" ? 2.05 : 1.6;
      group.add(label);
      const helper = new THREE.BoxHelper(group, 0x67c7f3);
      helper.userData.entityId = entity.id;
      world.add(group);
      world.add(helper);
      return { group, body, halo, helper };
    }

    function entityIdFromObject(object: THREE.Object3D | undefined): string | null {
      let currentObject = object;
      while (currentObject) {
        const entityId = currentObject.userData.entityId;
        if (typeof entityId === "string") return entityId;
        currentObject = currentObject.parent ?? undefined;
      }
      return null;
    }

    function getPointer(clientX: number, clientY: number): void {
      const bounds = canvas.getBoundingClientRect();
      pointer.x = ((clientX - bounds.left) / Math.max(1, bounds.width)) * 2 - 1;
      pointer.y = -((clientY - bounds.top) / Math.max(1, bounds.height)) * 2 + 1;
    }

    let dragging = false;
    let moved = false;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let orbitYaw = -0.42;
    let orbitPitch = 0.05;
    let pointerYaw = 0;
    let pointerPitch = 0;
    let cameraDistance = 16.4;
    let hoveredId: string | null = null;

    function updateHover(clientX: number, clientY: number): void {
      getPointer(clientX, clientY);
      pointerYaw = pointer.x * 0.055;
      pointerPitch = pointer.y * -0.025;
      raycaster.setFromCamera(pointer, renderCamera);
      const intersections = raycaster.intersectObjects([...entityHandles.values()].map((handle) => handle.group), true);
      const nextHoveredId = entityIdFromObject(intersections[0]?.object);
      if (nextHoveredId === hoveredId) return;
      hoveredId = nextHoveredId;
      canvas.style.cursor = hoveredId ? "pointer" : dragging ? "grabbing" : "grab";
    }

    function onPointerDown(event: PointerEvent): void {
      dragging = true;
      moved = false;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = "grabbing";
    }

    function onPointerMove(event: PointerEvent): void {
      if (dragging) {
        const deltaX = event.clientX - lastPointerX;
        const deltaY = event.clientY - lastPointerY;
        if (Math.abs(deltaX) + Math.abs(deltaY) > 2) moved = true;
        orbitYaw += deltaX * 0.005;
        orbitPitch = THREE.MathUtils.clamp(orbitPitch + deltaY * 0.0035, -0.14, 0.24);
        lastPointerX = event.clientX;
        lastPointerY = event.clientY;
      }
      updateHover(event.clientX, event.clientY);
    }

    function onPointerUp(event: PointerEvent): void {
      dragging = false;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      updateHover(event.clientX, event.clientY);
      if (!moved && hoveredId && hoveredId !== "local") stateRef.current.onSelectEntity?.(hoveredId);
      canvas.style.cursor = hoveredId ? "pointer" : "grab";
    }

    function onPointerLeave(): void {
      if (!dragging) {
        hoveredId = null;
        pointerYaw = 0;
        pointerPitch = 0;
        canvas.style.cursor = "grab";
      }
    }

    function onWheel(event: WheelEvent): void {
      event.preventDefault();
      cameraDistance = THREE.MathUtils.clamp(cameraDistance + event.deltaY * 0.009, 11.5, 22);
    }

    canvas.style.cursor = "grab";
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerLeave);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    function resize(): void {
      const bounds = host.getBoundingClientRect();
      const width = Math.max(1, Math.round(bounds.width));
      const height = Math.max(1, Math.round(bounds.height));
      renderer.setSize(width, height, false);
      renderCamera.aspect = width / height;
      renderCamera.updateProjectionMatrix();
      const previous = viewportRef.current;
      if (previous.width === width && previous.height === height) return;
      viewportRef.current = { width, height };
      stateRef.current.onViewportChange?.({ width, height });
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    const clock = new THREE.Clock();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let animationFrame = 0;

    function render(): void {
      const state = stateRef.current;
      const elapsed = clock.getElapsedTime();
      const knownIds = new Set(state.entities.map((entity) => entity.id));

      for (const entity of state.entities) {
        let handle = entityHandles.get(entity.id);
        if (!handle) {
          handle = createEntity(entity);
          entityHandles.set(entity.id, handle);
        }
        const tint = entityColor(entity, state.selectedId);
        handle.group.visible = true;
        handle.group.position.lerp(targetPosition.set(entity.position.x, entity.position.y, entity.position.z), reduceMotion ? 1 : 0.14);
        handle.body.material.color.setHex(tint);
        handle.body.material.emissive.setHex(tint);
        handle.body.material.emissiveIntensity = entity.id === state.selectedId ? 0.38 : entity.id === "local" ? 0.24 : 0.11;
        handle.halo.material.color.setHex(tint);
        handle.halo.material.opacity = entity.id === state.selectedId ? 0.86 : entity.id === "local" ? 0.58 : 0.24;
        const haloScale = entity.id === state.selectedId && !reduceMotion ? 1.12 + Math.sin(elapsed * 3.2) * 0.12 : 1;
        handle.halo.scale.setScalar(haloScale);
        handle.helper.visible = state.showBoxes;
        (handle.helper.material as THREE.LineBasicMaterial).color.setHex(entity.id === state.selectedId ? 0xf0b429 : tint);
        handle.helper.update();
      }

      entityHandles.forEach((handle, entityId) => {
        if (!knownIds.has(entityId)) {
          handle.group.visible = false;
          handle.helper.visible = false;
        }
      });

      const localEntity = state.entities.find((entity) => entity.id === "local");
      const selectedEntity = state.entities.find((entity) => entity.id === state.selectedId);
      cameraIndicator.position.set(state.camera.x, state.camera.y, state.camera.z);
      cameraIndicator.rotation.y = state.yaw;
      obstacle.visible = state.obstacle;

      if (localEntity && selectedEntity && selectedEntity.id !== "local" && state.showRay) {
        const positions = rayGeometry.getAttribute("position") as THREE.BufferAttribute;
        positions.setXYZ(0, localEntity.position.x, localEntity.position.y + 0.78, localEntity.position.z);
        positions.setXYZ(1, selectedEntity.position.x, selectedEntity.position.y + 0.48, selectedEntity.position.z);
        positions.needsUpdate = true;
        rayGeometry.computeBoundingSphere();
        ray.computeLineDistances();
        ray.visible = true;
        const progress = reduceMotion ? 0.52 : (elapsed * 0.34) % 1;
        rayMarker.position.lerpVectors(
          new THREE.Vector3(localEntity.position.x, localEntity.position.y + 0.78, localEntity.position.z),
          new THREE.Vector3(selectedEntity.position.x, selectedEntity.position.y + 0.48, selectedEntity.position.z),
          progress
        );
        rayMarker.visible = true;
      } else {
        ray.visible = false;
        rayMarker.visible = false;
      }

      if (localEntity) nextFocus.set(localEntity.position.x, 0.3, localEntity.position.z + (state.mode === "arena" ? 1.1 : 2.3));
      else nextFocus.set(0, 0.3, 2);
      focus.lerp(nextFocus, reduceMotion ? 1 : 0.08);
      const sceneYaw = orbitYaw + (reduceMotion ? 0 : pointerYaw);
      const scenePitch = orbitPitch + (reduceMotion ? 0 : pointerPitch);
      const modeDistance = state.mode === "arena" ? cameraDistance : cameraDistance * 0.94;
      renderCamera.position.set(
        focus.x + Math.sin(sceneYaw) * modeDistance,
        focus.y + (state.mode === "arena" ? 7.3 : 6.4) + scenePitch * 11,
        focus.z + Math.cos(sceneYaw) * modeDistance
      );
      renderCamera.lookAt(focus.x, focus.y + 0.4, focus.z);
      ring.material.opacity = state.mode === "arena" ? 0.34 : 0.22;
      ring.scale.setScalar(state.mode === "arena" ? 1 : 0.86);
      renderer.render(scene, renderCamera);
      animationFrame = window.requestAnimationFrame(render);
    }

    render();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("wheel", onWheel);
      disposeScene(scene);
      renderer.dispose();
    };
  }, []);

  const sceneLabel = mode === "arena" ? "Arena educacional top-down" : "Visualização 3D de World to Screen";
  const overlayLeft = screenPoint ? Math.min(96, Math.max(4, (screenPoint.ndcX * 0.5 + 0.5) * 100)) : 50;
  const overlayTop = screenPoint ? Math.min(92, Math.max(8, (1 - (screenPoint.ndcY * 0.5 + 0.5)) * 100)) : 50;

  return (
    <div className="gsl-scene" ref={hostRef} data-mode={mode}>
      <canvas ref={canvasRef} aria-label={sceneLabel} />
      <div className="gsl-scene-status"><i /><span>{mode === "arena" ? "LIVE ARENA MODEL" : "WORLD / SCREEN MODEL"}</span><small>THREE.JS · GPU</small></div>
      <div className="gsl-scene-metrics" aria-hidden="true">
        <span><b>ENT</b>{entities.length}</span>
        <span><b>YAW</b>{formatYaw(aimYaw ?? yaw)}</span>
        <span><b>PITCH</b>{formatYaw(aimPitch ?? 0)}</span>
      </div>
      {mode === "analysis" && screenPoint && targetEntity ? (
        <div
          className="gsl-w2s-overlay"
          data-visible={screenPoint.visible}
          data-los={lineOfSight !== false}
          aria-label={`World to screen overlay for ${targetEntity.name}`}
        >
          <div className="gsl-w2s-target" style={{ left: `${overlayLeft}%`, top: `${overlayTop}%` }}>
            <i className="gsl-w2s-reticle" aria-hidden="true" />
            <span className="gsl-w2s-box" aria-hidden="true" />
            <strong>{targetEntity.name}</strong>
            <small>{screenPoint.visible ? "VISIBLE" : "CLIPPED"} · LoS {lineOfSight === false ? "BLOCKED" : "CLEAR"}</small>
          </div>
          <div className="gsl-w2s-readout">
            <span>W2S <b>{screenPoint.visible ? "LOCKED" : "CLIPPED"}</b></span>
            <code>{screenPoint.x.toFixed(0)}:{screenPoint.y.toFixed(0)} · w {screenPoint.clipW.toFixed(2)}</code>
          </div>
        </div>
      ) : null}
      <div className="gsl-scene-help">ARRASTE PARA ORBITAR · SCROLL PARA ZOOM · CLIQUE EM UM ALVO</div>
    </div>
  );
}
