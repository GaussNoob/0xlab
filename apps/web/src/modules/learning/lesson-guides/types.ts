export interface GuideCode {
  readonly language: string;
  readonly filename: string;
  readonly source: string;
  readonly explanation: string;
}

export interface GuideStep {
  readonly title: string;
  readonly detail: string;
}

export interface ModuleGuide {
  readonly thesis: string;
  readonly context: readonly [string, string];
  readonly flow: readonly string[];
  readonly topicNotes: Readonly<Record<string, string>>;
  readonly code: GuideCode;
  readonly mechanics: readonly GuideStep[];
  readonly invariants: readonly string[];
  readonly pitfalls: readonly GuideStep[];
  readonly practice: {
    readonly prompt: string;
    readonly tasks: readonly string[];
    readonly evidence: string;
  };
}

export type GuideMap = Readonly<Record<string, ModuleGuide>>;

export function guide(value: ModuleGuide): ModuleGuide {
  return value;
}
