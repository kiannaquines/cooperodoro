import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  authStateCallback: undefined as ((event: string, session: any) => void) | undefined,
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock("./lib/supabase", () => ({
  completeAuthCallback: vi.fn().mockResolvedValue(undefined),
  getSession: authMocks.getSession,
  isSupabaseConfigured: false,
  signInWithFacebook: vi.fn(),
  signInWithGoogle: vi.fn(),
  supabase: { auth: { onAuthStateChange: authMocks.onAuthStateChange } },
}));

import App from "./App";

describe("cached theme before authentication", () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    });
    localStorage.setItem("pomodoro-studio:theme", "matcha-cream");
    authMocks.getSession.mockReset();
    authMocks.getSession.mockResolvedValue(null);
    authMocks.authStateCallback = undefined;
    authMocks.onAuthStateChange.mockReset();
    authMocks.onAuthStateChange.mockImplementation((callback) => {
      authMocks.authStateCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.setAttribute("href", "/app-icon.svg");
  });

  it("applies the cached theme to the login screen", async () => {
    render(<App />);

    const loginTheme = (await screen.findByRole("main")).parentElement;
    expect(loginTheme).toHaveAttribute("data-theme", "matcha-cream");
    expect(loginTheme).toHaveStyle("--theme-page-top: #edf5e6");
  });

  it("applies the cached theme while authentication is loading", () => {
    authMocks.getSession.mockReturnValue(new Promise(() => undefined));

    render(<App />);

    const loadingTheme = screen.getByText("Opening your studio…").parentElement;
    expect(loadingTheme).toHaveAttribute("data-theme", "matcha-cream");
    expect(loadingTheme).toHaveStyle("--theme-page-top: #edf5e6");
  });

  it("shows the signed-in user's profile in the top bar", async () => {
    authMocks.getSession.mockResolvedValue({
      user: {
        id: "profile-user",
        email: "cooper@example.com",
        user_metadata: { full_name: "Cooper User", avatar_url: "https://example.com/cooper.png" },
      },
    });

    render(<App />);

    expect(await screen.findByLabelText("Signed in as Cooper User", {}, { timeout: 2000 })).toBeVisible();
    expect(screen.getByText("Cooper User")).toBeVisible();
    expect(screen.getByText("cooper@example.com")).toBeVisible();
  });

  it("plays a transition before showing the main screen after login", async () => {
    render(<App />);
    await screen.findByRole("main");

    act(() => authMocks.authStateCallback?.("SIGNED_IN", {
      user: { id: "new-user", email: "new@example.com", user_metadata: {} },
    }));

    const transition = screen.getByRole("status");
    expect(transition).toHaveTextContent("Welcome back!");
    expect(screen.queryByRole("button", { name: /settings/i })).not.toBeInTheDocument();

    expect(await screen.findByRole("button", { name: /settings/i }, { timeout: 2000 })).toBeVisible();
    expect(screen.getByText("No tasks yet")).toBeVisible();
    expect(screen.getByText("No playlists yet")).toBeVisible();
    expect(screen.getByRole("button", { name: /connect spotify/i }).querySelector(".spotify-mark")).toBeInTheDocument();
  });

  it("updates the tab and navbar logos with the timer state", async () => {
    authMocks.getSession.mockResolvedValue({ user: { id: "timer-logo-user", user_metadata: {} } });
    render(<App />);

    const start = await screen.findByRole("button", { name: "Start" }, { timeout: 2000 });
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    const navbarLogo = document.querySelector<HTMLImageElement>(".brand-mark img");
    expect(favicon).toHaveAttribute("href", "/app-icon.svg");
    expect(navbarLogo).toHaveAttribute("src", "/cooper-idle-chibi.webp");

    fireEvent.click(start);
    await waitFor(() => expect(favicon).toHaveAttribute("href", "/cooper-focus-chibi.webp"));
    expect(navbarLogo).toHaveAttribute("src", "/cooper-focus-chibi.webp");

    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    await waitFor(() => expect(favicon).toHaveAttribute("href", "/cooper-idle-chibi.webp"));
    expect(navbarLogo).toHaveAttribute("src", "/cooper-idle-chibi.webp");
  });

  it("shows the guide once per user and allows replay from settings", async () => {
    localStorage.setItem("pomodoro-studio:guide-user", JSON.stringify({ settings: { genderIdentity: "prefer-not-to-say" } }));
    authMocks.getSession.mockResolvedValue({ user: { id: "guide-user", user_metadata: {} } });
    const firstVisit = render(<App />);

    expect(await screen.findByRole("dialog", { name: "Meet your focus studio" }, { timeout: 2000 })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Skip tour" }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem("pomodoro-studio:guide-user") ?? "{}").settings?.tourCompletedAt).toEqual(expect.any(String)));

    firstVisit.unmount();
    render(<App />);
    const settings = await screen.findByRole("button", { name: "Settings" }, { timeout: 2000 });
    expect(screen.queryByRole("dialog", { name: "Meet your focus studio" })).not.toBeInTheDocument();

    fireEvent.click(settings);
    fireEvent.click(screen.getByRole("button", { name: /show app guide/i }));
    expect(screen.getByRole("dialog", { name: "Meet your focus studio" })).toBeVisible();
  });

  it("keeps a newly selected theme on the login screen after sign-out", async () => {
    localStorage.setItem("pomodoro-studio:theme", "blueberry-cloud");
    authMocks.getSession.mockResolvedValue({ user: { id: "theme-user" } });
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /settings/i }, { timeout: 2000 }));
    expect(document.title).toBe("25:00 · Cooperodoro");
    fireEvent.click(screen.getByRole("radio", { name: "Matcha Cream" }));
    await waitFor(() => expect(document.querySelector(".app-shell")).toHaveAttribute("data-theme", "matcha-cream"));
    expect(localStorage.getItem("pomodoro-studio:theme")).toBe("matcha-cream");

    act(() => authMocks.authStateCallback?.("SIGNED_OUT", null));

    const loginTheme = (await screen.findByRole("main")).parentElement;
    expect(loginTheme).toHaveAttribute("data-theme", "matcha-cream");
    expect(document.title).toBe("Cooperodoro");
  });
});
