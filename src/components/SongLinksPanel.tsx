import { buildSongLinks } from "@/lib/musicLinks";

export function SongLinksPanel({
  songTitle,
  artist,
}: {
  songTitle: string;
  artist: string | null;
}) {
  const links = buildSongLinks(songTitle, artist);
  return (
    <div className="flex flex-col border-t border-dashed border-line-dashed px-4 py-1 text-sm">
      <a
        href={links.spotify}
        target="_blank"
        rel="noopener noreferrer"
        className="py-2 text-[#1DB954]"
      >
        Spotify
      </a>
      <a
        href={links.appleMusic}
        target="_blank"
        rel="noopener noreferrer"
        className="py-2 text-[#FA2D6D]"
      >
        Apple Music
      </a>
      <a href={links.lyrics} target="_blank" rel="noopener noreferrer" className="py-2 text-foreground">
        Lyrics
      </a>
    </div>
  );
}
