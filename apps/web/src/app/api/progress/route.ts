import type { ProgressSnapshot } from "@0xlab/contracts";
import { NextResponse } from "next/server";
import { GetProgress } from "@/application/progress/get-progress";
import { SaveProgress } from "@/application/progress/save-progress";
import { SqliteProgressRepository } from "@/infrastructure/persistence/sqlite-progress-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const repository = new SqliteProgressRepository();
const getProgress = new GetProgress(repository);
const saveProgress = new SaveProgress(repository);

export async function GET() {
  return NextResponse.json(await getProgress.execute("local"));
}

export async function PUT(request: Request) {
  try {
    const body = await request.json() as ProgressSnapshot;
    return NextResponse.json(await saveProgress.execute("local", body));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid progress snapshot." }, { status: 400 });
  }
}

