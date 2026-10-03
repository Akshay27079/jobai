import { prisma } from "@/lib/prisma";
import { getDashboardStats } from "@/lib/stats";
import { emptyProfile, type ParsedProfile } from "@/lib/types";
import { llmLabel } from "@/lib/llm";
import { CvUpload, SearchButton } from "./actions";
import { AwliPrefillPanel } from "./awli-panel";
import { awliPrefillFromProfile } from "@/lib/awli-profile";
import Link from "next/link";

export const dynamic = "force-dynamic";

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[#243049] bg-[#121a2b] p-5">
      <div className="text-sm text-[#93a0bb]">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </div>
  );
}

export default async function DashboardPage() {
  const [stats, profileRow, recentJobs] = await Promise.all([
    getDashboardStats(),
    prisma.profile.findUnique({ where: { id: "default" } }),
    prisma.job.findMany({
      take: 8,
      orderBy: { foundAt: "desc" },
      include: { docs: true, application: true },
    }),
  ]);

  let parsed: ParsedProfile = emptyProfile();
  if (profileRow?.parsedJson) {
    try {
      parsed = { ...parsed, ...JSON.parse(profileRow.parsedJson) };
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-[#93a0bb]">
          Analyze a CV, find matching jobs, generate tailored documents, and track applications.
          Writing engine: {llmLabel()}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Jobs found" value={stats.jobsFound} />
        <Card label="CVs created" value={stats.cvsCreated} />
        <Card label="Cover letters" value={stats.coverLetters} />
        <Card label="Applications sent" value={stats.applied} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card label="Queued" value={stats.queued} />
        <Card label="Needs review" value={stats.needsReview} />
        <Card label="Failed" value={stats.failed} />
      </div>

      <section className="rounded-xl border border-[#243049] bg-[#121a2b] p-5">
        <h2 className="font-medium">CV check</h2>
        <p className="mt-1 text-sm text-[#93a0bb]">
          {profileRow?.fileName
            ? `Loaded ${profileRow.fileName} for ${parsed.name || "unknown candidate"}.`
            : "No CV uploaded yet."}
        </p>
        <div className="mt-4">
          <CvUpload />
        </div>
        {parsed.skills.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {parsed.skills.slice(0, 16).map((s) => (
              <span key={s} className="rounded-full border border-[#243049] px-3 py-1 text-xs">
                {s}
              </span>
            ))}
          </div>
        )}
        {parsed.experience.length > 0 && (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#93a0bb]">
            {parsed.experience.slice(0, 4).map((e) => (
              <li key={`${e.title}-${e.company}`}>
                {e.title}
                {e.company ? ` — ${e.company}` : ""}
              </li>
            ))}
          </ul>
        )}
        {parsed.summary && <p className="mt-4 max-w-3xl text-sm text-[#93a0bb]">{parsed.summary}</p>}
      </section>

      {profileRow?.rawText && (
        <section className="rounded-xl border border-[#243049] bg-[#121a2b] p-5">
          <h2 className="font-medium">Application prefill (AWLI-style)</h2>
          <div className="mt-4">
            <AwliPrefillPanel packet={awliPrefillFromProfile(parsed)} />
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Recent jobs</h2>
          <SearchButton />
        </div>
        <div className="overflow-hidden rounded-xl border border-[#243049]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#121a2b] text-[#93a0bb]">
              <tr>
                <th className="px-4 py-3">Match</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">CV</th>
                <th className="px-4 py-3">Apply</th>
              </tr>
            </thead>
            <tbody>
              {recentJobs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[#93a0bb]">
                    No jobs yet. Upload a CV, then find jobs.
                  </td>
                </tr>
              )}
              {recentJobs.map((job) => (
                <tr key={job.id} className="border-t border-[#243049]">
                  <td className="px-4 py-3">{job.matchScore}%</td>
                  <td className="px-4 py-3">
                    <Link href={`/jobs/${job.id}`} className="font-medium hover:text-[#5b8cff]">
                      {job.title}
                    </Link>
                    <div className="text-xs text-[#93a0bb]">
                      {job.company}
                      {job.location ? ` · ${job.location}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {job.docs.some((d) => d.type === "cv") ? "Created" : "—"}
                  </td>
                  <td className="px-4 py-3">{job.application?.status ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Link href="/jobs" className="inline-block text-sm text-[#5b8cff]">
          View all jobs
        </Link>
      </section>
    </div>
  );
}
