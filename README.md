# Sonic Tapes

A private site for a 5-person band to share song ideas, versions, and feedback.
Members post audio + notes; anyone can reply with their own audio building on
an idea. Posts are never edited — every contribution is a new, permanent post.

A static Next.js site (`output: "export"`) hosted on GitHub Pages, backed by
Supabase (Postgres, Auth, Storage). There is no server: the browser talks to
Supabase directly, and Supabase's Row Level Security is what actually gates
who can read or write what — not the web server, since there isn't one.

## How auth works

Sign-in is email + magic link, no passwords:

1. Enter your email → Supabase emails a sign-in link.
2. Open the link (any device/browser — e.g. tap it from your phone's Mail
   app) → it opens the site and signs that browser in.

No public signup — only the 5 accounts created ahead of time (see below) can
request a link; everyone else's request is rejected. Supabase's default
built-in mailer sends this out of the box — no SMTP setup required (customizing
the email's wording requires connecting a custom SMTP provider, which isn't
necessary for this to work).

Because this is a static site, "you must be logged in to see `/`" is enforced
client-side (a redirect to `/login` if there's no session) rather than by a
server. That redirect is a UX nicety, not the security boundary — the actual
boundary is Supabase RLS: without a valid session, every database query and
storage read comes back empty no matter what page loads. GitHub Pages serves
the page shell publicly (Pages doesn't support private static sites on the
free tier), but the shell without a session shows no band data.

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
3. **Authentication → Providers → Email**: leave Email enabled. Under
   **Auth Settings**, turn **off** "Allow new users to sign up" — combined
   with `shouldCreateUser: false` in the login code, this guarantees only the
   5 pre-created accounts can ever sign in.
4. Nothing to configure for the email itself — Supabase's default template
   for the "Magic Link" email already sends a clickable sign-in link, no
   custom SMTP needed. (Editing the wording/branding of that email does
   require custom SMTP, but that's cosmetic, not required to work.)

## 2. Create the 5 accounts

No public signup — accounts are created manually, no password required.

1. In the Supabase dashboard: **Authentication → Users → Add user**.
2. For each of the 5 band members, add their email, add `{"name": "Their Name"}`
   under **User Metadata**, and tick **Auto Confirm User** (no password
   needed — they'll only ever sign in with an emailed link).
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

These are public values (safe to ship in a static bundle) — RLS is what
actually protects data, not keeping these secret.

## 4. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to
`/login`.

To check the actual static export locally (what GitHub Pages will serve):

```bash
npm run build        # writes ./out
npx serve out         # or any static file server
```

Note the production build uses `basePath: "/sonic-tapes"`, so local links only
resolve correctly if served from a path ending in `/sonic-tapes/` (matching
the GitHub Pages project-site URL) — plain `npx serve out` at the root won't
match paths 1:1, but is enough to sanity-check the build.

## 5. Deploy to GitHub Pages

This repo includes `.github/workflows/deploy-pages.yml`, which builds the
static export and publishes it via GitHub's official Pages actions.

1. **Settings → Secrets and variables → Actions**: add repository secrets
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (same values
   as `.env.local`). These get baked into the static bundle at build time.
2. **Settings → Pages**: set **Source** to **GitHub Actions**.
3. Push to `main` (or run the workflow manually from the Actions tab) — it
   builds and deploys to `https://<your-github-username>.github.io/sonic-tapes/`.

If you rename the repo or serve from a custom domain, update `basePath` in
`next.config.ts` to match (or remove it entirely for a custom domain served
from the root).

## How it works

- **Auth**: email magic link via Supabase Auth (`signInWithOtp` with implicit
  flow), entirely client-side — see "How auth works" above. Implicit flow
  (rather than the newer PKCE default) means the link works even if it's
  opened in a different browser/device than the one that requested it.
- **Route guarding**: `src/components/RequireAuth.tsx` checks for a session
  on mount and redirects to `/login` if there isn't one.
- **Feed** (`/`): fetches all posts and profiles client-side, builds a reply
  tree (`src/lib/threads.ts`) keyed on `parent_post_id`, and renders root
  threads newest-first with replies nested underneath in chronological order.
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
