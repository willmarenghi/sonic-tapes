-- Caps audio uploads at 100 MB so long/uncompressed recordings fail with a
-- clear Supabase storage error instead of silently hitting the project's
-- default 50 MB bucket limit. Keep this in sync with MAX_UPLOAD_BYTES in
-- src/lib/audioLimits.ts, which enforces the same limit client-side first.
update storage.buckets
set file_size_limit = 104857600, -- 100 MB
    allowed_mime_types = array['audio/*']
where id = 'audio';
