import { describe, expect, it } from "vitest";
import { parseSpotifyPlaylist, spotifyEmbedUrl } from "./spotify";

describe("Spotify playlist URLs", () => {
  it("normalizes a playlist URL and drops tracking parameters", () => {
    expect(parseSpotifyPlaylist("https://open.spotify.com/playlist/37i9dQZF1DX8NTLI2TtZa6?si=test")).toEqual({
      playlistId: "37i9dQZF1DX8NTLI2TtZa6",
      url: "https://open.spotify.com/playlist/37i9dQZF1DX8NTLI2TtZa6",
    });
  });

  it("rejects tracks, lookalike hosts, and short ids", () => {
    expect(parseSpotifyPlaylist("https://open.spotify.com/track/37i9dQZF1DX8NTLI2TtZa6")).toBeNull();
    expect(parseSpotifyPlaylist("https://open.spotify.example/playlist/37i9dQZF1DX8NTLI2TtZa6")).toBeNull();
    expect(parseSpotifyPlaylist("https://open.spotify.com/playlist/short")).toBeNull();
  });

  it("creates the official embed URL", () => {
    expect(spotifyEmbedUrl("abc1234567")).toContain("open.spotify.com/embed/playlist/abc1234567");
  });
});
