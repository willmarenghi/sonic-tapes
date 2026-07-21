"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function Logo() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0 text-accent" aria-hidden>
      <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="12" cy="12" r="1.25" fill="currentColor" />
    </svg>
  );
}

function useProfileLabel() {
  const [label, setLabel] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();
      setLabel((profile as { name: string } | null)?.name ?? user.email ?? "");
    });
  }, []);

  return label;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const label = useProfileLabel();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col md:flex-row">
      <header className="flex items-center justify-between border-b border-line px-4 py-3 md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
          <span className="font-display text-lg lowercase text-foreground">sonic tapes</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/upload"
            className="flex min-h-11 items-center rounded-md bg-accent px-3 text-sm font-medium lowercase text-accent-foreground"
          >
            + new idea
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex min-h-11 items-center text-sm lowercase text-muted hover:text-foreground"
          >
            sign out
          </button>
        </div>
      </header>

      <aside className="hidden w-72 shrink-0 flex-col border-r border-line bg-surface px-6 py-8 md:flex">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
          <span className="font-display text-2xl lowercase text-foreground">sonic tapes</span>
        </Link>
        <p className="mt-1 text-xs lowercase text-muted">
          song library for thoughts, feedback, and innovation
        </p>

        <Link
          href="/upload"
          className="mt-6 flex min-h-11 items-center justify-center rounded-md bg-accent text-sm font-medium lowercase text-accent-foreground transition hover:brightness-110"
        >
          + new idea
        </Link>

        <div className="mt-8 border-t border-dashed border-line-dashed pt-4">
          <p className="text-xs lowercase tracking-wide text-muted">feed</p>
        </div>

        <div className="flex-1" />

        <div className="border-t border-dashed border-line-dashed pt-4">
          <p className="truncate text-sm text-muted">{label}</p>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-3 min-h-11 w-full rounded-md border border-dashed border-line-dashed px-3 text-sm lowercase text-muted transition hover:text-foreground"
          >
            sign out
          </button>
        </div>
      </aside>

      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-10 md:py-10">{children}</div>
      </main>
    </div>
  );
}
