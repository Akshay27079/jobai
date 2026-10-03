import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { JobActions } from "../../actions";
import { AwliPrefillPanel } from "../../awli-panel";
import { awliPrefillFromProfile, parseStoredProfile } from "@/lib/awli-profile";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: { docs: true, application: true },
  });
  if (!job) notFound();

  const cv = job.docs.find((d) => d.type === "cv");
  const letter = job.docs.find((d) => d.type === "cover_letter");
  const profileRow = await prisma.profile.findUnique({ where: { id: "default" } });
  const packet = awliPrefillFromProfile(parseStoredProfile(profileRow?.parsedJson));

  return (
    <div className="space-y-6">
      <Link href="/jobs" className="text-sm text-[#5b8cff]">
        ← Jobs
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">{job.title}</h1>
        <p className="mt-1 text-[#93a0bb]">
          {job.company}
          {job.location ? ` · ${job.location}` : ""} · match {job.matchScore}% · {job.source}
        </p>
      </div>
      <JobActions jobId={job.id} applyUrl={job.url} hasCv={Boolean(cv)} />
      {job.application && (
        <p className="text-sm text-[#93a0bb]">
          Application: {job.application.status} via {job.application.method}
          {job.application.error ? ` — ${job.application.error}` : ""}
        </p>
      )}
      <section id="awli-prefill" className="rounded-xl border border-[#243049] bg-[#121a2b] p-5">
        <h2 className="font-medium">Application prefill (AWLI-style)</h2>
        <div className="mt-4">
          <AwliPrefillPanel packet={packet} />
        </div>
      </section>
      <section className="rounded-xl border border-[#243049] bg-[#121a2b] p-5">
        <h2 className="font-medium">Posting</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#c5d0ea]">{job.description}</p>
      </section>
      <section id="cv-preview" className="rounded-xl border border-[#243049] bg-[#121a2b] p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-medium">Generated CV</h2>
          {cv && (
            <a
              href={`/api/jobs/${job.id}/cv`}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-[#5b8cff]"
            >
              Open in new tab
            </a>
          )}
        </div>
        {cv ? (
          <div className="mt-4 overflow-hidden rounded-lg border border-[#243049] bg-white">
            <iframe
              title="Tailored CV preview"
              src={`/api/jobs/${job.id}/cv?v=${encodeURIComponent(cv.createdAt.toISOString())}`}
              className="h-[920px] w-full"
            />
          </div>
        ) : (
          <p className="mt-2 text-sm text-[#93a0bb]">Not generated yet.</p>
        )}
      </section>
      <section className="rounded-xl border border-[#243049] bg-[#121a2b] p-5">
        <h2 className="font-medium">Cover letter</h2>
        {letter ? (
          <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#c5d0ea]">{letter.content}</pre>
        ) : (
          <p className="mt-2 text-sm text-[#93a0bb]">Not generated yet.</p>
        )}
      </section>
    </div>
  );
}
