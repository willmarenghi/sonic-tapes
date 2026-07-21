"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Post } from "@/lib/types";

type PostOption = Pick<Post, "id" | "title" | "created_at">;

function storagePath(userId: string, file: File) {
  const ext = file.name.split(".").pop();
  const random = crypto.randomUUID();
  return `${userId}/${random}${ext ? `.${ext}` : ""}`;
}

export function UploadForm({ defaultReplyTo }: { defaultReplyTo?: string }) {
  const router = useRouter();
  const [posts, setPosts] = useState<PostOption[]>([]);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [replyTo, setReplyTo] = useState(defaultReplyTo ?? "");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("posts")
      .select("id, title, created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => setPosts((data as PostOption[]) ?? []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!audioFile) {
      setError("An audio file is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be signed in.");
        setSubmitting(false);
        return;
      }

      const audioPath = storagePath(user.id, audioFile);
      const { error: audioError } = await supabase.storage
        .from("audio")
        .upload(audioPath, audioFile);
      if (audioError) throw audioError;
      const {
        data: { publicUrl: audioUrl },
      } = supabase.storage.from("audio").getPublicUrl(audioPath);

      let coverUrl: string | null = null;
      if (coverFile) {
        const coverPath = storagePath(user.id, coverFile);
        const { error: coverError } = await supabase.storage
          .from("cover-art")
          .upload(coverPath, coverFile);
        if (coverError) throw coverError;
        coverUrl = supabase.storage.from("cover-art").getPublicUrl(coverPath).data.publicUrl;
      }

      const { error: insertError } = await supabase.from("posts").insert({
        title,
        uploader_id: user.id,
        audio_url: audioUrl,
        cover_art_url: coverUrl,
        notes: notes || null,
        parent_post_id: replyTo || null,
      });
      if (insertError) throw insertError;

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="title" className="mb-1 block text-sm text-neutral-300">
          Title
        </label>
        <input
          id="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-600"
        />
      </div>

      <div>
        <label htmlFor="replyTo" className="mb-1 block text-sm text-neutral-300">
          Replying to (leave blank to start a new song idea)
        </label>
        <select
          id="replyTo"
          value={replyTo}
          onChange={(e) => setReplyTo(e.target.value)}
          className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-600"
        >
          <option value="">— New song idea —</option>
          {posts.map((post) => (
            <option key={post.id} value={post.id}>
              {post.title} ({new Date(post.created_at).toLocaleDateString()})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="audio" className="mb-1 block text-sm text-neutral-300">
          Audio file
        </label>
        <input
          id="audio"
          type="file"
          accept="audio/*"
          required
          onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm text-neutral-300 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-800 file:px-3 file:py-2 file:text-neutral-100"
        />
      </div>

      <div>
        <label htmlFor="cover" className="mb-1 block text-sm text-neutral-300">
          Cover art (optional)
        </label>
        <input
          id="cover"
          type="file"
          accept="image/*"
          onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm text-neutral-300 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-800 file:px-3 file:py-2 file:text-neutral-100"
        />
      </div>

      <div>
        <label htmlFor="notes" className="mb-1 block text-sm text-neutral-300">
          Notes (markdown supported — chords, description, etc.)
        </label>
        <textarea
          id="notes"
          rows={6}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 font-mono text-sm text-neutral-100 outline-none focus:border-neutral-600"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-neutral-100 px-3 py-2 font-medium text-neutral-900 transition hover:bg-white disabled:opacity-60"
      >
        {submitting ? "Uploading…" : "Post"}
      </button>
    </form>
  );
}
