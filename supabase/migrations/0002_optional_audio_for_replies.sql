-- Replies (posts with a parent_post_id) can now be title + notes only, no
-- audio required — only original song ideas (parent_post_id is null) still
-- need audio, which is enforced client-side, not by the database.
alter table public.posts alter column audio_url drop not null;
