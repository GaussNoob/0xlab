import type { ProgressSnapshot } from "@0xlab/contracts";
import type { ProgressRepository } from "@/domain/progress/progress";

export class GetProgress {
  constructor(private readonly repository: ProgressRepository) {}

  execute(userId: string): Promise<ProgressSnapshot> {
    if (!userId.trim()) {
      throw new Error("userId is required");
    }

    return this.repository.get(userId);
  }
}

