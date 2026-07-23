"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { PostWithReplies } from "@/lib/types";
import { AudioPlayer } from "@/components/AudioPlayer";
import { Notes } from "@/components/Notes";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function countDescendants(post: PostWithReplies): number {
  return post.replies.reduce((sum, reply) => sum + 1 + countDescendants(reply), 0);
}

export function PostCard({
  post,
  depth = 0,
  currentUserId = null,
  isAdmin = false,
  onDeleted,
  forceExpanded = false,
  anchorId,
}: {
  post: PostWithReplies;
  depth?: number;
  currentUserId?: string | null;
  isAdmin?: boolean;
  onDeleted?: () => void;
  forceExpanded?: boolean;
  anchorId?: string;
}) {
  // null = no manual choice yet, so a search match (forceExpanded) wins;
  // once the user explicitly toggles it, their choice takes over.
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const replyCount = post.replies.length;
  const isOwner = currentUserId === post.uploader_id;
  const canDelete = isOwner || isAdmin;
  const expanded = manualExpanded ?? forceExpanded;

  async function handleDelete() {
    const descendantCount = countDescendants(post);
    const confirmMessage =
      descendantCount > 0
        ? `Delete this post and its ${descendantCount} ${descendantCount === 1 ? "reply" : "replies"}? This can't be undone.`
        : "Delete this post? This can't be undone.";
    if (!window.confirm(confirmMessage)) return;

    setDeleting(true);
    setDeleteError(null);
    const supabase = createClient();
    const { data, error } = await supabase.from("posts").delete().eq("id", post.id).select();

    if (error) {
      setDeleteError(error.message);
      setDeleting(false);
      return;
    }
    if (!data || data.length === 0) {
      setDeleteError(
        "Nothing was deleted — make sure the latest Supabase migration has been run."
      );
      setDeleting(false);
      return;
    }
    onDeleted?.();
  }

  return (
    <div id={anchorId} className={depth > 0 ? "border-l border-line pl-2 sm:pl-4" : ""}>
      <article className="rounded-xl border-2 border-line bg-surface p-4 shadow-sm shadow-black/20">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="break-words font-semibold text-foreground">{post.title}</h3>
            <p className="text-xs text-muted">
              {post.uploader?.name ?? "Unknown"} · {formatDate(post.created_at)}
              {depth > 0 && " · reply"}
              {post.updated_at && ` · edited ${formatDate(post.updated_at)}`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={`/upload?replyTo=${post.id}&mode=voice`}
              className="flex min-h-9 items-center rounded-md border border-line px-2.5 text-xs text-muted hover:border-accent hover:text-foreground"
            >
              Audio reply
            </Link>
            <Link
              href={`/upload?replyTo=${post.id}&mode=text`}
              className="flex min-h-9 items-center rounded-md border border-line px-2.5 text-xs text-muted hover:border-accent hover:text-foreground"
            >
              Text reply
            </Link>
            {isOwner && (
              <Link
                href={`/upload?edit=${post.id}`}
                className="flex min-h-9 items-center rounded-md border border-line px-2.5 text-xs text-muted hover:border-accent hover:text-foreground"
              >
                Edit
              </Link>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex min-h-9 items-center rounded-md border border-line px-2.5 text-xs text-red-400 hover:border-red-400 disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            )}
          </div>
        </div>

        {deleteError && <p className="mt-2 text-xs text-red-400">{deleteError}</p>}

        {post.audio_url && (
          <div className="mt-3">
            <AudioPlayer src={post.audio_url} />
          </div>
        )}

        {post.notes && (
          <div className="mt-3">
            <Notes>{post.notes}</Notes>
          </div>
        )}

        {replyCount > 0 && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setManualExpanded(!expanded)}
              className="text-sm font-medium text-accent hover:underline"
            >
              {expanded ? "Hide replies" : `See ${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}
            </button>
          </div>
        )}
      </article>

      {expanded && replyCount > 0 && (
        <div className="mt-3 space-y-3 pl-2 sm:pl-4">
          {post.replies.map((reply) => (
            <PostCard
              key={reply.id}
              post={reply}
              depth={depth + 1}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onDeleted={onDeleted}
              forceExpanded={forceExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
}
