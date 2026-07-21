"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { buildThreads, threadMatchesQuery } from "@/lib/threads";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { PostCard } from "@/components/PostCard";
import type { Post, PostWithReplies, Profile } from "@/lib/types";

function Feed() {
  const [threads, setThreads] = useState<PostWithReplies[] | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id ?? null));

    async function load() {
      const [{ data: profiles }, { data: posts }] = await Promise.all([
        supabase.from("profiles").select("id, name, email"),
        supabase.from("posts").select("*").order("created_at", { ascending: false }),
      ]);
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
  const visibleThreads = trimmedQuery
    ? threads.filter((thread) => threadMatchesQuery(thread, trimmedQuery))
    : threads;

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="find a song, note, or bandmate…"
        className="mb-4 w-full rounded-md border border-line bg-surface px-3 py-2 text-base text-foreground outline-none placeholder:text-muted focus:border-accent"
      />

      {visibleThreads.length === 0 ? (
        <p className="text-muted">No matches for &ldquo;{query.trim()}&rdquo;.</p>
      ) : (
        <div className="space-y-4">
          {visibleThreads.map((thread) => (
            <PostCard
              key={thread.id}
              post={thread}
              currentUserId={currentUserId}
              onDeleted={() => setReloadKey((k) => k + 1)}
              forceExpanded={!!trimmedQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FeedPage() {
  return (
    <RequireAuth>
      <AppShell>
        <Feed />
      </AppShell>
    </RequireAuth>
  );
}
