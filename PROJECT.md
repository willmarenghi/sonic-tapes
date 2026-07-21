# Sonic Tapes

A private site for a 5-person band to share song ideas, versions, and feedback.

## Purpose
Band members post song ideas (audio + notes + title + date). If someone wants
to build on an idea, they reply with their own audio file and their own notes.
Nobody ever edits or overwrites anyone else's post — every contribution is a
new, permanent post that references the one it's replying to.

## Access
- Exactly 5 known users, no public signup.
- Simple auth: email + password (or magic link) for each of the 5 accounts,
  created manually/seeded — not self-registration.

## Data model

### users
- id
- name
- email
- password_hash (or auth provider id, if using magic links)

### posts
The only content object. Represents either an original song idea or a reply
building on one — structurally identical, always immutable once created.
- id
- title
- uploader_id -> users.id
- audio_url
- cover_art_url (optional/only required on the original post, if you want)
- notes (text/markdown — chords, description, whatever the poster wants to add;
  set once at creation, never edited afterward)
- created_at (the date)
- parent_post_id -> posts.id, nullable
  - null = original song idea
  - set = this is a reply/addition to that post

No edit or update capability on `posts` at all — creation only. If someone
wants to change something, they post again as a reply.

## Core features (v1)
1. Login (5 fixed accounts)
2. Upload form: audio file + notes + title + optional "replying to ___" picker
   (leave blank to start a new song idea)
3. Feed of song threads, newest first — each thread shows the original post
   and every reply nested underneath it, in order
4. Inline audio player per post
5. Notes/chords shown under each post, read-only after posting
6. (Optional, confirm before building) lightweight text-only comment thread per
   post, for quick remarks that don't need their own audio file — separate from
   the reply-with-audio mechanism above

## Nice-to-have (later)
- Notify bandmates when a new reply is posted to a thread
- Reactions (quick "love this" style feedback) on posts
- Download original audio file

## Suggested stack
- **Frontend/backend:** Next.js (single project, API routes handle uploads/auth)
- **Database + Auth + File storage:** Supabase (Postgres DB, built-in auth,
  storage buckets for audio/cover art — avoids stitching together 3 services)
- **Hosting:** Vercel, connected to a GitHub repo for push-to-deploy
- **Version control:** private GitHub repo, Claude Code commits as it builds

## Getting started in Claude Code
1. Create a private GitHub repo (e.g. `sonic-tapes`)
2. Set up a Supabase project (free tier is enough for 5 users)
3. Point Claude Code at this file and the empty repo, and build from here
