import { guide, type GuideMap } from "./types";

export const graphicsGuides: GuideMap = {
  "gfx-model": guide({
    thesis: "A CPU descreve trabalho por uma graphics API; runtime e driver traduzem commands e resources; a GPU executa em memória própria/compartilhada e produz imagens que a apresentação entrega ao compositor.",
    context: [
      "APIs não desenham pixels imediatamente a cada chamada. OpenGL/D3D11 acumulam estado e o driver monta trabalho; D3D12/Vulkan fazem a aplicação registrar command buffers explicitamente. Em ambos, execução da GPU é assíncrona.",
      "VRAM guarda buffers, images e caches conforme arquitetura. O framebuffer é o conjunto de attachments de um render pass; a swapchain oferece images apresentáveis e coordena aquisição/presentação."
    ],
    flow: ["game/application", "CPU commands", "graphics API", "driver", "GPU + VRAM", "framebuffer", "monitor"],
    topicNotes: {
      "CPU/GPU": "CPU é forte em controle serial e baixa latência; GPU ganha throughput com milhares de lanes em workloads regulares. Frames exigem que ambos avancem sem filas excessivas.",
      driver: "Driver valida/compila/agenda conforme API e traduz abstrações em packets da GPU. Em APIs explícitas, mais validação e lifetime passam para a aplicação.",
      VRAM: "Discrete GPUs acessam VRAM de alta largura; uploads cruzam PCIe/resizable paths. Integrated GPUs compartilham memória física, mas ainda usam caches e domains de acesso.",
      framebuffer: "Color, depth e stencil attachments recebem resultados do pipeline. Load/store/clear e formats determinam bandwidth e interpretação.",
      swapchain: "Images da swapchain alternam entre acquire, render e present. Buffer count e present mode influenciam latência, tearing e capacidade de manter GPU ocupada."
    },
    code: { language: "cpp", filename: "frame-model.cpp", source: `while (running) {
    FrameContext &frame = frames[next_frame];
    wait_until_reusable(frame.fence);
    Image back_buffer = acquire_swapchain_image(frame.acquire);
    record_scene(frame.commands, back_buffer);
    submit(frame.commands, frame.acquire, frame.finished, frame.fence);
    present(back_buffer, frame.finished);
    next_frame = (next_frame + 1) % frames.size();
}`, explanation: "Os nomes são neutros entre APIs. A regra essencial é: só reutilize CPU allocators, buffers e swapchain images depois da sincronização que comprova conclusão." },
    mechanics: [{ title: "Preparar", detail: "CPU atualiza dados e registra comandos referenciando resources válidos." }, { title: "Submeter", detail: "Queue recebe command stream e dependências de sincronização." }, { title: "Executar", detail: "GPU agenda waves, acessa caches/VRAM e escreve attachments." }, { title: "Apresentar", detail: "Present transfere ownership/estado da image para o sistema de apresentação." }],
    invariants: ["Resource vive até a última operação GPU terminar.", "Image/buffer está no state/layout exigido por cada uso.", "CPU não sobrescreve dados ainda consumidos por frame em flight."],
    pitfalls: [{ title: "Medir FPS apenas", detail: "FPS esconde spikes e soma não linear; use frame time e timeline CPU/GPU." }, { title: "Achar que Present terminou o frame", detail: "Pode apenas enfileirar; fences/queries provam conclusão do trabalho, dependendo da API." }],
    practice: { prompt: "Trace um frame no CPU/GPU Visualizer.", tasks: ["Marque update, record, submit, execute e present.", "Associe resources a cada etapa.", "Aumente frames in flight e meça latência/fila."], evidence: "Timeline com timestamps CPU/GPU, ownership de image e explicação de um stall." }
  }),

  "gfx-pipeline": guide({
    thesis: "O pipeline transforma vertices em primitives, rasteriza cobertura em fragments, executa shaders e combina resultados nos attachments; cada estágio consome uma representação com regras precisas.",
    context: [
      "Vertex buffers contêm atributos com stride/format; index buffers reutilizam vertices e definem topologia. Vertex shader produz clip-space position e varyings para os próximos estágios.",
      "Primitive assembly, clipping e viewport preparam triangles. Rasterization gera fragments; interpolation fornece valores; fragment/pixel shader calcula outputs que passam por depth/stencil/blend antes do framebuffer."
    ],
    flow: ["Vertex Data", "Vertex Shader", "Primitive Assembly", "Rasterization", "Fragment / Pixel Shader", "Framebuffer", "Screen"],
    topicNotes: {
      vertex: "Um vertex é um conjunto lógico de atributos lidos conforme input layout. gl_VertexID/SV_VertexID permite gerar dados sem buffer em casos simples.",
      index: "Indices apontam para vertices e reduzem duplicação. Format 16/32-bit limita range e muda bandwidth; base vertex acrescenta offset lógico.",
      rasterization: "Rasterizer aplica clipping, face culling, viewport e sample coverage. Winding e handedness inconsistentes podem remover toda geometria.",
      fragment: "Fragment é candidato a sample/pixel, não pixel garantido. Depth/stencil, discard e blending podem impedir ou combinar a escrita.",
      "draw call": "Draw liga pipeline, descriptors/state e buffers a um range/instance count. Ele agenda trabalho; não garante execução imediata nem um triangle visível."
    },
    code: { language: "glsl", filename: "triangle.vert", source: `#version 450
layout(location = 0) in vec3 inPosition;
layout(location = 1) in vec3 inColor;
layout(location = 0) out vec3 color;
layout(set = 0, binding = 0) uniform Scene { mat4 mvp; } scene;

void main() {
    gl_Position = scene.mvp * vec4(inPosition, 1.0);
    color = inColor;
}`, explanation: "O visualizer deve mostrar object position, clip position, NDC após divide por w, viewport coordinates e color interpolada por fragment." },
    mechanics: [{ title: "Fetch", detail: "Input assembler combina address, stride, index e format em atributos." }, { title: "Transformar", detail: "Vertex shader escreve clip position e outputs por vertex." }, { title: "Rasterizar", detail: "Primitives são clipped e convertidas em coverage/samples com barycentrics." }, { title: "Testar/combinar", detail: "Fragment output passa por depth/stencil e blend até attachments." }],
    invariants: ["Input layout corresponde exatamente ao buffer/stride.", "gl_Position/SV_Position está em clip space válido.", "Attachment formats e blend/depth states correspondem ao pass."],
    pitfalls: [{ title: "Depurar só no shader final", detail: "Visualize outputs por estágio: buffer, clip/NDC, winding, coverage, depth e target." }, { title: "Misturar row/column ou handedness", detail: "Matrizes podem compilar e ainda colocar geometry atrás da câmera ou inverter winding." }],
    practice: { prompt: "Expanda o Pipeline Visualizer para um triângulo indexado.", tasks: ["Inspecione atributos e indices.", "Mostre clipping e barycentrics.", "Alterne culling/depth/blend e explique cada resultado."], evidence: "Snapshots de todos os estágios e um bug de pipeline diagnosticado pelo primeiro estágio divergente." }
  }),

  "gfx-math": guide({
    thesis: "Gráficos movem pontos entre espaços coordenados; vetores e matrizes codificam transformações, e a cadeia Model–View–Projection leva object space até clip space antes da perspectiva.",
    context: [
      "Vetores representam direção/posição conforme w em coordenadas homogêneas. Produto escalar mede projeção/ângulo; produto vetorial produz normal orientada segundo handedness.",
      "Model posiciona objeto no mundo, View aplica a inversa da pose da câmera e Projection transforma o frustum. Após clipping, dividir xyz por w produz NDC; viewport converte para pixels."
    ],
    flow: ["model coordinates", "Model", "world", "View", "camera", "Projection", "clip/NDC", "screen"],
    topicNotes: {
      vectors: "Magnitude, normalize, dot e cross sustentam direção, lighting e bases. Não normalize zero; points e directions respondem diferente a translation.",
      matrices: "Ordem de multiplicação depende da convenção de vector e memory layout, que são conceitos distintos. Declare ambos e teste com transforms simples.",
      MVP: "MVP combina Projection·View·Model para column vectors, ou ordem correspondente na outra convenção. Normals exigem inverse-transpose da parte linear quando há escala não uniforme.",
      quaternions: "Quaternion unitário representa rotação sem singularidade de Euler e interpola com slerp. Composição ainda tem ordem e precisa de normalização após acúmulo.",
      perspective: "Perspective faz objetos distantes menores por divisão por w. Near plane afeta fortemente precisão de depth; conventions de NDC z variam entre APIs/configurações."
    },
    code: { language: "cpp", filename: "mvp.cpp", source: `Mat4 model = translate(position) * rotate(orientation) * scale(size);
Mat4 view = inverse(camera_world_transform);
Mat4 projection = perspective(fov_y, aspect, near_z, far_z);
Mat4 mvp = projection * view * model; // column-vector convention

Vec4 clip = mvp * Vec4(local_point, 1.0f);
Vec3 ndc = clip.xyz / clip.w;`, explanation: "No 3D Transform Lab, exiba cada vetor intermediário e o frustum. Se a library usa row vectors, adapte a ordem conscientemente." },
    mechanics: [{ title: "Transformar model", detail: "Local point recebe scale, rotation e translation até world space." }, { title: "Mudar câmera", detail: "View é inversa da transformação que posiciona a câmera no mundo." }, { title: "Projetar", detail: "Projection mapeia frustum para clip volume preservando w para perspectiva." }, { title: "Clip/divide/viewport", detail: "Primitives são clipped em homogeneous space; NDC vira coordenada de tela e depth." }],
    invariants: ["Todo valor anota seu coordinate space.", "Matrizes e shaders compartilham ordem/layout/convention.", "Near > 0 e projection/depth convention coincidem com a API."],
    pitfalls: [{ title: "Transpor até funcionar", detail: "Isso mascara convenções inconsistentes; teste translation de um ponto e registre a regra." }, { title: "Interpolar Euler diretamente", detail: "Pode escolher caminho ruim e sofrer gimbal lock; use quaternion para orientação, Euler apenas como UI quando convém." }],
    practice: { prompt: "Construa visualizações Three.js para a matemática.", tasks: ["Mostre dot/cross e bases.", "Anime Model, View, Projection separadamente.", "Compare Euler/quaternion e near-plane depth precision."], evidence: "Controles interativos, valores numéricos por espaço e testes de matriz identidade/inversa." }
  }),

  "gfx-shaders": guide({
    thesis: "Shaders são programas paralelos com interfaces declaradas: source vira representação intermediária/ISA, descriptors e buffers alimentam invocações, e o pipeline define como outputs chegam ao estágio seguinte.",
    context: [
      "GLSL é central em OpenGL e também pode compilar para SPIR-V; HLSL é natural no Direct3D e toolchains modernas também produzem SPIR-V. SPIR-V é IR binária tipada para APIs/ambientes compatíveis, não uma linguagem de shading de alto nível.",
      "Uniforms/constant buffers mudam pouco por draw; storage buffers/images permitem acesso mais geral. Interpolation acontece entre vertex e fragment; texture sampling combina coordinates, sampler state, filtering e mip selection."
    ],
    flow: ["GLSL/HLSL", "shader compiler", "SPIR-V/DXIL", "pipeline", "GPU ISA", "shader invocations"],
    topicNotes: {
      GLSL: "GLSL usa layouts, locations e bindings; versão e extensions definem recursos. OpenGL pode linkar program, Vulkan consome módulos SPIR-V com interfaces explícitas.",
      HLSL: "HLSL usa semantics, register spaces e resource types; DXC produz DXIL para D3D12 e pode produzir SPIR-V com regras de layout escolhidas.",
      "SPIR-V": "SPIR-V codifica tipos, control flow, decorations e capabilities. Validation confirma regras estruturais/ambientais antes de criar pipeline.",
      "vertex/fragment": "Vertex shader roda por vertex e produz posição/varyings; fragment/pixel shader roda por covered sample/fragment e produz colors/depth ou descarta.",
      compute: "Compute shader organiza workgroups e local invocations, com shared memory e barriers dentro do group. Dispatch dimensions não substituem bounds check."
    },
    code: { language: "hlsl", filename: "color.hlsl", source: `cbuffer Scene : register(b0) { float4x4 mvp; };
Texture2D colorTex : register(t0);
SamplerState linearSampler : register(s0);

VSOut VSMain(VSIn input) {
    VSOut o;
    o.position = mul(mvp, float4(input.position, 1));
    o.uv = input.uv;
    return o;
}

float4 PSMain(VSOut input) : SV_Target0 {
    return colorTex.Sample(linearSampler, input.uv);
}`, explanation: "O preview deve mostrar compiler diagnostics, reflection de b0/t0/s0 e resultado. Matrix convention do upload precisa coincidir com mul usado." },
    mechanics: [{ title: "Compilar", detail: "Frontend valida tipos/interfaces e gera IR para target/profile." }, { title: "Refletir/ligar", detail: "Pipeline confirma locations, descriptors, formats e stage interfaces." }, { title: "Despachar", detail: "GPU cria invocations em waves/warps e lê constants/resources." }, { title: "Sincronizar", detail: "Inter-stage dependencies vêm do pipeline; compute/resource hazards exigem barriers adequadas." }],
    invariants: ["Bindings e layouts CPU/shader coincidem byte a byte.", "Toda dispatch calcula e testa global index contra o tamanho.", "Shader compilation errors aparecem com arquivo/linha e não executam pipeline antigo silenciosamente."],
    pitfalls: [{ title: "Hot reload sem versionar resources", detail: "Novo shader pode exigir layout incompatível; reflita e recrie pipeline/descriptors atomicamente." }, { title: "Barrier em branch divergente", detail: "Se nem todas invocations do workgroup alcançam barrier, comportamento pode deadlockar/ser inválido." }],
    practice: { prompt: "Expanda o editor de shader com preview em tempo real.", tasks: ["Compile GLSL e HLSL suportados.", "Mostre reflection e diagnostics.", "Adicione compute image effect com bounds/barrier corretos."], evidence: "Hot reload preserva último build válido e exibe bindings, tempo e output determinístico." }
  }),

  "gfx-opengl": guide({
    thesis: "OpenGL apresenta uma state machine: um contexto current recebe comandos que usam objects vinculados; compreender o estado implícito é essencial para ligar cada draw aos resources reais.",
    context: [
      "A windowing API cria surface/context e resolve entry points. VAO registra vertex input, VBO/EBO armazenam dados, shader program define estágios e textures/samplers fornecem images. Context ownership por thread é explícito.",
      "Depth testing resolve visibilidade, blending combina source/destination e framebuffer objects direcionam offscreen passes. Driver rastreia hazards implicitamente, mas sync objects tornam dependências CPU/GPU observáveis."
    ],
    flow: ["Window/context", "VAO + buffers", "GLSL program", "textures/state", "glDraw*", "FBO/default framebuffer", "swap"],
    topicNotes: {
      "OpenGL context": "Context contém state e object namespace compartilhável. Deve estar current no thread antes de calls; profile/version limitam funções legais.",
      "VAO/VBO/EBO": "VBO é buffer; VAO captura vertex attribute format/binding e element buffer association. Stride/offset são bytes e precisam corresponder ao C++ layout.",
      GLSL: "Compile shaders, confira logs e linke program validando stage interfaces. Uniform locations podem mudar após relink; query ou use explicit locations.",
      textures: "Texture storage tem target, levels e formats; sampler controla filtering/wrap. Pixel unpack alignment afeta uploads com row stride não múltiplo do default.",
      framebuffer: "FBO anexa textures/renderbuffers e precisa estar complete. Default framebuffer pertence à janela e sua color encoding/samples podem diferir do offscreen target."
    },
    code: { language: "cpp", filename: "triangle-gl.cpp", source: `glBindVertexArray(vao);
glUseProgram(program);
glBindTextureUnit(0, texture);
glEnable(GL_DEPTH_TEST);

glBindFramebuffer(GL_FRAMEBUFFER, framebuffer);
glViewport(0, 0, width, height);
glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
glDrawElements(GL_TRIANGLES, index_count, GL_UNSIGNED_INT, nullptr);
GLenum error = glGetError();`, explanation: "Para ensino, liste todo estado relevante antes do draw. Em produção, use debug callback em vez de glGetError após cada chamada." },
    mechanics: [{ title: "Criar objects", detail: "Names viram storage/configuração por glCreate*/glNamed* ou bind-to-edit legado." }, { title: "Configurar state", detail: "Program, VAO, textures, FBO, viewport, depth e blend formam o draw state." }, { title: "Emitir draw", detail: "Driver valida/lazily compila e acrescenta commands à fila do contexto." }, { title: "Apresentar/sincronizar", detail: "Window swap apresenta; fences/queries coordenam reutilização e profiling." }],
    invariants: ["Context correto está current no calling thread.", "Todos objects usados continuam vivos até o driver/GPU não precisar mais.", "FBO completeness e viewport são validados após resize."],
    pitfalls: [{ title: "Estado vazando entre passes", detail: "Uma função muda blend/depth/program e outra assume defaults; use state cache/encapsulation e debug labels." }, { title: "Confundir object name com resource bound", detail: "GLuint é apenas nome no context; binding e target determinam o uso atual." }],
    practice: { prompt: "Construa renderer OpenGL em progressão.", tasks: ["Janela → triângulo → texture → cube/camera.", "Adicione lighting, FBO, depth e blending.", "Capture um draw e liste todo estado implícito."], evidence: "Renderer redimensionável, debug output limpo e frame capture anotado." }
  }),

  "gfx-d3d11": guide({
    thesis: "Direct3D 11 separa criação de resources pelo Device de comandos/state pelo DeviceContext; DXGI swapchain fornece back buffers e views descrevem como cada resource será usado.",
    context: [
      "ID3D11Device cria buffers, textures, shaders, input layouts e states. Immediate context envia trabalho ordenado; deferred contexts gravam command lists com limitações e não equivalem à granularidade de D3D12.",
      "RenderTargetView, DepthStencilView, ShaderResourceView e UnorderedAccessView dão interpretações controladas ao mesmo resource. O runtime/driver gerencia muitas transições e hazards implicitamente."
    ],
    flow: ["Device creates resources", "DeviceContext binds state", "Draw/Dispatch", "driver command stream", "GPU", "SwapChain Present"],
    topicNotes: {
      Device: "Device representa adapter e capability level e é thread-safe para resource creation. Ative debug layer em builds de desenvolvimento e consulte removed reason.",
      DeviceContext: "Immediate context guarda pipeline state e emite draws/maps/copies. Get/Set state excessivo custa; organize passes e use debug annotations.",
      SwapChain: "DXGI flip-model swapchain associa buffers ao HWND. Acquire é implícito pelo current buffer API e Present coordena composição/latência.",
      RenderTargetView: "RTV descreve mip/array/format usado como color output. Antes de ResizeBuffers, solte RTV e qualquer reference aos back buffers.",
      buffers: "Buffer desc define ByteWidth, Usage, BindFlags, CPUAccess e Misc. Dynamic buffers usam Map WRITE_DISCARD/NO_OVERWRITE segundo regras de streaming."
    },
    code: { language: "cpp", filename: "d3d11-frame.cpp", source: `context->OMSetRenderTargets(1, rtv.GetAddressOf(), depth_view.Get());
context->RSSetViewports(1, &viewport);
context->IASetInputLayout(input_layout.Get());
context->IASetVertexBuffers(0, 1, vertex_buffer.GetAddressOf(), &stride, &offset);
context->IASetIndexBuffer(index_buffer.Get(), DXGI_FORMAT_R32_UINT, 0);
context->VSSetShader(vertex_shader.Get(), nullptr, 0);
context->PSSetShader(pixel_shader.Get(), nullptr, 0);
context->DrawIndexed(index_count, 0, 0);
swapchain->Present(1, 0);`, explanation: "O Frame Debugger pode agrupar esses binds como pipeline state do DrawIndexed e mostrar RTV, buffers e shaders selecionados." },
    mechanics: [{ title: "Criar", detail: "Device valida descriptors e cria resource/state objects." }, { title: "Vincular", detail: "Context atualiza slots de cada pipeline stage e output merger." }, { title: "Desenhar", detail: "Runtime detecta hazards, driver forma commands e GPU executa." }, { title: "Apresentar", detail: "DXGI entrega current back buffer com sync interval/flags." }],
    invariants: ["View format/dimension é compatível com resource.", "Resource não está simultaneamente bound em usos conflitantes.", "Resize libera todas as referências ao swapchain buffer."],
    pitfalls: [{ title: "Map errado para Usage", detail: "DEFAULT, DYNAMIC, IMMUTABLE e STAGING permitem CPU/GPU access patterns diferentes; escolha pelo fluxo real." }, { title: "Ignorar debug layer warnings", detail: "Ela detecta hazards, leaks e invalid state cedo; trate output como falha de desenvolvimento." }],
    practice: { prompt: "Construa um renderer D3D11 básico.", tasks: ["Device/context/swapchain e triangle.", "Buffers, texture, depth e constant buffer de câmera.", "Resize e device-removed handling."], evidence: "Debug layer limpa, live object report vazio e capture de DrawIndexed explicado." }
  }),

  "gfx-d3d12": guide({
    thesis: "Direct3D 12 torna explícitos command recording, descriptor binding, resource states, memory e synchronization; o controle reduz overhead potencial, mas toda reutilização precisa de prova por fence.",
    context: [
      "Device cria resources/heaps, descriptor heaps, root signatures e PSOs. Command allocator guarda backing de recording; command list grava; command queue executa. Allocator só pode resetar após GPU concluir as lists que o usam.",
      "Descriptor heaps expõem views/samplers à GPU. Root signature define interface pequena e PSO congela shaders e fixed state. Resource barriers declaram transições e ordering; fence cria timeline CPU–queue."
    ],
    flow: ["Frame allocator", "CommandList", "Resource Barriers", "CommandQueue", "Fence signal", "Present/reuse"],
    topicNotes: {
      "CommandQueue/List": "Queue é de direct/compute/copy type; lists compatíveis registram comandos e fecham antes de ExecuteCommandLists. Queue ordering é explícito entre queues via fences.",
      DescriptorHeap: "RTV/DSV heaps são CPU-visible; CBV/SRV/UAV e sampler heaps podem ser shader-visible. Descriptor handle é offset em heap, não lifetime do resource.",
      PSO: "Pipeline State Object combina shaders, root signature, input, raster, depth, blend e target formats para compilação/validação antecipada.",
      RootSignature: "Root parameters oferecem constants, root descriptors e descriptor tables. Root space é limitado; coloque dados por frequência e minimize mudanças.",
      "Fence/Barrier": "Fence comprova progresso de queue; barrier controla state/visibility/order de resource. Um não substitui o outro."
    },
    code: { language: "cpp", filename: "d3d12-frame.cpp", source: `frame.fence->wait_before_reuse(queue);
frame.allocator->Reset();
commands->Reset(frame.allocator.Get(), pso.Get());

transition(commands, back_buffer, D3D12_RESOURCE_STATE_PRESENT,
           D3D12_RESOURCE_STATE_RENDER_TARGET);
commands->OMSetRenderTargets(1, &rtv, FALSE, nullptr);
commands->DrawIndexedInstanced(index_count, 1, 0, 0, 0);
transition(commands, back_buffer, D3D12_RESOURCE_STATE_RENDER_TARGET,
           D3D12_RESOURCE_STATE_PRESENT);
commands->Close();
queue->ExecuteCommandLists(1, lists);
swapchain->Present(1, 0);
frame.fence->signal(queue);`, explanation: "O frame context mantém allocator, transient descriptors e fence value próprios. Reuso só ocorre depois que a fence daquele frame foi alcançada." },
    mechanics: [{ title: "Alocar/descrever", detail: "Resources ocupam heaps e views entram em descriptor heaps." }, { title: "Gravar", detail: "Allocator/list armazenam comandos, bindings e barriers sem executar imediatamente." }, { title: "Submeter", detail: "Queue recebe lists e executa na ordem, sincronizando outras queues por fence." }, { title: "Reciclar", detail: "CPU aguarda ou consulta fence antes de resetar allocator e sobrescrever transient data." }],
    invariants: ["Tracked resource state coincide com uso real em cada subresource.", "Descriptor/resource permanece válido até última execução.", "Allocator e upload slice não são reutilizados antes da fence."],
    pitfalls: [{ title: "WaitForGPU a cada frame", detail: "Torna correto porém serializa CPU/GPU; mantenha frame contexts e espere só quando atingir o que ainda está in flight." }, { title: "Barrier como cache flush mágico", detail: "Escolha before/after states e scopes corretos; barriers extras custam e ausentes geram hazards." }],
    practice: { prompt: "Construa renderer D3D12 incremental.", tasks: ["Triangle com debug layer e GPU validation.", "Ring de 2–3 frame contexts/descriptors.", "Texture upload, root signature, PSO e resize."], evidence: "Timeline de fence values, state log por resource e debug layer sem erros." }
  }),

  "gfx-vulkan": guide({
    thesis: "Vulkan explicita descoberta de capabilities, criação de device/queues, memory binding, command buffers e synchronization; quase todo passo transforma uma obrigação implícita em estado verificável.",
    context: [
      "Instance habilita extensions/layers; physical device expõe propriedades; logical device cria queues/features. Surface + capabilities determinam swapchain images/formats/present modes e precisam ser recriados quando ficam out-of-date.",
      "Images exigem image views e memory; pipeline define shaders/fixed state/layout. Command pool aloca command buffers; semaphores coordenam queue operations/present e fences permitem CPU observar conclusão."
    ],
    flow: ["Instance/validation", "Physical → Logical Device", "Swapchain resources", "Pipeline/descriptors", "CommandBuffer", "Queue submit", "Present"],
    topicNotes: {
      "Instance/Device": "Instance extensions conectam window system/debug; physical selection verifica queues/features/formats; logical device habilita apenas o necessário e obtém queues.",
      "Queue/Swapchain": "Queue families suportam graphics/compute/transfer/present. Swapchain negotiation escolhe image count, extent, format, usage, sharing e present mode.",
      CommandBuffer: "Command pool pertence a queue family; buffers passam por initial/recording/executable/pending. Reset/re-record só quando usage e synchronization permitem.",
      Descriptor: "Descriptor set layout define bindings; pool aloca sets; pipeline layout combina sets e push constants. Update não pode invalidar descriptors em uso sem flags/modelo adequado.",
      "Semaphore/Fence": "Binary/timeline semaphores ordenam device work; fence é sinalizada por submission e esperada pela CPU. Stage masks definem onde a dependência se aplica."
    },
    code: { language: "cpp", filename: "vulkan-submit.cpp", source: `vkWaitForFences(device, 1, &frame.fence, VK_TRUE, UINT64_MAX);
vkResetFences(device, 1, &frame.fence);
uint32_t image = acquire(frame.image_available);
record(frame.command_buffer, image);

VkSubmitInfo submit = make_submit(frame.image_available,
    VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT,
    frame.command_buffer, frame.render_finished);
check(vkQueueSubmit(graphics_queue, 1, &submit, frame.fence));
present(present_queue, image, frame.render_finished);`, explanation: "A fence protege recursos por frame; semaphores ligam acquire → rendering → present. Trate OUT_OF_DATE/SUBOPTIMAL e não resete fence antes de garantir uma submission que a sinalizará." },
    mechanics: [{ title: "Descobrir/criar", detail: "Capabilities guiam instance/device/queues e extensions sem assumir suporte." }, { title: "Alocar/vincular", detail: "Memory requirements escolhem type/alignment; resources são bound antes do uso." }, { title: "Registrar/transicionar", detail: "Command buffers contêm pipeline, descriptors, draws e image/buffer barriers." }, { title: "Submeter/apresentar", detail: "Queues executam dependências e WSI recebe image no layout/ownership correto." }],
    invariants: ["Toda feature/extension usada foi consultada e habilitada.", "Image layout/access/stage/queue ownership seguem o último uso real.", "Objetos host e device não são destruídos enquanto comandos estão pending."],
    pitfalls: [{ title: "Copiar barrier sem entender stages", detail: "TOP/BOTTOM_OF_PIPE e masks genéricas podem não criar a dependência desejada; derive producer/consumer." }, { title: "Validation como garantia total", detail: "Layers cobrem muito uso de API, não races da aplicação, matemática ou todos hazards de shader." }],
    practice: { prompt: "Construa Vulkan do instance ao triangle.", tasks: ["Validation, device e queues por capabilities.", "Swapchain/pipeline/command buffers/descriptors.", "Frames in flight, resize e memory allocator básico."], evidence: "Validation limpa, lifetime graph e capture com barriers/synchronization explicadas." }
  }),

  "gfx-sdl": guide({
    thesis: "SDL3 é uma camada de plataforma: uniformiza window, events, input, controller e audio, mas ainda entrega handles/extensions para OpenGL/Vulkan e não remove os conceitos nativos por baixo.",
    context: [
      "Win32 direto oferece controle e integração Windows; SDL3 reduz branches de plataforma e traduz eventos. O tradeoff é depender do lifecycle e das abstrações SDL, recorrendo a propriedades/handles nativos apenas quando necessário.",
      "Para OpenGL, SDL cria contexto e swap; para Vulkan, informa instance extensions e cria surface. O renderer continua responsável por device, resources, synchronization e frame loop."
    ],
    flow: ["C++ application", "SDL3 platform API", "Win32/X11/Wayland/etc.", "OpenGL/Vulkan", "driver", "hardware"],
    topicNotes: {
      "SDL3 window": "SDL_CreateWindow configura flags como resizable/high-DPI/OpenGL/Vulkan. Diferencie logical window size de pixel size para render correto.",
      "event loop": "SDL_PollEvent drena eventos; SDL_WaitEvent permite idle eficiente. Eventos de window/display redimensionam resources no ponto controlado do frame.",
      input: "Keyboard usa scancodes/keycodes conforme intenção física/lógica; mouse e gamepad têm hotplug, focus e coordinate conversion. Estado contínuo e eventos servem propósitos distintos.",
      audio: "Audio callbacks/streams têm deadlines e não devem bloquear/alocar sem controle. Formato, sample rate e buffer determinam conversão e latência.",
      "OpenGL/Vulkan": "SDL_GL_* gerencia contexto OpenGL; SDL_Vulkan_* conecta WSI. Não misture swap/present ownership entre os dois modelos."
    },
    code: { language: "cpp", filename: "sdl-loop.cpp", source: `SDL_Init(SDL_INIT_VIDEO | SDL_INIT_GAMEPAD | SDL_INIT_AUDIO);
SDL_Window *window = SDL_CreateWindow("0xLab", 1280, 720,
    SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY | SDL_WINDOW_VULKAN);

bool running = window != nullptr;
while (running) {
    SDL_Event event;
    while (SDL_PollEvent(&event)) {
        if (event.type == SDL_EVENT_QUIT) running = false;
        handle_event(event);
    }
    render_frame();
}
SDL_DestroyWindow(window);
SDL_Quit();`, explanation: "O app permanece responsável por error handling e por destruir graphics resources/device/surface na ordem correta antes da window." },
    mechanics: [{ title: "Inicializar subsystem", detail: "SDL carrega backend de plataforma e cria estado por subsistema." }, { title: "Criar janela", detail: "Flags selecionam capabilities e SDL cria o objeto nativo correspondente." }, { title: "Traduzir eventos", detail: "Backend converte messages/events nativos em SDL_Event estável." }, { title: "Conectar graphics", detail: "Context ou surface liga janela à API; renderer segue seu lifecycle normal." }],
    invariants: ["SDL é inicializado para cada subsystem usado.", "Pixel extent, DPI e resize chegam ao renderer sem confundir logical units.", "Graphics objects que dependem da window morrem antes dela."],
    pitfalls: [{ title: "Abstração vazando sem política", detail: "Acesso nativo é válido, mas isole em módulo de plataforma para não espalhar #ifdefs." }, { title: "Render no audio callback", detail: "Audio é real-time-sensitive; comunique por ring buffer/estado lock-free apropriado." }],
    practice: { prompt: "Implemente o mesmo app com Win32 e SDL3.", tasks: ["Compare window/event/input lifecycle.", "Conecte SDL3 + OpenGL e SDL3 + Vulkan.", "Adicione gamepad/audio com shutdown limpo."], evidence: "Tabela de equivalências, builds em duas plataformas quando disponíveis e logs do backend selecionado." }
  }),

  "gfx-gpu": guide({
    thesis: "GPU converte milhares de invocações em warps/wavefronts SIMD/SIMT; throughput depende de ocupação, coerência de controle e acesso coalescido à hierarquia de memória.",
    context: [
      "Cores de GPU agrupam threads em waves que compartilham instruction issue. Branches divergentes serializam caminhos ativos por mask; muitas threads escondem latency trocando waves prontas.",
      "Registers e shared/local memory são rápidos e limitam occupancy; caches e VRAM têm maior alcance/latency. Compute shaders expõem workgroups, group shared memory e barriers locais para algoritmos paralelos."
    ],
    flow: ["dispatch grid", "workgroups", "warps/wavefronts", "SIMD lanes", "cache/shared memory", "VRAM", "result"],
    topicNotes: {
      "warp/wavefront": "Hardware agrupa lanes (frequentemente 32 ou 64, mas não universal). Subgroup operations precisam consultar tamanho/capabilities ou usar abstrações portáveis.",
      SIMD: "SIMT apresenta thread IDs individuais sobre execução vetorial mascarada. Divergência e loops com comprimentos diferentes reduzem lanes úteis.",
      "VRAM/cache": "Acessos adjacentes favorecem coalescing/cache lines. Strides, random access e transfers CPU↔GPU podem dominar ALU barata.",
      compute: "Dispatch define groups; shader calcula global ID e valida bounds. Group memory permite tile/reuse com barrier entre produção e consumo.",
      parallelism: "Data parallelism escala quando elementos são independentes. Reductions/scans exigem algoritmos hierárquicos e synchronization por níveis."
    },
    code: { language: "glsl", filename: "vector-add.comp", source: `#version 450
layout(local_size_x = 256) in;
layout(std430, binding = 0) readonly buffer A { float a[]; };
layout(std430, binding = 1) readonly buffer B { float b[]; };
layout(std430, binding = 2) writeonly buffer Out { float outData[]; };
layout(push_constant) uniform Params { uint count; } p;

void main() {
    uint i = gl_GlobalInvocationID.x;
    if (i < p.count) outData[i] = a[i] + b[i];
}`, explanation: "Dispatch ceil(count/256) groups e mantenha bounds check. Uma barrier de API torna storage writes visíveis ao próximo consumer." },
    mechanics: [{ title: "Distribuir", detail: "Grid vira workgroups e scheduler coloca waves em compute units." }, { title: "Executar lanes", detail: "Mesma instrução opera lanes ativas; divergence muda masks por caminho." }, { title: "Acessar memória", detail: "Coalescer/caches agrupam requests; shared memory reutiliza tiles dentro do group." }, { title: "Publicar", detail: "Barrier de shader sincroniza group; barrier de API ordena dispatch com consumers posteriores." }],
    invariants: ["Global IDs fora do domínio não acessam buffers.", "Todos threads necessários alcançam barriers locais uniformemente.", "Host/API barrier cobre producer writes e consumer reads corretos."],
    pitfalls: [{ title: "Maximizar occupancy cegamente", detail: "Occupancy baixa pode limitar latency hiding, mas reduzir registers/work também pode piorar; profile." }, { title: "GPU para trabalho minúsculo", detail: "Dispatch, synchronization e transfer overhead podem superar o compute; compare CPU." }],
    practice: { prompt: "Implemente vector add e tiled image filter.", tasks: ["Compare CPU/GPU incluindo transfers.", "Varie local size e layout.", "Inspecione divergence, bandwidth e occupancy."], evidence: "Gráficos por tamanho, dispatch correto nos tails e profile com bottleneck identificado." }
  }),

  "gfx-frame": guide({
    thesis: "Um frame é uma dependência temporal entre CPU, queues, GPU e display; diagnosticar performance requer frame time por estágio, não apenas média de FPS.",
    context: [
      "CPU-bound significa que preparação/submission limita throughput; GPU-bound que execução gráfica/compute domina. O gargalo pode variar dentro do frame, e filas longas aumentam input latency mesmo com FPS alto.",
      "VSync alinha apresentação ao refresh e evita tearing, mas pode bloquear/introduzir pacing. Double buffering dá front/back; triple permite outro frame em progresso, elevando throughput potencial e também latency se não limitado."
    ],
    flow: ["input", "CPU update/record", "queue submit", "GPU passes", "present", "display scanout", "next frame"],
    topicNotes: {
      "frame time": "16,67 ms corresponde a 60 Hz e 8,33 ms a 120 Hz. Observe percentis e spikes; 60 FPS médio pode esconder frames de 50 ms.",
      "CPU/GPU bound": "Reduza artificialmente resolution para testar GPU load e desabilite trabalho CPU controladamente. Timers de GPU e CPU precisam de domains calibrados/markers.",
      VSync: "Com VSync, present espera/junta refresh conforme queue e API. Adaptive sync/tearing modes alteram regra e requerem capability/flag corretas.",
      "double/triple buffering": "Mais buffers desacoplam producer/consumer e evitam idle, mas permitem fila. Frame latency waitable objects ou fences limitam quantos frames ficam à frente.",
      profiling: "Markers hierárquicos, timestamp queries, pipeline statistics e frame capture conectam custo a pass/draw. Profile build representativo e sem debug validation pesada."
    },
    code: { language: "text", filename: "frame-1251.trace", source: `Frame #1251 — 16.42 ms
CPU  0.00–2.10  Update + culling
CPU  2.10–3.25  Record + submit
GPU  1.20–2.00  Clear / depth prepass
GPU  2.00–11.80 Opaque (412 draws)
GPU 11.80–14.70 Post-process
GPU 14.70–15.10 UI
PRESENT 15.10–16.42 wait / compose`, explanation: "Selecionar Opaque deve revelar draw calls, buffers, textures, shaders e pipeline; depois agregue por material/mesh para testar a hipótese." },
    mechanics: [{ title: "Marcar", detail: "CPU scopes e GPU debug markers dão nomes estáveis a passes/events." }, { title: "Timestamp", detail: "Queries cercam trabalho sem forçar sync; resultado é lido frames depois." }, { title: "Correlacionar", detail: "Timeline alinha CPU submission, queue execution, present e display." }, { title: "Intervir", detail: "Mude uma variável, recapture percentis/counters e preserve comparação." }],
    invariants: ["Medição não bloqueia GPU a cada timestamp.", "CPU/GPU clocks são correlacionados ou apresentados em lanes distintas.", "Frame contexts limitam queue depth conforme meta de latency."],
    pitfalls: [{ title: "Chamar CPU-bound por GPU ociosa", detail: "GPU também pode esperar barrier, upload, present ou dependência; leia a timeline completa." }, { title: "Otimizar draw isolado", detail: "Um draw caro pode ser irrelevante no frame total; priorize hot passes e spikes reproduzíveis." }],
    practice: { prompt: "Complete o Frame Debugger educacional.", tasks: ["Liste clear/bind/draw/UI/present por frame.", "Inspecione resources de um draw.", "Demonstre CPU-bound, GPU-bound, VSync e buffering."], evidence: "Capturas antes/depois com frame-time percentiles, queue depth e causa do gargalo." }
  })
};
