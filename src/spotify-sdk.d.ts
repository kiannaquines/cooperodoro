interface SpotifyWebPlaybackTrack {
  name: string;
  uri: string;
  album: { images: Array<{ url: string }> };
  artists: Array<{ name: string }>;
}

interface SpotifyWebPlaybackState {
  paused: boolean;
  position: number;
  duration: number;
  track_window: { current_track: SpotifyWebPlaybackTrack };
}

interface SpotifyWebPlayer {
  addListener(event: "ready" | "not_ready", callback: (value: { device_id: string }) => void): boolean;
  addListener(event: "player_state_changed", callback: (state: SpotifyWebPlaybackState | null) => void): boolean;
  addListener(event: "initialization_error" | "authentication_error" | "account_error" | "playback_error", callback: (value: { message: string }) => void): boolean;
  addListener(event: "autoplay_failed", callback: () => void): boolean;
  connect(): Promise<boolean>;
  disconnect(): void;
  activateElement(): Promise<void>;
  togglePlay(): Promise<void>;
  nextTrack(): Promise<void>;
  previousTrack(): Promise<void>;
  setVolume(volume: number): Promise<void>;
}

interface Window {
  Spotify?: { Player: new (options: { name: string; getOAuthToken: (callback: (token: string) => void) => void; volume: number; enableMediaSession: boolean }) => SpotifyWebPlayer };
  onSpotifyWebPlaybackSDKReady?: () => void;
}
