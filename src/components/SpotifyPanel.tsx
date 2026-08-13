import { ArrowDown, ArrowUp, ExternalLink, Music2, Pause, Pencil, Play, Plus, RefreshCw, SkipBack, SkipForward, Sparkles, Trash2, Unplug } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSpotifyPlayer } from "../hooks/useSpotifyPlayer";
import { parseSpotifyPlaylist } from "../lib/spotify";
import { beginSpotifyLogin, disconnectSpotify, isSpotifyConfigured, loadSpotifyToken } from "../lib/spotifyAuth";
import { loadSpotifyPlaylistDetails, recommendSpotifyPlaylists, type SpotifyPlaylistDetails, type SpotifyPlaylistRecommendation } from "../lib/spotifyRecommendations";
import type { SpotifyPlaylist } from "../types";

interface Props {
  playlists: SpotifyPlaylist[];
  onAdd: (name: string, playlistId: string, url: string) => Promise<void>;
  onActivate: (id: string) => Promise<void>;
  onUpdate: (id: string, patch: Partial<Pick<SpotifyPlaylist, "name" | "sortOrder">>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function SpotifyPanel({ playlists, onAdd, onActivate, onUpdate, onDelete }: Props) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(Boolean(loadSpotifyToken()));
  const [volume, setVolume] = useState(50);
  const [recommendations, setRecommendations] = useState<SpotifyPlaylistRecommendation[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState("");
  const [playlistDetails, setPlaylistDetails] = useState<Record<string, SpotifyPlaylistDetails>>({});
  const player = useSpotifyPlayer(connected);
  const active = playlists.find((playlist) => playlist.active) ?? playlists[0];
  const loadRecommendations = useCallback(async () => {
    if (!connected || !active) return;
    setRecommendationsLoading(true);
    setRecommendationsError("");
    try { setRecommendations(await recommendSpotifyPlaylists(active, playlists.map((playlist) => playlist.playlistId))); }
    catch (recommendationError) { setRecommendationsError(recommendationError instanceof Error ? recommendationError.message : "Spotify recommendations could not be loaded."); }
    finally { setRecommendationsLoading(false); }
  }, [active, connected, playlists]);
  useEffect(() => { void loadRecommendations(); }, [loadRecommendations]);
  useEffect(() => {
    if (!connected || playlists.length === 0) {
      setPlaylistDetails({});
      return;
    }
    let cancelled = false;
    void loadSpotifyPlaylistDetails(playlists).then((details) => {
      if (!cancelled) setPlaylistDetails(details);
    });
    return () => { cancelled = true; };
  }, [connected, playlists]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = parseSpotifyPlaylist(url);
    if (!name.trim()) return setError("Give this playlist a name.");
    if (!parsed) return setError("Paste a valid open.spotify.com playlist URL.");
    await onAdd(name, parsed.playlistId, parsed.url);
    setName(""); setUrl(""); setError("");
  };
  const move = async (playlist: SpotifyPlaylist, direction: -1 | 1) => {
    const index = playlists.findIndex((item) => item.id === playlist.id);
    const neighbor = playlists[index + direction];
    if (!neighbor) return;
    await Promise.all([onUpdate(playlist.id, { sortOrder: neighbor.sortOrder }), onUpdate(neighbor.id, { sortOrder: playlist.sortOrder })]);
  };
  const playActive = async () => {
    if (!active) return;
    try { await player.playPlaylist(active.playlistId); setError(""); }
    catch (playError) { setError(playError instanceof Error ? playError.message : "Spotify playback failed."); }
  };
  const disconnect = () => {
    disconnectSpotify();
    setConnected(false);
    setRecommendations([]);
    setPlaylistDetails({});
  };
  const addRecommendation = async (recommendation: SpotifyPlaylistRecommendation) => {
    try { await onAdd(recommendation.name, recommendation.id, recommendation.url); setRecommendations((current) => current.filter((item) => item.id !== recommendation.id)); }
    catch (addError) { setRecommendationsError(addError instanceof Error ? addError.message : "The recommended playlist could not be saved."); }
  };
  return (
    <section className="side-card spotify-card" aria-labelledby="spotify-title" data-tour="spotify">
      <div className="section-heading"><div><span className="eyebrow">Soundtrack</span><h2 id="spotify-title">Spotify ambience</h2></div><Music2 /></div>
      <div className="spotify-player-column">
        {!connected ? (
          <div className="spotify-connect">
            <Music2 />
            <strong>Full Spotify playback</strong>
            <span>Connect a Premium account to play complete songs here.</span>
            <button className="spotify-login" disabled={!isSpotifyConfigured} onClick={() => void beginSpotifyLogin().catch((loginError) => setError(loginError.message))}>
              <svg className="spotify-mark" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="11" fill="currentColor" />
                <path d="M6.2 8.7c4.1-1.2 8.2-.9 11.7 1" fill="none" stroke="#1ed760" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M6.9 12c3.5-.9 7-.6 10 1" fill="none" stroke="#1ed760" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M7.6 15.1c2.8-.6 5.7-.3 8.2.8" fill="none" stroke="#1ed760" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Connect Spotify
            </button>
            {!isSpotifyConfigured && <small>Add your Spotify client ID to enable login.</small>}
          </div>
        ) : (
          <div className="spotify-player">
            <div className="now-playing">
              {player.track?.album.images[0]?.url ? <img src={player.track.album.images[0].url} alt="" /> : <div className="track-placeholder"><Music2 /></div>}
              <div><span>{player.track ? "Now playing" : player.ready ? "Ready to play" : "Connecting…"}</span><strong>{player.track?.name ?? active?.name ?? "Choose a playlist"}</strong><small>{player.track?.artists.map((artist) => artist.name).join(", ") || "Cooperodoro"}</small></div>
            </div>
            <div className="player-controls">
              <button onClick={() => void player.previousTrack()} aria-label="Previous track"><SkipBack /></button>
              <button className="play-control" disabled={!player.ready || !active} onClick={() => player.track ? void player.togglePlay() : void playActive()} aria-label={player.paused ? "Play" : "Pause"}>{player.paused ? <Play /> : <Pause />}</button>
              <button onClick={() => void player.nextTrack()} aria-label="Next track"><SkipForward /></button>
            </div>
            <label className="volume-control"><span>Volume</span><input type="range" min="0" max="100" value={volume} onChange={(event) => { const next = Number(event.target.value); setVolume(next); void player.setVolume(next / 100); }} /></label>
            <div className="spotify-player-links"><a href={active?.url ?? "https://open.spotify.com"} target="_blank" rel="noreferrer"><ExternalLink /> Open Spotify</a><button onClick={disconnect}><Unplug /> Disconnect</button></div>
            {player.error && <p className="field-error" role="alert">{player.error}</p>}
          </div>
        )}
        <div className="playlist-list">
          {playlists.length === 0 && <div className="spotify-empty">
            <Music2 />
            <strong>No playlists yet</strong>
            <span>Add a Spotify playlist below to set the mood.</span>
          </div>}
          {playlists.map((playlist) => {
            const details = playlistDetails[playlist.playlistId];
            const description = details ? `${details.name === playlist.name ? "" : `${details.name} · `}By ${details.ownerName}` : "Saved playlist";
            return (
              <div className={`playlist-row saved-playlist-row ${playlist.id === active?.id ? "active" : ""}`} key={playlist.id}>
                {details?.imageUrl ? <img className="saved-playlist-art" src={details.imageUrl} alt="" /> : <div className="saved-playlist-art"><Music2 /></div>}
                <button className="playlist-name" onClick={() => { void onActivate(playlist.id); if (connected && player.ready) void player.playPlaylist(playlist.playlistId).catch((playError) => setError(playError.message)); }}><strong>{playlist.name}</strong><span>{description}</span></button>
                <div className="row-actions">
                  <button onClick={() => void move(playlist, -1)} aria-label={`Move ${playlist.name} up`}><ArrowUp /></button>
                  <button onClick={() => void move(playlist, 1)} aria-label={`Move ${playlist.name} down`}><ArrowDown /></button>
                  <button onClick={() => { const next = prompt("Playlist name", playlist.name); if (next?.trim()) void onUpdate(playlist.id, { name: next.trim() }); }} aria-label={`Rename ${playlist.name}`}><Pencil /></button>
                  <button onClick={() => void onDelete(playlist.id)} aria-label={`Delete ${playlist.name}`}><Trash2 /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="spotify-library">
        {connected && active && <div className="spotify-recommendations">
            <div className="recommendation-heading"><div><Sparkles /><span>Recommended for you</span></div><button onClick={() => void loadRecommendations()} disabled={recommendationsLoading} aria-label="Refresh playlist recommendations"><RefreshCw /></button></div>
            <small>Inspired by {active.name}</small>
            {recommendationsLoading ? <div className="recommendation-loading">Finding a matching vibe…</div> : recommendations.length > 0 ? recommendations.map((recommendation) => (
              <div className="recommendation-row" key={recommendation.id}>
                {recommendation.imageUrl ? <img src={recommendation.imageUrl} alt="" /> : <div className="recommendation-art"><Music2 /></div>}
                <div><strong>{recommendation.name}</strong><span>By {recommendation.ownerName}</span></div>
                <a href={recommendation.url} target="_blank" rel="noreferrer" aria-label={`Open ${recommendation.name} on Spotify`}><ExternalLink /></a>
                <button onClick={() => void addRecommendation(recommendation)} aria-label={`Add recommended playlist ${recommendation.name}`}><Plus /></button>
              </div>
            )) : !recommendationsError && <div className="recommendation-loading">No new matches yet. Try refreshing.</div>}
            {recommendationsError && <p className="field-error" role="alert">{recommendationsError}</p>}
        </div>}
        <form className="stacked-form" onSubmit={submit}>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Playlist name" maxLength={100} />
          <div className="inline-form"><input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://open.spotify.com/playlist/..." /><button className="small-primary" aria-label="Add Spotify playlist"><Plus /></button></div>
          {error && <p className="field-error" role="alert">{error}</p>}
        </form>
      </div>
    </section>
  );
}
