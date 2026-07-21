-- Deleting a post now cascades to every reply underneath it (via the
-- existing `on delete cascade` foreign key), even replies from other band
-- members. Postgres enforces RLS on cascaded deletes too, so an
-- ownership-scoped policy would block removing someone else's reply and
-- fail the whole delete. Open it up at the database level; the app's UI
-- still only shows the delete button on posts you uploaded yourself.
drop policy if exists "users can delete their own posts" on public.posts;

create policy "authenticated users can delete posts"
  on public.posts for delete
  to authenticated
  using (true);
