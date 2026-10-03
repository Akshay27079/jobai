"use client";

import { useState } from "react";
import type { AwliPrefill } from "@/lib/awli-profile";

export function AwliPrefillPanel({ packet }: { packet: AwliPrefill }) {
  const [msg, setMsg] = useState("");

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMsg(`Copied ${label}`);
    } catch {
      setMsg("Could not copy — select the text instead.");
    }
  }

  const blob = JSON.stringify(packet, null, 2);

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#93a0bb]">
        LinkedIn Apply with LinkedIn (AWLI) is a plugin on <em>employer</em> career sites. JobAi
        cannot log into LinkedIn for you. Use this packet — the same fields AWLI prefills — review
        it, then paste or confirm on the application page.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 text-sm">
        <Field label="First name" value={packet.firstName} onCopy={() => copy(packet.firstName, "first name")} />
        <Field label="Last name" value={packet.lastName} onCopy={() => copy(packet.lastName, "last name")} />
        <Field label="Email" value={packet.email} onCopy={() => copy(packet.email, "email")} />
        <Field label="Phone" value={packet.phone} onCopy={() => copy(packet.phone, "phone")} />
        <Field label="Location" value={packet.location} onCopy={() => copy(packet.location, "location")} />
      </div>
      <div>
        <h3 className="text-sm font-medium">Employers</h3>
        <ul className="mt-2 space-y-1 text-sm text-[#c5d0ea]">
          {packet.employers.length === 0 && <li className="text-[#93a0bb]">None parsed from your CV yet.</li>}
          {packet.employers.map((e, i) => (
            <li key={`${e.title}-${i}`}>
              {e.title}
              {e.company ? ` — ${e.company}` : ""}
              {e.dates ? ` (${e.dates})` : ""}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="text-sm font-medium">Education</h3>
        <ul className="mt-2 space-y-1 text-sm text-[#c5d0ea]">
          {packet.education.length === 0 && <li className="text-[#93a0bb]">None parsed from your CV yet.</li>}
          {packet.education.map((e, i) => (
            <li key={`${e.school}-${i}`}>
              {e.degree}
              {e.school ? `, ${e.school}` : ""}
              {e.dates ? ` (${e.dates})` : ""}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md border border-[#243049] px-3 py-1.5 text-xs hover:border-[#5b8cff]"
          onClick={() => copy(blob, "JSON packet")}
        >
          Copy JSON
        </button>
        <button
          type="button"
          className="rounded-md border border-[#243049] px-3 py-1.5 text-xs hover:border-[#5b8cff]"
          onClick={() =>
            copy(
              [
                packet.fullName,
                packet.email,
                packet.phone,
                packet.location,
                ...packet.employers.map((e) => `${e.title} ${e.company} ${e.dates}`.trim()),
              ].join("\n"),
              "plain text",
            )
          }
        >
          Copy all as text
        </button>
      </div>
      {msg && <p className="text-xs text-[#93a0bb]">{msg}</p>}
    </div>
  );
}

function Field({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-lg border border-[#243049] px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-[#93a0bb]">{label}</span>
        {value && (
          <button type="button" className="text-xs text-[#5b8cff]" onClick={onCopy}>
            Copy
          </button>
        )}
      </div>
      <div className="mt-1">{value || "—"}</div>
    </div>
  );
}
