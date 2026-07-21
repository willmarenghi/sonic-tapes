-- Tracks songs the band wants to learn as covers, and how far along
-- everyone is on each one (not started / partially learned / stage ready).
create table if not exists public.cover_songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default 'not_started' check (status in ('not_started', 'partial', 'ready')),
  created_at timestamptz not null default now(),
  added_by uuid references public.profiles (id) on delete set null
);

alter table public.cover_songs enable row level security;

create policy "cover songs are readable by authenticated users"
  on public.cover_songs for select
  to authenticated
  using (true);

create policy "authenticated users can add cover songs"
  on public.cover_songs for insert
  to authenticated
  with check (added_by = auth.uid());

-- Progress is a shared, collaborative thing — anyone can update the
-- status dots on any cover song as the band practices it.
create policy "authenticated users can update cover song status"
  on public.cover_songs for update
  to authenticated
  using (true)
  with check (true);

-- Removing a song from the list entirely is scoped like posts: whoever
-- added it, or the admin (see 0007).
create policy "delete own cover song or admin deletes any"
  on public.cover_songs for delete
  to authenticated
  using (added_by = auth.uid() or public.is_admin(auth.uid()));

grant select, insert, update, delete on public.cover_songs to authenticated;
