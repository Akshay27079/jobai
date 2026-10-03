import { NextResponse } from "next/server";
import { generateDocsForJob } from "@/lib/generate-docs";

export const runtime = "nodejs";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const result = await generateDocsForJob(id);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generate failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
