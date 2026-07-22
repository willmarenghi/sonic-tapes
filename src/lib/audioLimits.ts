// Shared caps for voice recording and audio uploads. Keep MAX_UPLOAD_BYTES in
// sync with the `file_size_limit` set on the `audio` bucket in
// supabase/migrations/0013_audio_upload_limits.sql — this constant produces a
// friendly client-side error, but Supabase enforces the real ceiling.
export const MAX_RECORDING_MS = 15 * 60 * 1000; // 15 minutes
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB

export function formatBytes(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
}
