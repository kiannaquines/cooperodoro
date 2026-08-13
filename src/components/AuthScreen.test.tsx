import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthScreen } from "./AuthScreen";

describe("AuthScreen", () => {
  it("offers Google and Facebook login without a local account bypass", () => {
    const google = vi.fn();
    const facebook = vi.fn();
    render(<AuthScreen configured onGoogle={google} onFacebook={facebook} />);
    fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue with facebook/i }));
    expect(google).toHaveBeenCalledOnce();
    expect(facebook).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: /explore locally/i })).not.toBeInTheDocument();
  });

  it("disables cloud login when configuration is missing", () => {
    render(<AuthScreen configured={false} onGoogle={vi.fn()} onFacebook={vi.fn()} />);
    expect(screen.getByRole("button", { name: /continue with google/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /continue with facebook/i })).toBeDisabled();
  });
});
