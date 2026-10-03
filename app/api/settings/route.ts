import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/lib/stats";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const searchCountry = /^[a-z]{2}$/i.test(String(body.searchCountry || ""))
    ? String(body.searchCountry).toLowerCase()
    : "in";
  await prisma.settings.upsert({
    where: { id: "default" },
    create: { id: "default" },
    update: {
      searchQuery: String(body.searchQuery ?? ""),
      location: String(body.location ?? ""),
      remoteOk: Boolean(body.remoteOk),
      autoSearch: Boolean(body.autoSearch),
      searchIntervalHr: Number(body.searchIntervalHr) || 6,
      autoEmailApply: Boolean(body.autoEmailApply),
      minMatchScore: Number(body.minMatchScore) || 0,
    },
  });
  await prisma.$executeRawUnsafe(
    `UPDATE Settings SET searchCountry = ? WHERE id = 'default'`,
    searchCountry,
  );
  const settings = await getSettings();
  return NextResponse.json(settings);
}
