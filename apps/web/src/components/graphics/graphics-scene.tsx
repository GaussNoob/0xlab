"use client";

import * as THREE from "three";
import { useEffect, useRef } from "react";

interface GraphicsSceneProps {
  readonly stage: number;
  readonly rotation?: number;
  readonly scale?: number;
  readonly projection?: "perspective" | "orthographic";
  readonly tint?: string;
  readonly fragmentShader?: string;
  readonly onShaderStatus?: (status: { readonly valid: boolean; readonly message: string }) => void;
}

const defaultFragmentShader = `uniform float uTime;
uniform vec3 uTint;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  float light = 0.24 + max(dot(normalize(vNormal), normalize(vec3(0.4, 0.8, 0.6))), 0.0) * 0.76;
  float pulse = 0.92 + sin(uTime + vPosition.y * 2.0) * 0.08;
  gl_FragColor = vec4(uTint * light * pulse, 1.0);
}`;

export function GraphicsScene({ stage, rotation = 22, scale = 1, projection = "perspective", tint = "#71e6c1", fragmentShader, onShaderStatus }: GraphicsSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const container = host;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x090c10, 1);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x090c10, 0.055);
    const perspectiveCamera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    const orthographicCamera = new THREE.OrthographicCamera(-4, 4, 3, -3, 0.1, 100);
    const camera = projection === "perspective" ? perspectiveCamera : orthographicCamera;
    camera.position.set(4.7, 3.4, 6.7);
    camera.lookAt(0, 0.25, 0);

    const grid = new THREE.GridHelper(16, 32, 0x26333a, 0x151b22);
    grid.position.y = -1.45;
    scene.add(grid);
    const axes = new THREE.AxesHelper(2.8);
    axes.position.set(-2.8, -1.43, -2.2);
    scene.add(axes);

    const geometry = new THREE.BoxGeometry(2.5, 2.5, 2.5, 2, 2, 2);
    const color = new THREE.Color(tint);
    let object: THREE.Object3D;
    let shaderMaterial: THREE.ShaderMaterial | null = null;
    let shaderFailed = false;

    renderer.debug.checkShaderErrors = true;
    renderer.debug.onShaderError = (gl, program, _vertex, compiledFragment) => {
      shaderFailed = true;
      const programLog = gl.getProgramInfoLog(program)?.trim();
      const fragmentLog = gl.getShaderInfoLog(compiledFragment)?.trim();
      onShaderStatus?.({ valid: false, message: fragmentLog || programLog || "GLSL compilation failed" });
    };

    if (stage === 0) {
      object = new THREE.Points(geometry, new THREE.PointsMaterial({ color, size: 0.1, sizeAttenuation: true }));
    } else if (stage === 1) {
      object = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({ color }));
    } else if (stage === 2) {
      object = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.84 }));
    } else if (stage === 3) {
      object = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.72 }));
    } else {
      shaderMaterial = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uTint: { value: color } },
        vertexShader: `varying vec3 vNormal;
          varying vec3 vPosition;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: fragmentShader?.trim() || defaultFragmentShader
      });
      object = new THREE.Mesh(geometry, shaderMaterial);
    }
    object.scale.setScalar(scale);
    object.rotation.x = THREE.MathUtils.degToRad(rotation * 0.58);
    object.rotation.y = THREE.MathUtils.degToRad(rotation);
    scene.add(object);

    if (stage >= 4) {
      const lightPlane = new THREE.Mesh(new THREE.CircleGeometry(2.15, 48), new THREE.MeshBasicMaterial({ color: 0x71e6c1, transparent: true, opacity: 0.025, side: THREE.DoubleSide }));
      lightPlane.rotation.x = -Math.PI / 2;
      lightPlane.position.y = -1.38;
      scene.add(lightPlane);
    }

    function resize() {
      const { width, height } = container.getBoundingClientRect();
      const safeWidth = Math.max(1, width);
      const safeHeight = Math.max(1, height);
      renderer.setSize(safeWidth, safeHeight, false);
      perspectiveCamera.aspect = safeWidth / safeHeight;
      perspectiveCamera.updateProjectionMatrix();
      const aspect = safeWidth / safeHeight;
      orthographicCamera.left = -3.2 * aspect;
      orthographicCamera.right = 3.2 * aspect;
      orthographicCamera.top = 3.2;
      orthographicCamera.bottom = -3.2;
      orthographicCamera.updateProjectionMatrix();
    }
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    if (shaderMaterial) {
      try {
        renderer.compile(scene, camera);
        if (!shaderFailed) onShaderStatus?.({ valid: true, message: "GLSL compiled · preview updated" });
      } catch (error) {
        shaderFailed = true;
        onShaderStatus?.({ valid: false, message: error instanceof Error ? error.message : "GLSL compilation failed" });
      }
    }

    const clock = new THREE.Clock();
    let frame = 0;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function render() {
      const elapsed = clock.getElapsedTime();
      if (!reduceMotion) object.rotation.y += 0.0022;
      if (shaderMaterial) shaderMaterial.uniforms.uTime!.value = elapsed;
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(render);
    }
    render();

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Points || child instanceof THREE.LineSegments) {
          child.geometry.dispose();
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
    };
  }, [fragmentShader, onShaderStatus, projection, rotation, scale, stage, tint]);

  return <div className="graphics-scene-host" ref={hostRef}><canvas ref={canvasRef} aria-label="Preview 3D interativo do pipeline gráfico" /><span className="graphics-axis-label">WORLD · XYZ</span></div>;
}
