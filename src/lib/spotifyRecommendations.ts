import { spotifyApi } from "./spotifyAuth";
import type { SpotifyPlaylist } from "../types";

export interface SpotifyPlaylistRecommendation {
  id: string;
  name: string;
  url: string;
  imageUrl: string | null;
  ownerName: string;
}

interface SpotifySearchResponse {
  playlists?: {
    items?: Array<{
      id?: string;
      name?: string;
      external_urls?: { spotify?: string };
      images?: Array<{ url?: string }>;
      owner?: { display_name?: string | null };
    } | null>;
  };
}

export const recommendSpotifyPlaylists = async (source: SpotifyPlaylist, savedPlaylistIds: string[]): Promise<SpotifyPlaylistRecommendation[]> => {
  const query = new URLSearchParams({ q: source.name, type: "playlist", limit: "10" });
  const response = await spotifyApi(`/search?${query.toString()}`);
  const data = await response.json() as SpotifySearchResponse;
  const saved = new Set(savedPlaylistIds);
  return (data.playlists?.items ?? [])
    .filter((item): item is NonNullable<typeof item> => Boolean(item?.id && item.name && item.external_urls?.spotify))
    .filter((item) => !saved.has(item.id!))
    .slice(0, 3)
    .map((item) => ({
      id: item.id!,
      name: item.name!,
      url: item.external_urls!.spotify!,
      imageUrl: item.images?.[0]?.url ?? null,
      ownerName: item.owner?.display_name?.trim() || "Spotify",
    }));
};
