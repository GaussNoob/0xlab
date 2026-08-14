import { NextResponse } from "next/server";
import { getExecution, RunnerUnavailableError } from "@/infrastructure/execution/runner-client";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await context.params;
    return NextResponse.json(await getExecution(jobId));
  } catch (error) {
    const unavailable = error instanceof RunnerUnavailableError;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to read execution." },
      { status: unavailable ? 503 : 404 }
    );
  }
}

