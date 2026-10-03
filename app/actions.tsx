"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CvUpload() {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setStatus("Analyzing CV…");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/cv/upload", { method: "POST", body: form });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setStatus(data.error || "Upload failed");
      return;
    }
    setStatus(`Analyzed: ${data.profile?.parsed?.name || file.name}`);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="cursor-pointer rounded-lg bg-[#5b8cff] px-4 py-2 text-sm font-medium text-white">
        {busy ? "Working…" : "Upload CV (PDF)"}
        <input type="file" accept="application/pdf" className="hidden" onChange={onChange} disabled={busy} />
      </label>
      {status && <span className="text-sm text-[#93a0bb]">{status}</span>}
    </div>
  );
}

export function SearchButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function run() {
    setBusy(true);
    setMsg("Searching…");
    const res = await fetch("/api/jobs/search", { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "Search failed");
      return;
    }
    setMsg(`Scanned ${data.scanned} (${data.source}), added ${data.created} new.`);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="rounded-lg border border-[#243049] bg-[#121a2b] px-4 py-2 text-sm hover:border-[#5b8cff]"
      >
        {busy ? "Searching…" : "Find jobs"}
      </button>
      {msg && <span className="text-sm text-[#93a0bb]">{msg}</span>}
    </div>
  );
}

export function JobActions({
  jobId,
  applyUrl,
  hasCv = false,
}: {
  jobId: string;
  applyUrl: string;
  hasCv?: boolean;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  function openPreview() {
    window.open(`/api/jobs/${jobId}/cv?t=${Date.now()}`, "_blank", "noopener,noreferrer");
  }

  async function call(path: string, body?: object) {
    setBusy(true);
    setMsg("");
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    setBusy(false);
    setMsg(data.message || data.error || (res.ok ? "Done" : "Failed"));
    if (res.ok && path.endsWith("/generate")) {
      openPreview();
      router.push(`/jobs/${jobId}#cv-preview`);
    }
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => call(`/api/jobs/${jobId}/generate`)}
        className="rounded-md border border-[#243049] px-3 py-1.5 text-xs hover:border-[#5b8cff]"
      >
        Generate CV
      </button>
      {hasCv && (
        <button
          type="button"
          onClick={openPreview}
          className="rounded-md border border-[#243049] px-3 py-1.5 text-xs hover:border-[#5b8cff]"
        >
          Preview CV
        </button>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => call(`/api/jobs/${jobId}/apply`)}
        className="rounded-md border border-[#243049] px-3 py-1.5 text-xs hover:border-[#5b8cff]"
      >
        Queue / apply
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => call(`/api/jobs/${jobId}/apply`, { force: true })}
        className="rounded-md border border-[#243049] px-3 py-1.5 text-xs hover:border-[#5b8cff]"
      >
        Send now
      </button>
      {applyUrl && (
        <a
          href={applyUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-[#243049] px-3 py-1.5 text-xs hover:border-[#5b8cff]"
        >
          {/linkedin\.com/i.test(applyUrl) ? "Open LinkedIn apply" : "Open career / apply page"}
        </a>
      )}
      {msg && <span className="text-xs text-[#93a0bb]">{msg}</span>}
    </div>
  );
}
