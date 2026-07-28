"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buildThreads, threadMatchesQuery } from "@/lib/threads";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { PostCard } from "@/components/PostCard";
import type { Post, PostWithReplies, Profile } from "@/lib/types";

// True if `targetId` is `post.id` or belongs to one of its replies at any depth.
function threadContainsPost(post: PostWithReplies, targetId: string): boolean {
  return post.id === targetId || post.replies.some((reply) => threadContainsPost(reply, targetId));
}

function findRootThreadId(threads: PostWithReplies[], targetId: string): string | null {
  return threads.find((thread) => threadContainsPost(thread, targetId))?.id ?? null;
}

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
  const searchParams = useSearchParams();
  const targetPostId = searchParams.get("post");

  const [threads, setThreads] = useState<PostWithReplies[] | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "shelf">(() =>
    searchParams.get("view") === "list" ? "list" : "shelf"
  );
  // undefined = no explicit choice yet, so a "?post=" deep link (coming back
  // from "Cancel" on a reply/edit form) wins; null = the user explicitly
  // backed out to the shelf grid, which overrides the deep link.
  const [selectedShelfThreadId, setSelectedShelfThreadId] = useState<string | null | undefined>(
    undefined
  );
  const scrolledToTargetRef = useRef(false);

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

  const trimmedQuery = query.trim().toLowerCase();
  let visibleThreads = threads ?? [];
  if (selectedUserId) {
    visibleThreads = visibleThreads.filter((thread) => thread.uploader_id === selectedUserId);
  }
  if (trimmedQuery) {
    visibleThreads = visibleThreads.filter((thread) => threadMatchesQuery(thread, trimmedQuery));
  }

  const effectiveShelfThreadId =
    selectedShelfThreadId === undefined
      ? (targetPostId && threads ? findRootThreadId(threads, targetPostId) : null)
      : selectedShelfThreadId;

  const activeShelfThread =
    viewMode === "shelf" && effectiveShelfThreadId
      ? (visibleThreads.find((thread) => thread.id === effectiveShelfThreadId) ?? null)
      : null;

  // In list view, whichever thread contains the deep-linked post (if any)
  // needs to be force-expanded so a nested reply is actually on screen.
  const targetThread = targetPostId
    ? (visibleThreads.find((thread) => threadContainsPost(thread, targetPostId)) ?? null)
    : null;

  // Once the deep-linked post is actually on screen — in either view —
  // scroll it into view.
  useEffect(() => {
    if (scrolledToTargetRef.current || !targetPostId) return;
    if (viewMode === "shelf" ? !activeShelfThread : !targetThread) return;
    scrolledToTargetRef.current = true;
    requestAnimationFrame(() => {
      document.getElementById(targetPostId)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [targetPostId, viewMode, activeShelfThread, targetThread]);

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

  return (
    <div>
      <div className="sticky top-14 z-20 -mx-4 mb-4 border-b border-line bg-background px-4 py-3 md:static md:mx-0 md:mb-4 md:border-0 md:bg-transparent md:px-0 md:py-0">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="find a song"
          className="w-full rounded-md border border-line bg-surface px-3 py-2 text-base text-foreground outline-none placeholder:text-muted focus:border-accent"
        />

        <div className="my-3 border-t border-line" />

        <Link
          href="/upload"
          className="flex min-h-11 items-center justify-center rounded-md bg-accent text-sm font-medium lowercase text-accent-foreground transition hover:brightness-110 active:scale-95 active:brightness-110"
        >
          + new idea
        </Link>

        <div className="mt-3 flex items-center justify-end gap-2">
          <span className="text-sm text-muted">view:</span>
          <div className="flex shrink-0 overflow-hidden rounded-md border border-line">
            <button
              type="button"
              onClick={() => setViewMode("shelf")}
              className={`min-h-8 px-2.5 text-xs lowercase transition ${
                viewMode === "shelf" ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              shelf
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`min-h-8 px-2.5 text-xs lowercase transition ${
                viewMode === "list" ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              list
            </button>
          </div>
        </div>
      </div>

      {visibleThreads.length === 0 ? (
        <p className="text-muted">
          {trimmedQuery ? `No matches for "${query.trim()}".` : "Nothing to show with the current filters."}
        </p>
      ) : viewMode === "shelf" && effectiveShelfThreadId ? (
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
              returnView="shelf"
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
              <div className="relative aspect-square overflow-hidden rounded-md border border-accent transition active:scale-95 active:brightness-110">
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
              forceExpanded={!!trimmedQuery || thread.id === targetThread?.id}
              returnView="list"
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
        {selectedUserId ? (
          <button
            type="button"
            onClick={() => setSelectedUserId(null)}
            className="mb-4 text-sm font-medium text-accent hover:underline"
          >
            ← back to all members
          </button>
        ) : (
          <Link href="/" className="mb-4 inline-block text-sm font-medium text-accent hover:underline">
            ← back home
          </Link>
        )}
        <Suspense fallback={<p className="text-muted">Loading…</p>}>
          <Feed selectedUserId={selectedUserId} />
        </Suspense>
      </AppShell>
    </RequireAuth>
  );
}
