import type { TimerPreset, TimerState, UserSettings } from "../types";

export const DEFAULT_PRESET: TimerPreset = {
  id: "classic-pomodoro",
  name: "Classic Pomodoro",
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  roundsBeforeLongBreak: 4,
  isDefault: true,
};

export const DEFAULT_SETTINGS: UserSettings = {
  autoStart: false,
  completionSound: "soft-bell",
  browserNotifications: false,
  themeKey: "blueberry-cloud",
  genderIdentity: null,
};

export const initialTimer = (preset: TimerPreset = DEFAULT_PRESET): TimerState => ({
  id: null,
  presetId: preset.id,
  phase: "focus",
  round: 1,
  status: "idle",
  durationSeconds: preset.focusMinutes * 60,
  remainingSeconds: preset.focusMinutes * 60,
  endsAt: null,
  taskId: null,
});
