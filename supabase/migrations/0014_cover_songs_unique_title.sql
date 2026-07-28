-- Prevent the same cover song from being entered twice (case-insensitive,
-- ignoring surrounding whitespace). The app already checks for duplicates
-- before inserting, but this closes the race where two people add the same
-- song at once.
create unique index if not exists cover_songs_title_unique_idx
  on public.cover_songs (lower(trim(title)));
