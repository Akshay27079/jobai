import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { JobActions, SearchButton } from "../actions";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const jobs = await prisma.job.findMany({
    orderBy: [{ matchScore: "desc" }, { foundAt: "desc" }],
    include: { docs: true, application: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Jobs</h1>
          <p className="mt-1 text-sm text-[#93a0bb]">{jobs.length} listings stored</p>
        </div>
        <SearchButton />
      </div>
      <div className="overflow-hidden rounded-xl border border-[#243049]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#121a2b] text-[#93a0bb]">
            <tr>
              <th className="px-4 py-3">Match</th>
              <th className="px-4 py-3">Job</th>
              <th className="px-4 py-3">Docs</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[#93a0bb]">
                  No jobs found yet.
                </td>
              </tr>
            )}
            {jobs.map((job) => {
              const hasCv = job.docs.some((d) => d.type === "cv");
              const hasLetter = job.docs.some((d) => d.type === "cover_letter");
              return (
                <tr key={job.id} className="border-t border-[#243049] align-top">
                  <td className="px-4 py-3">{job.matchScore}%</td>
                  <td className="px-4 py-3">
                    <Link href={`/jobs/${job.id}`} className="font-medium hover:text-[#5b8cff]">
                      {job.title}
                    </Link>
                    <div className="text-xs text-[#93a0bb]">
                      {job.company}
                      {job.location ? ` · ${job.location}` : ""}
                      {job.contactEmail ? ` · ${job.contactEmail}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    CV {hasCv ? "yes" : "no"}
                    <br />
                    Letter {hasLetter ? "yes" : "no"}
                  </td>
                  <td className="px-4 py-3">{job.application?.status ?? "—"}</td>
                  <td className="px-4 py-3">
                    <JobActions jobId={job.id} applyUrl={job.url} hasCv={hasCv} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
