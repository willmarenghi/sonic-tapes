-- Posts can now be edited by their uploader (title, notes, audio, cover
-- art) — a deliberate departure from the original "posts are permanent"
-- design. `updated_at` is stamped automatically by a trigger, not set by
-- the client, so every edit stays visible to bandmates as "edited <date>"
-- even though the content itself can change.
alter table public.posts add column if not exists updated_at timestamptz;

create or replace function public.handle_post_updated()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_post_updated on public.posts;
create trigger on_post_updated
  before update on public.posts
  for each row execute procedure public.handle_post_updated();

create policy "users can update their own posts"
  on public.posts for update
  to authenticated
  using (uploader_id = auth.uid())
  with check (uploader_id = auth.uid());

grant update on public.posts to authenticated;
