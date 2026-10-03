import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ParsedProfile } from "./types";

function pdfSafe(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/[•●▪◦]/g, "-")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .normalize("NFKD")
    .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, "")
    .trim();
}

function wrap(text: string, max = 92): string[] {
  const words = pdfSafe(text).replace(/\s+/g, " ").split(" ").filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > max) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

export async function buildCvPdf(opts: {
  profile: ParsedProfile;
  rawText: string;
  targetTitle: string;
  company: string;
  emphasizedSkills: string[];
}): Promise<Buffer> {
  const { profile, rawText, targetTitle, company, emphasizedSkills } = opts;
  const doc = await PDFDocument.create();
  let page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let y = 800;
  const ink = rgb(0.08, 0.1, 0.14);

  const draw = (text: string, size: number, useBold = false) => {
    const f = useBold ? bold : font;
    for (const line of wrap(text, useBold && size >= 16 ? 48 : 95)) {
      if (y < 48) {
        page = doc.addPage([595, 842]);
        y = 800;
      }
      page.drawText(line, { x: 48, y, size, font: f, color: ink });
      y -= size + 6;
    }
  };

  draw(profile.name || "Candidate", 18, true);
  draw([profile.email, profile.phone, profile.location].filter(Boolean).join("  ·  "), 9);
  if (targetTitle) {
    y -= 4;
    draw(`Target role: ${targetTitle}${company ? `  |  ${company}` : ""}`, 9);
  }
  y -= 8;

  const summary = profile.summary;
  if (summary) {
    draw("Summary", 12, true);
    draw(summary, 10);
  }

  const skills = [
    ...emphasizedSkills.filter((s) => profile.skills.some((p) => p.toLowerCase() === s.toLowerCase())),
    ...profile.skills.filter((s) => !emphasizedSkills.some((e) => e.toLowerCase() === s.toLowerCase())),
  ];
  if (skills.length) {
    y -= 6;
    draw("Skills", 12, true);
    draw(skills.join(" · "), 10);
  }

  if (profile.experience.length) {
    y -= 6;
    draw("Experience", 12, true);
    for (const exp of profile.experience) {
      draw(
        `${exp.title}${exp.company ? ` - ${exp.company}` : ""}${exp.dates ? `  (${exp.dates})` : ""}`,
        10,
        true,
      );
      for (const b of exp.bullets) draw(`- ${b}`, 10);
      y -= 4;
    }
  }

  if (profile.education.length) {
    y -= 4;
    draw("Education", 12, true);
    for (const ed of profile.education) {
      const label = [ed.degree, ed.school].filter(Boolean).join(", ");
      draw(`${label}${ed.dates ? ` (${ed.dates})` : ""}`, 10);
    }
  }

  const structuredThin = !profile.experience.length && !profile.education.length;
  if (structuredThin && rawText.trim()) {
    y -= 8;
    draw("Resume", 12, true);
    const body = rawText
      .split(/\n+/)
      .map((l) => l.trim())
      .filter((l) => l && l !== profile.name)
      .slice(0, 80);
    for (const line of body) draw(line, 10);
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
