"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";

type CoverStatus = "not_started" | "partial" | "ready";

type CoverSong = {
  id: string;
  title: string;
  status: CoverStatus;
  added_by: string | null;
};

const STATUSES: { value: CoverStatus; color: string }[] = [
  { value: "not_started", color: "#e15c4f" },
  { value: "partial", color: "#e0b23e" },
  { value: "ready", color: "#6fbf73" },
];

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
    return err.message;
  }
  return "Something went wrong.";
}

function StatusDots({
  song,
  onChange,
}: {
  song: CoverSong;
  onChange: (id: string, status: CoverStatus) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {STATUSES.map((s) => (
        <button
          key={s.value}
          type="button"
          aria-label={s.value.replace("_", " ")}
          onClick={() => onChange(song.id, s.value)}
          className="h-4 w-4 shrink-0 rounded-full border-2 transition"
          style={{
            borderColor: s.color,
            background: song.status === s.value ? s.color : "transparent",
          }}
        />
      ))}
    </div>
  );
}

function CoversPageContent() {
  const [songs, setSongs] = useState<CoverSong[] | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const [
        {
          data: { user },
        },
        { data: profiles },
        { data: covers },
      ] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("profiles").select("id, is_admin"),
        supabase.from("cover_songs").select("*").order("created_at", { ascending: true }),
      ]);
      setCurrentUserId(user?.id ?? null);
      setIsAdmin(
        !!(profiles as { id: string; is_admin: boolean }[] | null)?.find((p) => p.id === user?.id)
          ?.is_admin
      );
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
      .insert({ title: title.trim(), added_by: currentUserId });

    setAdding(false);
    if (error) {
      setError(errorMessage(error));
      return;
    }
    setTitle("");
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

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl lowercase text-foreground">cover songs</h1>
      <p className="mb-6 text-sm text-muted">
        songs the band wants to learn, and how far along we are on each one.
      </p>

      <form onSubmit={handleAdd} className="mb-6 flex gap-3">
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="add a cover song…"
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
        <ul className="space-y-2">
          {songs.map((song) => (
            <li
              key={song.id}
              className="flex items-center justify-between gap-3 rounded-lg border-2 border-line bg-surface px-4 py-3"
            >
              <span className="min-w-0 truncate text-foreground">{song.title}</span>
              <div className="flex shrink-0 items-center gap-4">
                <StatusDots song={song} onChange={handleStatusChange} />
                {(song.added_by === currentUserId || isAdmin) && (
                  <button
                    type="button"
                    onClick={() => handleDelete(song.id)}
                    className="text-xs text-red-400 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
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
