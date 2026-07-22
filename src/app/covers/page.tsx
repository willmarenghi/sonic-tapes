"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";

type CoverStatus = "not_started" | "partial" | "ready";

type CoverSong = {
  id: string;
  title: string;
  status: CoverStatus;
  added_by: string | null;
  created_at: string;
};

const STATUSES: { value: CoverStatus; color: string; label: string; fill: number }[] = [
  { value: "not_started", color: "#e15c4f", label: "not learned", fill: 10 },
  { value: "partial", color: "#e0b23e", label: "in progress", fill: 55 },
  { value: "ready", color: "#6fbf73", label: "stage ready", fill: 100 },
];

function statusInfo(status: CoverStatus) {
  return STATUSES.find((s) => s.value === status) ?? STATUSES[0];
}

const STATUS_ORDER: Record<CoverStatus, number> = { not_started: 0, partial: 1, ready: 2 };

type SortMode = "alpha" | "status" | "date";

function splitTitleArtist(title: string): { songTitle: string; artist: string | null } {
  const separatorIndex = title.indexOf(" - ");
  if (separatorIndex === -1) return { songTitle: title, artist: null };
  return {
    songTitle: title.slice(0, separatorIndex),
    artist: title.slice(separatorIndex + 3),
  };
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
    return err.message;
  }
  return "Something went wrong.";
}

function StatusGauge({
  song,
  onChange,
}: {
  song: CoverSong;
  onChange: (id: string, status: CoverStatus) => void;
}) {
  const current = statusInfo(song.status);
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-xs lowercase text-muted">{current.label}</span>
      <div className="relative h-2.5 w-24 shrink-0 overflow-hidden rounded-full bg-line">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all"
          style={{ width: `${current.fill}%`, background: current.color }}
        />
        <div className="absolute inset-0 flex">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              type="button"
              aria-label={s.label}
              onClick={() => onChange(song.id, s.value)}
              className="flex-1 border-r border-background last:border-r-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function CoversPageContent() {
  const [songs, setSongs] = useState<CoverSong[] | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [songTitle, setSongTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [sortMode, setSortMode] = useState<SortMode>("alpha");

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const [
        {
          data: { user },
        },
        { data: covers },
      ] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("cover_songs").select("*").order("created_at", { ascending: true }),
      ]);
      setCurrentUserId(user?.id ?? null);
      setSongs((covers as CoverSong[]) ?? []);
    }

    load();
  }, [reloadKey]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUserId) return;
    setAdding(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("cover_songs")
      .insert({ title: `${songTitle.trim()} - ${artist.trim()}`, added_by: currentUserId });

    setAdding(false);
    if (error) {
      setError(errorMessage(error));
      return;
    }
    setSongTitle("");
    setArtist("");
    setReloadKey((k) => k + 1);
  }

  async function handleStatusChange(id: string, status: CoverStatus) {
    setError(null);
    const previous = songs;
    setSongs((prev) => prev?.map((s) => (s.id === id ? { ...s, status } : s)) ?? null);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("cover_songs")
      .update({ status })
      .eq("id", id)
      .select();

    if (error) {
      setSongs(previous);
      setError(errorMessage(error));
      return;
    }
    if (!data || data.length === 0) {
      setSongs(previous);
      setError("Nothing was saved — make sure the latest Supabase migration has been run.");
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Remove this cover song from the list?")) return;
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.from("cover_songs").delete().eq("id", id).select();

    if (error) {
      setError(errorMessage(error));
      return;
    }
    if (!data || data.length === 0) {
      setError("Nothing was removed — make sure the latest Supabase migration has been run.");
      return;
    }
    setReloadKey((k) => k + 1);
  }

  if (songs === null) {
    return <p className="text-muted">Loading…</p>;
  }

  const sortedSongs = [...songs].sort((a, b) => {
    if (sortMode === "alpha") return a.title.localeCompare(b.title);
    if (sortMode === "date") return b.created_at.localeCompare(a.created_at);
    return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
  });

  return (
    <div>
      <Link
        href="/"
        className="mb-4 inline-block text-sm font-medium text-accent hover:underline"
      >
        ← back to song ideas
      </Link>

      <h1 className="mb-1 font-display text-2xl lowercase text-foreground">cover songs</h1>
      <p className="mb-6 text-sm text-muted">
        songs the band wants to learn, and how far along we are on each one.
      </p>

      <form onSubmit={handleAdd} className="flex flex-wrap gap-3">
        <input
          type="text"
          required
          value={songTitle}
          onChange={(e) => setSongTitle(e.target.value)}
          placeholder="song title"
          className="min-w-0 flex-1 rounded-md border border-line bg-surface px-3 py-2 text-base text-foreground outline-none placeholder:text-muted focus:border-accent"
        />
        <input
          type="text"
          required
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          placeholder="artist"
          className="min-w-0 flex-1 rounded-md border border-line bg-surface px-3 py-2 text-base text-foreground outline-none placeholder:text-muted focus:border-accent"
        />
        <button
          type="submit"
          disabled={adding}
          className="min-h-11 shrink-0 rounded-md bg-accent px-4 text-sm font-medium lowercase text-accent-foreground transition hover:brightness-110 disabled:opacity-60"
        >
          {adding ? "Adding…" : "Add"}
        </button>
      </form>

      <div className="mt-3 mb-6 flex flex-wrap items-center gap-4 text-xs text-muted">
        {STATUSES.map((s) => (
          <span key={s.value} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: s.color }}
              aria-hidden
            />
            {s.label}
          </span>
        ))}
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {songs.length === 0 ? (
        <p className="text-muted">No cover songs yet — add one above.</p>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-2 text-sm">
            <span className="text-muted">sort:</span>
            <div className="flex shrink-0 overflow-hidden rounded-md border border-line">
              <button
                type="button"
                onClick={() => setSortMode("alpha")}
                className={`min-h-9 px-3 text-xs lowercase transition ${
                  sortMode === "alpha"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted hover:text-foreground"
                }`}
              >
                a–z
              </button>
              <button
                type="button"
                onClick={() => setSortMode("status")}
                className={`min-h-9 px-3 text-xs lowercase transition ${
                  sortMode === "status"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted hover:text-foreground"
                }`}
              >
                by status
              </button>
              <button
                type="button"
                onClick={() => setSortMode("date")}
                className={`min-h-9 px-3 text-xs lowercase transition ${
                  sortMode === "date"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted hover:text-foreground"
                }`}
              >
                date added
              </button>
            </div>
          </div>

          <ul className="space-y-2">
            {sortedSongs.map((song) => {
              const { songTitle, artist } = splitTitleArtist(song.title);
              return (
                <li
                  key={song.id}
                  className="flex items-center justify-between gap-3 rounded-lg border-2 border-line bg-surface px-4 py-3"
                >
                  <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1.5">
                    <span className="text-foreground">{songTitle}</span>
                    {artist && <span className="whitespace-nowrap text-muted">- {artist}</span>}
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <StatusGauge song={song} onChange={handleStatusChange} />
                    <button
                      type="button"
                      onClick={() => handleDelete(song.id)}
                      className="text-xs text-red-400 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

export default function CoversPage() {
  return (
    <RequireAuth>
      <AppShell>
        <CoversPageContent />
      </AppShell>
    </RequireAuth>
  );
}
