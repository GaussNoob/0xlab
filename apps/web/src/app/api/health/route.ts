import { NextResponse } from "next/server";
import { getRunnerHealth } from "@/infrastructure/execution/runner-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ web: "online", runner: await getRunnerHealth() });
}

