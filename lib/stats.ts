import { prisma } from "./prisma";

export async function getSettings() {
  const settings = await prisma.settings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
  const extra = await prisma.$queryRawUnsafe<Array<{ searchCountry: string | null }>>(
    `SELECT searchCountry FROM Settings WHERE id = 'default'`,
  );
  return {
    ...settings,
    searchCountry: extra[0]?.searchCountry || "in",
  };
}

export async function getDashboardStats() {
  const [jobsFound, cvsCreated, coverLetters, applications] = await Promise.all([
    prisma.job.count(),
    prisma.generatedDoc.count({ where: { type: "cv" } }),
    prisma.generatedDoc.count({ where: { type: "cover_letter" } }),
    prisma.application.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
  ]);

  const byStatus = Object.fromEntries(applications.map((a) => [a.status, a._count.status]));
  return {
    jobsFound,
    cvsCreated,
    coverLetters,
    applied: byStatus.sent ?? 0,
    queued: byStatus.queued ?? 0,
    needsReview: byStatus.needs_review ?? 0,
    failed: byStatus.failed ?? 0,
  };
}
