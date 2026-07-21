-- Allow deleting your own posts. The app only shows a delete option for
-- posts with no replies underneath them, so the existing
-- `on delete cascade` on parent_post_id is never expected to fire here —
-- this policy alone doesn't let anyone delete a post that still has
-- replies attached, since the app enforces that client-side.
create policy "users can delete their own posts"
  on public.posts for delete
  to authenticated
  using (uploader_id = auth.uid());

grant delete on public.posts to authenticated;
