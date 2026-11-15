import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getSettings } from "@/lib/db";

// Settings live in the database, so render at request time (also keeps builds DB-free).
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return { title: { default: `Book online | ${s.businessName}`, template: `%s | ${s.businessName}` }, description: s.tagline };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="border-b border-line bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-lg font-bold tracking-tight">
              {s.businessName}
            </Link>
            <a href={`mailto:${s.contactEmail}`} className="text-sm text-muted hover:text-ink">
              Contact
            </a>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-10">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 pb-10 text-xs text-muted">
          © {new Date().getFullYear()} {s.businessName}
        </footer>
      </body>
    </html>
  );
}
