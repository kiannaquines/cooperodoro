import { beforeEach, describe, expect, it, vi } from "vitest";

const TOKEN_KEY = "pomodoro-studio:spotify-token";
const VERIFIER_KEY = "pomodoro-studio:spotify-verifier";
const STATE_KEY = "pomodoro-studio:spotify-state";

describe("completeSpotifyLogin", () => {
  beforeEach(() => {
    const createStorage = (): Storage => {
      const values = new Map<string, string>();
      return {
        get length() { return values.size; },
        clear: () => values.clear(),
        getItem: (key) => values.get(key) ?? null,
        key: (index) => [...values.keys()][index] ?? null,
        removeItem: (key) => { values.delete(key); },
        setItem: (key, value) => { values.set(key, value); },
      };
    };
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: createStorage() });
    Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: createStorage() });
    vi.resetModules();
    vi.restoreAllMocks();
    vi.stubEnv("VITE_SPOTIFY_CLIENT_ID", "test-client");
    window.history.replaceState({}, "", "/");
  });

  it("shares one token exchange when the callback is completed concurrently", async () => {
    window.history.replaceState({}, "", "/spotify/callback?code=test-code&state=test-state");
    sessionStorage.setItem(VERIFIER_KEY, "test-verifier");
    sessionStorage.setItem(STATE_KEY, "test-state");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ access_token: "access", refresh_token: "refresh", expires_in: 3600 }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { completeSpotifyLogin } = await import("./spotifyAuth");

    await expect(Promise.all([completeSpotifyLogin(), completeSpotifyLogin()])).resolves.toEqual([true, true]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe("/");
    expect(JSON.parse(localStorage.getItem(TOKEN_KEY) ?? "null")).toMatchObject({ accessToken: "access", refreshToken: "refresh" });
  });

  it("finishes a stale callback without an error when its token was already saved", async () => {
    window.history.replaceState({}, "", "/spotify/callback");
    localStorage.setItem(TOKEN_KEY, JSON.stringify({ accessToken: "access", refreshToken: "refresh", expiresAt: Date.now() + 3600000 }));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { completeSpotifyLogin } = await import("./spotifyAuth");

    await expect(completeSpotifyLogin()).resolves.toBe(true);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe("/");
  });

  it("still rejects an unverified callback when no token exists", async () => {
    window.history.replaceState({}, "", "/spotify/callback?code=test-code&state=wrong-state");
    const { completeSpotifyLogin } = await import("./spotifyAuth");

    await expect(completeSpotifyLogin()).rejects.toThrow("Spotify sign-in could not be verified. Please try again.");
  });
});
