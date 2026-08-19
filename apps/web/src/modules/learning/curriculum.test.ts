import { describe, expect, it } from "vitest";
import { learningStats, projects } from "./catalog";
import { curriculumTracks, getCurriculumTrack } from "./curriculum";
import { curriculumLessons, curriculumModules } from "./lesson-catalog";
import { lessonGuides } from "./lesson-guides";
import { lessonHref } from "./lesson-slugs";
import { getRealWorldExample } from "./real-world-examples";
import { getLessonStudy } from "./lesson-study";
import { getProjectBlueprint } from "./project-blueprints";
import { reviewCards } from "./review-catalog";
import { getTopicDepth } from "./topic-depth";

describe("connected computer engineering curriculum", () => {
  it("keeps all core domains in one navigable map", () => {
    expect(curriculumTracks.map((track) => track.id)).toEqual([
      "c", "cpp", "assembly", "systems", "windows", "linux", "memory", "networking", "graphics", "reverse-engineering", "cybersecurity", "security-research", "game-security"
    ]);
    expect(curriculumTracks.every((track) => track.modules.every((module) => module.bridge.length > 0))).toBe(true);
  });

  it("covers the complete Assembly progression", () => {
    const assembly = getCurriculumTrack("assembly");
    expect(assembly?.modules.map((module) => module.id)).toEqual([
      "asm-bits", "asm-registers", "asm-flags", "asm-memory", "asm-syntax", "asm-abi", "asm-compiler", "asm-syscalls", "asm-simd", "asm-capstone"
    ]);
    expect(assembly?.modules.flatMap((module) => module.topics)).toEqual(expect.arrayContaining([
      "RAX–R15", "ZF CF OF SF PF", "Intel syntax", "AT&T syntax", "Windows x64", "System V AMD64", "AVX-512"
    ]));
  });

  it("covers Win32 from the API surface to PE and graphics", () => {
    const windows = getCurriculumTrack("windows");
    expect(windows?.modules.map((module) => module.id)).toEqual([
      "win-model", "win-text", "win-gui", "win-paint", "win-process", "win-threads", "win-memory", "win-files", "win-dll", "win-pe", "win-native", "win-graphics"
    ]);
  });

  it("covers the game security laboratory from memory to fictional anti-cheat", () => {
    const games = getCurriculumTrack("game-security");
    expect(games?.modules.map((module) => module.id)).toEqual([
      "gsec-fundamentals", "gsec-memory", "gsec-pointers", "gsec-world", "gsec-aim",
      "gsec-input", "gsec-tools", "gsec-assembly", "gsec-reverse", "gsec-anticheat", "gsec-network"
    ]);
    expect(games?.modules.flatMap((module) => module.topics)).toEqual(expect.arrayContaining([
      "game state", "pointer chains", "world-to-screen", "fictional AC", "authoritative server"
    ]));
  });

  it("covers the security research laboratory from memory bugs to detection", () => {
    const security = getCurriculumTrack("security-research");
    expect(security?.modules.map((module) => module.id)).toEqual([
      "sres-fundamentals", "sres-corruption", "sres-mitigations", "sres-fuzzing", "sres-binary",
      "sres-windows", "sres-linux", "sres-network", "sres-reverse", "sres-malware", "sres-detection"
    ]);
    expect(security?.modules.flatMap((module) => module.topics)).toEqual(expect.arrayContaining([
      "stack overflow", "sanitizers", "coverage-guided", "process injection theory", "YARA", "Mini EDR"
    ]));
  });

  it("covers the graphics pipeline and modern API families", () => {
    const graphics = getCurriculumTrack("graphics");
    expect(graphics?.modules.map((module) => module.id)).toEqual([
      "gfx-model", "gfx-pipeline", "gfx-math", "gfx-shaders", "gfx-opengl", "gfx-d3d11", "gfx-d3d12", "gfx-vulkan", "gfx-sdl", "gfx-gpu", "gfx-frame"
    ]);
  });

  it("offers capstones across binaries, Windows, Assembly and graphics", () => {
    const ids = projects.map((project) => project.id);
    expect(ids).toEqual(expect.arrayContaining([
      "pe-parser", "elf-inspector", "assembly-cpp-bridge", "opcode-vm", "cpu-emulator", "educational-debugger", "process-explorer", "runtime-dll", "opengl-renderer", "d3d11-renderer", "d3d12-renderer", "vulkan-renderer", "minimal-engine",
      "sres-vulnerable-cli", "sres-fuzz-parser", "sres-crackme", "sres-synthetic-sample", "sres-mini-edr", "sres-vulnerable-server", "sres-secure-server", "sres-malware-analyzer",
      "gsec-memory-inspector", "gsec-entity-visualizer", "gsec-mini-anticheat", "gsec-security-analyzer", "gsec-local-lab"
    ]));
  });

  it("publishes the requested progressive C, C++, networking and SQLite projects", () => {
    const ids = projects.map((project) => project.id);
    expect(ids).toEqual(expect.arrayContaining([
      "c-calculator", "c-arguments", "c-file-reader", "c-text-editor", "c-contacts",
      "c-dynamic-list", "c-linked-list", "c-stack-queue", "c-hash-table", "c-dynamic-string",
      "c-csv-parser", "c-binary-parser", "c-logger", "c-sqlite-crud", "c-http-client", "c-mini-shell",
      "cpp-cli", "cpp-filesystem-indexer", "cpp-oo-logger", "cpp-event-system", "cpp-resource-manager",
      "cpp-thread-pool", "cpp-task-queue", "cpp-tcp-server", "cpp-http-client", "cpp-sqlite-repository",
      "cpp-plugin-system", "cpp-memory-pool", "cpp-ecs", "cpp-basic-renderer", "cpp-game-loop", "cpp-serialization",
      "tcp-echo-pair", "tcp-file-transfer", "protocol-lab"
    ]));
  });

  it("gives every project a six-stage technical blueprint and verification plan", () => {
    expect(projects.length).toBeGreaterThanOrEqual(50);
    for (const project of projects) {
      const blueprint = getProjectBlueprint(project);
      expect(blueprint.brief.length, project.id).toBeGreaterThan(150);
      expect(blueprint.architecture.length, project.id).toBeGreaterThanOrEqual(6);
      expect(blueprint.invariants.length, project.id).toBeGreaterThanOrEqual(3);
      expect(blueprint.milestones.length, project.id).toBe(6);
      expect(blueprint.milestones.every((milestone) => milestone.build.length >= 3 && milestone.edgeCases.length >= 2), project.id).toBe(true);
      expect(blueprint.publicTests.length, project.id).toBeGreaterThanOrEqual(5);
      expect(blueprint.hiddenTests.length, project.id).toBeGreaterThan(100);
      expect(blueprint.experiments.length, project.id).toBeGreaterThanOrEqual(4);
      expect(blueprint.deliverables.length, project.id).toBeGreaterThanOrEqual(6);
      expect(blueprint.starter.source.length, project.id).toBeGreaterThan(100);
      if (project.id.startsWith("c-")) expect(blueprint.starter.language, project.id).toBe("c");
      if (project.id.startsWith("cpp-")) expect(blueprint.starter.language, project.id).toBe("cpp");
    }
  });

  it("publishes an active-recall review deck with concrete technical evidence", () => {
    expect(reviewCards.length).toBeGreaterThanOrEqual(8);
    for (const card of reviewCards) {
      expect(card.prompt.length, card.id).toBeGreaterThan(80);
      expect(card.answer.length, card.id).toBeGreaterThan(120);
      expect(card.evidence.length, card.id).toBeGreaterThanOrEqual(3);
      expect(card.href, card.id).toMatch(/^\/learn\//);
    }
  });

  it("publishes substantive content for every module and topic", () => {
    expect(curriculumModules).toHaveLength(87);
    expect(curriculumLessons).toHaveLength(403);
    expect(learningStats.totalLessons).toBe(curriculumLessons.length);
    expect(Object.keys(lessonGuides)).toHaveLength(87);

    for (const { module } of curriculumModules) {
      const guide = lessonGuides[module.id];
      expect(guide, `missing guide for ${module.id}`).toBeDefined();
      expect(guide!.thesis.length).toBeGreaterThan(80);
      expect(guide!.context).toHaveLength(2);
      expect(guide!.flow.length).toBeGreaterThanOrEqual(4);
      expect(guide!.mechanics.length).toBeGreaterThanOrEqual(4);
      expect(guide!.invariants.length).toBeGreaterThanOrEqual(3);
      expect(guide!.pitfalls.length).toBeGreaterThanOrEqual(2);
      expect(guide!.practice.tasks.length).toBeGreaterThanOrEqual(3);

      for (const topic of module.topics) {
        expect(guide!.topicNotes[topic], `missing ${module.id}/${topic}`).toBeTruthy();
        expect(guide!.topicNotes[topic]!.length).toBeGreaterThan(70);
      }
    }
  });

  it("gives every published topic a unique working destination", () => {
    const hrefs = curriculumLessons.map(({ track, module, topic }) => lessonHref(track, module, topic));
    expect(new Set(hrefs).size).toBe(curriculumLessons.length);
    expect(hrefs.every((href) => href.startsWith("/learn/") && !href.includes("#"))).toBe(true);
    const c = getCurriculumTrack("c")!;
    const pointers = c.modules.find((module) => module.id === "c-pointers")!;
    expect(lessonHref(c, pointers, "pointers")).toBe("/learn/c/c-pointers/pointers");
  });

  it("publishes a topic-specific technical dossier for every lesson", () => {
    for (const lesson of curriculumLessons) {
      const guide = lessonGuides[lesson.module.id]!;
      const depth = getTopicDepth(lesson, guide);
      expect(depth.readingMinutes, `${lesson.module.id}/${lesson.topic}`).toBeGreaterThanOrEqual(50);
      expect(depth.lenses).toHaveLength(5);
      expect(depth.lenses[0]!.detail).toBe(guide.topicNotes[lesson.topic]);
      expect(depth.transitions).toHaveLength(guide.flow.length - 1);
      expect(depth.transitions.every((transition) =>
        transition.contract.length > 30 && transition.evidence.length > 50 && transition.failure.length > 30
      )).toBe(true);
      expect(depth.checkpoints).toHaveLength(4);
      expect(depth.checkpoints.every((checkpoint) => checkpoint.answer.length > 50)).toBe(true);
    }
  });

  it("turns every topic into a layered course lesson with repeated practice", () => {
    for (const lesson of curriculumLessons) {
      const guide = lessonGuides[lesson.module.id]!;
      const study = getLessonStudy(lesson, guide);
      const label = `${lesson.track.id}/${lesson.module.id}/${lesson.topic}`;

      expect(study.motivation.length, label).toBeGreaterThan(180);
      expect(study.realUses.length, label).toBeGreaterThanOrEqual(6);
      expect(study.layers.map((layer) => layer.id), label).toEqual(["essential", "deep-dive", "low-level"]);
      expect(study.layers.every((layer) => layer.explanation.length > 70 && layer.inspect.length > 40), label).toBe(true);

      expect(study.examples.length, label).toBeGreaterThanOrEqual(3);
      expect(study.examples.filter((example) => example.code).length, label).toBeGreaterThanOrEqual(2);
      expect(study.examples.every((example) => example.expected.length > 5 && example.observations.length >= 2), label).toBe(true);
      expect(study.visualization.before.length, label).toBeGreaterThanOrEqual(3);
      expect(study.visualization.after.length, label).toBeGreaterThanOrEqual(3);

      expect(study.mistakes.length, label).toBeGreaterThanOrEqual(1);
      expect(study.mistakes.every((mistake) => mistake.cause.length > 60 && mistake.tradeOff.length > 60), label).toBe(true);
      expect(study.prediction.prompt.length, label).toBeGreaterThan(80);
      expect(study.prediction.answer.length, label).toBeGreaterThan(40);

      expect(study.exercises.map((exercise) => exercise.kind), label).toEqual(expect.arrayContaining(["guided", "independent", "challenge"]));
      expect(study.exercises.every((exercise) => exercise.hints.length === 3 && exercise.tests.length >= 3), label).toBe(true);
      expect(study.exercises.every((exercise) => exercise.reasoning.length > 80 && exercise.alternatives.length > 60), label).toBe(true);

      expect(study.generatedCode.generated.source.length, label).toBeGreaterThan(100);
      expect(study.generatedCode.observations.length, label).toBeGreaterThanOrEqual(3);
      expect(study.reviewQuestions.length, label).toBeGreaterThanOrEqual(5);
      expect(study.technicalSummary.length, label).toBeGreaterThanOrEqual(5);
      expect(study.connections.length, label).toBeGreaterThanOrEqual(3);

      const serialized = JSON.stringify(study).toLowerCase();
      expect(serialized, label).not.toMatch(/lorem ipsum|coming soon|example here|todo:/);
    }
  });

  it("teaches pointers through multiple executable contexts and failure modes", () => {
    const lesson = curriculumLessons.find(({ module, topic }) => module.id === "c-pointers" && topic === "pointers")!;
    const study = getLessonStudy(lesson, lessonGuides[lesson.module.id]!);
    expect(study.examples.map((example) => example.id)).toEqual([
      "pointer-address", "pointer-write", "pointer-parameter", "pointer-array", "pointer-dynamic", "pointer-struct"
    ]);
    expect(study.examples.every((example) => example.code?.language === "c")).toBe(true);
    expect(study.mistakes.map((mistake) => mistake.title)).toEqual(expect.arrayContaining([
      expect.stringContaining("Wild pointer"), expect.stringContaining("Dangling pointer")
    ]));
    expect(study.generatedCode.generated.source).toContain("DWORD PTR [rax]");
    expect(study.exercises.find((exercise) => exercise.kind === "challenge")?.title).toContain("Dynamic Integer List");
  });

  it("includes complete reproducible projects for core low-level domains", () => {
    const tcp = getRealWorldExample("net-sockets", "sockets");
    expect(tcp?.files.map((file) => file.filename)).toEqual(["tcp_server_posix.c", "tcp_server_win32.cpp"]);
    expect(tcp?.files[0]?.source).toContain("bind(listener");
    expect(tcp?.files[0]?.source).toContain("listen(listener");
    expect(tcp?.files[0]?.source).toContain("accept(listener");
    expect(tcp?.files[0]?.source).toContain("send_all");

    expect(getRealWorldExample("c-pointers", "pointers")?.id).toBe("c-dynamic-vector");
    expect(getRealWorldExample("asm-abi", "System V AMD64")?.id).toBe("assembly-c-bridge");
    expect(getRealWorldExample("win-gui", "WndProc")?.id).toBe("win32-window");
    expect(getRealWorldExample("win-memory", "VirtualAlloc")?.id).toBe("win32-virtual-memory");
    expect(getRealWorldExample("gfx-opengl", "VAO/VBO/EBO")?.id).toBe("opengl-triangle");
  });
});
