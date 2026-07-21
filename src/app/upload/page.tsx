import { createClient } from "@/lib/supabase/server";
import { UploadForm } from "@/components/UploadForm";
import { NavBar } from "@/components/NavBar";
import type { Post, Profile } from "@/lib/types";

export default async function UploadPage({
  searchParams,
}: {
  searchParams: Promise<{ replyTo?: string }>;
}) {
  const { replyTo } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: posts }, { data: me }] = await Promise.all([
    supabase
      .from("posts")
      .select("id, title, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("name").eq("id", user?.id ?? "").single(),
  ]);

  return (
    <>
      <NavBar userName={(me as Profile | null)?.name ?? user?.email ?? ""} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <h1 className="mb-6 text-xl font-semibold text-neutral-100">
          Post a song idea or reply
        </h1>
        <UploadForm
          posts={(posts as Pick<Post, "id" | "title" | "created_at">[]) ?? []}
          defaultReplyTo={replyTo}
        />
      </main>
    </>
  );
}
