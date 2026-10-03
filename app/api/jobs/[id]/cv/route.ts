import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const doc = await prisma.generatedDoc.findFirst({
    where: { jobId: id, type: "cv" },
  });
  if (!doc) {
    return NextResponse.json({ error: "CV not generated yet." }, { status: 404 });
  }
  const buf = await readFile(doc.filePath);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="cv-${id}.pdf"`,
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
