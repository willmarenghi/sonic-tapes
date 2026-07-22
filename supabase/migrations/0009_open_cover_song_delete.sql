-- Anyone can now remove any cover song from the list, not just the
-- person who added it (or the admin). Progress dots were already open
-- to everyone; this makes list curation collaborative too.
drop policy if exists "delete own cover song or admin deletes any" on public.cover_songs;

create policy "authenticated users can delete any cover song"
  on public.cover_songs for delete
  to authenticated
  using (true);
