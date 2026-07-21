# Sonic Tapes

A private site for a 5-person band to share song ideas, versions, and feedback.
Members post audio + notes; anyone can reply with their own audio building on
an idea. Posts are never edited — every contribution is a new, permanent post.

Built with Next.js (App Router) and Supabase (Postgres, Auth, Storage).

## Stack

- **Frontend/backend:** Next.js, single project, API routes not needed —
  uploads go straight from the browser to Supabase Storage under RLS.
- **Database + Auth + Storage:** Supabase.
- **Hosting:** Vercel, connected to this GitHub repo for push-to-deploy.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project (the
   free tier is enough for 5 users).
2. In the SQL Editor, run the migration in
   [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql).
   This creates:
   - `profiles` (mirrors `auth.users`, auto-populated by a trigger)
   - `posts` (the only content table — insert + select only, no update/delete
     policies, so posts are immutable once created)
   - `audio` and `cover-art` storage buckets, plus policies so any signed-in
     band member can upload/read files

## 2. Create the 5 accounts

No public signup — accounts are created manually.

1. In the Supabase dashboard: **Authentication → Users → Add user**.
2. For each of the 5 band members, set their email and a password (or send a
   magic link), and add `{"name": "Their Name"}` under **User Metadata**.
3. The `on_auth_user_created` trigger from the migration automatically creates
   a matching row in `profiles`.

## 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your project's values (found
in Supabase under **Project Settings → API**):

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 4. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to
`/login`.

## 5. Deploy

Push this repo to GitHub (already done if you're reading this from the repo)
and import it into [Vercel](https://vercel.com/new). Add the same two
`NEXT_PUBLIC_SUPABASE_*` environment variables in the Vercel project settings.
Every push to the connected branch redeploys automatically.

## How it works

- **Auth**: email + password via Supabase Auth. `src/proxy.ts` (Next's
  middleware convention) refreshes the session on every request and redirects
  signed-out visitors to `/login`.
- **Feed** (`/`): fetches all posts and profiles, builds a reply tree
  (`src/lib/threads.ts`) keyed on `parent_post_id`, and renders root threads
  newest-first with replies nested underneath in chronological order.
- **Posting** (`/upload`): uploads the audio file (and optional cover art)
  directly to Supabase Storage from the browser, then inserts a `posts` row.
  Leaving "replying to" blank starts a new song idea; picking an existing post
  files the upload as a reply to it.
- **Immutability**: the `posts` table has no update/delete RLS policies, so
  once a post is created it can never be changed — a correction is just a new
  reply.

## Not built yet (see PROJECT.md)

- Text-only comment threads (separate from audio replies) — optional, confirm
  before building.
- Notifications on new replies, reactions, downloading original audio files.
