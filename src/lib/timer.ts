import type { TimerPhase, TimerPreset, TimerState } from "../types";

export const phaseDuration = (preset: TimerPreset, phase: TimerPhase): number => {
  if (phase === "focus") return preset.focusMinutes * 60;
  if (phase === "short_break") return preset.shortBreakMinutes * 60;
  return preset.longBreakMinutes * 60;
};

export const remainingFromEnd = (endsAt: number, now = Date.now()): number =>
  Math.max(0, Math.ceil((endsAt - now) / 1000));

export const nextPhase = (
  phase: TimerPhase,
  round: number,
  roundsBeforeLongBreak: number,
): { phase: TimerPhase; round: number } => {
  if (phase === "focus") {
    return round >= roundsBeforeLongBreak
      ? { phase: "long_break", round }
      : { phase: "short_break", round };
  }
  return { phase: "focus", round: phase === "long_break" ? 1 : round + 1 };
};

export const moveToNextPhase = (state: TimerState, preset: TimerPreset): TimerState => {
  const next = nextPhase(state.phase, state.round, preset.roundsBeforeLongBreak);
  const durationSeconds = phaseDuration(preset, next.phase);
  return {
    ...state,
    id: null,
    phase: next.phase,
    round: next.round,
    status: "idle",
    durationSeconds,
    remainingSeconds: durationSeconds,
    endsAt: null,
  };
};

export const switchTimerPhase = (state: TimerState, preset: TimerPreset, phase: TimerPhase): TimerState => {
  if (state.phase === phase) return state;
  const phaseSnapshots = { ...state.phaseSnapshots };
  if (state.status === "paused") {
    phaseSnapshots[state.phase] = {
      durationSeconds: state.durationSeconds,
      remainingSeconds: state.remainingSeconds,
    };
  }
  const restored = phaseSnapshots[phase];
  const durationSeconds = restored?.durationSeconds ?? phaseDuration(preset, phase);
  return {
    ...state,
    id: null,
    phase,
    status: restored ? "paused" : "idle",
    durationSeconds,
    remainingSeconds: restored?.remainingSeconds ?? durationSeconds,
    endsAt: null,
    phaseSnapshots,
  };
};

export const formatClock = (seconds: number): string => {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  return `${String(minutes).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
};

export const validatePreset = (preset: Omit<TimerPreset, "id">): string | null => {
  if (!preset.name.trim() || preset.name.trim().length > 80) return "Use a name between 1 and 80 characters.";
  if (preset.focusMinutes < 1 || preset.focusMinutes > 180) return "Focus time must be 1–180 minutes.";
  if (preset.shortBreakMinutes < 1 || preset.shortBreakMinutes > 60) return "Short break must be 1–60 minutes.";
  if (preset.longBreakMinutes < 1 || preset.longBreakMinutes > 60) return "Long break must be 1–60 minutes.";
  if (preset.roundsBeforeLongBreak < 1 || preset.roundsBeforeLongBreak > 12) return "Rounds must be 1–12.";
  return null;
};
