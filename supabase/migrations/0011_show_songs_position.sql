-- Adds explicit ordering to setlist entries so they can be drag-reordered,
-- instead of always sorting by insertion order.
alter table public.show_songs add column if not exists position integer;

-- Backfill existing rows using their current insertion order per show.
with ranked as (
  select id, row_number() over (partition by show_id order by created_at asc) - 1 as rn
  from public.show_songs
)
update public.show_songs s
set position = ranked.rn
from ranked
where s.id = ranked.id
  and s.position is null;

alter table public.show_songs alter column position set default 0;
alter table public.show_songs alter column position set not null;

-- Reordering a setlist means updating other people's rows' `position`,
-- same collaborative model as cover song status (see 0008).
create policy "authenticated users can update show song position"
  on public.show_songs for update
  to authenticated
  using (true)
  with check (true);

grant update on public.show_songs to authenticated;
