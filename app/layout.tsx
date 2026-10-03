import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "JobAi",
  description: "Analyze your CV, find jobs, tailor applications, and track applies.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-[#243049] bg-[#121a2b]">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              JobAi
            </Link>
            <nav className="flex gap-5 text-sm text-[#93a0bb]">
              <Link href="/" className="hover:text-white">
                Dashboard
              </Link>
              <Link href="/jobs" className="hover:text-white">
                Jobs
              </Link>
              <Link href="/settings" className="hover:text-white">
                Settings
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
