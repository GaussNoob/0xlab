import type { ProgressSnapshot } from "@0xlab/contracts";

export interface ProgressRepository {
  get(userId: string): Promise<ProgressSnapshot>;
  save(userId: string, snapshot: ProgressSnapshot): Promise<void>;
}

export const EMPTY_PROGRESS: ProgressSnapshot = {
  completedLessonIds: [],
  completedExerciseIds: [],
  completedChallengeIds: [],
  studyMinutes: 0,
  lastLessonId: null,
  updatedAt: new Date(0).toISOString()
};

