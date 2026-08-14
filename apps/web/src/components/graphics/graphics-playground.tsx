"use client";

import {
  Activity,
  ArrowRight,
  Boxes,
  Braces,
  Check,
  CircleDot,
  Clock3,
  Code2,
  Cpu,
  Eye,
  Frame,
  Gauge,
  Layers3,
  MemoryStick,
  Monitor,
  MousePointer2,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Timer,
  Triangle,
  Workflow
} from "lucide-react";
import { useDeferredValue, useEffect, useState } from "react";
import { GraphicsScene } from "./graphics-scene";

type GraphicsView = "playground" | "pipeline" | "frame" | "compare" | "cpu-gpu" | "math";
type ResourceTab = "pipeline" | "vertex" | "index" | "texture";

const pipelineStages = [
  { title: "Vertex Data", detail: "Positions, normals, UVs and indices live in buffers.", input: "VBO · EBO", output: "vertex attributes" },
  { title: "Vertex Shader", detail: "Runs once per vertex and produces clip-space position.", input: "attributes + uniforms", output: "gl_Position + varyings" },
  { title: "Primitive Assembly", detail: "Indices group transformed vertices into triangles.", input: "vertex stream", output: "triangle primitives" },
  { title: "Rasterization", detail: "Triangles become covered fragments; varyings are interpolated.", input: "screen-space triangles", output: "fragments" },
  { title: "Fragment / Pixel Shader", detail: "Computes color and depth using textures and material data.", input: "interpolants + samples", output: "color / depth" },
  { title: "Framebuffer", detail: "Depth, blending and attachment writes produce the final image.", input: "shader outputs", output: "render target" },
  { title: "Screen", detail: "The swapchain image is presented through the window compositor.", input: "back buffer", output: "photons" }
] as const;

const frameEvents = [
  { name: "Clear Render Target", api: "ClearRenderTargetView", detail: "Color = (0.035, 0.047, 0.063, 1.0)", resource: "BackBuffer #2" },
  { name: "Bind Pipeline", api: "SetPipelineState", detail: "basic_mesh.pso · depth ON · back-face culling", resource: "Pipeline #04" },
  { name: "Bind Vertex Buffer", api: "IASetVertexBuffers", detail: "stride 32 B · 24 vertices · POSITION/NORMAL/UV", resource: "Buffer #17" },
  { name: "Bind Texture", api: "SetGraphicsRootDescriptorTable", detail: "RGBA8 · 1024×1024 · 7 mip levels", resource: "Texture #09" },
  { name: "Draw Mesh", api: "DrawIndexedInstanced", detail: "36 indices · 12 triangles · 1 instance", resource: "Draw #1251.04" },
  { name: "Draw UI", api: "DrawIndexedInstanced", detail: "612 indices · alpha blending · scissor rect", resource: "Draw #1251.05" },
  { name: "Present", api: "Present", detail: "sync interval 1 · flip discard", resource: "SwapChain #01" }
] as const;

const apiRows = [
  ["Model", "Global state machine", "Device context", "Explicit command lists", "Explicit command buffers"],
  ["Indexed draw", "glDrawElements", "DrawIndexed", "DrawIndexedInstanced", "vkCmdDrawIndexed"],
  ["Texture / image", "Texture object", "ID3D11Texture2D", "ID3D12Resource", "VkImage + VkImageView"],
  ["Pipeline", "Program + implicit state", "State objects", "PSO + root signature", "VkPipeline + layout"],
  ["Memory", "Driver managed", "Mostly managed", "Explicit heaps", "Explicit allocation / binding"],
  ["Synchronization", "Mostly implicit", "Mostly implicit", "Fences + barriers", "Semaphores + fences + barriers"],
  ["Command recording", "Immediate calls", "Immediate/deferred context", "Command list", "Command buffer"],
  ["Portability", "Windows · Linux · macOS*", "Windows", "Windows / Xbox", "Windows · Linux · Android"],
  ["Responsibility", "Low", "Medium", "High", "Very high"]
] as const;

const cppCode = `// C++ + SDL3 + Vulkan (architecture sketch)
Frame begin_frame(Renderer& renderer)
{
    auto image = renderer.acquire_next_image();
    auto cmd = renderer.begin_commands();

    cmd.transition(image, Present, RenderTarget);
    cmd.begin_rendering(image);
    cmd.bind_pipeline(renderer.mesh_pipeline);
    cmd.draw_indexed(mesh.index_count);
    cmd.end_rendering();

    return renderer.submit_and_present(cmd, image);
}`;

const shaderCode = `uniform float uTime;
uniform vec3 uTint;
varying vec3 vNormal;
varying vec3 vPosition;

void main()
{
    vec3 L = normalize(vec3(0.4, 0.8, 0.6));
    float NdotL = max(dot(normalize(vNormal), L), 0.0);
    float pulse = 0.92 + sin(uTime + vPosition.y * 2.0) * 0.08;
    gl_FragColor = vec4(uTint * (0.24 + NdotL * 0.76) * pulse, 1.0);
}`;

const resourceDetails: Readonly<Record<ResourceTab, readonly (readonly [string, string])[]>> = {
  pipeline: [["Vertex shader", "mesh.vert.spv"], ["Fragment shader", "mesh.frag.spv"], ["Topology", "TRIANGLE_LIST"], ["Depth test", "LESS · write ON"], ["Viewport", "1280 × 720"]],
  vertex: [["Buffer", "VertexBuffer #17"], ["Stride", "32 bytes"], ["Count", "24 vertices"], ["Layout", "POSITION · NORMAL · UV"], ["Memory", "device local · 768 B"]],
  index: [["Buffer", "IndexBuffer #18"], ["Type", "uint16"], ["Count", "36 indices"], ["Topology", "12 triangles"], ["Offset", "0 bytes"]],
  texture: [["Image", "Texture #09"], ["Format", "RGBA8 sRGB"], ["Extent", "1024 × 1024"], ["Mip levels", "7"], ["Sampler", "linear · repeat · anisotropy 8×"]]
};

export function GraphicsPlayground() {
  const [view, setView] = useState<GraphicsView>("playground");
  const [stage, setStage] = useState(4);
  const [selectedFrameEvent, setSelectedFrameEvent] = useState(4);
  const [editor, setEditor] = useState<"cpp" | "shader">("shader");
  const [shader, setShader] = useState(shaderCode);
  const deferredShader = useDeferredValue(shader);
  const [shaderStatus, setShaderStatus] = useState({ valid: true, message: "GLSL ready · waiting for WebGL" });
  const [tint, setTint] = useState("#71e6c1");
  const [rotation, setRotation] = useState(28);
  const [scale, setScale] = useState(1);
  const [projection, setProjection] = useState<"perspective" | "orthographic">("perspective");
  const [cpuLoad, setCpuLoad] = useState(6.4);
  const [resourceTab, setResourceTab] = useState<ResourceTab>("pipeline");

  useEffect(() => {
    const query = new URLSearchParams(window.location.search).get("view");
    if (query === "pipeline" || query === "frame" || query === "compare" || query === "cpu-gpu" || query === "math" || query === "playground") setView(query);
  }, []);

  const gpuLoad = Math.max(3.8, 13.8 - cpuLoad);
  const frameTime = Math.max(cpuLoad, gpuLoad);
  const fps = Math.round(1000 / frameTime);
  const currentFrameEvent = frameEvents[selectedFrameEvent]!;
  const code = editor === "shader" ? shader : cppCode;

  function changeView(next: GraphicsView) {
    setView(next);
    const url = new URL(window.location.href);
    url.searchParams.set("view", next);
    window.history.replaceState({}, "", url);
  }

  return (
    <div className="graphics-lab-shell">
      <header className="graphics-lab-header">
        <div><span className="eyebrow">Graphics Engineering Lab</span><h1>Siga o frame até o pixel.</h1></div>
        <div className="graphics-runtime"><span><CircleDot size={9} /> preview online</span><span>API <strong>Vulkan 1.3 model</strong></span><span>GPU <strong>educational adapter</strong></span></div>
      </header>
      <nav className="graphics-tabs" aria-label="Ferramentas gráficas">
        <button type="button" data-active={view === "playground"} onClick={() => changeView("playground")}><Code2 size={13} />Playground</button>
        <button type="button" data-active={view === "pipeline"} onClick={() => changeView("pipeline")}><Workflow size={13} />Pipeline</button>
        <button type="button" data-active={view === "frame"} onClick={() => changeView("frame")}><Frame size={13} />Frame Debugger</button>
        <button type="button" data-active={view === "compare"} onClick={() => changeView("compare")}><Layers3 size={13} />API Compare</button>
        <button type="button" data-active={view === "cpu-gpu"} onClick={() => changeView("cpu-gpu")}><Activity size={13} />CPU / GPU</button>
        <button type="button" data-active={view === "math"} onClick={() => changeView("math")}><Triangle size={13} />Math 3D</button>
      </nav>

      {view === "playground" ? <section className="graphics-playground-view">
        <div className="graphics-code-pane"><header><div><button type="button" data-active={editor === "cpp"} onClick={() => setEditor("cpp")}><Braces size={11} />renderer.cpp</button><button type="button" data-active={editor === "shader"} onClick={() => setEditor("shader")}><Sparkles size={11} />mesh.frag</button></div><span>{editor === "cpp" ? "C++20" : "GLSL · LIVE"}</span></header><div className="graphics-editor-body"><div>{code.split("\n").map((_, index) => <span key={index}>{index + 1}</span>)}</div><textarea aria-label={editor === "cpp" ? "Editor C++ gráfico" : "Editor de shader"} spellCheck={false} readOnly={editor === "cpp"} value={code} onChange={(event) => editor === "shader" && setShader(event.target.value)} /></div><footer data-valid={editor === "cpp" || shaderStatus.valid}><span><Check size={10} />{editor === "shader" ? shaderStatus.valid ? "GLSL compiled · live preview" : "shader compile error" : "architecture sketch"}</span><span>{code.split("\n").length} lines</span></footer></div>
        <div className="graphics-preview-pane"><header><span><Eye size={11} />PREVIEW</span><div><label>TINT<input type="color" value={tint} onChange={(event) => setTint(event.target.value)} /></label><button type="button" onClick={() => setShader(shaderCode)}><RotateCcw size={10} />Reset shader</button></div></header><GraphicsScene stage={4} rotation={rotation} scale={scale} tint={tint} fragmentShader={deferredShader} onShaderStatus={setShaderStatus} /><div className="preview-overlay"><span>FRAME 001251</span><span>1280 × 720</span><span>{shaderStatus.valid ? "LIVE · sRGB" : "COMPILE ERROR"}</span></div></div>
        <footer className="graphics-stats"><div><Gauge size={12} /><span>FPS</span><strong>{fps}</strong></div><div><Timer size={12} /><span>Frame time</span><strong>{frameTime.toFixed(2)} ms</strong></div><div><MousePointer2 size={12} /><span>Draw calls</span><strong>2</strong></div><div><Triangle size={12} /><span>Triangles</span><strong>216</strong></div><div><MemoryStick size={12} /><span>Buffers</span><strong>3.4 MiB</strong></div><div className="graphics-log" data-error={!shaderStatus.valid}><span>{shaderStatus.valid ? "API LOG" : "SHADER LOG"}</span><code title={shaderStatus.message}>{shaderStatus.valid ? "compile GLSL → draw indexed → present" : shaderStatus.message}</code></div></footer>
      </section> : null}

      {view === "pipeline" ? <section className="pipeline-visualizer-view">
        <aside className="pipeline-stage-list"><header>GRAPHICS PIPELINE <span>07 stages</span></header>{pipelineStages.map((item, index) => <button type="button" data-active={stage === index} data-complete={stage > index} onClick={() => setStage(index)} key={item.title}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{item.title}</strong><small>{item.input}</small></div><ArrowRight size={11} /></button>)}</aside>
        <div className="pipeline-stage-preview"><header><span>STAGE OUTPUT · {pipelineStages[stage]!.title.toUpperCase()}</span><small>drag mentally: model → view → projection → viewport</small></header><GraphicsScene stage={Math.min(stage, 5)} tint={tint} /><div className="pipeline-callout"><span>{String(stage + 1).padStart(2, "0")}</span><div><strong>{pipelineStages[stage]!.title}</strong><p>{pipelineStages[stage]!.detail}</p></div></div></div>
        <aside className="pipeline-inspector"><header><SlidersHorizontal size={11} /><span>STAGE INSPECTOR</span></header><dl><div><dt>Input</dt><dd>{pipelineStages[stage]!.input}</dd></div><div><dt>Output</dt><dd>{pipelineStages[stage]!.output}</dd></div><div><dt>Invocation</dt><dd>{stage === 1 ? "24 vertices" : stage === 4 ? "18,432 fragments" : stage === 3 ? "12 triangles" : "1 frame"}</dd></div></dl><section><span>RESOURCE FLOW</span>{["VertexBuffer #17", "IndexBuffer #18", "Pipeline #04", "Texture #09", "BackBuffer #2"].map((resource, index) => <p data-active={index <= Math.min(stage, 4)} key={resource}><i /><code>{resource}</code></p>)}</section><div className="pipeline-formula"><span>TRANSFORM</span><code>clip = P · V · M · position</code></div></aside>
        <footer className="pipeline-flow-footer">{pipelineStages.map((item, index) => <button type="button" data-active={index === stage} onClick={() => setStage(index)} key={item.title}><i /><span>{item.title}</span>{index < pipelineStages.length - 1 ? <ArrowRight size={9} /> : null}</button>)}</footer>
      </section> : null}

      {view === "frame" ? <section className="frame-debugger-view">
        <aside className="frame-event-list"><header><span>FRAME #1251</span><small>7 events · 13.81 ms</small></header>{frameEvents.map((event, index) => <button type="button" data-active={selectedFrameEvent === index} onClick={() => setSelectedFrameEvent(index)} key={event.name}><span>{index + 1}</span><div><strong>{event.name}</strong><small>{event.api}</small></div><code>{index === 4 ? "0.71ms" : `${(0.08 + index * 0.17).toFixed(2)}ms`}</code></button>)}</aside>
        <div className="frame-preview"><header><span>OUTPUT AFTER EVENT {selectedFrameEvent + 1}</span><small>color attachment 0 · mip 0 · layer 0</small></header><GraphicsScene stage={Math.min(selectedFrameEvent, 5)} tint={tint} /><div className="frame-scrubber">{frameEvents.map((event, index) => <button type="button" aria-label={event.name} data-active={index <= selectedFrameEvent} onClick={() => setSelectedFrameEvent(index)} key={event.name}><i /></button>)}</div></div>
        <aside className="draw-inspector"><header><Eye size={11} /><span>EVENT INSPECTOR</span></header><div className="draw-event-title"><span>EVENT {String(selectedFrameEvent + 1).padStart(2, "0")}</span><h2>{currentFrameEvent.name}</h2><code>{currentFrameEvent.api}</code><p>{currentFrameEvent.detail}</p></div><section><span>BOUND RESOURCE</span><strong>{currentFrameEvent.resource}</strong></section><section className="resource-tabs">{(["pipeline", "vertex", "index", "texture"] as ResourceTab[]).map((tab) => <button type="button" data-active={resourceTab === tab} onClick={() => setResourceTab(tab)} key={tab}>{tab[0]!.toUpperCase() + tab.slice(1)}</button>)}</section><div className="bound-state">{resourceDetails[resourceTab].map(([label, value]) => <p key={label}><span>{label}</span><code>{value}</code></p>)}</div></aside>
      </section> : null}

      {view === "compare" ? <section className="api-comparator-view">
        <header className="api-comparator-hero"><div><span className="eyebrow">Graphics API Comparator</span><h2>Abstração implícita ou controle explícito?</h2></div><p>Os mesmos recursos existem em todas as APIs. O que muda é quem gerencia estado, memória, sincronização e lifetime.</p></header>
        <div className="api-comparison-table" role="table" aria-label="Comparador de APIs gráficas"><header role="row"><span>CONCEPT</span><span>OPENGL</span><span>DIRECT3D 11</span><span>DIRECT3D 12</span><span>VULKAN</span></header>{apiRows.map((row) => <div role="row" key={row[0]}>{row.map((cell, index) => index === 0 ? <strong key={`concept-${index}`}>{cell}</strong> : <code key={`api-${index}`}>{cell}</code>)}</div>)}</div>
        <div className="api-spectrum"><article><span>HIGH-LEVEL DRIVER CONTROL</span><div><b>OpenGL</b><i /><b>D3D11</b><i /><b>D3D12</b><i /><b>Vulkan</b></div><span>HIGH-LEVEL APPLICATION CONTROL</span></article><article><span>LOWER SETUP COST</span><div><b>OpenGL</b><i /><b>D3D11</b><i /><b>D3D12</b><i /><b>Vulkan</b></div><span>LOWER RUNTIME OVERHEAD</span></article></div>
        <footer className="api-choice-notes"><p><strong>OpenGL</strong><span>Ótimo para aprender o pipeline e iterar rapidamente.</span></p><p><strong>D3D11</strong><span>API madura para aplicações Windows com gestão moderada.</span></p><p><strong>D3D12</strong><span>Controle explícito no ecossistema Microsoft.</span></p><p><strong>Vulkan</strong><span>Controle explícito e portabilidade ampla, com mais responsabilidade.</span></p></footer>
      </section> : null}

      {view === "cpu-gpu" ? <section className="cpu-gpu-view">
        <header className="cpu-gpu-title"><div><span className="eyebrow">CPU / GPU Visualizer</span><h2>Um frame é trabalho em duas timelines.</h2></div><div><label>CPU WORK <input type="range" min="3" max="14" step="0.2" value={cpuLoad} onChange={(event) => setCpuLoad(Number(event.target.value))} /></label><button type="button" onClick={() => setCpuLoad(6.4)}><RotateCcw size={11} />balanced</button></div></header>
        <div className="hardware-flow">{[{ icon: Boxes, label: "Game / Application", detail: "simulation + render loop" }, { icon: Cpu, label: "CPU", detail: "record commands" }, { icon: Code2, label: "Graphics Driver", detail: "validate + schedule" }, { icon: Sparkles, label: "GPU", detail: "execute pipeline" }, { icon: Frame, label: "Framebuffer", detail: "completed image" }, { icon: Monitor, label: "Monitor", detail: "scanout" }].map(({ icon: Icon, label, detail }, index, all) => <span key={label}><i><Icon size={17} /></i><strong>{label}</strong><small>{detail}</small>{index < all.length - 1 ? <ArrowRight size={15} /> : null}</span>)}</div>
        <div className="frame-timelines"><header><span>FRAME N</span><span>{frameTime.toFixed(2)} ms · {fps} FPS</span></header><div className="timeline-row"><strong>CPU</strong><div><i className="cpu-update" style={{ width: `${Math.min(42, cpuLoad * 3)}%` }}>UPDATE</i><i className="cpu-record" style={{ width: `${Math.min(38, cpuLoad * 2.4)}%` }}>RECORD</i><i className="timeline-wait">WAIT</i></div><code>{cpuLoad.toFixed(2)} ms</code></div><div className="timeline-row"><strong>GPU</strong><div><i className="gpu-vertex" style={{ width: `${gpuLoad * 2.2}%` }}>VERTEX</i><i className="gpu-fragment" style={{ width: `${gpuLoad * 3.2}%` }}>FRAGMENT</i><i className="gpu-present">PRESENT</i></div><code>{gpuLoad.toFixed(2)} ms</code></div><div className="vsync-line"><span>VSync interval · 16.67 ms</span><i /></div></div>
        <div className="bottleneck-cards"><article data-active={cpuLoad > gpuLoad}><Cpu size={18} /><div><strong>CPU Bound</strong><p>CPU termina o command stream tarde; GPU fica sem trabalho.</p></div><span>{cpuLoad > gpuLoad ? "CURRENT" : ""}</span></article><article data-active={gpuLoad >= cpuLoad}><Sparkles size={18} /><div><strong>GPU Bound</strong><p>Shaders, fill rate ou bandwidth dominam o frame time.</p></div><span>{gpuLoad >= cpuLoad ? "CURRENT" : ""}</span></article><article><Clock3 size={18} /><div><strong>Buffering</strong><p>Double/triple buffering desacopla render e scanout, ao custo de latency.</p></div><span>2–3 FRAMES</span></article></div>
      </section> : null}

      {view === "math" ? <section className="graphics-math-view">
        <aside className="math-controls"><header><SlidersHorizontal size={12} /><span>TRANSFORM CONTROLS</span></header><label><span>Rotation Y <code>{rotation}°</code></span><input type="range" min="0" max="180" value={rotation} onChange={(event) => setRotation(Number(event.target.value))} /></label><label><span>Uniform scale <code>{scale.toFixed(2)}</code></span><input type="range" min="0.4" max="1.5" step="0.05" value={scale} onChange={(event) => setScale(Number(event.target.value))} /></label><label><span>Projection</span><select value={projection} onChange={(event) => setProjection(event.target.value as "perspective" | "orthographic")}><option value="perspective">Perspective</option><option value="orthographic">Orthographic</option></select></label><section><span>MODEL MATRIX</span><code>M = T · R · S</code><span>VIEW MATRIX</span><code>V = inverse(camera transform)</code><span>PROJECTION</span><code>{projection === "perspective" ? "P = perspective(fov, aspect, near, far)" : "P = orthographic(l, r, b, t, n, f)"}</code></section></aside>
        <div className="math-preview"><header><span>COORDINATE TRANSFORM</span><small>interactive Three.js model</small></header><GraphicsScene stage={4} rotation={rotation} scale={scale} projection={projection} tint={tint} /><div className="coordinate-flow">{["Model", "World", "View", "Clip", "NDC", "Screen"].map((node, index, all) => <span key={node}><b>{node}</b>{index < all.length - 1 ? <ArrowRight size={9} /> : null}</span>)}</div></div>
        <aside className="math-concepts"><header>GRAPHICS MATH</header>{[["Vectors", "direction, position, color"], ["Dot product", "angle and lighting"], ["Cross product", "perpendicular basis"], ["Matrices", "composable transforms"], ["Homogeneous coords", "translation in 4D"], ["Quaternions", "stable 3D rotation"], ["Perspective", "depth foreshortening"], ["Clipping", "visible volume" ]].map(([name, note], index) => <p key={name}><span>{String(index + 1).padStart(2, "0")}</span><strong>{name}</strong><small>{note}</small></p>)}</aside>
      </section> : null}
    </div>
  );
}
