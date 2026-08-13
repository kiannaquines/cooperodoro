import { loadLocalWorkspace, newestTimer } from "./useWorkspace";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useWorkspace } from "./useWorkspace";
import { initialTimer } from "../lib/constants";

const storage = new Map<string, string>();

describe("workspace theme hydration", () => {
  beforeEach(() => {
    storage.clear();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    });
  });

  it("hydrates a saved curated theme", () => {
    localStorage.setItem("pomodoro-studio:theme-user", JSON.stringify({ settings: { themeKey: "matcha-cream" } }));
    expect(loadLocalWorkspace("theme-user").settings.themeKey).toBe("matcha-cream");
  });

  it("falls back when local storage contains an unknown theme", () => {
    localStorage.setItem("pomodoro-studio:theme-user", JSON.stringify({ settings: { themeKey: "retired-theme" } }));
    expect(loadLocalWorkspace("theme-user").settings.themeKey).toBe("blueberry-cloud");
  });

  it("does not overwrite a saved theme while restoring a user session", async () => {
    localStorage.setItem("pomodoro-studio:signed-in-user", JSON.stringify({ settings: { themeKey: "matcha-cream" } }));
    const { result, rerender } = renderHook(
      ({ userId }) => useWorkspace(userId, false),
      { initialProps: { userId: "initial-user" } },
    );

    rerender({ userId: "signed-in-user" });

    await waitFor(() => expect(result.current.data.settings.themeKey).toBe("matcha-cream"));
    expect(loadLocalWorkspace("signed-in-user").settings.themeKey).toBe("matcha-cream");
  });
});

describe("workspace timer completion", () => {
  beforeEach(() => {
    storage.clear();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    });
  });

  it("completes the selected task when a focus timer finishes", async () => {
    const { result } = renderHook(() => useWorkspace("focus-user", false));
    await act(() => result.current.addTask("Finish report"));
    const taskId = result.current.data.tasks[0].id;

    await act(() => result.current.finishTimer({ ...initialTimer(), taskId }, "completed"));

    expect(result.current.data.tasks[0]).toMatchObject({ id: taskId, completed: true });
    expect(result.current.data.tasks[0].completedAt).not.toBeNull();
  });

  it("does not complete the selected task for a break", async () => {
    const { result } = renderHook(() => useWorkspace("break-user", false));
    await act(() => result.current.addTask("Keep working"));
    const taskId = result.current.data.tasks[0].id;

    await act(() => result.current.finishTimer({ ...initialTimer(), phase: "short_break", taskId }, "completed"));

    expect(result.current.data.tasks[0]).toMatchObject({ id: taskId, completed: false, completedAt: null });
  });
});

describe("timer refresh recovery", () => {
  it("keeps a newer local pause over an older running cloud timer", () => {
    const running = { ...initialTimer(), id: "run-1", status: "running" as const, endsAt: Date.now() + 60_000, updatedAt: 100 };
    const paused = { ...running, status: "paused" as const, endsAt: null, remainingSeconds: 60, updatedAt: 200 };

    expect(newestTimer(paused, running)).toEqual(paused);
  });

  it("uses a newer cloud timer update", () => {
    const local = { ...initialTimer(), updatedAt: 100 };
    const remote = { ...initialTimer(), status: "paused" as const, updatedAt: 200 };

    expect(newestTimer(local, remote)).toEqual(remote);
  });
});
