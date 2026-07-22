-- Lets any band member edit a show's date/time/location in place, same
-- collaborative model as everything else here (cover song status in 0008,
-- show_songs position in 0011).
create policy "authenticated users can update any show"
  on public.shows for update
  to authenticated
  using (true)
  with check (true);

grant update on public.shows to authenticated;
