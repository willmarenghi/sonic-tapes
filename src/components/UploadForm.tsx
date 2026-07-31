"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { MAX_UPLOAD_BYTES, formatBytes } from "@/lib/audioLimits";
import type { Post } from "@/lib/types";

const QUICK_TAGS = [
  "riff",
  "full song",
  "lyrics only",
  "guitar only",
  "vocals only",
  "chorus only",
  "acoustic",
];

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
  returnView,
  editingPost,
}: {
  defaultReplyTo?: string;
  returnView?: "shelf";
  editingPost?: Post;
}) {
  const router = useRouter();
  const isEditing = !!editingPost;

  const [title, setTitle] = useState(editingPost?.title ?? "");
  const [notes, setNotes] = useState(editingPost?.notes ?? "");
  const [replyMode, setReplyMode] = useState<"voice" | "text">("voice");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [recorderKey, setRecorderKey] = useState(0);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverRemoved, setCoverRemoved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existingAudioUrl = editingPost?.audio_url ?? null;
  const existingCoverUrl = editingPost?.cover_art_url ?? null;
  const effectiveParentPostId = isEditing ? editingPost.parent_post_id : (defaultReplyTo ?? null);
  const isReply = !!effectiveParentPostId;
  const isTextReply = isReply && replyMode === "text";
  // Where Cancel should return to: the post being replied to, or the post
  // being edited (its parent thread, if it's a reply). A brand-new song idea
  // has no post to go back to, so that falls back to router.back().
  const cancelPostId = isEditing
    ? (editingPost.parent_post_id ?? editingPost.id)
    : (effectiveParentPostId ?? null);
  const cancelHref = cancelPostId
    ? `/library?post=${cancelPostId}${returnView ? `&view=${returnView}` : ""}`
    : null;

  function switchReplyMode(mode: "voice" | "text") {
    setReplyMode(mode);
    if (mode === "text") {
      setAudioFile(null);
      setRecorderKey((k) => k + 1);
      setFileInputKey((k) => k + 1);
    }
  }

  function handleRecorded(file: File | null) {
    if (file && file.size > MAX_UPLOAD_BYTES) {
      setError(
        `That recording is ${formatBytes(file.size)}, which is over the ${formatBytes(MAX_UPLOAD_BYTES)} upload limit.`
      );
      setRecorderKey((k) => k + 1);
      return;
    }
    setError(null);
    setAudioFile(file);
    if (file) setFileInputKey((k) => k + 1);
  }

  function addQuickTag(tag: string) {
    setNotes((prev) => {
      const existingEntries = prev
        .split(/[,\n]/)
        .map((part) => part.trim().toLowerCase())
        .filter(Boolean);
      if (existingEntries.includes(tag.toLowerCase())) return prev;
      const trimmed = prev.trim();
      return trimmed ? `${trimmed}, ${tag}` : tag;
    });
  }

  function handleFilePicked(file: File | null) {
    if (file && file.size > MAX_UPLOAD_BYTES) {
      setError(
        `That file is ${formatBytes(file.size)}, which is over the ${formatBytes(MAX_UPLOAD_BYTES)} upload limit.`
      );
      setFileInputKey((k) => k + 1);
      return;
    }
    setError(null);
    setAudioFile(file);
    if (file) setRecorderKey((k) => k + 1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const hasAudio = !!audioFile || !!existingAudioUrl;
    if (!isReply && !hasAudio) {
      setError("An audio file is required to start a new song idea.");
      return;
    }
    if (isReply && !isEditing && replyMode === "voice" && !hasAudio) {
      setError("Add a recording or file for your audio reply.");
      return;
    }
    if (isTextReply && !isEditing && !notes.trim()) {
      setError("Add some text for your reply.");
      return;
    }
    if (audioFile && audioFile.size > MAX_UPLOAD_BYTES) {
      setError(
        `That audio file is ${formatBytes(audioFile.size)}, which is over the ${formatBytes(MAX_UPLOAD_BYTES)} upload limit.`
      );
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
          title: isReply ? "" : title,
          uploader_id: user.id,
          audio_url: audioUrl,
          cover_art_url: coverUrl,
          notes: notes || null,
          parent_post_id: effectiveParentPostId,
        });
        if (insertError) throw insertError;
      }

      router.push("/library");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {!isEditing && isReply && (
        <div>
          <span className="mb-1 block text-sm text-foreground">Reply type</span>
          <div className="inline-flex rounded-md border border-line p-1">
            <button
              type="button"
              onClick={() => switchReplyMode("voice")}
              className={`min-h-9 rounded px-3 text-sm transition ${
                replyMode === "voice"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Audio
            </button>
            <button
              type="button"
              onClick={() => switchReplyMode("text")}
              className={`min-h-9 rounded px-3 text-sm transition ${
                replyMode === "text"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Text only
            </button>
          </div>
        </div>
      )}

      {!isReply && (
        <div>
          <label htmlFor="title" className="mb-1 block text-sm text-foreground">
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
      )}

      {isEditing && (
        <p className="text-sm text-muted">
          {editingPost.parent_post_id
            ? "Editing a reply — the thread it belongs to can't be changed."
            : "Editing a song idea."}
        </p>
      )}

      {!isTextReply && (
        <div>
          <span className="mb-1 block text-sm text-foreground">Audio</span>
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
            <VoiceRecorder key={`recorder-${recorderKey}`} onRecorded={handleRecorded} />
            <input
              key={`file-${fileInputKey}`}
              id="audio"
              type="file"
              accept="audio/*"
              onChange={(e) => handleFilePicked(e.target.files?.[0] ?? null)}
              className="text-sm text-muted file:mr-3 file:min-h-11 file:rounded-md file:border-0 file:bg-line file:px-3 file:py-2 file:text-foreground"
            />
          </div>
          <p className="mt-1 text-xs text-muted">
            Recordings stop automatically at 15 minutes. Files up to {formatBytes(MAX_UPLOAD_BYTES)}.
          </p>
        </div>
      )}

      {!isReply && (
        <div>
          <label htmlFor="cover" className="mb-1 block text-sm text-foreground">
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
      )}

      <div>
        <label htmlFor="notes" className="mb-1 block text-sm text-foreground">
          {isTextReply ? "Your reply" : "Notes (chords, description, etc.)"}
        </label>
        <div className="mb-2 flex flex-wrap gap-2">
          {QUICK_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => addQuickTag(tag)}
              className="rounded-full border border-accent px-2.5 py-1 text-xs lowercase text-accent transition hover:bg-line"
            >
              + {tag}
            </button>
          ))}
        </div>
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
          onClick={() => (cancelHref ? router.push(cancelHref) : router.back())}
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
