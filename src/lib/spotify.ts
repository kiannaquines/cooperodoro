const PLAYLIST_PATTERN = /^https:\/\/open\.spotify\.com\/playlist\/([A-Za-z0-9]{10,40})(?:[/?].*)?$/;

export const parseSpotifyPlaylist = (rawUrl: string): { playlistId: string; url: string } | null => {
  const trimmed = rawUrl.trim();
  const match = trimmed.match(PLAYLIST_PATTERN);
  if (!match) return null;
  return { playlistId: match[1], url: `https://open.spotify.com/playlist/${match[1]}` };
};

export const spotifyEmbedUrl = (playlistId: string): string =>
  `https://open.spotify.com/embed/playlist/${encodeURIComponent(playlistId)}?utm_source=generator&theme=0`;
