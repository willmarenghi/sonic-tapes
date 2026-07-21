"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const BAND_SIZE = 5;
const AVATAR_COLORS = ["#b8a9e6", "#cdb37a", "#cfa8b0", "#a8c0a0", "#9aa6c9"];

function Logo({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`shrink-0 text-accent ${className}`} aria-hidden>
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

type BandMember = { id: string; name: string };

function useBandMembers() {
  const [members, setMembers] = useState<BandMember[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("id, name")
      .order("created_at", { ascending: true })
      .then(({ data }) => setMembers((data as BandMember[]) ?? []));
  }, []);

  return members;
}

function BandRoster({
  selectedUserId,
  onSelectUser,
}: {
  selectedUserId: string | null;
  onSelectUser: (id: string | null) => void;
}) {
  const members = useBandMembers();
  const blanks = Math.max(0, BAND_SIZE - members.length);

  return (
    <div className="mt-8 border-t border-dashed border-line-dashed pt-5">
      <p className="text-sm lowercase tracking-wide text-muted">band members</p>
      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => onSelectUser(null)}
          className={`flex min-h-11 items-center gap-3 rounded-md px-1 text-base lowercase transition ${
            selectedUserId === null ? "text-foreground" : "text-muted hover:text-foreground"
          }`}
        >
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full border-2 bg-background transition"
            style={{ borderColor: selectedUserId === null ? "var(--accent)" : "var(--line)" }}
          >
            <Logo className="h-4 w-4" />
          </span>
          all
        </button>

        {members.map((member, i) => (
          <button
            key={member.id}
            type="button"
            onClick={() => onSelectUser(member.id)}
            className={`flex min-h-11 items-center gap-3 rounded-md px-1 text-base lowercase transition ${
              selectedUserId === member.id ? "text-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold transition"
              style={{
                background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                color: "var(--accent-foreground)",
                borderColor: selectedUserId === member.id ? "var(--accent)" : "transparent",
              }}
            >
              {member.name.charAt(0).toUpperCase()}
            </span>
            {member.name}
          </button>
        ))}

        {Array.from({ length: blanks }).map((_, i) => (
          <div key={i} className="flex min-h-11 items-center gap-3 px-1 text-base text-muted-2">
            <span className="h-9 w-9 rounded-full border-2 border-dashed border-line-dashed" />
            —
          </div>
        ))}
      </div>
    </div>
  );
}

export function AppShell({
  children,
  selectedUserId = null,
  onSelectUser,
}: {
  children: React.ReactNode;
  selectedUserId?: string | null;
  onSelectUser?: (id: string | null) => void;
}) {
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

        {onSelectUser && (
          <BandRoster selectedUserId={selectedUserId} onSelectUser={onSelectUser} />
        )}

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
