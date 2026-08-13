import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProfileOnboarding } from "./ProfileOnboarding";

describe("ProfileOnboarding", () => {
  it("suggests a theme from the optional answer and saves it", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<ProfileOnboarding onSave={onSave} />);

    fireEvent.click(screen.getByRole("radio", { name: "Man" }));
    expect(screen.getByRole("radio", { name: "Midnight Navy" })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Use this style" }));

    expect(onSave).toHaveBeenCalledWith({ genderIdentity: "man", themeKey: "midnight-navy" });
  });

  it("allows the user to skip the optional answer", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<ProfileOnboarding onSave={onSave} />);

    fireEvent.click(screen.getByRole("button", { name: "Prefer not to say" }));

    expect(onSave).toHaveBeenCalledWith({ genderIdentity: "prefer-not-to-say", themeKey: "matcha-cream" });
  });
});
