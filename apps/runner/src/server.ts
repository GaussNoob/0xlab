import { timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { InMemoryJobQueue } from "./application/job-queue.js";
import { loadConfig } from "./config.js";
import { InvalidExecutionRequest, validateExecutionRequest } from "./domain/validation.js";
import { DockerSandbox } from "./infrastructure/docker-sandbox.js";

const config = loadConfig();
const queue = new InMemoryJobQueue(
  new DockerSandbox(config.sandboxImage, config.jobTimeoutMs, config.jobsRoot, config.jobsVolume),
  config.maxConcurrentJobs
);
const MAX_REQUEST_BYTES = 320 * 1024;

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  });
  response.end(JSON.stringify(body));
}

function isAuthorized(request: IncomingMessage): boolean {
  const provided = request.headers.authorization?.replace(/^Bearer\s+/i, "") ?? "";
  const expected = config.apiToken;
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  let received = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    received += buffer.length;
    if (received > MAX_REQUEST_BYTES) throw new InvalidExecutionRequest("Request exceeds 320 KiB.");
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new InvalidExecutionRequest("Request body is not valid JSON.");
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  try {
    if (request.method === "GET" && url.pathname === "/health") {
      return json(response, 200, { status: "ok", queue: queue.getStats(), sandboxImage: config.sandboxImage });
    }
    if (!isAuthorized(request)) return json(response, 401, { error: "Unauthorized" });

    if (request.method === "POST" && url.pathname === "/v1/executions") {
      const executionRequest = validateExecutionRequest(await readJson(request));
      const job = queue.enqueue(executionRequest);
      return json(response, 202, { jobId: job.id, status: job.status });
    }

    const jobMatch = url.pathname.match(/^\/v1\/executions\/(?<id>[0-9a-f-]{36})$/i);
    if (request.method === "GET" && jobMatch?.groups?.id) {
      const job = queue.get(jobMatch.groups.id);
      return job ? json(response, 200, job) : json(response, 404, { error: "Execution not found" });
    }

    return json(response, 404, { error: "Not found" });
  } catch (error) {
    if (error instanceof InvalidExecutionRequest) return json(response, 400, { error: error.message });
    console.error(JSON.stringify({ level: "error", message: "request_failed", error: error instanceof Error ? error.message : String(error) }));
    return json(response, 500, { error: "Internal runner error" });
  }
});

server.listen(config.port, "0.0.0.0", () => {
  console.log(JSON.stringify({ level: "info", message: "runner_started", port: config.port, concurrency: config.maxConcurrentJobs }));
});

function shutdown(signal: string) {
  console.log(JSON.stringify({ level: "info", message: "runner_stopping", signal }));
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
