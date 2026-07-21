"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { buildThreads } from "@/lib/threads";
import { RequireAuth } from "@/components/RequireAuth";
import { NavBar } from "@/components/NavBar";
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
    return <p className="text-center text-neutral-500">Loading…</p>;
  }

  if (threads.length === 0) {
    return (
      <p className="text-center text-neutral-500">
        No song ideas yet. Be the first to post one.
      </p>
    );
  }

  return (
    <>
      {threads.map((thread) => (
        <PostCard key={thread.id} post={thread} />
      ))}
    </>
  );
}

export default function FeedPage() {
  return (
    <RequireAuth>
      <NavBar />
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-6">
        <Feed />
      </main>
    </RequireAuth>
  );
}
