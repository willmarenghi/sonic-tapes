"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { buildThreads, threadMatchesQuery } from "@/lib/threads";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { PostCard } from "@/components/PostCard";
import type { Post, PostWithReplies, Profile } from "@/lib/types";

function formatShelfDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function RingIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="12" cy="12" r="1.25" fill="currentColor" />
    </svg>
  );
}

function Feed({ selectedUserId }: { selectedUserId: string | null }) {
  const [threads, setThreads] = useState<PostWithReplies[] | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "shelf">("shelf");
  const [selectedShelfThreadId, setSelectedShelfThreadId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const [
        {
          data: { user },
        },
        { data: profiles },
        { data: posts },
      ] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("profiles").select("id, name, email, is_admin"),
        supabase.from("posts").select("*").order("created_at", { ascending: false }),
      ]);
      setCurrentUserId(user?.id ?? null);
      setIsAdmin(!!(profiles as Profile[] | null)?.find((p) => p.id === user?.id)?.is_admin);
      setThreads(buildThreads((posts as Post[]) ?? [], (profiles as Profile[]) ?? []));
    }

    load();
  }, [reloadKey]);

  if (threads === null) {
    return <p className="text-muted">Loading…</p>;
  }

  if (threads.length === 0) {
    return (
      <div>
        <h2 className="font-display text-2xl lowercase text-foreground">nothing posted yet.</h2>
        <p className="mt-3 max-w-md text-muted">
          Record a quick idea or upload an audio file to start the first thread. Anyone can reply
          with their own take once it&apos;s up.
        </p>
        <Link
          href="/upload"
          className="mt-5 inline-flex min-h-11 items-center rounded-md bg-accent px-4 text-sm font-medium lowercase text-accent-foreground transition hover:brightness-110"
        >
          + post your first idea
        </Link>
      </div>
    );
  }

  const trimmedQuery = query.trim().toLowerCase();
  let visibleThreads = threads;
  if (selectedUserId) {
    visibleThreads = visibleThreads.filter((thread) => thread.uploader_id === selectedUserId);
  }
  if (trimmedQuery) {
    visibleThreads = visibleThreads.filter((thread) => threadMatchesQuery(thread, trimmedQuery));
  }

  const activeShelfThread =
    viewMode === "shelf" && selectedShelfThreadId
      ? (visibleThreads.find((thread) => thread.id === selectedShelfThreadId) ?? null)
      : null;

  return (
    <div>
      <div className="sticky top-14 z-20 -mx-4 mb-4 border-b border-line bg-background px-4 py-3 md:static md:mx-0 md:mb-4 md:border-0 md:bg-transparent md:px-0 md:py-0">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="find a song, note, or bandmate…"
            className="min-w-0 flex-1 rounded-md border border-line bg-surface px-3 py-2 text-base text-foreground outline-none placeholder:text-muted focus:border-accent"
          />
          <div className="flex shrink-0 overflow-hidden rounded-md border border-line">
            <button
              type="button"
              onClick={() => setViewMode("shelf")}
              className={`min-h-11 px-3 text-sm lowercase transition ${
                viewMode === "shelf" ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              shelf
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`min-h-11 px-3 text-sm lowercase transition ${
                viewMode === "list" ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              list
            </button>
          </div>
        </div>
      </div>

      <Link
        href="/upload"
        className="mb-4 flex min-h-11 items-center justify-center rounded-md bg-accent text-sm font-medium lowercase text-accent-foreground transition hover:brightness-110 md:hidden"
      >
        + new idea
      </Link>

      {visibleThreads.length === 0 ? (
        <p className="text-muted">
          {trimmedQuery ? `No matches for "${query.trim()}".` : "Nothing to show with the current filters."}
        </p>
      ) : viewMode === "shelf" && selectedShelfThreadId ? (
        <div>
          <button
            type="button"
            onClick={() => setSelectedShelfThreadId(null)}
            className="mb-4 text-sm font-medium text-accent hover:underline"
          >
            ← back to shelf
          </button>
          {activeShelfThread ? (
            <PostCard
              post={activeShelfThread}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onDeleted={() => {
                setSelectedShelfThreadId(null);
                setReloadKey((k) => k + 1);
              }}
              forceExpanded
            />
          ) : (
            <p className="text-muted">This song is no longer available.</p>
          )}
        </div>
      ) : viewMode === "shelf" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {visibleThreads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => setSelectedShelfThreadId(thread.id)}
              className="flex flex-col gap-2 text-left"
            >
              <div className="relative aspect-square overflow-hidden rounded-md border border-line">
                {thread.cover_art_url ? (
                  <Image
                    src={thread.cover_art_url}
                    alt=""
                    fill
                    sizes="200px"
                    className="object-cover"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center"
                    style={{ background: "#2a2a2a" }}
                  >
                    <RingIcon className="h-10 w-10 text-accent" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-1">
                  <p className="truncate text-sm text-foreground">{thread.title}</p>
                  <span className="shrink-0 text-[10px] text-muted">
                    {formatShelfDate(thread.created_at)}
                  </span>
                </div>
                <p className="truncate text-xs text-muted">{thread.uploader?.name ?? "Unknown"}</p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {visibleThreads.map((thread) => (
            <PostCard
              key={thread.id}
              post={thread}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onDeleted={() => setReloadKey((k) => k + 1)}
              forceExpanded={!!trimmedQuery}
              anchorId={thread.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FeedPage() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // The default useState(null) only resets on a fresh mount. If the browser
  // restores this page from bfcache (e.g. hitting back), the whole component
  // — including whatever member was selected — comes back as-is. Resetting
  // on "pageshow" covers that case too, so landing back on the feed always
  // shows "all" rather than whoever was last filtered.
  useEffect(() => {
    function handlePageShow() {
      setSelectedUserId(null);
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return (
    <RequireAuth>
      <AppShell selectedUserId={selectedUserId} onSelectUser={setSelectedUserId}>
        <Feed selectedUserId={selectedUserId} />
      </AppShell>
    </RequireAuth>
  );
}
