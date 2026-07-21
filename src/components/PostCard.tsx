"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
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

export function PostCard({ post, depth = 0 }: { post: PostWithReplies; depth?: number }) {
  const [expanded, setExpanded] = useState(false);
  const replyCount = post.replies.length;

  return (
    <div className={depth > 0 ? "border-l border-line pl-2 sm:pl-4" : ""}>
      <article className="rounded-xl border-2 border-line bg-surface p-4 shadow-sm shadow-black/20">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="break-words font-semibold text-foreground">{post.title}</h3>
            <p className="text-xs text-muted">
              {post.uploader?.name ?? "Unknown"} · {formatDate(post.created_at)}
              {depth > 0 && " · reply"}
            </p>
          </div>
          <Link
            href={`/upload?replyTo=${post.id}`}
            className="flex min-h-9 shrink-0 items-center rounded-md border border-line px-2.5 text-xs text-muted hover:border-accent hover:text-foreground"
          >
            Reply
          </Link>
        </div>

        {post.cover_art_url && (
          <div className="relative mt-3 h-40 w-40 overflow-hidden rounded-md">
            <Image
              src={post.cover_art_url}
              alt=""
              fill
              sizes="160px"
              className="object-cover"
            />
          </div>
        )}

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
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 text-sm font-medium text-accent hover:underline"
          >
            {expanded ? "Hide replies" : `See ${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}
          </button>
        )}
      </article>

      {expanded && replyCount > 0 && (
        <div className="mt-3 space-y-3 pl-2 sm:pl-4">
          {post.replies.map((reply) => (
            <PostCard key={reply.id} post={reply} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
