import { prisma } from "./prisma";
import { extractJobEmail } from "./email-from-job";
import { getSettings } from "./stats";
import type { ParsedProfile } from "./types";

type AdzunaHit = {
  id: number | string;
  title?: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  redirect_url?: string;
  description?: string;
};

function scoreJob(job: { title: string; description: string }, profile: ParsedProfile): number {
  const hay = `${job.title}\n${job.description}`.toLowerCase();
  const skills = profile.skills.filter(Boolean);
  const titles = profile.titles.filter(Boolean);
  let hits = 0;
  for (const skill of skills) {
    if (hay.includes(skill.toLowerCase())) hits += 1;
  }
  for (const title of titles) {
    if (hay.includes(title.toLowerCase())) hits += 3;
  }
  const denom = Math.max(skills.length + titles.length * 2, 1);
  return Math.min(100, Math.round((hits / denom) * 100));
}

function mockJobs(query: string, location: string): AdzunaHit[] {
  const q = query || "Software Engineer";
  const loc = location || "Remote";
  return [
    {
      id: "mock-1",
      title: `${q}`,
      company: { display_name: "Northstar Labs" },
      location: { display_name: loc },
      redirect_url: "https://example.com/jobs/northstar-engineer",
      description: `We are hiring a ${q}. Skills: TypeScript, React, APIs, problem solving. Apply via careers page.`,
    },
    {
      id: "mock-2",
      title: `Senior ${q}`,
      company: { display_name: "Harbor Analytics" },
      location: { display_name: loc },
      redirect_url: "mailto:jobs@harbor-analytics.example",
      description: `Senior ${q} role. Please include a cover letter. Email jobs@harbor-analytics.example with your CV. Skills: Python, SQL, communication.`,
    },
    {
      id: "mock-3",
      title: `${q} — Product`,
      company: { display_name: "Cedar Health" },
      location: { display_name: loc },
      redirect_url: "https://example.com/jobs/cedar-product",
      description: `${q} working with clinicians. Cover letter required. Skills: stakeholder management, data, healthcare.`,
    },
  ];
}

function adzunaCountry(fromSettings?: string): string {
  const raw = (fromSettings || process.env.ADZUNA_COUNTRY || "in").trim().toLowerCase();
  return /^[a-z]{2}$/.test(raw) ? raw : "in";
}

const INDIA_PLACE =
  /\b(india|bangalore|bengaluru|mumbai|delhi|ncr|noida|gurgaon|gurugram|hyderabad|pune|chennai|kolkata|ahmedabad|jaipur|kochi|cochin|chandigarh|indore|nagpur|lucknow|remote)\b/i;

function locationForCountry(country: string, location: string): string {
  const where = location.trim();
  if (!where) return "";
  if (/^remote$/i.test(where)) return "";
  if (country === "in" && !INDIA_PLACE.test(where)) return "";
  return where.slice(0, 80);
}

async function fetchAdzunaPage(query: string, location: string, country: string): Promise<AdzunaHit[]> {
  const appId = process.env.ADZUNA_APP_ID!;
  const appKey = process.env.ADZUNA_APP_KEY!;
  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: "50",
    what: query.slice(0, 80),
    "content-type": "application/json",
  });
  const where = locationForCountry(country, location);
  if (where) params.set("where", where);
  const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params.toString()}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await res.text();
  if (!res.ok) {
    const brief = text.startsWith("<") ? "invalid search parameters" : text.slice(0, 240);
    throw new Error(`Adzuna search failed (${res.status}): ${brief}`);
  }
  const data = JSON.parse(text) as { results?: AdzunaHit[] };
  return data.results || [];
}

async function fetchAdzuna(query: string, location: string, country: string): Promise<AdzunaHit[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    return mockJobs(query, location || "India");
  }

  try {
    return await fetchAdzunaPage(query, location, country);
  } catch (first) {
    if (location.trim()) {
      try {
        return await fetchAdzunaPage(query, "", country);
      } catch {
        /* fall through */
      }
    }
    throw first;
  }
}

export async function searchAndStoreJobs(): Promise<{ created: number; scanned: number; source: string }> {
  const profileRow = await prisma.profile.findUnique({ where: { id: "default" } });
  const settings = await getSettings();

  let parsed: ParsedProfile = {
    name: "",
    email: "",
    phone: "",
    location: "",
    summary: "",
    titles: [],
    skills: [],
    experience: [],
    education: [],
  };
  if (profileRow?.parsedJson) {
    try {
      parsed = { ...parsed, ...(JSON.parse(profileRow.parsedJson) as ParsedProfile) };
    } catch {
      /* ignore */
    }
  }

  const query =
    settings.searchQuery.trim() ||
    parsed.titles[0] ||
    parsed.skills.slice(0, 3).join(" ") ||
    "software engineer";
  const country = adzunaCountry(settings.searchCountry);
  const location = settings.location.trim() || (country === "in" ? "" : parsed.location) || "";

  const hits = await fetchAdzuna(query, location, country);
  const source = process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY ? `adzuna-${country}` : "mock";
  let created = 0;

  for (const hit of hits) {
    const title = (hit.title || "Untitled").trim();
    const company = (hit.company?.display_name || "Unknown").trim();
    const loc = (hit.location?.display_name || "").trim();
    const url = hit.redirect_url || "";
    const description = hit.description || "";
    const externalId = `${source}:${hit.id}`;
    const matchScore = scoreJob({ title, description }, parsed);
    if (matchScore < settings.minMatchScore && source !== "mock") {
      continue;
    }
    const contactEmail = extractJobEmail(description, url);
    const existing = await prisma.job.findUnique({ where: { externalId } });
    if (existing) {
      await prisma.job.update({
        where: { id: existing.id },
        data: { matchScore, contactEmail, description, title, company, location: loc, url },
      });
      continue;
    }
    await prisma.job.create({
      data: {
        externalId,
        title,
        company,
        location: loc,
        url,
        description,
        source,
        contactEmail,
        matchScore: source === "mock" ? Math.max(matchScore, 62) : matchScore,
      },
    });
    created += 1;
  }

  return { created, scanned: hits.length, source };
}
