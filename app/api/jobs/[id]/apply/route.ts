import { NextRequest, NextResponse } from "next/server";
import { applyToJob } from "@/lib/apply";

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { force?: boolean };
  try {
    const result = await applyToJob(id, Boolean(body.force));
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Apply failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
