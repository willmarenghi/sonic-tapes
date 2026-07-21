"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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

export function UploadForm({
  defaultReplyTo,
  editingPost,
}: {
  defaultReplyTo?: string;
  editingPost?: Post;
}) {
  const router = useRouter();
  const isEditing = !!editingPost;

  const [posts, setPosts] = useState<PostOption[]>([]);
  const [title, setTitle] = useState(editingPost?.title ?? "");
  const [notes, setNotes] = useState(editingPost?.notes ?? "");
  const [replyTo, setReplyTo] = useState(defaultReplyTo ?? "");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [recorderKey, setRecorderKey] = useState(0);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverRemoved, setCoverRemoved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existingAudioUrl = editingPost?.audio_url ?? null;
  const existingCoverUrl = editingPost?.cover_art_url ?? null;
  const effectiveParentPostId = isEditing ? editingPost.parent_post_id : replyTo || null;

  useEffect(() => {
    if (isEditing) return;
    const supabase = createClient();
    supabase
      .from("posts")
      .select("id, title, created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => setPosts((data as PostOption[]) ?? []));
  }, [isEditing]);

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
    const hasAudio = !!audioFile || !!existingAudioUrl;
    if (!effectiveParentPostId && !hasAudio) {
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

      let audioUrl = existingAudioUrl;
      if (audioFile) {
        const audioPath = storagePath(user.id, audioFile);
        const { error: audioError } = await supabase.storage
          .from("audio")
          .upload(audioPath, audioFile);
        if (audioError) throw audioError;
        audioUrl = supabase.storage.from("audio").getPublicUrl(audioPath).data.publicUrl;
      }

      let coverUrl = coverRemoved ? null : existingCoverUrl;
      if (coverFile) {
        const coverPath = storagePath(user.id, coverFile);
        const { error: coverError } = await supabase.storage
          .from("cover-art")
          .upload(coverPath, coverFile);
        if (coverError) throw coverError;
        coverUrl = supabase.storage.from("cover-art").getPublicUrl(coverPath).data.publicUrl;
      }

      if (isEditing) {
        const { error: updateError } = await supabase
          .from("posts")
          .update({
            title,
            notes: notes || null,
            audio_url: audioUrl,
            cover_art_url: coverUrl,
          })
          .eq("id", editingPost.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("posts").insert({
          title,
          uploader_id: user.id,
          audio_url: audioUrl,
          cover_art_url: coverUrl,
          notes: notes || null,
          parent_post_id: effectiveParentPostId,
        });
        if (insertError) throw insertError;
      }

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

      {isEditing ? (
        <p className="text-sm text-muted">
          {editingPost.parent_post_id
            ? "Editing a reply — the thread it belongs to can't be changed."
            : "Editing a song idea."}
        </p>
      ) : (
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
      )}

      <div>
        <span className="mb-1 block text-sm text-muted">
          Audio{effectiveParentPostId && " (optional for a reply)"}
        </span>
        {existingAudioUrl && !audioFile && (
          <p className="mb-2 text-xs text-muted">
            Current:{" "}
            <a href={existingAudioUrl} target="_blank" rel="noreferrer" className="underline">
              audio file
            </a>{" "}
            — record or choose a new one below to replace it.
          </p>
        )}
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
        {existingCoverUrl && !coverFile && !coverRemoved && (
          <div className="mb-2 flex items-center gap-3">
            <div className="relative h-24 w-24 overflow-hidden rounded-md">
              <Image src={existingCoverUrl} alt="" fill sizes="96px" className="object-cover" />
            </div>
            <button
              type="button"
              onClick={() => setCoverRemoved(true)}
              className="min-h-9 rounded-md border border-line px-2.5 text-xs text-red-400 hover:border-red-400"
            >
              Remove image
            </button>
          </div>
        )}
        {coverRemoved && <p className="mb-2 text-xs text-muted">Image will be removed.</p>}
        <input
          id="cover"
          type="file"
          accept="image/*"
          onChange={(e) => {
            setCoverFile(e.target.files?.[0] ?? null);
            if (e.target.files?.[0]) setCoverRemoved(false);
          }}
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
          {submitting ? (isEditing ? "Saving…" : "Uploading…") : isEditing ? "Save changes" : "Post"}
        </button>
      </div>
    </form>
  );
}
