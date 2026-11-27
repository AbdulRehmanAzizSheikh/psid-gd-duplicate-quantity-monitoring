import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "PSID & GD Duplicate & Quantity Monitoring",
  description:
    "Customs PSID & GD duplicate detection + multi-vehicle quantity monitoring. Next.js + Tailwind + MongoDB + Cloudinary demo.",
};

const NAV = [
  { href: "/", label: "Dashboard", hint: "Live demo" },
  { href: "/flow", label: "Client Flow", hint: "Presentation" },
  { href: "/flow/dev", label: "Developer Guide", hint: "Architecture + RTM" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
          <nav className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3">
            <Link href="/" className="mr-4 flex items-center gap-2 font-bold text-slate-900">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">P</span>
              <span className="hidden sm:inline">PSID &amp; GD Monitor</span>
            </Link>
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                title={n.hint}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 bg-white px-4 py-3 text-center text-xs text-slate-500">
          PSID &amp; GD Duplicate &amp; Quantity Monitoring System · Next.js App Router · Tailwind CSS · MongoDB · Cloudinary · demo build
        </footer>
      </body>
    </html>
  );
}
