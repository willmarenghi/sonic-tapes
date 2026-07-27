"use client";

import { useEffect, useRef, useState } from "react";
import { buildSongLinks } from "@/lib/musicLinks";

function DotsIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0" fill="currentColor" aria-hidden>
      <circle cx="3" cy="8" r="1.3" />
      <circle cx="8" cy="8" r="1.3" />
      <circle cx="13" cy="8" r="1.3" />
    </svg>
  );
}

export function SongLinksMenu({
  songTitle,
  artist,
}: {
  songTitle: string;
  artist: string | null;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const links = buildSongLinks(songTitle, artist);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Find "${songTitle}" on Spotify, Apple Music, or lyrics`}
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition hover:bg-line hover:text-foreground"
      >
        <DotsIcon />
      </button>

      {open && (
        <ul
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-md border border-line bg-surface shadow-lg shadow-black/30"
        >
          <li role="none">
            <a
              role="menuitem"
              href={links.spotify}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm text-foreground hover:bg-line"
            >
              Spotify
            </a>
          </li>
          <li role="none">
            <a
              role="menuitem"
              href={links.appleMusic}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm text-foreground hover:bg-line"
            >
              Apple Music
            </a>
          </li>
          <li role="none">
            <a
              role="menuitem"
              href={links.lyrics}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm text-foreground hover:bg-line"
            >
              Lyrics
            </a>
          </li>
        </ul>
      )}
    </div>
  );
}
