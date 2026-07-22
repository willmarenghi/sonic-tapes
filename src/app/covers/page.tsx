"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { StatusGauge } from "@/components/StatusGauge";
import { SwipeActions } from "@/components/SwipeActions";
import {
  STATUSES,
  STATUS_ORDER,
  splitTitleArtist,
  type CoverSong,
  type CoverStatus,
} from "@/lib/coverSongs";

type SortMode = "alpha" | "status" | "date";

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
    return err.message;
  }
  return "Something went wrong.";
}

function CoversPageContent() {
  const [songs, setSongs] = useState<CoverSong[] | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [songTitle, setSongTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [sortMode, setSortMode] = useState<SortMode>("status");

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

  const statusCounts = STATUSES.map((s) => ({
    ...s,
    count: songs.filter((song) => song.status === s.value).length,
  }));

  return (
    <div>
      <Link
        href="/"
        className="mb-4 inline-block text-sm font-medium text-accent hover:underline"
      >
        ← back home
      </Link>

      <h1 className="mb-1 font-display text-2xl lowercase text-foreground">cover songs</h1>
      <p className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
        <span>
          {songs.length} song{songs.length === 1 ? "" : "s"}:
        </span>
        {statusCounts.map((s) => (
          <span key={s.value} className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} aria-hidden />
            {s.count}
          </span>
        ))}
      </p>

      <form onSubmit={handleAdd} className="mb-6 flex flex-wrap gap-3">
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
                <li key={song.id} className="overflow-hidden rounded-lg border-2 border-line">
                  <SwipeActions actions={[{ label: "Remove", onClick: () => handleDelete(song.id) }]}>
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1.5">
                        <span className="text-foreground">{songTitle}</span>
                        {artist && <span className="whitespace-nowrap text-muted">- {artist}</span>}
                      </div>
                      <div className="flex shrink-0 items-center gap-4">
                        <StatusGauge
                          status={song.status}
                          onChange={(status) => handleStatusChange(song.id, status)}
                        />
                      </div>
                    </div>
                  </SwipeActions>
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
