import type { ProgressSnapshot } from "@0xlab/contracts";
import type { ProgressRepository } from "@/domain/progress/progress";

export class SaveProgress {
  constructor(private readonly repository: ProgressRepository) {}

  async execute(userId: string, snapshot: ProgressSnapshot): Promise<ProgressSnapshot> {
    if (!userId.trim()) {
      throw new Error("userId is required");
    }
    if (snapshot.studyMinutes < 0 || !Number.isFinite(snapshot.studyMinutes)) {
      throw new Error("studyMinutes must be a positive finite number");
    }

    const normalized: ProgressSnapshot = {
      ...snapshot,
      completedLessonIds: [...new Set(snapshot.completedLessonIds)],
      completedExerciseIds: [...new Set(snapshot.completedExerciseIds)],
      completedChallengeIds: [...new Set(snapshot.completedChallengeIds)],
      updatedAt: new Date().toISOString()
    };

    await this.repository.save(userId, normalized);
    return normalized;
  }
}

