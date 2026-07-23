"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { UploadForm } from "@/components/UploadForm";
import type { Post } from "@/lib/types";

function UploadPageContent() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const replyTo = searchParams.get("replyTo") ?? undefined;
  const mode = searchParams.get("mode") === "text" ? "text" : "voice";

  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [status, setStatus] = useState<"loading" | "not-allowed" | "ready">(
    editId ? "loading" : "ready"
  );

  useEffect(() => {
    if (!editId) return;
    const supabase = createClient();

    async function load() {
      const [{ data: post }, { data: { user } }] = await Promise.all([
        supabase.from("posts").select("*").eq("id", editId as string).single(),
        supabase.auth.getUser(),
      ]);
      if (post && user && (post as Post).uploader_id === user.id) {
        setEditingPost(post as Post);
        setStatus("ready");
      } else {
        setStatus("not-allowed");
      }
    }

    load();
  }, [editId]);

  if (status === "loading") {
    return <p className="text-muted">Loading…</p>;
  }

  if (status === "not-allowed") {
    return <p className="text-red-400">You can only edit your own posts.</p>;
  }

  return (
    <>
      <h1 className="mb-6 font-display text-2xl lowercase text-foreground">
        {editingPost ? "edit post" : "new song idea"}
      </h1>
      <UploadForm defaultReplyTo={replyTo} defaultMode={mode} editingPost={editingPost ?? undefined} />
    </>
  );
}

export default function UploadPage() {
  return (
    <RequireAuth>
      <AppShell>
        <Suspense fallback={<p className="text-muted">Loading…</p>}>
          <UploadPageContent />
        </Suspense>
      </AppShell>
    </RequireAuth>
  );
}
