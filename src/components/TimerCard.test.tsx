import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { initialTimer } from "../lib/constants";
import { TimerCard } from "./TimerCard";

describe("TimerCard full screen", () => {
  afterEach(() => vi.restoreAllMocks());

  it("enters and exits full screen", async () => {
    let fullscreenElement: Element | null = null;
    Object.defineProperty(document, "fullscreenElement", { configurable: true, get: () => fullscreenElement });
    Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
      configurable: true,
      value: vi.fn(() => {
        fullscreenElement = document.querySelector(".timer-card");
        document.dispatchEvent(new Event("fullscreenchange"));
        return Promise.resolve();
      }),
    });
    Object.defineProperty(document, "exitFullscreen", {
      configurable: true,
      value: vi.fn(() => {
        fullscreenElement = null;
        document.dispatchEvent(new Event("fullscreenchange"));
        return Promise.resolve();
      }),
    });

    render(<TimerCard timer={initialTimer()} tasks={[]} rounds={4} onTaskChange={vi.fn()} onStart={vi.fn()} onPause={vi.fn()} onReset={vi.fn()} onSkip={vi.fn()} onAcknowledge={vi.fn()} onPhaseChange={vi.fn()} autoStart={false} onAutoStartChange={vi.fn()} onCustomTimer={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Enter full screen" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Exit full screen" })).toBeVisible());

    fireEvent.click(screen.getByRole("button", { name: "Exit full screen" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Enter full screen" })).toBeVisible());
  });
});
