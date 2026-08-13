import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FeedbackSurvey } from "./FeedbackSurvey";

describe("FeedbackSurvey", () => {
  it("requires a rating and at least one favorite feature", () => {
    render(<FeedbackSurvey feedback={null} onSubmit={vi.fn()} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Send feedback" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Choose a rating");
    fireEvent.click(screen.getByRole("radio", { name: "5" }));
    fireEvent.click(screen.getByRole("button", { name: "Send feedback" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Choose at least one favorite feature");
  });

  it("submits a complete response", () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<FeedbackSurvey feedback={null} onSubmit={onSubmit} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByRole("radio", { name: "5" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Cooper mascot" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Themes" }));
    fireEvent.change(screen.getByPlaceholderText(/Tell Cooper/), { target: { value: "More Cooper animations" } });
    fireEvent.click(screen.getByRole("button", { name: "Send feedback" }));
    expect(onSubmit).toHaveBeenCalledWith({ rating: 5, favoriteFeatures: ["cooper-mascot", "themes"], improvementComment: "More Cooper animations" });
  });

  it("loads an existing response for editing and can be dismissed", () => {
    const onDismiss = vi.fn().mockResolvedValue(undefined);
    render(<FeedbackSurvey feedback={{ rating: 4, favoriteFeatures: ["themes", "timer"], improvementComment: "More colors", status: "submitted", nextPromptSessionCount: 6, submittedAt: new Date().toISOString() }} onSubmit={vi.fn()} onDismiss={onDismiss} />);
    expect(screen.getByRole("radio", { name: "4" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Themes" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Timer" })).toBeChecked();
    expect(screen.getByDisplayValue("More colors")).toHaveAttribute("maxlength", "1000");
    fireEvent.click(screen.getByRole("button", { name: "Maybe later" }));
    expect(onDismiss).toHaveBeenCalled();
  });
});
