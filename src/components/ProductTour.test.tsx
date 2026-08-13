import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductTour } from "./ProductTour";

describe("ProductTour", () => {
  it("walks through anchored components and closes from the final step", () => {
    const onClose = vi.fn();
    render(<>
      <div data-tour="timer">Timer</div>
      <div data-tour="tasks">Tasks</div>
      <div data-tour="insights">Insights</div>
      <div data-tour="spotify">Spotify</div>
      <button data-tour="settings">Settings</button>
      <div data-tour="profile">Profile</div>
      <ProductTour open onClose={onClose} />
    </>);

    expect(screen.getByRole("dialog")).toHaveTextContent("Meet your focus studio");
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Shape your session");

    for (let step = 0; step < 5; step += 1) fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByRole("dialog")).toHaveTextContent("Make the studio yours");
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("can be skipped with Escape", () => {
    const onClose = vi.fn();
    render(<ProductTour open onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
