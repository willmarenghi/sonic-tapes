"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import type { Post } from "@/lib/types";

type PostOption = Pick<Post, "id" | "title" | "created_at">;

function storagePath(userId: string, file: File) {
  const ext = file.name.split(".").pop();
  const random = crypto.randomUUID();
  return `${userId}/${random}${ext ? `.${ext}` : ""}`;
}

// Supabase's Postgrest/Storage errors are plain objects with a `message`
// field, not real Error instances, so `instanceof Error` misses them.
function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
    return err.message;
  }
  return "Something went wrong.";
}

export function UploadForm({ defaultReplyTo }: { defaultReplyTo?: string }) {
  const router = useRouter();
  const [posts, setPosts] = useState<PostOption[]>([]);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [replyTo, setReplyTo] = useState(defaultReplyTo ?? "");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [recorderKey, setRecorderKey] = useState(0);
  const [fileInputKey, setFileInputKey] = useState(0);
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

  function handleRecorded(file: File | null) {
    setAudioFile(file);
    if (file) setFileInputKey((k) => k + 1);
  }

  function handleFilePicked(file: File | null) {
    setAudioFile(file);
    if (file) setRecorderKey((k) => k + 1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!replyTo && !audioFile) {
      setError("An audio file is required to start a new song idea.");
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

      let audioUrl: string | null = null;
      if (audioFile) {
        const audioPath = storagePath(user.id, audioFile);
        const { error: audioError } = await supabase.storage
          .from("audio")
          .upload(audioPath, audioFile);
        if (audioError) throw audioError;
        audioUrl = supabase.storage.from("audio").getPublicUrl(audioPath).data.publicUrl;
      }

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
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="title" className="mb-1 block text-sm text-muted">
          Title
        </label>
        <input
          id="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-line bg-surface px-3 py-2 text-base text-foreground outline-none focus:border-accent"
        />
      </div>

      <div>
        <label htmlFor="replyTo" className="mb-1 block text-sm text-muted">
          Replying to (leave blank to start a new song idea)
        </label>
        <select
          id="replyTo"
          value={replyTo}
          onChange={(e) => setReplyTo(e.target.value)}
          className="w-full rounded-md border border-line bg-surface px-3 py-2 text-base text-foreground outline-none focus:border-accent"
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
        <span className="mb-1 block text-sm text-muted">
          Audio{replyTo && " (optional for a reply)"}
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <VoiceRecorder key={recorderKey} onRecorded={handleRecorded} />
          <input
            key={fileInputKey}
            id="audio"
            type="file"
            accept="audio/*"
            onChange={(e) => handleFilePicked(e.target.files?.[0] ?? null)}
            className="text-sm text-muted file:mr-3 file:min-h-11 file:rounded-md file:border-0 file:bg-line file:px-3 file:py-2 file:text-foreground"
          />
        </div>
      </div>

      <div>
        <label htmlFor="cover" className="mb-1 block text-sm text-muted">
          Cover art (optional)
        </label>
        <input
          id="cover"
          type="file"
          accept="image/*"
          onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm text-muted file:mr-3 file:min-h-11 file:rounded-md file:border-0 file:bg-line file:px-3 file:py-2 file:text-foreground"
        />
      </div>

      <div>
        <label htmlFor="notes" className="mb-1 block text-sm text-muted">
          Notes (chords, description, etc.)
        </label>
        <textarea
          id="notes"
          rows={6}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-md border border-line bg-surface px-3 py-2 font-mono text-base text-foreground outline-none focus:border-accent"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="min-h-11 flex-1 rounded-md border border-line px-3 py-2 font-medium text-muted transition hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="min-h-11 flex-1 rounded-md bg-accent px-3 py-2 font-medium text-accent-foreground transition hover:brightness-110 disabled:opacity-60"
        >
          {submitting ? "Uploading…" : "Post"}
        </button>
      </div>
    </form>
  );
}
