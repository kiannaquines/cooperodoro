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

  it("keeps a newly selected theme on the login screen after sign-out", async () => {
    localStorage.setItem("pomodoro-studio:theme", "blueberry-cloud");
    authMocks.getSession.mockResolvedValue({ user: { id: "theme-user" } });
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /settings/i }));
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
