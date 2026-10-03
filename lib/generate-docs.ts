import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "./prisma";
import { chatJson, llmConfigured } from "./llm";
import { buildCvPdf } from "./cv-pdf";
import { coverLetterRequired } from "./email-from-job";
import { mergeProfile } from "./parse-cv";
import { emptyProfile, type ParsedProfile } from "./types";

const GEN_DIR = path.join(process.cwd(), "data", "generated");

function overlapSkills(profile: ParsedProfile, jobText: string): string[] {
  const hay = jobText.toLowerCase();
  return profile.skills.filter((s) => hay.includes(s.toLowerCase())).slice(0, 10);
}

function coverLetterFromProfile(
  profile: ParsedProfile,
  jobTitle: string,
  company: string,
  skills: string[],
): string {
  const skillList = skills.join(", ") || profile.skills.slice(0, 6).join(", ") || "the experience on my CV";
  const firstExp = profile.experience[0];
  return [
    `Dear ${company} hiring team,`,
    "",
    `Please find my CV for the ${jobTitle} role. It is based on my uploaded profile${profile.name ? ` (${profile.name})` : ""}.`,
    firstExp
      ? `My recent role is ${firstExp.title}${firstExp.company ? ` at ${firstExp.company}` : ""}.`
      : "",
    `Relevant strengths from my CV: ${skillList}.`,
    "I have not added employers or qualifications that are not on the original resume.",
    "",
    "Sincerely,",
    profile.name || "Applicant",
  ]
    .filter((line, i, arr) => line !== "" || (i > 0 && arr[i - 1] !== ""))
    .join("\n");
}

export async function generateDocsForJob(jobId: string) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new Error("Job not found.");

  const profileRow = await prisma.profile.findUnique({ where: { id: "default" } });
  if (!profileRow?.rawText) {
    throw new Error("Upload a CV first.");
  }

  let stored: ParsedProfile | null = null;
  try {
    stored = JSON.parse(profileRow.parsedJson) as ParsedProfile;
  } catch {
    stored = null;
  }
  const profile = mergeProfile(profileRow.rawText, stored || emptyProfile());

  const needLetter = coverLetterRequired(job.description);
  const emphasized = overlapSkills(profile, `${job.title} ${job.description}`);
  let letter = coverLetterFromProfile(profile, job.title, job.company, emphasized);

  if (llmConfigured()) {
    try {
      const written = await chatJson<{ coverLetter: string }>(
        `Write a cover letter using ONLY facts from the resume JSON. Do not invent employers, degrees, or skills.
Return JSON: {coverLetter: string} (180-280 words, no markdown).`,
        JSON.stringify({
          profile,
          job: { title: job.title, company: job.company, description: job.description.slice(0, 4000), needLetter },
        }),
      );
      if (written.coverLetter?.trim()) letter = written.coverLetter.trim();
    } catch {
      /* keep letter from profile */
    }
  }

  await mkdir(GEN_DIR, { recursive: true });
  const pdf = await buildCvPdf({
    profile,
    rawText: profileRow.rawText,
    targetTitle: job.title,
    company: job.company,
    emphasizedSkills: emphasized,
  });

  const cvPath = path.join(GEN_DIR, `${job.id}-cv.pdf`);
  await writeFile(cvPath, pdf);

  await prisma.generatedDoc.deleteMany({ where: { jobId: job.id } });
  await prisma.generatedDoc.create({
    data: {
      jobId: job.id,
      type: "cv",
      filePath: cvPath,
      content: profile.summary || profile.name || "CV from uploaded profile",
    },
  });

  const letterPath = path.join(GEN_DIR, `${job.id}-cover-letter.txt`);
  await writeFile(letterPath, letter, "utf8");
  await prisma.generatedDoc.create({
    data: {
      jobId: job.id,
      type: "cover_letter",
      filePath: letterPath,
      content: letter,
    },
  });

  return { cvPath, letterPath, needLetter };
}
