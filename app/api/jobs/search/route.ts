import { NextResponse } from "next/server";
import { searchAndStoreJobs } from "@/lib/job-search";

export const runtime = "nodejs";

export async function POST() {
  try {
    const result = await searchAndStoreJobs();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
