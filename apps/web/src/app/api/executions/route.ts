import type { CreateExecutionRequest } from "@0xlab/contracts";
import { NextResponse } from "next/server";
import { createExecution, RunnerUnavailableError } from "@/infrastructure/execution/runner-client";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const contentLength = Number.parseInt(request.headers.get("content-length") ?? "0", 10);
  if (contentLength > 320 * 1024) return NextResponse.json({ error: "Payload exceeds 320 KiB." }, { status: 413 });

  try {
    const body = await request.json() as CreateExecutionRequest;
    const response = await createExecution(body);
    return NextResponse.json(response, { status: 202 });
  } catch (error) {
    const unavailable = error instanceof RunnerUnavailableError;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create execution." },
      { status: unavailable ? 503 : 400 }
    );
  }
}

