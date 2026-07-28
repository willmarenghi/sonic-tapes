"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { StatusGauge } from "@/components/StatusGauge";
import { SwipeActions } from "@/components/SwipeActions";
import { SongLinksPanel } from "@/components/SongLinksPanel";
import { AVATAR_COLORS, getInitials, useBandMembers } from "@/lib/profiles";
import {
  STATUSES,
  STATUS_ORDER,
  splitTitleArtist,
  findDuplicateCoverSong,
  isDuplicateTitleError,
  DUPLICATE_TITLE_ERROR,
  type CoverSong,
  type CoverStatus,
} from "@/lib/coverSongs";

type SortMode = "alpha" | "status" | "date";

type Show = {
  id: string;
  show_date: string;
  show_time: string | null;
  location: string;
};

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
    return err.message;
  }
  return "Something went wrong.";
}

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

function CoversPageContent() {
  const [songs, setSongs] = useState<CoverSong[] | null>(null);
  const [shows, setShows] = useState<Show[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [songTitle, setSongTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [sortMode, setSortMode] = useState<SortMode>("date");
  const [expandedSongId, setExpandedSongId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const members = useBandMembers();

  const [addToSetlistFor, setAddToSetlistFor] = useState<CoverSong | null>(null);
  const [newSetlistMode, setNewSetlistMode] = useState(false);
  const [addingToShowId, setAddingToShowId] = useState<string | null>(null);
  const [creatingSetlist, setCreatingSetlist] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newLocation, setNewLocation] = useState("");

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const [
        {
          data: { user },
        },
        { data: covers },
        { data: showsData },
      ] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("cover_songs").select("*").order("created_at", { ascending: true }),
        supabase
          .from("shows")
          .select("*")
          .order("show_date", { ascending: true })
          .order("show_time", { ascending: true }),
      ]);
      setCurrentUserId(user?.id ?? null);
      setSongs((covers as CoverSong[]) ?? []);
      setShows((showsData as Show[]) ?? []);
    }

    load();
  }, [reloadKey]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUserId) return;
    setError(null);

    const title = `${songTitle.trim()} - ${artist.trim()}`;
    if (songs && findDuplicateCoverSong(songs, title)) {
      setError(DUPLICATE_TITLE_ERROR);
      return;
    }

    setAdding(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("cover_songs")
      .insert({ title, added_by: currentUserId });

    setAdding(false);
    if (error) {
      setError(isDuplicateTitleError(error) ? DUPLICATE_TITLE_ERROR : errorMessage(error));
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

  function toggleLinks(id: string) {
    setExpandedSongId((prev) => (prev === id ? null : id));
  }

  function openAddToSetlist(song: CoverSong) {
    setAddToSetlistFor(song);
    setNewSetlistMode(false);
    setModalError(null);
    setNewDate("");
    setNewTime("");
    setNewLocation("");
  }

  function closeAddToSetlist() {
    setAddToSetlistFor(null);
    setNewSetlistMode(false);
  }

  async function addCoverToShow(showId: string, cover: CoverSong) {
    const supabase = createClient();
    const { count, error: countError } = await supabase
      .from("show_songs")
      .select("id", { count: "exact", head: true })
      .eq("show_id", showId);

    if (countError) {
      setModalError(errorMessage(countError));
      return false;
    }

    const { error } = await supabase.from("show_songs").insert({
      show_id: showId,
      kind: "cover",
      title: cover.title,
      cover_song_id: cover.id,
      position: count ?? 0,
      added_by: currentUserId,
    });

    if (error) {
      setModalError(errorMessage(error));
      return false;
    }
    return true;
  }

  async function handleAddToExistingShow(showId: string) {
    if (!addToSetlistFor) return;
    setModalError(null);
    setAddingToShowId(showId);
    const ok = await addCoverToShow(showId, addToSetlistFor);
    setAddingToShowId(null);
    if (ok) closeAddToSetlist();
  }

  async function handleCreateSetlistAndAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addToSetlistFor || !currentUserId) return;
    setCreatingSetlist(true);
    setModalError(null);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("shows")
      .insert({
        show_date: newDate,
        show_time: newTime || null,
        location: newLocation.trim(),
        added_by: currentUserId,
      })
      .select()
      .single();

    if (error || !data) {
      setCreatingSetlist(false);
      setModalError(errorMessage(error ?? new Error("Could not create the setlist.")));
      return;
    }

    const ok = await addCoverToShow(data.id, addToSetlistFor);
    setCreatingSetlist(false);
    if (ok) {
      setReloadKey((k) => k + 1);
      closeAddToSetlist();
    }
  }

  if (songs === null) {
    return <p className="text-muted">Loading…</p>;
  }

  const sortedSongs = [...songs].sort((a, b) => {
    if (sortMode === "alpha") return a.title.localeCompare(b.title);
    if (sortMode === "date") return b.created_at.localeCompare(a.created_at);
    return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
  });

  const filteredSongs = sortedSongs.filter((song) =>
    song.title.toLowerCase().includes(search.trim().toLowerCase())
  );

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

      {songTitle.trim() &&
        artist.trim() &&
        findDuplicateCoverSong(songs, `${songTitle.trim()} - ${artist.trim()}`) && (
          <p className="-mt-4 mb-4 text-sm text-yellow-500">{DUPLICATE_TITLE_ERROR}</p>
        )}

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {songs.length === 0 ? (
        <p className="text-muted">No cover songs yet — add one above.</p>
      ) : (
        <>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="search cover songs…"
            className="mb-4 w-full rounded-md border border-line bg-surface px-3 py-2 text-base text-foreground outline-none placeholder:text-muted focus:border-accent"
          />

          <div className="mb-4 flex items-center gap-2 text-sm">
            <span className="text-muted">sort:</span>
            <div className="flex shrink-0 overflow-hidden rounded-md border border-line">
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
                onClick={() => setSortMode("alpha")}
                className={`min-h-9 px-3 text-xs lowercase transition ${
                  sortMode === "alpha"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted hover:text-foreground"
                }`}
              >
                a–z
              </button>
            </div>
          </div>

          {filteredSongs.length === 0 && (
            <p className="mb-2 text-sm text-muted">No cover songs match “{search}”.</p>
          )}

          <ul className="space-y-2">
            {filteredSongs.map((song) => {
              const { songTitle, artist } = splitTitleArtist(song.title);
              const memberIndex = members.findIndex((m) => m.id === song.added_by);
              const addedByMember = memberIndex === -1 ? null : members[memberIndex];
              return (
                <li key={song.id} className="relative">
                  <div className="overflow-hidden rounded-lg border-2 border-line">
                    <SwipeActions
                      actions={[
                        {
                          label: "Setlist",
                          onClick: () => openAddToSetlist(song),
                          className: "bg-accent text-accent-foreground",
                        },
                        { label: "Remove", onClick: () => handleDelete(song.id) },
                      ]}
                    >
                      <div
                        onClick={() => toggleLinks(song.id)}
                        className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3"
                      >
                        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1.5">
                          <span className="text-foreground">{songTitle}</span>
                          {artist && <span className="whitespace-nowrap text-muted">- {artist}</span>}
                        </div>
                        <div
                          className="flex shrink-0 items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <StatusGauge
                            status={song.status}
                            onChange={(status) => handleStatusChange(song.id, status)}
                          />
                        </div>
                      </div>
                    </SwipeActions>
                    {expandedSongId === song.id && (
                      <SongLinksPanel songTitle={songTitle} artist={artist} />
                    )}
                  </div>
                  {addedByMember && (
                    <span
                      title={`added by ${addedByMember.name}`}
                      className="absolute left-0 top-6 z-10 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-background text-xs font-bold"
                      style={{
                        background: AVATAR_COLORS[memberIndex % AVATAR_COLORS.length],
                        color: "var(--accent-foreground)",
                      }}
                    >
                      {getInitials(addedByMember.name)}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {addToSetlistFor && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-16 sm:pt-24"
          onClick={closeAddToSetlist}
        >
          <div
            className="w-full max-w-sm rounded-lg border border-line bg-surface p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="min-w-0 truncate font-display text-lg lowercase text-foreground">
                add “{splitTitleArtist(addToSetlistFor.title).songTitle}” to a setlist
              </h2>
              <button
                type="button"
                onClick={closeAddToSetlist}
                aria-label="Close"
                className="shrink-0 text-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {modalError && <p className="mb-3 text-sm text-red-400">{modalError}</p>}

            {newSetlistMode ? (
              <form onSubmit={handleCreateSetlistAndAdd} className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <label className="flex w-[calc(50%-0.375rem)] min-w-0 flex-col gap-1 text-xs lowercase text-muted">
                    date
                    <input
                      type="date"
                      required
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full min-w-0 rounded-md border border-line bg-surface px-2 py-2 text-sm text-foreground outline-none focus:border-accent"
                    />
                  </label>
                  <label className="flex w-[calc(50%-0.375rem)] min-w-0 flex-col gap-1 text-xs lowercase text-muted">
                    time
                    <input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-full min-w-0 rounded-md border border-line bg-surface px-2 py-2 text-sm text-foreground outline-none focus:border-accent"
                    />
                  </label>
                </div>
                <label className="flex min-w-0 flex-col gap-1 text-xs lowercase text-muted">
                  venue
                  <input
                    type="text"
                    required
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="venue / location"
                    className="w-full min-w-0 rounded-md border border-line bg-surface px-3 py-2 text-base text-foreground outline-none placeholder:text-muted focus:border-accent"
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={creatingSetlist}
                    className="min-h-10 flex-1 rounded-md bg-accent px-3 text-sm font-medium lowercase text-accent-foreground transition hover:brightness-110 disabled:opacity-60"
                  >
                    {creatingSetlist ? "Creating…" : "Create & add"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewSetlistMode(false)}
                    className="min-h-10 rounded-md border border-line px-3 text-sm lowercase text-muted transition hover:text-foreground"
                  >
                    back
                  </button>
                </div>
              </form>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setNewSetlistMode(true)}
                  className="mb-3 w-full rounded-md border border-dashed border-accent px-3 py-2 text-left text-sm text-accent transition hover:bg-line"
                >
                  + new setlist
                </button>
                <ul className="flex max-h-64 flex-col gap-3 overflow-y-auto">
                  {shows.length === 0 ? (
                    <li className="py-2 text-sm text-muted">no setlists yet</li>
                  ) : (
                    shows.map((show) => {
                      const time = formatShowTime(show.show_time);
                      return (
                        <li key={show.id}>
                          <button
                            type="button"
                            disabled={addingToShowId === show.id}
                            onClick={() => handleAddToExistingShow(show.id)}
                            className="flex w-full items-center justify-between gap-3 rounded-md border border-accent px-3 py-2 text-left text-sm text-foreground transition hover:bg-line disabled:opacity-60"
                          >
                            <span className="min-w-0 truncate">{show.location}</span>
                            <span className="shrink-0 text-xs text-muted">
                              {formatShowDate(show.show_date)}
                              {time && ` · ${time}`}
                            </span>
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              </>
            )}
          </div>
        </div>
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
