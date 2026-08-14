import type { CreateExecutionRequest, ExecutionJob, ExecutionResult } from "@0xlab/contracts";
import { randomUUID } from "node:crypto";

export interface ExecutionSandbox {
  execute(jobId: string, request: CreateExecutionRequest): Promise<ExecutionResult>;
}

interface QueuedWork {
  readonly id: string;
  readonly request: CreateExecutionRequest;
}

export class InMemoryJobQueue {
  private readonly jobs = new Map<string, ExecutionJob>();
  private readonly pending: QueuedWork[] = [];
  private activeCount = 0;

  constructor(
    private readonly sandbox: ExecutionSandbox,
    private readonly maxConcurrency: number,
    private readonly maxStoredJobs = 200
  ) {}

  enqueue(request: CreateExecutionRequest): ExecutionJob {
    const id = randomUUID();
    const job: ExecutionJob = { id, status: "queued", createdAt: new Date().toISOString() };
    this.jobs.set(id, job);
    this.pending.push({ id, request });
    this.prune();
    this.drain();
    return job;
  }

  get(id: string): ExecutionJob | undefined {
    return this.jobs.get(id);
  }

  getStats() {
    return { active: this.activeCount, queued: this.pending.length, stored: this.jobs.size };
  }

  private drain(): void {
    while (this.activeCount < this.maxConcurrency) {
      const work = this.pending.shift();
      if (!work) return;
      this.activeCount += 1;
      void this.run(work).finally(() => {
        this.activeCount -= 1;
        this.drain();
      });
    }
  }

  private async run(work: QueuedWork): Promise<void> {
    const current = this.jobs.get(work.id);
    if (!current) return;
    this.jobs.set(work.id, { ...current, status: "compiling", startedAt: new Date().toISOString() });
    try {
      const result = await this.sandbox.execute(work.id, work.request);
      const started = this.jobs.get(work.id);
      this.jobs.set(work.id, {
        id: work.id,
        createdAt: started?.createdAt ?? current.createdAt,
        ...(started?.startedAt === undefined ? {} : { startedAt: started.startedAt }),
        status: result.compileExitCode === 0 ? "completed" : "failed",
        finishedAt: new Date().toISOString(),
        result
      });
    } catch (error) {
      const started = this.jobs.get(work.id);
      this.jobs.set(work.id, {
        id: work.id,
        createdAt: started?.createdAt ?? current.createdAt,
        ...(started?.startedAt === undefined ? {} : { startedAt: started.startedAt }),
        status: "failed",
        finishedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Sandbox execution failed."
      });
    }
  }

  private prune(): void {
    if (this.jobs.size <= this.maxStoredJobs) return;
    const completed = [...this.jobs.values()]
      .filter((job) => job.status === "completed" || job.status === "failed")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (const job of completed.slice(0, this.jobs.size - this.maxStoredJobs)) this.jobs.delete(job.id);
  }
}

