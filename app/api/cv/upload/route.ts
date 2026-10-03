import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { analyzeCv, extractPdfText } from "@/lib/parse-cv";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a PDF CV." }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Upload a PDF file." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rawText = await extractPdfText(buffer);
    const parsed = await analyzeCv(rawText);

    const uploadDir = path.join(process.cwd(), "data", "uploads");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, "cv.pdf"), buffer);

    const profile = await prisma.profile.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        rawText,
        parsedJson: JSON.stringify(parsed),
        fileName: file.name,
      },
      update: {
        rawText,
        parsedJson: JSON.stringify(parsed),
        fileName: file.name,
      },
    });

    return NextResponse.json({ profile: { ...profile, parsed } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
