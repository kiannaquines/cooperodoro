import { CheckCircle2, Maximize2, Minimize2, Pause, Play, RefreshCw, SkipForward } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { TaskItem, TimerPhase, TimerState } from "../types";
import { formatClock } from "../lib/timer";

interface Props {
  timer: TimerState;
  tasks: TaskItem[];
  rounds: number;
  onTaskChange: (taskId: string | null) => void;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSkip: () => void;
  onAcknowledge: () => void;
  onPhaseChange: (phase: TimerPhase) => void;
  autoStart: boolean;
  onAutoStartChange: (enabled: boolean) => void;
  onCustomTimer: () => void;
}

const labels: Record<TimerPhase, string> = {
  focus: "Focus session",
  short_break: "Short break",
  long_break: "Long break",
};

const runningMascots: Record<TimerPhase, { src: string; alt: string }> = {
  focus: { src: "/cooper-focus-chibi.webp", alt: "Chibi Cooper focusing on a notebook beside a timer" },
  short_break: { src: "/cooper-short-break-chibi.webp", alt: "Chibi Cooper taking a playful stretch" },
  long_break: { src: "/cooper-long-break-chibi.webp", alt: "Chibi Cooper sleeping with his plush toy on a blue cushion" },
};

const idleMessages: Record<TimerPhase, string> = {
  focus: "Ready? Let's do this!",
  short_break: "How about a quick stretch?",
  long_break: "Let's take a real rest.",
};

const studioClock = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
};

export function TimerCard({ timer, tasks, rounds, onTaskChange, onStart, onPause, onReset, onSkip, onAcknowledge, onPhaseChange, autoStart, onAutoStartChange, onCustomTimer }: Props) {
  const meta = labels[timer.phase];
  const cardRef = useRef<HTMLElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const progress = timer.durationSeconds > 0 ? Math.min(100, Math.max(0, ((timer.durationSeconds - timer.remainingSeconds) / timer.durationSeconds) * 100)) : 0;
  const isRunning = timer.status === "running";
  const mascot = runningMascots[timer.phase];
  const comicMessage = timer.status === "paused"
    ? "I'll keep your spot!"
    : timer.status === "awaiting_acknowledgement"
      ? "You did it! High paw!"
      : idleMessages[timer.phase];
  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(document.fullscreenElement === cardRef.current);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);
  const toggleFullscreen = async () => {
    if (document.fullscreenElement === cardRef.current) await document.exitFullscreen();
    else await cardRef.current?.requestFullscreen();
  };
  return (
    <section ref={cardRef} className="timer-card glass-panel" aria-labelledby="timer-heading">
      <div className="timer-toolbar">
        <button className="custom-timer-button" onClick={onCustomTimer}>Custom timer</button>
        <button className="fullscreen-button" onClick={() => void toggleFullscreen()} aria-label={fullscreen ? "Exit full screen" : "Enter full screen"}>{fullscreen ? <Minimize2 /> : <Maximize2 />}<span>{fullscreen ? "Exit full screen" : "Full screen"}</span></button>
      </div>
      <div className="phase-tabs" role="tablist" aria-label="Timer phase">
        <button role="tab" aria-selected={timer.phase === "focus"} className={timer.phase === "focus" ? "active" : ""} disabled={timer.status === "running"} onClick={() => onPhaseChange("focus")}>Pomodoro</button>
        <button role="tab" aria-selected={timer.phase === "short_break"} className={timer.phase === "short_break" ? "active" : ""} disabled={timer.status === "running"} onClick={() => onPhaseChange("short_break")}>Short break</button>
        <button role="tab" aria-selected={timer.phase === "long_break"} className={timer.phase === "long_break" ? "active" : ""} disabled={timer.status === "running"} onClick={() => onPhaseChange("long_break")}>Long break</button>
        <label className="loop-tab"><input type="checkbox" checked={autoStart} onChange={(event) => onAutoStartChange(event.target.checked)} /> Loop</label>
      </div>
      <div className="timer-focus-layout">
        <div className={`mascot-stage ${isRunning ? "is-running" : "is-chatting"} phase-${timer.phase}`}>
          {!isRunning && <div className="cooper-speech" role="status">{comicMessage}</div>}
          <img
            className="cooper-mascot"
            src={isRunning ? mascot.src : "/cooper-idle-chibi.webp"}
            alt={isRunning ? mascot.alt : "Chibi Cooper waving beside a small focus timer"}
          />
        </div>
        <div className="timer-controls-panel">
          <div className="timer-meta">
            <span className="eyebrow">{meta}</span>
            <span className="round-pill">Round {timer.round} of {rounds}</span>
          </div>
          <h1 id="timer-heading" className="visually-hidden">{timer.status === "awaiting_acknowledgement" ? "Session complete." : `${meta} timer`}</h1>
          <div className="clock-wrap" aria-live="polite">
            <div className="clock" aria-label={`${Math.floor(timer.remainingSeconds / 60)} minutes ${timer.remainingSeconds % 60} seconds remaining`}>
              <span className="full-clock">{studioClock(timer.remainingSeconds)}</span>
              <span className="compact-clock">{formatClock(timer.remainingSeconds)}</span>
            </div>
            <div className="progress-track" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
          </div>

          <label className="task-picker">
            <span>Working on</span>
            <select value={timer.taskId ?? ""} onChange={(event) => onTaskChange(event.target.value || null)} disabled={timer.status === "running"}>
              <option value="">No task selected</option>
              {tasks.filter((task) => !task.completed).map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
            </select>
          </label>

          {timer.status === "awaiting_acknowledgement" ? (
            <button className="primary-button large" onClick={onAcknowledge}><CheckCircle2 size={19} /> Continue</button>
          ) : (
            <div className="timer-actions">
              <button className="icon-button" onClick={onReset} aria-label="Reset timer"><RefreshCw /></button>
              {timer.status === "running" ? (
                <button className="primary-button large" onClick={onPause}><Pause fill="currentColor" /> Pause</button>
              ) : (
                <button className="primary-button large" onClick={onStart}><Play fill="currentColor" /> {timer.status === "paused" ? "Resume" : "Start"}</button>
              )}
              <button className="icon-button" onClick={onSkip} aria-label="Skip this phase"><SkipForward /></button>
            </div>
          )}
          <p className="shortcut-hint"><kbd>Space</kbd> start / pause · <kbd>R</kbd> reset · <kbd>S</kbd> skip</p>
        </div>
      </div>
    </section>
  );
}
