"use client";

import { FormEvent, useEffect, useState } from "react";

type Settings = {
  searchQuery: string;
  location: string;
  searchCountry: string;
  remoteOk: boolean;
  autoSearch: boolean;
  searchIntervalHr: number;
  autoEmailApply: boolean;
  minMatchScore: number;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => setMsg("Could not load settings"));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setMsg(res.ok ? "Saved. API keys stay in .env." : "Save failed");
  }

  if (!settings) {
    return <p className="text-[#93a0bb]">Loading…</p>;
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-[#93a0bb]">
          Jobs come from Adzuna&apos;s free API. For India, keep country as <strong>India (in)</strong>.
          Free key:{" "}
          <a className="text-[#5b8cff]" href="https://developer.adzuna.com/" target="_blank" rel="noreferrer">
            developer.adzuna.com
          </a>
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-[#243049] bg-[#121a2b] p-5">
        <label className="block text-sm">
          Search query (blank uses titles from the CV)
          <input
            className="mt-1 w-full rounded-md border border-[#243049] bg-[#0b1220] px-3 py-2"
            value={settings.searchQuery}
            onChange={(e) => setSettings({ ...settings, searchQuery: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          Country (Adzuna free job search)
          <select
            className="mt-1 w-full rounded-md border border-[#243049] bg-[#0b1220] px-3 py-2"
            value={settings.searchCountry || "in"}
            onChange={(e) => setSettings({ ...settings, searchCountry: e.target.value })}
          >
            <option value="in">India (in) — free</option>
            <option value="gb">United Kingdom (gb)</option>
            <option value="us">United States (us)</option>
            <option value="au">Australia (au)</option>
            <option value="ca">Canada (ca)</option>
            <option value="de">Germany (de)</option>
            <option value="za">South Africa (za)</option>
          </select>
        </label>
        <label className="block text-sm">
          City in that country (optional — e.g. Bangalore, Mumbai, Hyderabad, Pune, Delhi)
          <input
            className="mt-1 w-full rounded-md border border-[#243049] bg-[#0b1220] px-3 py-2"
            placeholder="Bangalore"
            value={settings.location}
            onChange={(e) => setSettings({ ...settings, location: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          Minimum match score
          <input
            type="number"
            min={0}
            max={100}
            className="mt-1 w-full rounded-md border border-[#243049] bg-[#0b1220] px-3 py-2"
            value={settings.minMatchScore}
            onChange={(e) => setSettings({ ...settings, minMatchScore: Number(e.target.value) })}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.remoteOk}
            onChange={(e) => setSettings({ ...settings, remoteOk: e.target.checked })}
          />
          Remote OK (stored for your notes; Adzuna uses location)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.autoSearch}
            onChange={(e) => setSettings({ ...settings, autoSearch: e.target.checked })}
          />
          Auto-search on the worker schedule
        </label>
        <label className="block text-sm">
          Search interval (hours, used by worker)
          <input
            type="number"
            min={1}
            className="mt-1 w-full rounded-md border border-[#243049] bg-[#0b1220] px-3 py-2"
            value={settings.searchIntervalHr}
            onChange={(e) => setSettings({ ...settings, searchIntervalHr: Number(e.target.value) })}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.autoEmailApply}
            onChange={(e) => setSettings({ ...settings, autoEmailApply: e.target.checked })}
          />
          Auto-email apply when a posting has an email
        </label>
        <button type="submit" className="rounded-lg bg-[#5b8cff] px-4 py-2 text-sm font-medium text-white">
          Save
        </button>
        {msg && <p className="text-sm text-[#93a0bb]">{msg}</p>}
      </form>
    </div>
  );
}
