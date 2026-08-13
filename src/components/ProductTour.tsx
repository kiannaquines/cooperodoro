import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

interface TourStep {
  target?: string;
  eyebrow: string;
  title: string;
  description: string;
}

const TOUR_STEPS: TourStep[] = [
  { eyebrow: "Welcome", title: "Meet your focus studio", description: "Cooperodoro keeps your timer, tasks, progress, and focus soundtrack together. Here is a quick look around." },
  { target: '[data-tour="timer"]', eyebrow: "Focus timer", title: "Shape your session", description: "Choose a focus or break phase, select a task, then start, pause, reset, or skip. Loop continues the flow automatically, and Full screen expands the whole app." },
  { target: '[data-tour="tasks"]', eyebrow: "Your tasks", title: "Decide what matters now", description: "Add tasks, select one for the current session, mark it complete, or use the row actions to edit and delete it." },
  { target: '[data-tour="insights"]', eyebrow: "Focus insights", title: "See your progress", description: "Completed sessions, focused minutes, finished tasks, and the activity chart update as you work." },
  { target: '[data-tour="spotify"]', eyebrow: "Spotify ambience", title: "Set the mood", description: "Connect Spotify Premium for playback, then add, activate, reorder, rename, or remove your saved playlists." },
  { target: '[data-tour="settings"]', eyebrow: "Settings", title: "Make the studio yours", description: "Adjust timer presets, sounds, notifications, automatic phase changes, profile preferences, and color themes." },
  { target: '[data-tour="profile"]', eyebrow: "Your profile", title: "You are ready to focus", description: "Your avatar shows the signed-in account. Settings and Sign out stay beside it, and this guide can always be replayed from Settings." },
];

interface ProductTourProps {
  open: boolean;
  onClose: () => void;
}

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function ProductTour({ open, onClose }: ProductTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [highlight, setHighlight] = useState<HighlightRect | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const step = TOUR_STEPS[stepIndex];
  const lastStep = stepIndex === TOUR_STEPS.length - 1;

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setStepIndex(0);
    return () => previousFocusRef.current?.focus();
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const updateHighlight = () => {
      const target = step.target ? document.querySelector<HTMLElement>(step.target) : null;
      if (!target) return setHighlight(null);
      const rect = target.getBoundingClientRect();
      setHighlight({ top: Math.max(8, rect.top - 8), left: Math.max(8, rect.left - 8), width: Math.min(window.innerWidth - 16, rect.width + 16), height: Math.min(window.innerHeight - 16, rect.height + 16) });
    };
    const target = step.target ? document.querySelector<HTMLElement>(step.target) : null;
    target?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    updateHighlight();
    const frame = window.requestAnimationFrame(updateHighlight);
    window.addEventListener("resize", updateHighlight);
    window.addEventListener("scroll", updateHighlight, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateHighlight);
      window.removeEventListener("scroll", updateHighlight, true);
    };
  }, [open, step]);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") setStepIndex((current) => Math.min(TOUR_STEPS.length - 1, current + 1));
      if (event.key === "ArrowLeft") setStepIndex((current) => Math.max(0, current - 1));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) return null;
  const estimatedDialogHeight = window.innerWidth <= 460 ? 250 : 230;
  const dialogStyle = highlight
    ? { left: `${Math.max(16, Math.min(window.innerWidth - 336, highlight.left + highlight.width / 2 - 160))}px`, top: `${highlight.top + highlight.height + estimatedDialogHeight + 14 <= window.innerHeight ? highlight.top + highlight.height + 14 : Math.max(16, highlight.top - estimatedDialogHeight - 14)}px` }
    : undefined;

  return <div className={`product-tour ${highlight ? "has-highlight" : "centered-tour"}`} aria-live="polite">
    <div className="tour-blocker" aria-hidden="true" />
    {highlight && <div className="tour-highlight" style={highlight} aria-hidden="true" />}
    <section className={`tour-dialog ${highlight ? "anchored" : "centered"}`} style={dialogStyle} role="dialog" aria-modal="true" aria-labelledby="tour-title" tabIndex={-1} ref={dialogRef}>
      <button className="tour-close" onClick={onClose} aria-label="Skip app guide"><X /></button>
      <span className="eyebrow">{step.eyebrow}</span>
      <h2 id="tour-title">{step.title}</h2>
      <p>{step.description}</p>
      <div className="tour-progress" aria-label={`Step ${stepIndex + 1} of ${TOUR_STEPS.length}`}>
        {TOUR_STEPS.map((tourStep, index) => <i className={index <= stepIndex ? "active" : ""} key={tourStep.title} />)}
      </div>
      <div className="tour-actions">
        {stepIndex === 0 ? <button className="text-button" onClick={onClose}>Skip tour</button> : <button className="secondary-button" onClick={() => setStepIndex((current) => current - 1)}><ArrowLeft /> Back</button>}
        {lastStep
          ? <button className="primary-button" onClick={onClose}><Check /> Start focusing</button>
          : <button className="primary-button" onClick={() => setStepIndex((current) => current + 1)}>Next <ArrowRight /></button>}
      </div>
    </section>
  </div>;
}
