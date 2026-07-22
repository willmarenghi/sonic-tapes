-- Tracks upcoming (and past) shows: a date, time, and location, plus a
-- setlist built from either the band's originals or the cover songs
-- tracker. Fully collaborative, same as cover_songs (see 0008/0009):
-- anyone can add or remove a show or a setlist entry.
create table if not exists public.shows (
  id uuid primary key default gen_random_uuid(),
  show_date date not null,
  show_time time,
  location text not null,
  created_at timestamptz not null default now(),
  added_by uuid references public.profiles (id) on delete set null
);

alter table public.shows enable row level security;

create policy "shows are readable by authenticated users"
  on public.shows for select
  to authenticated
  using (true);

create policy "authenticated users can add shows"
  on public.shows for insert
  to authenticated
  with check (added_by = auth.uid());

create policy "authenticated users can delete any show"
  on public.shows for delete
  to authenticated
  using (true);

grant select, insert, delete on public.shows to authenticated;

-- Setlist entries. `title` is always stored directly (copied from the
-- cover song's title at add-time for "cover" entries) so a setlist stays
-- readable even if the referenced cover song is later removed from the
-- tracker; `cover_song_id` is only there to look up its live progress.
create table if not exists public.show_songs (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows (id) on delete cascade,
  kind text not null default 'original' check (kind in ('original', 'cover')),
  title text not null,
  cover_song_id uuid references public.cover_songs (id) on delete set null,
  created_at timestamptz not null default now(),
  added_by uuid references public.profiles (id) on delete set null
);

create index if not exists show_songs_show_id_idx on public.show_songs (show_id);

alter table public.show_songs enable row level security;

create policy "show songs are readable by authenticated users"
  on public.show_songs for select
  to authenticated
  using (true);

create policy "authenticated users can add show songs"
  on public.show_songs for insert
  to authenticated
  with check (added_by = auth.uid());

create policy "authenticated users can delete any show song"
  on public.show_songs for delete
  to authenticated
  using (true);

grant select, insert, delete on public.show_songs to authenticated;
