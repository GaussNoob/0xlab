import type { CompilerDiagnostic, ExecutionAnalysis } from "@0xlab/contracts";

const DIAGNOSTIC_PATTERN = /^(?<file>[^:\n]+):(?<line>\d+):(?<column>\d+):\s+(?<severity>fatal error|error|warning|note):\s+(?<message>.+)$/gm;

export function parseDiagnostics(compilerOutput: string): readonly CompilerDiagnostic[] {
  return [...compilerOutput.matchAll(DIAGNOSTIC_PATTERN)].slice(0, 100).map((match) => ({
    severity: match.groups?.severity === "warning" ? "warning" : match.groups?.severity === "note" ? "note" : "error",
    ...(match.groups?.file === undefined ? {} : { file: match.groups.file.replace(/^\/workspace\//, "") }),
    ...(match.groups?.line === undefined ? {} : { line: Number.parseInt(match.groups.line, 10) }),
    ...(match.groups?.column === undefined ? {} : { column: Number.parseInt(match.groups.column, 10) }),
    message: match.groups?.message ?? "Compiler diagnostic"
  }));
}

interface AnalysisInput {
  readonly compileExitCode: number;
  readonly runExitCode: number | null;
  readonly compileStderr: string;
  readonly stderr: string;
  readonly timedOut: boolean;
  readonly oomKilled?: boolean;
}

function extractLocation(output: string): string | null {
  const match = output.match(/(?<file>(?:\/workspace\/)?[\w./-]+\.(?:c|cc|cpp|cxx)):(?<line>\d+)(?::\d+)?/m);
  const file = match?.groups?.file;
  const line = match?.groups?.line;
  if (!file || !line) return null;
  return `${file.replace(/^\/workspace\//, "")}:${line}`;
}

export function analyzeExecution(input: AnalysisInput): ExecutionAnalysis {
  if (input.timedOut) {
    return {
      headline: "A execução excedeu o limite de tempo",
      summary: "O processo foi encerrado pelo sandbox. Verifique loops sem condição de saída, deadlocks e leituras bloqueantes.",
      category: "timeout",
      suggestions: ["Revise as condições de parada.", "Evite esperar entrada que não foi fornecida em stdin."]
    };
  }
  if (input.oomKilled) {
    return {
      headline: "O processo excedeu o limite de memória",
      summary: "O cgroup do sandbox encerrou o programa após o consumo ultrapassar 256 MiB.",
      category: "memory",
      suggestions: ["Verifique o retorno de malloc/calloc e limite o tamanho das entradas.", "Libere buffers que não serão mais usados e procure crescimento sem limite."]
    };
  }
  if (input.compileExitCode !== 0) {
    return {
      headline: "O programa não compilou",
      summary: "Leia o primeiro erro antes de tratar os diagnósticos seguintes; muitos deles podem ser consequências do mesmo problema.",
      category: "compiler",
      suggestions: ["Abra o diagnóstico para ir até a linha indicada.", "Corrija primeiro errors; depois trate warnings."]
    };
  }

  const combined = `${input.compileStderr}\n${input.stderr}`;
  const location = extractLocation(combined);
  if (/AddressSanitizer:[^\n]*(heap-buffer-overflow|stack-buffer-overflow|global-buffer-overflow)/i.test(combined)) {
    return {
      headline: "AddressSanitizer encontrou acesso fora dos limites",
      summary: `${location ? `Próximo de ${location}. ` : ""}O programa leu ou escreveu além da região válida de um objeto.`,
      category: "memory",
      suggestions: ["Confira se todo índice está no intervalo 0..tamanho-1.", "Preserve o tamanho junto ao buffer e valide antes do acesso."]
    };
  }
  if (/AddressSanitizer:[^\n]*heap-use-after-free/i.test(combined)) {
    return {
      headline: "AddressSanitizer encontrou use-after-free",
      summary: `${location ? `Próximo de ${location}. ` : ""}Um endereço foi usado depois que a região correspondente deixou de estar alocada.`,
      category: "memory",
      suggestions: ["Defina claramente quem possui a alocação.", "Invalide ponteiros não proprietários após free e evite aliases duradouros."]
    };
  }
  if (/runtime error:/i.test(combined) || /undefined behavior/i.test(combined)) {
    const detail = combined.match(/runtime error:\s*(.+)/i)?.[1];
    return {
      headline: "UndefinedBehaviorSanitizer encontrou comportamento indefinido",
      summary: `${location ? `Próximo de ${location}. ` : ""}${detail ?? "A operação não possui semântica definida pela linguagem."}`,
      category: "undefined-behavior",
      suggestions: ["Corrija a causa mesmo que o programa pareça funcionar sem o sanitizer.", "Mantenha -fsanitize=undefined ativo durante o desenvolvimento."]
    };
  }
  if (input.runExitCode !== 0) {
    return {
      headline: `O programa terminou com exit code ${input.runExitCode ?? "desconhecido"}`,
      summary: "A compilação foi concluída, mas o processo não encerrou com sucesso. Verifique stderr e sinais reportados.",
      category: "runtime",
      suggestions: ["Localize a última operação concluída.", "Recompile com -g e sanitizers para obter mais evidências."]
    };
  }
  return {
    headline: "Compilação e execução concluídas",
    summary: "O processo terminou com exit code 0 dentro dos limites do sandbox.",
    category: "success",
    suggestions: ["Trate warnings antes de considerar o exercício concluído.", "Compare a saída com o comportamento esperado, não apenas com o exit code."]
  };
}
