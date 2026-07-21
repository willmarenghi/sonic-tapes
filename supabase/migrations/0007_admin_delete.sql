-- Lets one designated "admin" profile delete anyone's post/reply, while
-- everyone else keeps the existing behavior: delete your own posts (and,
-- via cascade, all replies underneath your own thread regardless of who
-- wrote them — see 0004). Only the admin can additionally reach into
-- someone else's post/thread and delete it directly.

alter table public.profiles add column if not exists is_admin boolean not null default false;

-- Flag the band's owner as admin. Adjust the email below if needed.
update public.profiles set is_admin = true where email = 'willmarenghi@gmail.com';

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = uid), false);
$$;

-- Walks a post's parent_post_id chain up to its thread root and returns
-- that root's uploader_id, so "delete my own thread" can still cascade to
-- replies written by other people without opening delete up to everyone.
create or replace function public.thread_root_owner(post_id uuid)
returns uuid
language sql
stable
security definer set search_path = public
as $$
  with recursive chain as (
    select id, uploader_id, parent_post_id
    from public.posts
    where id = post_id
    union all
    select p.id, p.uploader_id, p.parent_post_id
    from public.posts p
    join chain c on p.id = c.parent_post_id
  )
  select uploader_id from chain where parent_post_id is null limit 1;
$$;

grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.thread_root_owner(uuid) to authenticated;

drop policy if exists "authenticated users can delete posts" on public.posts;

create policy "delete own posts, own threads, or admin deletes any"
  on public.posts for delete
  to authenticated
  using (
    uploader_id = auth.uid()
    or public.is_admin(auth.uid())
    or public.thread_root_owner(id) = auth.uid()
  );
