"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { StatusGauge } from "@/components/StatusGauge";
import { SwipeActions } from "@/components/SwipeActions";
import { SongLinksPanel } from "@/components/SongLinksPanel";
import {
  splitTitleArtist,
  findDuplicateCoverSong,
  isDuplicateTitleError,
  DUPLICATE_TITLE_ERROR,
  type CoverSong,
  type CoverStatus,
} from "@/lib/coverSongs";

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
  position: number;
  created_at: string;
};

type DragState = { showId: string; songs: ShowSong[]; draggingId: string } | null;

function GripIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0" fill="currentColor" aria-hidden>
      <circle cx="5" cy="3" r="1.3" />
      <circle cx="11" cy="3" r="1.3" />
      <circle cx="5" cy="8" r="1.3" />
      <circle cx="11" cy="8" r="1.3" />
      <circle cx="5" cy="13" r="1.3" />
      <circle cx="11" cy="13" r="1.3" />
    </svg>
  );
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
  onDragStart,
  isDragging,
  expanded,
  onToggle,
}: {
  song: ShowSong;
  coverSong: CoverSong | null;
  onRemove: (id: string) => void;
  onDragStart: (songId: string) => void;
  isDragging: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { songTitle, artist } = splitTitleArtist(song.title);
  const isOriginal = song.kind === "original";
  return (
    <li
      data-song-row={song.id}
      className={`flex items-center gap-3 transition-opacity ${isDragging ? "opacity-40" : ""}`}
    >
      <button
        type="button"
        onPointerDown={() => onDragStart(song.id)}
        aria-label="Drag to reorder"
        className="shrink-0 cursor-grab touch-none py-2 text-muted active:cursor-grabbing"
      >
        <GripIcon />
      </button>
      <div className="min-w-0 flex-1">
        <SwipeActions actions={[{ label: "Remove", onClick: () => onRemove(song.id) }]}>
          <div onClick={onToggle} className="flex cursor-pointer items-center justify-between gap-3 py-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1.5">
              <span className={isOriginal ? "text-accent" : "text-foreground"}>{songTitle}</span>
              {artist && <span className="whitespace-nowrap text-muted">- {artist}</span>}
            </div>
            <div className="flex shrink-0 items-center" onClick={(e) => e.stopPropagation()}>
              {coverSong ? (
                <StatusGauge status={coverSong.status} />
              ) : (
                <span className="text-xs lowercase text-muted">original</span>
              )}
            </div>
          </div>
        </SwipeActions>
        {expanded && <SongLinksPanel songTitle={songTitle} artist={artist} />}
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

  const [editingShowId, setEditingShowId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [expandedSongId, setExpandedSongId] = useState<string | null>(null);
  const [songKind, setSongKind] = useState<Record<string, ShowSongKind>>({});
  const [songTitleDraft, setSongTitleDraft] = useState<Record<string, string>>({});
  const [songCoverDraft, setSongCoverDraft] = useState<Record<string, string>>({});
  const [songCoverQuery, setSongCoverQuery] = useState<Record<string, string>>({});
  const [openSuggestionsFor, setOpenSuggestionsFor] = useState<string | null>(null);
  const [addingSongFor, setAddingSongFor] = useState<string | null>(null);

  const [newCoverModal, setNewCoverModal] = useState<{ showId: string } | null>(null);
  const [newCoverTitle, setNewCoverTitle] = useState("");
  const [newCoverArtist, setNewCoverArtist] = useState("");
  const [newCoverStatus, setNewCoverStatus] = useState<CoverStatus>("not_started");
  const [creatingCover, setCreatingCover] = useState(false);
  const [newCoverError, setNewCoverError] = useState<string | null>(null);
  const coverInputWrapperRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const showCardRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const [mobileSuggestionRect, setMobileSuggestionRect] = useState<{
    left: number;
    width: number;
  } | null>(null);

  const [dragState, setDragState] = useState<DragState>(null);
  const dragStateRef = useRef<DragState>(null);
  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  useEffect(() => {
    if (!openSuggestionsFor) return;
    const showId = openSuggestionsFor;
    const updateRect = () => {
      if (window.innerWidth >= 640) {
        setMobileSuggestionRect(null);
        return;
      }
      const wrapEl = coverInputWrapperRefs.current[showId];
      const cardEl = showCardRefs.current[showId];
      if (!wrapEl || !cardEl) return;
      const wrapRect = wrapEl.getBoundingClientRect();
      const cardRect = cardEl.getBoundingClientRect();
      setMobileSuggestionRect({ left: cardRect.left - wrapRect.left, width: cardRect.width });
    };
    updateRect();
    window.addEventListener("resize", updateRect);
    return () => {
      window.removeEventListener("resize", updateRect);
    };
  }, [openSuggestionsFor]);

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
        supabase
          .from("shows")
          .select("*")
          .order("show_date", { ascending: true })
          .order("show_time", { ascending: true }),
        supabase
          .from("show_songs")
          .select("*")
          .order("position", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase.from("cover_songs").select("*"),
      ]);
      setCurrentUserId(user?.id ?? null);
      setShows((showsData as Show[]) ?? []);
      setShowSongs((showSongsData as ShowSong[]) ?? []);
      setCoverSongs((coverSongsData as CoverSong[]) ?? []);
    }

    load();
  }, [reloadKey]);

  // Drag-to-reorder: pointer events (not HTML5 drag/drop) so this works on
  // touch as well as mouse. While a drag is active we track the live
  // reordering in `dragState` and only commit it to Supabase on release.
  useEffect(() => {
    if (!dragState) return;

    function handlePointerMove(e: PointerEvent) {
      const current = dragStateRef.current;
      if (!current) return;
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const row = target?.closest("[data-song-row]");
      const overId = row instanceof HTMLElement ? row.dataset.songRow : undefined;
      if (!overId || overId === current.draggingId) return;

      const fromIndex = current.songs.findIndex((s) => s.id === current.draggingId);
      const toIndex = current.songs.findIndex((s) => s.id === overId);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

      const reordered = [...current.songs];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);
      setDragState({ ...current, songs: reordered });
    }

    async function handlePointerUp() {
      const current = dragStateRef.current;
      setDragState(null);
      if (!current) return;

      const supabase = createClient();
      const results = await Promise.all(
        current.songs.map((s, i) => supabase.from("show_songs").update({ position: i }).eq("id", s.id))
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) {
        setError(errorMessage(failed.error));
      }
      setReloadKey((k) => k + 1);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  function startDrag(showId: string, songs: ShowSong[], songId: string) {
    setDragState({ showId, songs: [...songs], draggingId: songId });
  }

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

  function startEditShow(show: Show) {
    setEditingShowId(show.id);
    setEditDate(show.show_date);
    setEditTime(show.show_time ? show.show_time.slice(0, 5) : "");
    setEditLocation(show.location);
  }

  async function handleSaveEditShow(id: string) {
    if (!editDate || !editLocation.trim()) return;
    setSavingEdit(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("shows")
      .update({
        show_date: editDate,
        show_time: editTime || null,
        location: editLocation.trim(),
      })
      .eq("id", id);

    setSavingEdit(false);
    if (error) {
      setError(errorMessage(error));
      return;
    }
    setEditingShowId(null);
    setReloadKey((k) => k + 1);
  }

  async function handleAddSong(showId: string) {
    if (!currentUserId) return;
    const kind = songKind[showId] ?? "cover";

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

    const position = showSongs.filter((s) => s.show_id === showId).length;
    const supabase = createClient();
    const { error } = await supabase.from("show_songs").insert({
      show_id: showId,
      kind,
      title,
      cover_song_id: coverSongId,
      position,
      added_by: currentUserId,
    });

    setAddingSongFor(null);
    if (error) {
      setError(errorMessage(error));
      return;
    }
    setSongTitleDraft((prev) => ({ ...prev, [showId]: "" }));
    setSongCoverDraft((prev) => ({ ...prev, [showId]: "" }));
    setSongCoverQuery((prev) => ({ ...prev, [showId]: "" }));
    setReloadKey((k) => k + 1);
  }

  function openNewCoverModal(showId: string, query: string) {
    const { songTitle, artist } = splitTitleArtist(query);
    setNewCoverModal({ showId });
    setNewCoverTitle(songTitle.trim());
    setNewCoverArtist((artist ?? "").trim());
    setNewCoverStatus("not_started");
    setNewCoverError(null);
    setOpenSuggestionsFor(null);
  }

  function closeNewCoverModal() {
    setNewCoverModal(null);
  }

  async function handleCreateCoverAndAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newCoverModal || !currentUserId) return;
    const { showId } = newCoverModal;
    const title = `${newCoverTitle.trim()} - ${newCoverArtist.trim()}`;

    const duplicate = findDuplicateCoverSong(coverSongs, title);
    if (duplicate) {
      setNewCoverError(DUPLICATE_TITLE_ERROR);
      return;
    }

    setCreatingCover(true);
    setNewCoverError(null);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("cover_songs")
      .insert({ title, status: newCoverStatus, added_by: currentUserId })
      .select()
      .single();

    if (error || !data) {
      setCreatingCover(false);
      setNewCoverError(isDuplicateTitleError(error) ? DUPLICATE_TITLE_ERROR : errorMessage(error));
      return;
    }

    const cover = data as CoverSong;
    const position = showSongs.filter((s) => s.show_id === showId).length;
    const { error: showSongError } = await supabase.from("show_songs").insert({
      show_id: showId,
      kind: "cover",
      title: cover.title,
      cover_song_id: cover.id,
      position,
      added_by: currentUserId,
    });

    setCreatingCover(false);
    if (showSongError) {
      setNewCoverError(errorMessage(showSongError));
      return;
    }

    setCoverSongs((prev) => [...prev, cover]);
    setSongCoverDraft((prev) => ({ ...prev, [showId]: "" }));
    setSongCoverQuery((prev) => ({ ...prev, [showId]: "" }));
    closeNewCoverModal();
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
        ← back home
      </Link>

      <h1 className="mb-1 font-display text-2xl lowercase text-foreground">shows / setlists</h1>
      <p className="mb-6 text-sm text-muted">
        {shows.length} show{shows.length === 1 ? "" : "s"} on the books.
      </p>

      <form
        onSubmit={handleAddShow}
        className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
      >
        <div className="flex gap-3">
          <label className="flex w-[calc(50%-0.375rem)] min-w-0 flex-col gap-1 overflow-hidden text-xs lowercase text-muted sm:w-[9.5rem]">
            date
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full min-w-0 rounded-md border border-line bg-surface px-2 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </label>
          <label className="flex w-[calc(50%-0.375rem)] min-w-0 flex-col gap-1 overflow-hidden text-xs lowercase text-muted sm:w-[7.5rem]">
            time
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full min-w-0 rounded-md border border-line bg-surface px-2 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </label>
        </div>
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs lowercase text-muted">
          venue
          <input
            type="text"
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="venue / location"
            className="w-full min-w-0 rounded-md border border-line bg-surface px-3 py-2 text-base text-foreground outline-none placeholder:text-muted focus:border-accent"
          />
        </label>
        <button
          type="submit"
          disabled={adding}
          className="min-h-11 w-full shrink-0 rounded-md bg-accent px-4 text-sm font-medium lowercase text-accent-foreground transition hover:brightness-110 disabled:opacity-60 sm:w-auto"
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
            const displaySongs = dragState?.showId === show.id ? dragState.songs : songsForShow;
            const isExpanded = !!expanded[show.id];
            const kind = songKind[show.id] ?? "cover";
            const time = formatShowTime(show.show_time);

            const toggleButton = (
              <div className={`px-4 ${isExpanded ? "" : "pb-3"}`}>
                <button
                  type="button"
                  onClick={() => setExpanded((prev) => ({ ...prev, [show.id]: !prev[show.id] }))}
                  className="w-full border-t border-dashed border-line-dashed pt-2 text-left text-sm font-medium text-accent hover:underline"
                >
                  {isExpanded
                    ? "hide setlist"
                    : `setlist · ${songsForShow.length} song${songsForShow.length === 1 ? "" : "s"}`}
                </button>
              </div>
            );

            return (
              <li
                key={show.id}
                ref={(el) => {
                  showCardRefs.current[show.id] = el;
                }}
                className={`rounded-lg border border-accent bg-surface ${
                  isExpanded ? "" : "overflow-hidden"
                }`}
              >
                {editingShowId === show.id ? (
                  <>
                    <div className="flex flex-col gap-2 px-4 py-3">
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <div className="flex gap-2">
                          <div className="w-[calc(50%-0.25rem)] min-w-0 overflow-hidden sm:w-[9.5rem]">
                            <input
                              type="date"
                              required
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              className="w-full min-w-0 rounded-md border border-line bg-surface px-2 py-2 text-sm text-foreground outline-none focus:border-accent"
                            />
                          </div>
                          <div className="w-[calc(50%-0.25rem)] min-w-0 overflow-hidden sm:w-[7.5rem]">
                            <input
                              type="time"
                              value={editTime}
                              onChange={(e) => setEditTime(e.target.value)}
                              className="w-full min-w-0 rounded-md border border-line bg-surface px-2 py-2 text-sm text-foreground outline-none focus:border-accent"
                            />
                          </div>
                        </div>
                        <input
                          type="text"
                          required
                          value={editLocation}
                          onChange={(e) => setEditLocation(e.target.value)}
                          placeholder="venue / location"
                          className="w-full min-w-0 flex-1 rounded-md border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveEditShow(show.id)}
                          disabled={savingEdit}
                          className="min-h-9 rounded-md bg-accent px-3 text-xs font-medium lowercase text-accent-foreground transition hover:brightness-110 disabled:opacity-60"
                        >
                          {savingEdit ? "Saving…" : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingShowId(null)}
                          className="min-h-9 rounded-md border border-line px-3 text-xs lowercase text-muted transition hover:text-foreground"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                    {toggleButton}
                  </>
                ) : (
                  <SwipeActions
                    actions={[
                      {
                        label: "Edit",
                        onClick: () => startEditShow(show),
                        className: "bg-accent text-accent-foreground",
                      },
                      { label: "Remove", onClick: () => handleDeleteShow(show.id) },
                    ]}
                  >
                    <div>
                      <div className="px-4 py-3">
                        <p className="text-foreground">{show.location}</p>
                        <p className="text-xs text-muted">
                          {formatShowDate(show.show_date)}
                          {time && ` · ${time}`}
                        </p>
                      </div>
                      {toggleButton}
                    </div>
                  </SwipeActions>
                )}

                {isExpanded && (
                  <div className="px-4 pb-3 pt-2">
                    {displaySongs.length > 0 && (
                      <ul className="divide-y divide-line">
                        {displaySongs.map((song) => (
                          <SetlistSong
                            key={song.id}
                            song={song}
                            coverSong={
                              song.cover_song_id
                                ? (coverSongs.find((c) => c.id === song.cover_song_id) ?? null)
                                : null
                            }
                            onRemove={handleRemoveSong}
                            onDragStart={(songId) => startDrag(show.id, songsForShow, songId)}
                            isDragging={dragState?.draggingId === song.id}
                            expanded={expandedSongId === song.id}
                            onToggle={() =>
                              setExpandedSongId((prev) => (prev === song.id ? null : song.id))
                            }
                          />
                        ))}
                      </ul>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <div className="flex shrink-0 overflow-hidden rounded-md border border-line">
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
                        <div
                          ref={(el) => {
                            coverInputWrapperRefs.current[show.id] = el;
                          }}
                          className="relative min-w-0 flex-1"
                        >
                          <input
                            type="text"
                            value={songCoverQuery[show.id] ?? ""}
                            onChange={(e) => {
                              const query = e.target.value;
                              setSongCoverQuery((prev) => ({ ...prev, [show.id]: query }));
                              setSongCoverDraft((prev) => ({ ...prev, [show.id]: "" }));
                            }}
                            onFocus={() => setOpenSuggestionsFor(show.id)}
                            onBlur={() => {
                              setOpenSuggestionsFor((current) => (current === show.id ? null : current));
                              setMobileSuggestionRect(null);
                            }}
                            placeholder="search cover songs…"
                            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent"
                          />
                          {openSuggestionsFor === show.id &&
                            (() => {
                              const rawQuery = (songCoverQuery[show.id] ?? "").trim();
                              const query = rawQuery.toLowerCase();
                              const matches = coverSongs.filter((c) =>
                                c.title.toLowerCase().includes(query)
                              );
                              const exactMatch = coverSongs.some(
                                (c) => c.title.toLowerCase() === query
                              );
                              return (
                                <ul
                                  style={
                                    mobileSuggestionRect
                                      ? { left: mobileSuggestionRect.left, width: mobileSuggestionRect.width }
                                      : undefined
                                  }
                                  className={
                                    mobileSuggestionRect
                                      ? "absolute top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-md border border-line bg-surface shadow-lg shadow-black/30"
                                      : "absolute inset-x-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-md border border-line bg-surface shadow-lg shadow-black/30"
                                  }
                                >
                                  {matches.length === 0 && rawQuery === "" ? (
                                    <li className="px-3 py-2 text-sm text-muted">no matches</li>
                                  ) : (
                                    matches.map((c) => (
                                      <li key={c.id}>
                                        <button
                                          type="button"
                                          onMouseDown={(e) => e.preventDefault()}
                                          onClick={() => {
                                            setSongCoverDraft((prev) => ({ ...prev, [show.id]: c.id }));
                                            setSongCoverQuery((prev) => ({ ...prev, [show.id]: c.title }));
                                            setOpenSuggestionsFor(null);
                                            setMobileSuggestionRect(null);
                                          }}
                                          className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-line"
                                        >
                                          {c.title}
                                        </button>
                                      </li>
                                    ))
                                  )}
                                  {rawQuery !== "" && !exactMatch && (
                                    <li>
                                      <button
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => openNewCoverModal(show.id, rawQuery)}
                                        className="block w-full border-t border-dashed border-line-dashed px-3 py-2 text-left text-sm text-accent hover:bg-line"
                                      >
                                        {`+ add “${rawQuery}” as new cover song`}
                                      </button>
                                    </li>
                                  )}
                                </ul>
                              );
                            })()}
                        </div>
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

      {newCoverModal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-16 sm:pt-24"
          onClick={closeNewCoverModal}
        >
          <div
            className="w-full max-w-sm rounded-lg border border-line bg-surface p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="min-w-0 truncate font-display text-lg lowercase text-foreground">
                add a new cover song
              </h2>
              <button
                type="button"
                onClick={closeNewCoverModal}
                aria-label="Close"
                className="shrink-0 text-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {newCoverError && <p className="mb-3 text-sm text-red-400">{newCoverError}</p>}

            <form onSubmit={handleCreateCoverAndAdd} className="flex flex-col gap-3">
              <label className="flex min-w-0 flex-col gap-1 text-xs lowercase text-muted">
                song title
                <input
                  type="text"
                  required
                  value={newCoverTitle}
                  onChange={(e) => setNewCoverTitle(e.target.value)}
                  placeholder="song title"
                  className="w-full min-w-0 rounded-md border border-line bg-surface px-3 py-2 text-base text-foreground outline-none placeholder:text-muted focus:border-accent"
                />
              </label>
              <label className="flex min-w-0 flex-col gap-1 text-xs lowercase text-muted">
                artist
                <input
                  type="text"
                  required
                  value={newCoverArtist}
                  onChange={(e) => setNewCoverArtist(e.target.value)}
                  placeholder="artist"
                  className="w-full min-w-0 rounded-md border border-line bg-surface px-3 py-2 text-base text-foreground outline-none placeholder:text-muted focus:border-accent"
                />
              </label>
              <div className="flex flex-col gap-1 text-xs lowercase text-muted">
                progress
                <StatusGauge status={newCoverStatus} onChange={setNewCoverStatus} />
              </div>
              <button
                type="submit"
                disabled={creatingCover}
                className="min-h-10 rounded-md bg-accent px-3 text-sm font-medium lowercase text-accent-foreground transition hover:brightness-110 disabled:opacity-60"
              >
                {creatingCover ? "Adding…" : "Add to setlist & cover list"}
              </button>
            </form>
          </div>
        </div>
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
