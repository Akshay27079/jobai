import { emptyProfile, type ParsedProfile } from "./types";

export type AwliPrefill = {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  employers: { title: string; company: string; dates: string }[];
  education: { school: string; degree: string; dates: string }[];
};

export function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function awliPrefillFromProfile(profile: ParsedProfile): AwliPrefill {
  const { firstName, lastName } = splitName(profile.name);
  return {
    firstName,
    lastName,
    fullName: profile.name,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    employers: profile.experience.map((e) => ({
      title: e.title,
      company: e.company,
      dates: e.dates,
    })),
    education: profile.education.map((e) => ({
      school: e.school,
      degree: e.degree,
      dates: e.dates,
    })),
  };
}

export function parseStoredProfile(json: string | null | undefined): ParsedProfile {
  const base = emptyProfile();
  if (!json) return base;
  try {
    return { ...base, ...(JSON.parse(json) as ParsedProfile) };
  } catch {
    return base;
  }
}

export function prefillPlainText(packet: AwliPrefill): string {
  const jobs = packet.employers
    .map((e) => `- ${e.title}${e.company ? ` at ${e.company}` : ""}${e.dates ? ` (${e.dates})` : ""}`)
    .join("\n");
  const edu = packet.education
    .map((e) => `- ${e.degree}${e.school ? `, ${e.school}` : ""}${e.dates ? ` (${e.dates})` : ""}`)
    .join("\n");
  return [
    `Name: ${packet.fullName}`,
    `Email: ${packet.email}`,
    `Phone: ${packet.phone}`,
    `Location: ${packet.location}`,
    "",
    "Employers:",
    jobs || "- (none parsed)",
    "",
    "Education:",
    edu || "- (none parsed)",
  ].join("\n");
}

export function isLinkedInApplyUrl(url: string): boolean {
  return /linkedin\.com/i.test(url);
}
