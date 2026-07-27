export type SongLinks = {
  spotify: string;
  appleMusic: string;
  lyrics: string;
};

// No stored per-song URLs exist yet, so these are search-result links built
// from the song's title/artist rather than direct links to the exact track.
export function buildSongLinks(songTitle: string, artist: string | null): SongLinks {
  const query = artist ? `${songTitle} ${artist}` : songTitle;
  const encoded = encodeURIComponent(query);
  return {
    spotify: `https://open.spotify.com/search/${encoded}`,
    appleMusic: `https://music.apple.com/us/search?term=${encoded}`,
    lyrics: `https://genius.com/search?q=${encoded}`,
  };
}
