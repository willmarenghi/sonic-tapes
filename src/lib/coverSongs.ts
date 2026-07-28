export type CoverStatus = "not_started" | "partial" | "ready";

export type CoverSong = {
  id: string;
  title: string;
  status: CoverStatus;
  added_by: string | null;
  created_at: string;
};

export const STATUSES: { value: CoverStatus; color: string; label: string; fill: number }[] = [
  { value: "not_started", color: "#e15c4f", label: "not learned", fill: 10 },
  { value: "partial", color: "#e0b23e", label: "in progress", fill: 55 },
  { value: "ready", color: "#6fbf73", label: "stage ready", fill: 100 },
];

export const STATUS_ORDER: Record<CoverStatus, number> = { not_started: 0, partial: 1, ready: 2 };

export function statusInfo(status: CoverStatus) {
  return STATUSES.find((s) => s.value === status) ?? STATUSES[0];
}

export function splitTitleArtist(title: string): { songTitle: string; artist: string | null } {
  const separatorIndex = title.indexOf(" - ");
  if (separatorIndex === -1) return { songTitle: title, artist: null };
  return {
    songTitle: title.slice(0, separatorIndex),
    artist: title.slice(separatorIndex + 3),
  };
}

export function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

export function findDuplicateCoverSong(
  songs: CoverSong[],
  title: string
): CoverSong | undefined {
  const target = normalizeTitle(title);
  return songs.find((s) => normalizeTitle(s.title) === target);
}

export const DUPLICATE_TITLE_ERROR = "That song's already on the cover list.";

export function isDuplicateTitleError(err: unknown): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    "code" in err &&
    (err as { code?: unknown }).code === "23505"
  );
}
