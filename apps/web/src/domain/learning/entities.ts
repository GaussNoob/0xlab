export type LessonStatus = "completed" | "current" | "available" | "locked";
export type TrackTone = "cyan" | "amber" | "violet" | "green";

export interface Lesson {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly durationMinutes: number;
  readonly status: LessonStatus;
  readonly href?: string;
}

export interface LearningModule {
  readonly id: string;
  readonly index: string;
  readonly title: string;
  readonly description: string;
  readonly progress: number;
  readonly lessons: readonly Lesson[];
}

export interface Track {
  readonly id: string;
  readonly title: string;
  readonly shortTitle: string;
  readonly description: string;
  readonly tone: TrackTone;
  readonly progress: number;
  readonly moduleCount: number;
}

export interface ProjectDefinition {
  readonly id: string;
  readonly title: string;
  readonly level: "Fundamental" | "Intermediário" | "Avançado";
  readonly description: string;
  readonly skills: readonly string[];
  readonly estimatedHours: number;
  readonly platform: "Cross-platform" | "Linux" | "Windows";
}

