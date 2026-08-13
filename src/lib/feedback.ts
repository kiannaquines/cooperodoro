import type { TimerStatus, UserFeedback } from "../types";

export const completedFocusSessionCount = (sessions: Array<{ phase: string }>): number =>
  sessions.filter((session) => session.phase === "focus").length;

export const shouldPromptForFeedback = (feedback: UserFeedback | null, completedFocusSessions: number): boolean => {
  if (feedback?.status === "submitted") return false;
  return completedFocusSessions >= (feedback?.nextPromptSessionCount ?? 3);
};

export const canShowFeedbackSurvey = ({ authenticated, eligible, profileOnboardingOpen, settingsOpen, timerStatus }: {
  authenticated: boolean;
  eligible: boolean;
  profileOnboardingOpen: boolean;
  settingsOpen: boolean;
  timerStatus: TimerStatus;
}): boolean => authenticated && eligible && !profileOnboardingOpen && !settingsOpen && timerStatus !== "running" && timerStatus !== "awaiting_acknowledgement";
