-- Lightweight fire-emoji reactions, one per person per post — the
-- primary key itself prevents double-reacting, and reacting again just
-- means deleting your row (the app treats the button as a toggle).
create table if not exists public.reactions (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.reactions enable row level security;

create policy "reactions are readable by authenticated users"
  on public.reactions for select
  to authenticated
  using (true);

create policy "users can react as themselves"
  on public.reactions for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "users can remove their own reaction"
  on public.reactions for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, delete on public.reactions to authenticated;
