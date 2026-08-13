import { describe, expect, it } from "vitest";
import { DEFAULT_PRESET } from "./constants";
import { formatClock, moveToNextPhase, nextPhase, phaseDuration, remainingFromEnd, switchTimerPhase, validatePreset } from "./timer";

describe("timer calculations", () => {
  it("derives remaining time from an absolute end timestamp", () => {
    expect(remainingFromEnd(112_001, 100_000)).toBe(13);
    expect(remainingFromEnd(99_000, 100_000)).toBe(0);
  });

  it("cycles through short and long breaks", () => {
    expect(nextPhase("focus", 1, 4)).toEqual({ phase: "short_break", round: 1 });
    expect(nextPhase("short_break", 1, 4)).toEqual({ phase: "focus", round: 2 });
    expect(nextPhase("focus", 4, 4)).toEqual({ phase: "long_break", round: 4 });
    expect(nextPhase("long_break", 4, 4)).toEqual({ phase: "focus", round: 1 });
  });

  it("moves state using preset duration snapshots", () => {
    const next = moveToNextPhase({
      id: "one", presetId: DEFAULT_PRESET.id, phase: "focus", round: 1, status: "running",
      durationSeconds: 1500, remainingSeconds: 0, endsAt: 123, taskId: null,
    }, DEFAULT_PRESET);
    expect(next).toMatchObject({ id: null, phase: "short_break", round: 1, status: "idle", remainingSeconds: 300 });
  });

  it("formats time and chooses phase durations", () => {
    expect(formatClock(65)).toBe("01:05");
    expect(phaseDuration(DEFAULT_PRESET, "long_break")).toBe(900);
  });

  it("restores a paused phase after visiting another timer", () => {
    const pausedFocus = {
      id: null, presetId: DEFAULT_PRESET.id, phase: "focus" as const, round: 1, status: "paused" as const,
      durationSeconds: 1500, remainingSeconds: 713, endsAt: null, taskId: null,
    };
    const shortBreak = switchTimerPhase(pausedFocus, DEFAULT_PRESET, "short_break");
    expect(shortBreak).toMatchObject({ phase: "short_break", status: "idle", remainingSeconds: 300 });

    const restoredFocus = switchTimerPhase(shortBreak, DEFAULT_PRESET, "focus");
    expect(restoredFocus).toMatchObject({ phase: "focus", status: "paused", durationSeconds: 1500, remainingSeconds: 713 });
  });
});

describe("preset validation", () => {
  it("accepts plan boundaries", () => {
    expect(validatePreset({ name: "Deep work", focusMinutes: 180, shortBreakMinutes: 60, longBreakMinutes: 60, roundsBeforeLongBreak: 12 })).toBeNull();
  });

  it.each([
    [{ name: "", focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15, roundsBeforeLongBreak: 4 }, "name"],
    [{ name: "Bad", focusMinutes: 181, shortBreakMinutes: 5, longBreakMinutes: 15, roundsBeforeLongBreak: 4 }, "Focus"],
    [{ name: "Bad", focusMinutes: 25, shortBreakMinutes: 0, longBreakMinutes: 15, roundsBeforeLongBreak: 4 }, "Short"],
    [{ name: "Bad", focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 61, roundsBeforeLongBreak: 4 }, "Long"],
    [{ name: "Bad", focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15, roundsBeforeLongBreak: 13 }, "Rounds"],
  ])("rejects invalid values", (input, message) => expect(validatePreset(input)).toContain(message));
});
