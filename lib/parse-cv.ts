import { extractText } from "unpdf";
import { chatJson, llmConfigured } from "./llm";
import { emptyProfile, type EducationItem, type ExperienceItem, type ParsedProfile } from "./types";

const HEADING =
  /^(summary|profile|objective|about me|skills?|technical skills|core competencies|expertise|experience|work experience|professional experience|employment|work history|education|academic background|projects|certifications|awards)\s*:?$/i;

export function normalizeResumeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(
      /\b(PROFESSIONAL SUMMARY|CAREER OBJECTIVE|WORK EXPERIENCE|PROFESSIONAL EXPERIENCE|TECHNICAL SKILLS|CORE COMPETENCIES|EDUCATION|EXPERIENCE|SUMMARY|OBJECTIVE|SKILLS|PROJECTS|CERTIFICATIONS)\b/gi,
      "\n$1\n",
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
  return normalizeResumeText(String(text || ""));
}

function sectionAfter(lines: string[], names: RegExp): string[] {
  const start = lines.findIndex((l) => names.test(l));
  if (start < 0) return [];
  const body: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (HEADING.test(lines[i])) break;
    body.push(lines[i]);
  }
  return body;
}

function isBullet(line: string): boolean {
  return /^[-•●▪◦*]\s+/.test(line) || /^\d+[.)]\s+/.test(line);
}

function looksLikeJobHeader(line: string): boolean {
  if (isBullet(line)) return false;
  if (line.length > 120) return false;
  return (
    /\b((19|20)\d{2})\b/.test(line) ||
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|present|current)\b/i.test(line) ||
    /\s+[|–—-]\s+/.test(line) ||
    /\bat\b/i.test(line)
  );
}

function parseJobHeader(line: string): ExperienceItem {
  const dates = (line.match(/((?:19|20)\d{2}\s*[-–—to]+\s*(?:(?:19|20)\d{2}|present|current)|(?:19|20)\d{2})/i) ||
    [])[1] || "";
  const cleaned = line.replace(/\s*\([^)]*\)\s*$/, "").replace(dates, "").trim();
  const parts = cleaned.split(/\s+(?:[|–—-]|at)\s+/i).map((p) => p.trim()).filter(Boolean);
  return {
    title: parts[0] || cleaned || line,
    company: parts[1] || "",
    dates,
    bullets: [],
  };
}

export function heuristicParse(rawText: string): ParsedProfile {
  const profile = emptyProfile();
  const lines = normalizeResumeText(rawText)
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  profile.name = lines[0]?.slice(0, 80) || "Candidate";
  const emailMatch = rawText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phoneMatch = rawText.match(/(\+?\d[\d\s().-]{7,}\d)/);
  profile.email = emailMatch?.[0] || "";
  profile.phone = phoneMatch?.[0]?.trim() || "";

  const locLine = lines.slice(0, 6).find((l) =>
    /\b(remote|india|usa|uk|london|new york|bangalore|bengaluru|mumbai|hyderabad|pune|delhi|california|texas|canada)\b/i.test(
      l,
    ),
  );
  if (locLine && !locLine.includes("@") && locLine.length < 80) profile.location = locLine;

  const skillBody = sectionAfter(lines, /^(skills?|technical skills|core competencies|expertise)\s*:?$/i);
  const skillSrc = skillBody.join(" ") || "";
  profile.skills = skillSrc
    .split(/[,•·|;/]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length < 40 && !HEADING.test(s))
    .slice(0, 30);

  const expLines = sectionAfter(
    lines,
    /^(experience|work experience|professional experience|employment|work history)\s*:?$/i,
  );
  const experience: ExperienceItem[] = [];
  let current: ExperienceItem | null = null;
  for (const line of expLines) {
    if (isBullet(line)) {
      if (!current) {
        current = { title: "Experience", company: "", dates: "", bullets: [] };
      }
      current.bullets.push(line.replace(/^[-•●▪◦*\d.)\s]+/, "").trim());
      continue;
    }
    if (looksLikeJobHeader(line)) {
      if (current) experience.push(current);
      current = parseJobHeader(line);
      continue;
    }
    if (current && line.length > 20) {
      current.bullets.push(line);
    } else if (!current) {
      current = { title: line, company: "", dates: "", bullets: [] };
    }
  }
  if (current) experience.push(current);
  profile.experience = experience.slice(0, 10);

  const eduLines = sectionAfter(lines, /^(education|academic background)\s*:?$/i);
  profile.education = eduLines.slice(0, 6).map((line): EducationItem => {
    const dates = (line.match(/((?:19|20)\d{2}.*)$/) || [])[1] || "";
    return { school: line, degree: line.replace(dates, "").trim() || line, dates };
  });

  profile.titles = [
    ...new Set(
      profile.experience
        .map((e) => e.title)
        .filter((t) => t.length > 2 && t.length < 60 && t !== "Experience")
        .slice(0, 5),
    ),
  ];

  const summaryLines = sectionAfter(lines, /^(summary|profile|objective|about me|professional summary)\s*:?$/i);
  profile.summary = (summaryLines.join(" ") || "").slice(0, 800);
  return profile;
}

export function mergeProfile(rawText: string, stored?: Partial<ParsedProfile> | null): ParsedProfile {
  const local = heuristicParse(rawText);
  if (!stored) return local;
  return {
    name: stored.name || local.name,
    email: stored.email || local.email,
    phone: stored.phone || local.phone,
    location: stored.location || local.location,
    summary: stored.summary || local.summary,
    titles: stored.titles?.length ? stored.titles : local.titles,
    skills: stored.skills?.length ? stored.skills : local.skills,
    experience: stored.experience?.length ? stored.experience : local.experience,
    education: stored.education?.length ? stored.education : local.education,
  };
}

export async function analyzeCv(rawText: string): Promise<ParsedProfile> {
  if (!rawText.trim()) {
    throw new Error("Could not extract text from the PDF.");
  }

  const local = heuristicParse(rawText);
  if (!llmConfigured()) {
    return local;
  }

  try {
    const parsed = await chatJson<ParsedProfile>(
      `You extract structured resume data. Copy facts only from the resume. Return JSON with keys:
name, email, phone, location, summary, titles (string[] of job titles on the resume),
skills (string[]), experience (array of {title, company, dates, bullets: string[]}),
education (array of {school, degree, dates}). Do not invent employers, dates, or skills.`,
      rawText.slice(0, 18000),
    );
    return mergeProfile(rawText, parsed);
  } catch {
    return local;
  }
}
