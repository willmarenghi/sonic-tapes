-- Sonic Tapes schema
-- Run this in the Supabase SQL editor (or via `supabase db push`) on a fresh project.

-- ---------------------------------------------------------------------------
-- profiles: one row per band member, mirrors auth.users
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Any signed-in band member can see everyone's name (needed to render "posted by").
create policy "profiles are readable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

-- Explicit grants so this works whether or not the project has "Automatically
-- expose new tables" enabled — RLS policies alone don't grant table access.
grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;

-- Auto-create a profile row whenever a user is added in Supabase Auth.
-- Seed the 5 accounts via the Supabase dashboard (Authentication > Users > Add user).
-- No password is needed since sign-in is email-code (OTP) only — set
-- user_metadata: { "name": "Full Name" } and this trigger fills in `profiles`.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- posts: the only content object. Immutable once created (insert + select only).
-- ---------------------------------------------------------------------------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  uploader_id uuid not null references public.profiles (id) on delete cascade,
  audio_url text not null,
  cover_art_url text,
  notes text,
  created_at timestamptz not null default now(),
  parent_post_id uuid references public.posts (id) on delete cascade
);

create index if not exists posts_parent_post_id_idx on public.posts (parent_post_id);
create index if not exists posts_created_at_idx on public.posts (created_at);

alter table public.posts enable row level security;

-- All 5 band members can read every post.
create policy "posts are readable by authenticated users"
  on public.posts for select
  to authenticated
  using (true);

-- Members can only post as themselves.
create policy "users can insert their own posts"
  on public.posts for insert
  to authenticated
  with check (uploader_id = auth.uid());

-- No update/delete policies are defined on purpose: posts are permanent.

-- Same reasoning as the `profiles` grant above — select + insert only,
-- matching the RLS policies (no update/delete privilege at all).
grant select, insert on public.posts to authenticated;

-- ---------------------------------------------------------------------------
-- Storage buckets for audio and cover art
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('audio', 'audio', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('cover-art', 'cover-art', true)
on conflict (id) do nothing;

create policy "authenticated users can read audio"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'audio');

create policy "authenticated users can upload audio"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'audio');

create policy "authenticated users can read cover art"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'cover-art');

create policy "authenticated users can upload cover art"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'cover-art');
