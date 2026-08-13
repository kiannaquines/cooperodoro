const TOKEN_KEY = "pomodoro-studio:spotify-token";
const VERIFIER_KEY = "pomodoro-studio:spotify-verifier";
const STATE_KEY = "pomodoro-studio:spotify-state";
const RETURN_KEY = "pomodoro-studio:spotify-return";

const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID?.trim();
const configuredRedirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI?.trim();
let loginCompletion: Promise<boolean> | null = null;

export const isSpotifyConfigured = Boolean(clientId && !clientId.includes("your_spotify"));
export const spotifyRedirectUri = (): string => configuredRedirectUri || `${window.location.origin}/spotify/callback`;

export interface SpotifyToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface SpotifyTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

const randomString = (length: number): string => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
};

const base64Url = (input: ArrayBuffer): string => btoa(String.fromCharCode(...new Uint8Array(input)))
  .replace(/=/g, "")
  .replace(/\+/g, "-")
  .replace(/\//g, "_");

export const createSpotifyCodeChallenge = async (verifier: string): Promise<string> =>
  base64Url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));

const saveToken = (response: SpotifyTokenResponse, previousRefreshToken = ""): SpotifyToken => {
  const token = {
    accessToken: response.access_token,
    refreshToken: response.refresh_token ?? previousRefreshToken,
    expiresAt: Date.now() + response.expires_in * 1000,
  };
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
  return token;
};

export const loadSpotifyToken = (): SpotifyToken | null => {
  try {
    const token = JSON.parse(localStorage.getItem(TOKEN_KEY) ?? "null") as SpotifyToken | null;
    return token?.accessToken && token.refreshToken && token.expiresAt ? token : null;
  } catch {
    return null;
  }
};

export const beginSpotifyLogin = async (): Promise<void> => {
  if (!clientId || !isSpotifyConfigured) throw new Error("Add VITE_SPOTIFY_CLIENT_ID before connecting Spotify.");
  const verifier = randomString(64);
  const state = randomString(32);
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(STATE_KEY, state);
  sessionStorage.setItem(RETURN_KEY, window.location.pathname === "/spotify/callback" ? "/" : window.location.pathname);
  const authorize = new URL("https://accounts.spotify.com/authorize");
  authorize.search = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: spotifyRedirectUri(),
    code_challenge_method: "S256",
    code_challenge: await createSpotifyCodeChallenge(verifier),
    state,
    scope: "streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state",
  }).toString();
  window.location.assign(authorize);
};

const requestToken = async (body: URLSearchParams): Promise<SpotifyTokenResponse> => {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) throw new Error("Spotify sign-in could not be completed.");
  return response.json() as Promise<SpotifyTokenResponse>;
};

const spotifyReturnPath = (): string => {
  const returnPath = sessionStorage.getItem(RETURN_KEY);
  return returnPath && returnPath !== "/spotify/callback" ? returnPath : "/";
};

const clearSpotifyLoginState = (): void => {
  sessionStorage.removeItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
  sessionStorage.removeItem(RETURN_KEY);
};

const completeSpotifyLoginOnce = async (): Promise<boolean> => {
  const params = new URLSearchParams(window.location.search);
  const error = params.get("error");
  if (error) throw new Error(error === "access_denied" ? "Spotify access was declined." : "Spotify sign-in failed.");
  const code = params.get("code");
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  const expectedState = sessionStorage.getItem(STATE_KEY);
  if (!code && loadSpotifyToken()) {
    const returnPath = spotifyReturnPath();
    clearSpotifyLoginState();
    window.history.replaceState({}, "", returnPath);
    return true;
  }
  if (!code || !verifier || !expectedState || params.get("state") !== expectedState) throw new Error("Spotify sign-in could not be verified. Please try again.");
  if (!clientId) throw new Error("Spotify is not configured.");
  const response = await requestToken(new URLSearchParams({
    client_id: clientId,
    grant_type: "authorization_code",
    code,
    redirect_uri: spotifyRedirectUri(),
    code_verifier: verifier,
  }));
  saveToken(response);
  const returnPath = spotifyReturnPath();
  clearSpotifyLoginState();
  window.history.replaceState({}, "", returnPath);
  return true;
};

export const completeSpotifyLogin = async (): Promise<boolean> => {
  if (window.location.pathname !== "/spotify/callback") return false;
  if (!loginCompletion) loginCompletion = completeSpotifyLoginOnce();
  const currentCompletion = loginCompletion;
  try {
    return await currentCompletion;
  } finally {
    if (loginCompletion === currentCompletion) loginCompletion = null;
  }
};

export const getSpotifyAccessToken = async (): Promise<string | null> => {
  const token = loadSpotifyToken();
  if (!token) return null;
  if (token.expiresAt > Date.now() + 60_000) return token.accessToken;
  if (!clientId) return null;
  const response = await requestToken(new URLSearchParams({
    client_id: clientId,
    grant_type: "refresh_token",
    refresh_token: token.refreshToken,
  }));
  return saveToken(response, token.refreshToken).accessToken;
};

export const disconnectSpotify = (): void => localStorage.removeItem(TOKEN_KEY);

export const spotifyApi = async (path: string, init: RequestInit = {}, forbiddenMessage = "Spotify did not allow this request."): Promise<Response> => {
  const accessToken = await getSpotifyAccessToken();
  if (!accessToken) throw new Error("Connect Spotify first.");
  const response = await fetch(`https://api.spotify.com/v1${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...init.headers },
  });
  if (!response.ok) {
    if (response.status === 403) throw new Error(forbiddenMessage);
    throw new Error(`Spotify request failed (${response.status}).`);
  }
  return response;
};
