import { createClient } from "@/lib/supabase/server";
import { buildThreads } from "@/lib/threads";
import { NavBar } from "@/components/NavBar";
import { PostCard } from "@/components/PostCard";
import type { Post, Profile } from "@/lib/types";

export default async function FeedPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profiles }, { data: posts }, { data: me }] = await Promise.all([
    supabase.from("profiles").select("id, name, email"),
    supabase.from("posts").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("name").eq("id", user?.id ?? "").single(),
  ]);

  const threads = buildThreads((posts as Post[]) ?? [], (profiles as Profile[]) ?? []);

  return (
    <>
      <NavBar userName={me?.name ?? user?.email ?? ""} />
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-6">
        {threads.length === 0 && (
          <p className="text-center text-neutral-500">
            No song ideas yet. Be the first to post one.
          </p>
        )}
        {threads.map((thread) => (
          <PostCard key={thread.id} post={thread} />
        ))}
      </main>
    </>
  );
}
