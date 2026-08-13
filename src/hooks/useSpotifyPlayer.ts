import { useCallback, useEffect, useRef, useState } from "react";
import { getSpotifyAccessToken, loadSpotifyToken, spotifyApi } from "../lib/spotifyAuth";

export interface SpotifyPlayerState {
  connected: boolean;
  ready: boolean;
  paused: boolean;
  track: SpotifyWebPlaybackTrack | null;
  error: string;
}

const loadSdk = (): Promise<void> => new Promise((resolve, reject) => {
  if (window.Spotify) return resolve();
  const existing = document.querySelector<HTMLScriptElement>('script[src="https://sdk.scdn.co/spotify-player.js"]');
  window.onSpotifyWebPlaybackSDKReady = resolve;
  if (existing) {
    existing.addEventListener("error", () => reject(new Error("Spotify player could not be loaded.")), { once: true });
    return;
  }
  const script = document.createElement("script");
  script.src = "https://sdk.scdn.co/spotify-player.js";
  script.async = true;
  script.addEventListener("error", () => reject(new Error("Spotify player could not be loaded.")), { once: true });
  document.body.appendChild(script);
});

export const useSpotifyPlayer = (enabled: boolean) => {
  const playerRef = useRef<SpotifyWebPlayer | null>(null);
  const deviceIdRef = useRef("");
  const [state, setState] = useState<SpotifyPlayerState>({ connected: Boolean(loadSpotifyToken()), ready: false, paused: true, track: null, error: "" });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void loadSdk().then(async () => {
      if (cancelled || !window.Spotify) return;
      const player = new window.Spotify.Player({
        name: "Cooperodoro",
        getOAuthToken: (callback) => { void getSpotifyAccessToken().then((token) => token && callback(token)); },
        volume: 0.5,
        enableMediaSession: true,
      });
      playerRef.current = player;
      player.addListener("ready", ({ device_id }) => { deviceIdRef.current = device_id; setState((current) => ({ ...current, ready: true, error: "" })); });
      player.addListener("not_ready", () => setState((current) => ({ ...current, ready: false })));
      player.addListener("player_state_changed", (next) => next && setState((current) => ({ ...current, paused: next.paused, track: next.track_window.current_track })));
      const onError = ({ message }: { message: string }) => setState((current) => ({ ...current, error: message }));
      player.addListener("initialization_error", onError);
      player.addListener("authentication_error", onError);
      player.addListener("account_error", () => setState((current) => ({ ...current, error: "Spotify Premium is required for full playback." })));
      player.addListener("playback_error", onError);
      player.addListener("autoplay_failed", () => setState((current) => ({ ...current, error: "Press play once to allow audio in this browser." })));
      const connected = await player.connect();
      if (!connected) setState((current) => ({ ...current, error: "Spotify could not connect to this browser." }));
    }).catch((error) => setState((current) => ({ ...current, error: error instanceof Error ? error.message : "Spotify could not start." })));
    return () => { cancelled = true; playerRef.current?.disconnect(); playerRef.current = null; };
  }, [enabled]);

  const playPlaylist = useCallback(async (playlistId: string) => {
    const player = playerRef.current;
    const deviceId = deviceIdRef.current;
    if (!player || !deviceId) throw new Error("Spotify is still connecting. Try again in a moment.");
    await player.activateElement();
    await spotifyApi(`/me/player/play?device_id=${encodeURIComponent(deviceId)}`, {
      method: "PUT",
      body: JSON.stringify({ context_uri: `spotify:playlist:${playlistId}` }),
    });
  }, []);

  return {
    ...state,
    playPlaylist,
    togglePlay: () => playerRef.current?.togglePlay(),
    nextTrack: () => playerRef.current?.nextTrack(),
    previousTrack: () => playerRef.current?.previousTrack(),
    setVolume: (volume: number) => playerRef.current?.setVolume(volume),
  };
};
