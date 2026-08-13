import { describe, expect, it } from "vitest";
import { canShowFeedbackSurvey, completedFocusSessionCount, shouldPromptForFeedback } from "./feedback";
import type { UserFeedback } from "../types";

const dismissed = (nextPromptSessionCount: number): UserFeedback => ({ rating: null, favoriteFeatures: [], improvementComment: "", status: "dismissed", nextPromptSessionCount, submittedAt: null });

describe("feedback eligibility", () => {
  it("counts only completed focus sessions", () => {
    expect(completedFocusSessionCount([{ phase: "focus" }, { phase: "short_break" }, { phase: "focus" }])).toBe(2);
  });

  it("prompts at the third focus session", () => {
    expect(shouldPromptForFeedback(null, 2)).toBe(false);
    expect(shouldPromptForFeedback(null, 3)).toBe(true);
  });

  it("respects a dismissal reminder threshold", () => {
    expect(shouldPromptForFeedback(dismissed(6), 5)).toBe(false);
    expect(shouldPromptForFeedback(dismissed(6), 6)).toBe(true);
  });

  it("does not automatically prompt after submission", () => {
    expect(shouldPromptForFeedback({ rating: 5, favoriteFeatures: ["timer"], improvementComment: "", status: "submitted", nextPromptSessionCount: 6, submittedAt: new Date().toISOString() }, 100)).toBe(false);
  });

  it.each([
    [{ authenticated: false, eligible: true, profileOnboardingOpen: false, settingsOpen: false, timerStatus: "idle" as const }],
    [{ authenticated: true, eligible: true, profileOnboardingOpen: true, settingsOpen: false, timerStatus: "idle" as const }],
    [{ authenticated: true, eligible: true, profileOnboardingOpen: false, settingsOpen: true, timerStatus: "idle" as const }],
    [{ authenticated: true, eligible: true, profileOnboardingOpen: false, settingsOpen: false, timerStatus: "running" as const }],
    [{ authenticated: true, eligible: true, profileOnboardingOpen: false, settingsOpen: false, timerStatus: "awaiting_acknowledgement" as const }],
  ])("does not cover another blocking experience", (state) => expect(canShowFeedbackSurvey(state)).toBe(false));

  it("can open for an eligible authenticated user while the timer is idle", () => {
    expect(canShowFeedbackSurvey({ authenticated: true, eligible: true, profileOnboardingOpen: false, settingsOpen: false, timerStatus: "idle" })).toBe(true);
  });
});
