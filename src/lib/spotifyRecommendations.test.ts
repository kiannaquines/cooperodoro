import { beforeEach, describe, expect, it, vi } from "vitest";

const spotifyMocks = vi.hoisted(() => ({ spotifyApi: vi.fn() }));
vi.mock("./spotifyAuth", () => ({ spotifyApi: spotifyMocks.spotifyApi }));

import { loadSpotifyPlaylistDetails, recommendSpotifyPlaylists } from "./spotifyRecommendations";

describe("recommendSpotifyPlaylists", () => {
  beforeEach(() => spotifyMocks.spotifyApi.mockReset());

  it("searches from the source name and excludes saved playlists", async () => {
    spotifyMocks.spotifyApi.mockResolvedValue({ json: vi.fn().mockResolvedValue({ playlists: { items: [
      { id: "saved", name: "Saved mix", external_urls: { spotify: "https://open.spotify.com/playlist/saved" }, images: [], owner: { display_name: "Owner" } },
      { id: "recommended", name: "Deep Focus", external_urls: { spotify: "https://open.spotify.com/playlist/recommended" }, images: [{ url: "https://image/recommended.jpg" }], owner: { display_name: "Spotify" } },
      null,
    ] } }) });

    const result = await recommendSpotifyPlaylists({ id: "local", name: "Calm focus", playlistId: "saved", url: "", sortOrder: 0, active: true }, ["saved"]);

    expect(spotifyMocks.spotifyApi).toHaveBeenCalledWith("/search?q=Calm+focus&type=playlist&limit=10");
    expect(result).toEqual([{ id: "recommended", name: "Deep Focus", url: "https://open.spotify.com/playlist/recommended", imageUrl: "https://image/recommended.jpg", ownerName: "Spotify" }]);
  });
});

describe("loadSpotifyPlaylistDetails", () => {
  beforeEach(() => spotifyMocks.spotifyApi.mockReset());

  it("loads Spotify artwork, catalog name, and owner for saved playlists", async () => {
    spotifyMocks.spotifyApi.mockResolvedValue({ json: vi.fn().mockResolvedValue({
      id: "saved",
      name: "Deep Focus",
      external_urls: { spotify: "https://open.spotify.com/playlist/saved" },
      images: [{ url: "https://image/saved.jpg" }],
      owner: { display_name: "Spotify" },
    }) });

    const result = await loadSpotifyPlaylistDetails([{ id: "local", name: "Work", playlistId: "saved", url: "", sortOrder: 0, active: true }]);

    expect(spotifyMocks.spotifyApi).toHaveBeenCalledWith("/playlists/saved?fields=id%2Cname%2Cexternal_urls%2Cimages%2Cowner(display_name)");
    expect(result).toEqual({ saved: { id: "saved", name: "Deep Focus", url: "https://open.spotify.com/playlist/saved", imageUrl: "https://image/saved.jpg", ownerName: "Spotify" } });
  });

  it("keeps other saved playlist details when one Spotify request fails", async () => {
    spotifyMocks.spotifyApi
      .mockRejectedValueOnce(new Error("Unavailable"))
      .mockResolvedValueOnce({ json: vi.fn().mockResolvedValue({ id: "second", name: "Calm", external_urls: { spotify: "https://open.spotify.com/playlist/second" }, images: [] }) });

    const result = await loadSpotifyPlaylistDetails([
      { id: "one", name: "One", playlistId: "first", url: "", sortOrder: 0, active: true },
      { id: "two", name: "Two", playlistId: "second", url: "", sortOrder: 1, active: false },
    ]);

    expect(result).toEqual({ second: { id: "second", name: "Calm", url: "https://open.spotify.com/playlist/second", imageUrl: null, ownerName: "Spotify" } });
  });
});
