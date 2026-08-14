export interface RunnerConfig {
  readonly port: number;
  readonly apiToken: string;
  readonly sandboxImage: string;
  readonly maxConcurrentJobs: number;
  readonly jobTimeoutMs: number;
  readonly jobsRoot: string;
  readonly jobsVolume: string | null;
}

function boundedInteger(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): RunnerConfig {
  return {
    port: boundedInteger(environment.PORT, 8787, 1, 65_535),
    apiToken: environment.RUNNER_API_TOKEN ?? "local-development-token",
    sandboxImage: environment.SANDBOX_IMAGE ?? "0xlab-sandbox:local",
    maxConcurrentJobs: boundedInteger(environment.MAX_CONCURRENT_JOBS, 2, 1, 8),
    jobTimeoutMs: boundedInteger(environment.JOB_TIMEOUT_MS, 15_000, 2_000, 30_000),
    jobsRoot: environment.SANDBOX_JOBS_ROOT ?? "",
    jobsVolume: environment.SANDBOX_JOBS_VOLUME ?? null
  };
}
