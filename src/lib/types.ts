export type Profile = {
  id: string;
  name: string;
  email: string;
};

export type Post = {
  id: string;
  title: string;
  uploader_id: string;
  audio_url: string;
  cover_art_url: string | null;
  notes: string | null;
  created_at: string;
  parent_post_id: string | null;
};

export type PostWithReplies = Post & {
  uploader: Profile | null;
  replies: PostWithReplies[];
};
