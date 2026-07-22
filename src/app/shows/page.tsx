"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { StatusGauge } from "@/components/StatusGauge";
import { splitTitleArtist, type CoverSong } from "@/lib/coverSongs";

type Show = {
  id: string;
  show_date: string;
  show_time: string | null;
  location: string;
  created_at: string;
  added_by: string | null;
};

type ShowSongKind = "original" | "cover";

type ShowSong = {
  id: string;
  show_id: string;
  kind: ShowSongKind;
  title: string;
  cover_song_id: string | null;
  created_at: string;
};

function formatShowDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatShowTime(timeStr: string | null) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
    return err.message;
  }
  return "Something went wrong.";
}

function SetlistSong({
  song,
  coverSong,
  onRemove,
}: {
  song: ShowSong;
  coverSong: CoverSong | null;
  onRemove: (id: string) => void;
}) {
  const { songTitle, artist } = splitTitleArtist(song.title);
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1.5">
        <span className="text-foreground">{songTitle}</span>
        {artist && <span className="whitespace-nowrap text-muted">- {artist}</span>}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {coverSong ? (
          <StatusGauge status={coverSong.status} />
        ) : (
          <span className="text-xs lowercase text-muted">original</span>
        )}
        <button
          type="button"
          onClick={() => onRemove(song.id)}
          className="text-xs text-red-400 hover:underline"
        >
          Remove
        </button>
      </div>
    </li>
  );
}

function ShowsPageContent() {
  const [shows, setShows] = useState<Show[] | null>(null);
  const [showSongs, setShowSongs] = useState<ShowSong[]>([]);
  const [coverSongs, setCoverSongs] = useState<CoverSong[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [adding, setAdding] = useState(false);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [songKind, setSongKind] = useState<Record<string, ShowSongKind>>({});
  const [songTitleDraft, setSongTitleDraft] = useState<Record<string, string>>({});
  const [songCoverDraft, setSongCoverDraft] = useState<Record<string, string>>({});
  const [addingSongFor, setAddingSongFor] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const [
        {
          data: { user },
        },
        { data: showsData },
        { data: showSongsData },
        { data: coverSongsData },
      ] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("shows").select("*").order("show_date", { ascending: true }),
        supabase.from("show_songs").select("*").order("created_at", { ascending: true }),
        supabase.from("cover_songs").select("*"),
      ]);
      setCurrentUserId(user?.id ?? null);
      setShows((showsData as Show[]) ?? []);
      setShowSongs((showSongsData as ShowSong[]) ?? []);
      setCoverSongs((coverSongsData as CoverSong[]) ?? []);
    }

    load();
  }, [reloadKey]);

  async function handleAddShow(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUserId) return;
    setAdding(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.from("shows").insert({
      show_date: date,
      show_time: time || null,
      location: location.trim(),
      added_by: currentUserId,
    });

    setAdding(false);
    if (error) {
      setError(errorMessage(error));
      return;
    }
    setDate("");
    setTime("");
    setLocation("");
    setReloadKey((k) => k + 1);
  }

  async function handleDeleteShow(id: string) {
    if (!window.confirm("Remove this show?")) return;
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.from("shows").delete().eq("id", id).select();

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

  async function handleAddSong(showId: string) {
    if (!currentUserId) return;
    const kind = songKind[showId] ?? "original";

    let title = "";
    let coverSongId: string | null = null;

    if (kind === "cover") {
      coverSongId = songCoverDraft[showId] || null;
      if (!coverSongId) return;
      const cover = coverSongs.find((c) => c.id === coverSongId);
      if (!cover) return;
      title = cover.title;
    } else {
      title = (songTitleDraft[showId] ?? "").trim();
      if (!title) return;
    }

    setAddingSongFor(showId);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.from("show_songs").insert({
      show_id: showId,
      kind,
      title,
      cover_song_id: coverSongId,
      added_by: currentUserId,
    });

    setAddingSongFor(null);
    if (error) {
      setError(errorMessage(error));
      return;
    }
    setSongTitleDraft((prev) => ({ ...prev, [showId]: "" }));
    setSongCoverDraft((prev) => ({ ...prev, [showId]: "" }));
    setReloadKey((k) => k + 1);
  }

  async function handleRemoveSong(id: string) {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("show_songs").delete().eq("id", id);

    if (error) {
      setError(errorMessage(error));
      return;
    }
    setReloadKey((k) => k + 1);
  }

  if (shows === null) {
    return <p className="text-muted">Loading…</p>;
  }

  return (
    <div>
      <Link href="/" className="mb-4 inline-block text-sm font-medium text-accent hover:underline">
        ← back to song ideas
      </Link>

      <h1 className="mb-1 font-display text-2xl lowercase text-foreground">shows</h1>
      <p className="mb-6 text-sm text-muted">
        {shows.length} show{shows.length === 1 ? "" : "s"} on the books.
      </p>

      <form onSubmit={handleAddShow} className="mb-6 flex flex-wrap gap-3">
        <input
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="min-w-0 rounded-md border border-line bg-surface px-3 py-2 text-base text-foreground outline-none focus:border-accent"
        />
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="min-w-0 rounded-md border border-line bg-surface px-3 py-2 text-base text-foreground outline-none focus:border-accent"
        />
        <input
          type="text"
          required
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="venue / location"
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

      {shows.length === 0 ? (
        <p className="text-muted">No shows on the books yet — add one above.</p>
      ) : (
        <ul className="space-y-2">
          {shows.map((show) => {
            const songsForShow = showSongs.filter((s) => s.show_id === show.id);
            const isExpanded = !!expanded[show.id];
            const kind = songKind[show.id] ?? "original";
            const time = formatShowTime(show.show_time);

            return (
              <li key={show.id} className="rounded-lg border-2 border-line bg-surface px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-foreground">{show.location}</p>
                    <p className="text-xs text-muted">
                      {formatShowDate(show.show_date)}
                      {time && ` · ${time}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteShow(show.id)}
                    className="shrink-0 text-xs text-red-400 hover:underline"
                  >
                    Remove
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setExpanded((prev) => ({ ...prev, [show.id]: !prev[show.id] }))}
                  className="mt-3 border-t border-dashed border-line-dashed pt-2 text-sm font-medium text-accent hover:underline"
                >
                  {isExpanded
                    ? "hide setlist"
                    : `setlist · ${songsForShow.length} song${songsForShow.length === 1 ? "" : "s"}`}
                </button>

                {isExpanded && (
                  <div className="mt-2">
                    {songsForShow.length > 0 && (
                      <ul className="divide-y divide-line">
                        {songsForShow.map((song) => (
                          <SetlistSong
                            key={song.id}
                            song={song}
                            coverSong={
                              song.cover_song_id
                                ? (coverSongs.find((c) => c.id === song.cover_song_id) ?? null)
                                : null
                            }
                            onRemove={handleRemoveSong}
                          />
                        ))}
                      </ul>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <div className="flex shrink-0 overflow-hidden rounded-md border border-line">
                        <button
                          type="button"
                          onClick={() => setSongKind((prev) => ({ ...prev, [show.id]: "original" }))}
                          className={`min-h-9 px-3 text-xs lowercase transition ${
                            kind === "original"
                              ? "bg-accent text-accent-foreground"
                              : "text-muted hover:text-foreground"
                          }`}
                        >
                          original
                        </button>
                        <button
                          type="button"
                          onClick={() => setSongKind((prev) => ({ ...prev, [show.id]: "cover" }))}
                          className={`min-h-9 px-3 text-xs lowercase transition ${
                            kind === "cover"
                              ? "bg-accent text-accent-foreground"
                              : "text-muted hover:text-foreground"
                          }`}
                        >
                          cover
                        </button>
                      </div>

                      {kind === "original" ? (
                        <input
                          type="text"
                          value={songTitleDraft[show.id] ?? ""}
                          onChange={(e) =>
                            setSongTitleDraft((prev) => ({ ...prev, [show.id]: e.target.value }))
                          }
                          placeholder="song title"
                          className="min-w-0 flex-1 rounded-md border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent"
                        />
                      ) : (
                        <select
                          value={songCoverDraft[show.id] ?? ""}
                          onChange={(e) =>
                            setSongCoverDraft((prev) => ({ ...prev, [show.id]: e.target.value }))
                          }
                          className="min-w-0 flex-1 rounded-md border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                        >
                          <option value="">choose a cover song…</option>
                          {coverSongs.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.title}
                            </option>
                          ))}
                        </select>
                      )}

                      <button
                        type="button"
                        onClick={() => handleAddSong(show.id)}
                        disabled={addingSongFor === show.id}
                        className="min-h-9 shrink-0 rounded-md bg-accent px-3 text-xs font-medium lowercase text-accent-foreground transition hover:brightness-110 disabled:opacity-60"
                      >
                        {addingSongFor === show.id ? "Adding…" : "Add"}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function ShowsPage() {
  return (
    <RequireAuth>
      <AppShell>
        <ShowsPageContent />
      </AppShell>
    </RequireAuth>
  );
}
