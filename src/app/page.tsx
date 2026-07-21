"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { buildThreads } from "@/lib/threads";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { PostCard } from "@/components/PostCard";
import type { Post, PostWithReplies, Profile } from "@/lib/types";

function Feed() {
  const [threads, setThreads] = useState<PostWithReplies[] | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const [{ data: profiles }, { data: posts }] = await Promise.all([
        supabase.from("profiles").select("id, name, email"),
        supabase.from("posts").select("*").order("created_at", { ascending: false }),
      ]);
      setThreads(buildThreads((posts as Post[]) ?? [], (profiles as Profile[]) ?? []));
    }

    load();
  }, []);

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
    <div className="space-y-4">
      {threads.map((thread) => (
        <PostCard key={thread.id} post={thread} />
      ))}
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
