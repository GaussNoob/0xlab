import type { ProgressSnapshot } from "@0xlab/contracts";
import { describe, expect, it } from "vitest";
import type { ProgressRepository } from "@/domain/progress/progress";
import { SaveProgress } from "./save-progress";

class InMemoryProgressRepository implements ProgressRepository {
  snapshot: ProgressSnapshot | null = null;
  async get(): Promise<ProgressSnapshot> {
    if (!this.snapshot) throw new Error("missing snapshot");
    return this.snapshot;
  }
  async save(_userId: string, snapshot: ProgressSnapshot): Promise<void> {
    this.snapshot = snapshot;
  }
}

describe("SaveProgress", () => {
  it("deduplicates completed ids before persisting", async () => {
    const repository = new InMemoryProgressRepository();
    const useCase = new SaveProgress(repository);
    const result = await useCase.execute("local", {
      completedLessonIds: ["pointers", "pointers"],
      completedExerciseIds: [],
      completedChallengeIds: [],
      studyMinutes: 36,
      lastLessonId: "pointers",
      updatedAt: new Date(0).toISOString()
    });
    expect(result.completedLessonIds).toEqual(["pointers"]);
    expect(repository.snapshot).toEqual(result);
  });

  it("rejects invalid study time", async () => {
    const useCase = new SaveProgress(new InMemoryProgressRepository());
    await expect(useCase.execute("local", {
      completedLessonIds: [], completedExerciseIds: [], completedChallengeIds: [],
      studyMinutes: -1, lastLessonId: null, updatedAt: new Date(0).toISOString()
    })).rejects.toThrow(/studyMinutes/);
  });
});

