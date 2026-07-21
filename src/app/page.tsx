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

type Reaction = { post_id: string; user_id: string };

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
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "shelf">("list");
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null);
  const [reactionError, setReactionError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id ?? null));

    async function load() {
      const [{ data: profiles }, { data: posts }, { data: reactionRows }] = await Promise.all([
        supabase.from("profiles").select("id, name, email"),
        supabase.from("posts").select("*").order("created_at", { ascending: false }),
        supabase.from("reactions").select("post_id, user_id"),
      ]);
      setThreads(buildThreads((posts as Post[]) ?? [], (profiles as Profile[]) ?? []));
      setReactions((reactionRows as Reaction[]) ?? []);
    }

    load();
  }, [reloadKey]);

  useEffect(() => {
    if (viewMode !== "list" || !pendingScrollId) return;
    const id = pendingScrollId;
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      setPendingScrollId(null);
    });
  }, [viewMode, pendingScrollId]);

  async function handleToggleReaction(postId: string) {
    if (!currentUserId) return;
    setReactionError(null);
    const supabase = createClient();
    const alreadyReacted = reactions.some(
      (r) => r.post_id === postId && r.user_id === currentUserId
    );
    if (alreadyReacted) {
      const { data, error } = await supabase
        .from("reactions")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", currentUserId)
        .select();
      if (error) {
        setReactionError(error.message);
        return;
      }
      if (!data || data.length === 0) {
        setReactionError(
          "Nothing was removed — make sure the latest Supabase migration has been run."
        );
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("reactions")
        .insert({ post_id: postId, user_id: currentUserId })
        .select();
      if (error) {
        setReactionError(error.message);
        return;
      }
      if (!data || data.length === 0) {
        setReactionError(
          "Nothing was saved — make sure the latest Supabase migration has been run."
        );
        return;
      }
    }
    setReloadKey((k) => k + 1);
  }

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

  const reactionCounts = new Map<string, number>();
  const myReactions = new Set<string>();
  for (const r of reactions) {
    reactionCounts.set(r.post_id, (reactionCounts.get(r.post_id) ?? 0) + 1);
    if (r.user_id === currentUserId) myReactions.add(r.post_id);
  }

  const trimmedQuery = query.trim().toLowerCase();
  let visibleThreads = threads;
  if (selectedUserId) {
    visibleThreads = visibleThreads.filter((thread) => thread.uploader_id === selectedUserId);
  }
  if (trimmedQuery) {
    visibleThreads = visibleThreads.filter((thread) => threadMatchesQuery(thread, trimmedQuery));
  }

  return (
    <div>
      {reactionError && (
        <p className="mb-3 text-xs text-red-400">{reactionError}</p>
      )}
      <div className="mb-4 flex flex-wrap items-center gap-3">
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
            onClick={() => setViewMode("list")}
            className={`min-h-11 px-3 text-sm lowercase transition ${
              viewMode === "list" ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            list
          </button>
          <button
            type="button"
            onClick={() => setViewMode("shelf")}
            className={`min-h-11 px-3 text-sm lowercase transition ${
              viewMode === "shelf" ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            shelf
          </button>
        </div>
      </div>

      {visibleThreads.length === 0 ? (
        <p className="text-muted">
          {trimmedQuery ? `No matches for "${query.trim()}".` : "Nothing to show with the current filters."}
        </p>
      ) : viewMode === "shelf" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {visibleThreads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => {
                setViewMode("list");
                setPendingScrollId(thread.id);
              }}
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
                <p className="truncate text-sm text-foreground">{thread.title}</p>
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
              onDeleted={() => setReloadKey((k) => k + 1)}
              forceExpanded={!!trimmedQuery}
              reactionCounts={reactionCounts}
              myReactions={myReactions}
              onToggleReaction={handleToggleReaction}
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

  return (
    <RequireAuth>
      <AppShell selectedUserId={selectedUserId} onSelectUser={setSelectedUserId}>
        <Feed selectedUserId={selectedUserId} />
      </AppShell>
    </RequireAuth>
  );
}
