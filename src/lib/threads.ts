import type { Post, PostWithReplies, Profile } from "@/lib/types";

export function buildThreads(posts: Post[], profiles: Profile[]): PostWithReplies[] {
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const byId = new Map<string, PostWithReplies>();

  for (const post of posts) {
    byId.set(post.id, { ...post, uploader: profileById.get(post.uploader_id) ?? null, replies: [] });
  }

  const roots: PostWithReplies[] = [];

  for (const post of byId.values()) {
    if (post.parent_post_id && byId.has(post.parent_post_id)) {
      byId.get(post.parent_post_id)!.replies.push(post);
    } else {
      roots.push(post);
    }
  }

  const sortAsc = (a: PostWithReplies, b: PostWithReplies) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime();

  function sortRepliesRecursively(post: PostWithReplies) {
    post.replies.sort(sortAsc);
    post.replies.forEach(sortRepliesRecursively);
  }

  roots.forEach(sortRepliesRecursively);

  roots.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return roots;
}

function postMatchesQuery(post: PostWithReplies, query: string): boolean {
  return (
    post.title.toLowerCase().includes(query) ||
    (post.notes?.toLowerCase().includes(query) ?? false) ||
    (post.uploader?.name.toLowerCase().includes(query) ?? false)
  );
}

// True if this post or anything replying to it (at any depth) matches.
export function threadMatchesQuery(post: PostWithReplies, query: string): boolean {
  return (
    postMatchesQuery(post, query) || post.replies.some((reply) => threadMatchesQuery(reply, query))
  );
}
