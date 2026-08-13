import { beforeEach, describe, expect, it, vi } from "vitest";

const spotifyMocks = vi.hoisted(() => ({ spotifyApi: vi.fn() }));
vi.mock("./spotifyAuth", () => ({ spotifyApi: spotifyMocks.spotifyApi }));

import { recommendSpotifyPlaylists } from "./spotifyRecommendations";

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
