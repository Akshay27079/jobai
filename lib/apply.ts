import { readFile } from "fs/promises";
import nodemailer from "nodemailer";
import { prisma } from "./prisma";
import { generateDocsForJob } from "./generate-docs";
import { emptyProfile, type ParsedProfile } from "./types";

function smtpReady() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

export async function applyToJob(jobId: string, force = false) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { docs: true, application: true },
  });
  if (!job) throw new Error("Job not found.");

  const settings = await prisma.settings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });

  if (!job.docs.some((d) => d.type === "cv")) {
    await generateDocsForJob(jobId);
  }

  const refreshed = await prisma.job.findUnique({
    where: { id: jobId },
    include: { docs: true },
  });
  if (!refreshed) throw new Error("Job not found.");

  const method = refreshed.contactEmail ? "email" : "link";

  if (method === "link") {
    const application = await prisma.application.upsert({
      where: { jobId },
      create: { jobId, status: "needs_review", method: "link" },
      update: { status: "needs_review", method: "link", error: null },
    });
    return {
      application,
      message:
        "Career-site / LinkedIn apply: review the prefill packet, then submit on the company page (Apply with LinkedIn if they show it).",
    };
  }

  if (!settings.autoEmailApply && !force) {
    const application = await prisma.application.upsert({
      where: { jobId },
      create: { jobId, status: "queued", method: "email" },
      update: { status: "queued", method: "email", error: null },
    });
    return { application, message: "Queued. Enable auto-email apply in Settings, or send now." };
  }

  if (!smtpReady()) {
    const application = await prisma.application.upsert({
      where: { jobId },
      create: {
        jobId,
        status: "queued",
        method: "email",
        error: "SMTP is not configured. Application stays queued.",
      },
      update: {
        status: "queued",
        method: "email",
        error: "SMTP is not configured. Application stays queued.",
      },
    });
    return { application, message: "Queued. Configure SMTP in .env to send email." };
  }

  const profileRow = await prisma.profile.findUnique({ where: { id: "default" } });
  let profile: ParsedProfile = emptyProfile();
  try {
    if (profileRow?.parsedJson) profile = { ...profile, ...JSON.parse(profileRow.parsedJson) };
  } catch {
    /* ignore */
  }

  const cv = refreshed.docs.find((d) => d.type === "cv");
  const letter = refreshed.docs.find((d) => d.type === "cover_letter");
  const attachments: { filename: string; content: Buffer }[] = [];
  if (cv) {
    attachments.push({ filename: "CV.pdf", content: await readFile(cv.filePath) });
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: refreshed.contactEmail!,
      subject: `Application: ${refreshed.title} — ${profile.name || "Candidate"}`,
      text:
        letter?.content ||
        `Please find my CV attached for the ${refreshed.title} role.\n\n${profile.name || ""}`,
      attachments,
    });
    const application = await prisma.application.upsert({
      where: { jobId },
      create: {
        jobId,
        status: "sent",
        method: "email",
        sentAt: new Date(),
      },
      update: {
        status: "sent",
        method: "email",
        sentAt: new Date(),
        error: null,
      },
    });
    return { application, message: `Sent to ${refreshed.contactEmail}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Send failed";
    const application = await prisma.application.upsert({
      where: { jobId },
      create: { jobId, status: "failed", method: "email", error: message },
      update: { status: "failed", method: "email", error: message },
    });
    return { application, message };
  }
}

export async function processApplyQueue() {
  const settings = await prisma.settings.findUnique({ where: { id: "default" } });
  if (!settings?.autoEmailApply) return { processed: 0 };

  const queued = await prisma.application.findMany({
    where: { status: "queued", method: "email" },
    take: 10,
  });
  let processed = 0;
  for (const item of queued) {
    await applyToJob(item.jobId, true);
    processed += 1;
  }
  return { processed };
}
