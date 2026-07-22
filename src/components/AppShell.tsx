"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BASE_PATH } from "@/lib/basePath";

const BAND_SIZE = 5;
const AVATAR_COLORS = ["#d9714f", "#cdb37a", "#cfa8b0", "#a8c0a0", "#9aa6c9"];

// Swipe tuning: an "open" swipe must start within EDGE_WIDTH of the left
// edge (so it doesn't fire mid-scroll); either direction just needs enough
// horizontal travel and to not be mostly-vertical (a normal page scroll).
const EDGE_WIDTH = 24;
const SWIPE_DISTANCE = 60;

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

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path strokeLinecap="round" d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" />
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
  onSelectUser?: (id: string | null) => void;
}) {
  const router = useRouter();
  const selectUser = onSelectUser ?? (() => router.push("/"));

  const members = useBandMembers();
  const blanks = Math.max(0, BAND_SIZE - members.length);

  return (
    <div className="mt-8 border-t border-dashed border-line-dashed pt-5">
      <p className="text-sm lowercase tracking-wide text-muted">band members</p>
      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => selectUser(null)}
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
            onClick={() => selectUser(member.id)}
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

function SidebarContent({
  label,
  selectedUserId,
  onSelectUser,
  onSignOut,
  onNavigate,
}: {
  label: string;
  selectedUserId: string | null;
  onSelectUser?: (id: string | null) => void;
  onSignOut: () => void;
  onNavigate?: () => void;
}) {
  return (
    <>
      <Link href="/" onClick={onNavigate} className="flex items-center gap-2">
        <Logo />
        <span className="font-display text-2xl lowercase text-foreground">sonic tapes</span>
      </Link>
      <p className="mt-1 text-xs lowercase text-muted">
        song library for thoughts, feedback, and innovation
      </p>

      <div className="mt-6 flex flex-col gap-3">
        <Link
          href="/upload"
          onClick={onNavigate}
          className="flex min-h-11 items-center justify-center rounded-md bg-accent text-sm font-medium lowercase text-accent-foreground transition hover:brightness-110"
        >
          + new idea
        </Link>

        <Link
          href="/covers"
          onClick={onNavigate}
          className="flex min-h-11 items-center justify-center rounded-md border px-3 text-sm lowercase transition hover:brightness-110"
          style={{
            borderColor: "#6fbf73",
            color: "#a8d6ad",
            background: "rgba(111, 191, 115, 0.08)",
          }}
        >
          cover songs
        </Link>

        <Link
          href="/shows"
          onClick={onNavigate}
          className="flex min-h-11 items-center justify-center rounded-md border px-3 text-sm lowercase transition hover:brightness-110"
          style={{
            borderColor: "#e15c4f",
            color: "#f0a098",
            background: "rgba(225, 92, 79, 0.08)",
          }}
        >
          shows
        </Link>
      </div>

      <BandRoster
        selectedUserId={selectedUserId}
        onSelectUser={
          onSelectUser &&
          ((id) => {
            onSelectUser(id);
            onNavigate?.();
          })
        }
      />

      <div className="flex-1" />

      <div className="border-t border-dashed border-line-dashed pt-4">
        <p className="truncate text-sm text-muted">{label}</p>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-3 min-h-11 w-full rounded-md border border-dashed border-line-dashed px-3 text-sm lowercase text-muted transition hover:text-foreground"
        >
          sign out
        </button>
      </div>
    </>
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
  const pathname = usePathname();
  const label = useProfileLabel();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  // Following a same-route Link is a no-op in Next.js, so tapping the home
  // logo while already on "/" wouldn't reset shelf view or the member
  // filter. Force a full reload in that case so the logo always returns to
  // the true default state, not just whatever it navigates "toward".
  function handleLogoClick(e: React.MouseEvent) {
    if (pathname === "/") {
      e.preventDefault();
      window.location.href = `${BASE_PATH}/`;
    }
  }

  async function handleSignOut() {
    if (!window.confirm("Sign out?")) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  function handleTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }

  function handleTouchMove(e: React.TouchEvent) {
    const start = touchStart.current;
    if (!start) return;
    const t = e.touches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dy) > Math.abs(dx)) return;

    if (!drawerOpen && start.x < EDGE_WIDTH && dx > SWIPE_DISTANCE) {
      setDrawerOpen(true);
      touchStart.current = null;
    } else if (drawerOpen && dx < -SWIPE_DISTANCE) {
      setDrawerOpen(false);
      touchStart.current = null;
    }
  }

  function handleTouchEnd() {
    touchStart.current = null;
  }

  return (
    <div
      className="flex min-h-screen flex-1 flex-col md:flex-row"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-line bg-background px-4 md:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          className="flex h-11 w-11 -ml-2 items-center justify-center text-foreground"
        >
          <MenuIcon />
        </button>
        <Link href="/" onClick={handleLogoClick} className="flex items-center gap-2">
          <Logo className="h-6 w-6" />
          <span className="font-display text-lg lowercase text-foreground">sonic tapes</span>
        </Link>
        <div className="h-11 w-11" />
      </header>

      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 -translate-x-full flex-col overflow-y-auto border-r border-line bg-surface px-6 py-8 transition-transform duration-300 ease-out md:hidden ${
          drawerOpen ? "translate-x-0" : ""
        }`}
      >
        <SidebarContent
          label={label}
          selectedUserId={selectedUserId}
          onSelectUser={onSelectUser}
          onSignOut={handleSignOut}
          onNavigate={() => setDrawerOpen(false)}
        />
      </aside>

      <aside className="hidden w-72 shrink-0 flex-col overflow-y-auto border-r border-line bg-surface px-6 py-8 md:flex md:sticky md:top-0 md:h-screen">
        <SidebarContent
          label={label}
          selectedUserId={selectedUserId}
          onSelectUser={onSelectUser}
          onSignOut={handleSignOut}
        />
      </aside>

      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-10 md:py-10">{children}</div>
      </main>
    </div>
  );
}
