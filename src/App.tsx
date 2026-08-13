import { LogOut, Settings, TimerReset, UserRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { AuthScreen } from "./components/AuthScreen";
import { SettingsDrawer } from "./components/SettingsDrawer";
import { ProfileOnboarding } from "./components/ProfileOnboarding";
import { ProductTour } from "./components/ProductTour";
import { FeedbackSurvey } from "./components/FeedbackSurvey";
import { SpotifyPanel } from "./components/SpotifyPanel";
import { StatsPanel } from "./components/StatsPanel";
import { TaskPanel } from "./components/TaskPanel";
import { TimerCard } from "./components/TimerCard";
import { useWorkspace } from "./hooks/useWorkspace";
import { DEFAULT_PRESET, initialTimer } from "./lib/constants";
import { enablePushNotifications, playCompletionSound, showLocalNotification } from "./lib/notifications";
import { completeAuthCallback, getSession, isSupabaseConfigured, signInWithFacebook, signInWithGoogle, supabase } from "./lib/supabase";
import { loadCachedThemeKey, themeCssVariables } from "./lib/themes";
import { completeSpotifyLogin } from "./lib/spotifyAuth";
import { canShowFeedbackSurvey, completedFocusSessionCount, shouldPromptForFeedback } from "./lib/feedback";
import { formatClock, moveToNextPhase, phaseDuration, remainingFromEnd, switchTimerPhase } from "./lib/timer";
import type { CSSProperties } from "react";
import type { TimerState } from "./types";
import "./styles.css";

interface Toast { id: string; message: string; kind?: "error" | "success" }

const phaseLogos: Record<TimerState["phase"], string> = {
  focus: "/cooper-focus-chibi.webp",
  short_break: "/cooper-short-break-chibi.webp",
  long_break: "/cooper-long-break-chibi.webp",
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [showPostLoginAnimation, setShowPostLoginAnimation] = useState(false);
  const testAuthenticated = import.meta.env.VITE_E2E_AUTH_BYPASS === "true";
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [browserThemeKey, setBrowserThemeKey] = useState(() => loadCachedThemeKey());
  const userId = session?.user.id ?? "signed-out";
  const cloudEnabled = Boolean(session && isSupabaseConfigured);
  const workspace = useWorkspace(userId, cloudEnabled);
  const activeThemeKey = session || testAuthenticated ? workspace.data.settings.themeKey : browserThemeKey;
  const themeStyle = useMemo(() => themeCssVariables(activeThemeKey) as CSSProperties, [activeThemeKey]);
  const activeCooperLogo = workspace.data.timer.status === "running" ? phaseLogos[workspace.data.timer.phase] : "/cooper-idle-chibi.webp";
  const { finishTimer, setTimerLocal: persistTimerLocal } = workspace;
  const timerRef = useRef(workspace.data.timer);
  const setTimerLocal = useCallback((timer: TimerState) => {
    timerRef.current = timer;
    persistTimerLocal(timer);
  }, [persistTimerLocal]);
  const completingRef = useRef(false);
  const currentSessionRef = useRef<Session | null>(null);
  const toast = useCallback((message: string, kind: Toast["kind"] = "success") => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, message, kind }]);
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 3600);
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([completeAuthCallback(), completeSpotifyLogin()]).catch((error) => toast(error.message, "error")).finally(async () => {
      const current = await getSession();
      if (active) {
        currentSessionRef.current = current;
        setSession(current);
        setShowPostLoginAnimation(Boolean(current));
        setAuthReady(true);
      }
    });
    const subscription = supabase?.auth.onAuthStateChange((_event, next) => {
      if (!currentSessionRef.current && next) setShowPostLoginAnimation(true);
      if (!next) setShowPostLoginAnimation(false);
      currentSessionRef.current = next;
      setSession(next);
    });
    return () => { active = false; subscription?.data.subscription.unsubscribe(); };
  }, [toast]);

  useEffect(() => {
    if (!showPostLoginAnimation) return;
    const timeout = window.setTimeout(() => setShowPostLoginAnimation(false), 1400);
    return () => window.clearTimeout(timeout);
  }, [showPostLoginAnimation]);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, []);

  useEffect(() => {
    if (session || testAuthenticated) setBrowserThemeKey(workspace.data.settings.themeKey);
  }, [session, testAuthenticated, workspace.data.settings.themeKey]);

  useEffect(() => {
    document.title = session || testAuthenticated ? `${formatClock(workspace.data.timer.remainingSeconds)} · Cooperodoro` : "Cooperodoro";
  }, [session, testAuthenticated, workspace.data.timer.remainingSeconds]);

  useEffect(() => {
    let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      document.head.appendChild(favicon);
    }
    const appActive = Boolean(session || testAuthenticated);
    const href = appActive && workspace.data.timer.status !== "idle" ? activeCooperLogo : "/app-icon.svg";
    favicon.setAttribute("href", href);
    favicon.setAttribute("type", href.endsWith(".webp") ? "image/webp" : "image/svg+xml");
  }, [activeCooperLogo, session, testAuthenticated, workspace.data.timer.status]);

  useEffect(() => { timerRef.current = workspace.data.timer; }, [workspace.data.timer]);
  const preset = useMemo(() => workspace.data.presets.find((item) => item.id === workspace.data.timer.presetId) ?? workspace.data.presets[0] ?? DEFAULT_PRESET, [workspace.data.presets, workspace.data.timer.presetId]);
  const focusSessionCount = completedFocusSessionCount(workspace.data.sessions);
  const profileOnboardingOpen = Boolean(session && !workspace.loading && !workspace.data.settings.genderIdentity);
  const guideShouldOpen = Boolean(session && !workspace.loading && !profileOnboardingOpen && !workspace.data.settings.tourCompletedAt);
  const surveyEligible = Boolean(session && !workspace.loading && shouldPromptForFeedback(workspace.data.feedback, focusSessionCount));
  const surveyCanShow = canShowFeedbackSurvey({ authenticated: Boolean(session), eligible: surveyEligible, profileOnboardingOpen, settingsOpen, timerStatus: workspace.data.timer.status });
  const profileName = session
    ? ([session.user.user_metadata?.full_name, session.user.user_metadata?.name, session.user.email]
      .find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim() ?? "Profile")
    : "";
  const profileAvatar = session
    ? [session.user.user_metadata?.avatar_url, session.user.user_metadata?.picture]
      .find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim()
    : undefined;

  useEffect(() => {
    if (!session) setGuideOpen(false);
    else if (guideShouldOpen && !showPostLoginAnimation) {
      setFeedbackOpen(false);
      setGuideOpen(true);
    }
  }, [guideShouldOpen, session, showPostLoginAnimation]);

  useEffect(() => {
    if (surveyCanShow && !guideOpen && !guideShouldOpen) setFeedbackOpen(true);
  }, [guideOpen, guideShouldOpen, surveyCanShow]);

  const handleComplete = useCallback(async (timer: TimerState) => {
    if (completingRef.current || timer.status === "awaiting_acknowledgement") return;
    completingRef.current = true;
    const completed = { ...timer, status: "awaiting_acknowledgement" as const, remainingSeconds: 0, endsAt: null };
    setTimerLocal(completed);
    playCompletionSound(workspace.data.settings.completionSound);
    void showLocalNotification(timer.phase === "focus" ? "Focus session complete" : "Break complete", "Open Cooperodoro when you are ready to continue.");
    toast(timer.phase === "focus" ? "Focus session complete." : "Break complete.");
    try { await finishTimer(timer, "completed"); }
    catch (error) { localStorage.setItem("pomodoro-pending-completion", JSON.stringify(timer)); toast(error instanceof Error ? error.message : "Completion will sync when online.", "error"); }
    finally { completingRef.current = false; }
  }, [finishTimer, setTimerLocal, toast, workspace.data.settings.completionSound]);

  useEffect(() => {
    if (workspace.data.timer.status !== "running" || !workspace.data.timer.endsAt) return;
    const tick = () => {
      const current = timerRef.current;
      if (current.status !== "running" || !current.endsAt) return;
      const remainingSeconds = remainingFromEnd(current.endsAt);
      if (remainingSeconds <= 0) void handleComplete(current);
      else setTimerLocal({ ...current, remainingSeconds });
    };
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [handleComplete, setTimerLocal, workspace.data.timer.endsAt, workspace.data.timer.status]);

  useEffect(() => {
    if (!online || !cloudEnabled) return;
    const raw = localStorage.getItem("pomodoro-pending-completion");
    if (!raw) return;
    try {
      const pending = JSON.parse(raw) as TimerState;
      void finishTimer(pending, "completed").then(() => localStorage.removeItem("pomodoro-pending-completion"));
    } catch { localStorage.removeItem("pomodoro-pending-completion"); }
  }, [cloudEnabled, finishTimer, online]);

  const start = useCallback(async () => {
    const timer = timerRef.current;
    const endsAt = Date.now() + timer.remainingSeconds * 1000;
    const next = { ...timer, status: "running" as const, endsAt };
    setTimerLocal(next);
    try { await workspace.syncTimer(next, preset); }
    catch (error) { toast(error instanceof Error ? error.message : "Timer is running locally.", "error"); }
  }, [preset, setTimerLocal, toast, workspace]);

  const pause = useCallback(async () => {
    const timer = timerRef.current;
    const remainingSeconds = timer.endsAt ? remainingFromEnd(timer.endsAt) : timer.remainingSeconds;
    const next = { ...timer, status: "paused" as const, remainingSeconds, endsAt: null };
    setTimerLocal(next);
    try { await workspace.syncTimer(next, preset); } catch { toast("Paused locally; cloud sync will retry later.", "error"); }
  }, [preset, setTimerLocal, toast, workspace]);

  const reset = useCallback(async () => {
    const current = timerRef.current;
    try { await workspace.finishTimer(current, "reset"); } catch { /* local reset still succeeds */ }
    const durationSeconds = phaseDuration(preset, current.phase);
    const phaseSnapshots = { ...current.phaseSnapshots };
    delete phaseSnapshots[current.phase];
    setTimerLocal({ ...current, id: null, status: "idle", durationSeconds, remainingSeconds: durationSeconds, endsAt: null, phaseSnapshots });
  }, [preset, setTimerLocal, workspace]);

  const advance = useCallback(async (skip = false) => {
    const current = timerRef.current;
    if (skip) { try { await workspace.finishTimer(current, "skipped"); } catch { /* local skip still succeeds */ } }
    const next = moveToNextPhase({ ...current, id: null }, preset);
    setTimerLocal(next);
    if (workspace.data.settings.autoStart && !skip) {
      const running = { ...next, status: "running" as const, endsAt: Date.now() + next.remainingSeconds * 1000 };
      setTimerLocal(running);
      void workspace.syncTimer(running, preset);
    }
  }, [preset, setTimerLocal, workspace]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.code === "Space") { event.preventDefault(); if (timerRef.current.status === "running") void pause(); else void start(); }
      if (event.key.toLowerCase() === "r") void reset();
      if (event.key.toLowerCase() === "s") void advance(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, pause, reset, start]);

  const selectPreset = (id: string) => {
    const selected = workspace.data.presets.find((item) => item.id === id);
    if (!selected || workspace.data.timer.status === "running") return;
    setTimerLocal(initialTimer(selected));
  };

  const selectPhase = (phase: TimerState["phase"]) => {
    const current = timerRef.current;
    if (current.status === "running") return;
    setTimerLocal(switchTimerPhase(current, preset, phase));
    if (current.id && current.status === "paused") {
      void workspace.finishTimer(current, "reset").catch(() => toast("The paused timer was kept locally but could not update the cloud.", "error"));
    }
  };

  const enableNotifications = async () => {
    try {
      if (cloudEnabled && session) await enablePushNotifications(session.user.id);
      else {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") throw new Error("Notification permission was not granted.");
      }
      await workspace.updateSettings({ browserNotifications: true });
      toast("Notifications are enabled.");
    } catch (error) { toast(error instanceof Error ? error.message : "Could not enable notifications.", "error"); }
  };

  const updateSettings = async (patch: Parameters<typeof workspace.updateSettings>[0]) => {
    if (patch.themeKey !== undefined) setBrowserThemeKey(patch.themeKey);
    await workspace.updateSettings(patch);
  };

  const openFeedback = () => {
    if (workspace.data.timer.status === "running") {
      toast("Pause your timer before opening the survey. Your focus session is still running.", "error");
      return;
    }
    if (workspace.data.timer.status === "awaiting_acknowledgement") {
      toast("Continue to the next timer phase before opening the survey.", "error");
      return;
    }
    setSettingsOpen(false);
    setFeedbackOpen(true);
  };

  const closeGuide = () => {
    setGuideOpen(false);
    if (session && !workspace.data.settings.tourCompletedAt) {
      void updateSettings({ tourCompletedAt: new Date().toISOString() }).catch((error) => toast(error instanceof Error ? error.message : "The guide completion could not be saved.", "error"));
    }
  };

  const openGuide = () => {
    setSettingsOpen(false);
    setFeedbackOpen(false);
    setGuideOpen(true);
  };

  if (!authReady) return <div className="loading-screen cooper-style kawaii-cooper-theme" data-theme={activeThemeKey} style={themeStyle}><TimerReset className="spin" /><span>Opening your studio…</span></div>;
  if (!session && !testAuthenticated) return <div className="cooper-style kawaii-cooper-theme" data-theme={activeThemeKey} style={themeStyle}>
    <AuthScreen
      configured={isSupabaseConfigured}
      onGoogle={() => void signInWithGoogle().catch((error) => toast(error.message, "error"))}
      onFacebook={() => void signInWithFacebook().catch((error) => toast(error.message, "error"))}
    />
  </div>;
  if (session && showPostLoginAnimation) return <div
    className="loading-screen post-login-screen cooper-style kawaii-cooper-theme"
    data-theme={activeThemeKey}
    style={themeStyle}
    role="status"
    aria-live="polite"
    onAnimationEnd={() => setShowPostLoginAnimation(false)}
  >
    <div className="post-login-mascot" aria-hidden="true" onAnimationEnd={(event) => event.stopPropagation()}><img src="/cooper-idle-chibi.webp" alt="" /></div>
    <strong>Welcome back!</strong>
    <span>Preparing your focus space…</span>
    <div className="loading-dots" aria-hidden="true" onAnimationEnd={(event) => event.stopPropagation()}><i /><i /><i /></div>
  </div>;

  return (
    <div className="app-shell cooper-style kawaii-cooper-theme" data-theme={workspace.data.settings.themeKey} style={themeStyle}>
      <div className="theme-wave" aria-hidden="true">
        <svg viewBox="0 0 2880 120" preserveAspectRatio="none">
          <path d="M0 58 C120 112 240 4 360 58 S600 112 720 58 S960 4 1080 58 S1320 112 1440 58 S1680 4 1800 58 S2040 112 2160 58 S2400 4 2520 58 S2760 112 2880 58 L2880 0 L0 0 Z" />
        </svg>
      </div>
      <div className="theme-wave theme-wave-lower" aria-hidden="true">
        <svg viewBox="0 0 2880 170" preserveAspectRatio="none">
          <path d="M0 112 C130 36 300 24 450 98 C630 184 790 136 930 54 C1080 -34 1260 28 1420 116 C1590 208 1780 138 1920 48 C2070 -46 2250 30 2410 112 C2580 196 2740 110 2880 72 L2880 170 L0 170 Z" />
        </svg>
      </div>
      <header className="topbar">
        <div className="brand"><div className="brand-mark"><img src={activeCooperLogo} alt="" /></div><div><strong>Cooperodoro</strong><span>Focus with Cooper</span></div></div>
        <div className="top-actions">
          {session && <div className="user-profile" aria-label={`Signed in as ${profileName}`} data-tour="profile">
            <div className="user-avatar">
              {profileAvatar ? <img src={profileAvatar} alt="" referrerPolicy="no-referrer" /> : <UserRound aria-hidden="true" />}
            </div>
            <div className="user-profile-copy">
              <strong>{profileName}</strong>
              {session.user.email && session.user.email !== profileName && <span>{session.user.email}</span>}
            </div>
          </div>}
          <button className="top-button" aria-label="Settings" data-tour="settings" onClick={() => setSettingsOpen(true)}><Settings /> <span>Settings</span></button>
          {session && <button className="top-button" aria-label="Sign out" onClick={() => void supabase?.auth.signOut()}><LogOut /><span>Sign out</span></button>}
        </div>
      </header>

      <main className="workspace-layout timer-first-layout">
        <div className="center-column">
          <TimerCard timer={workspace.data.timer} tasks={workspace.data.tasks} rounds={preset.roundsBeforeLongBreak} onTaskChange={(taskId) => setTimerLocal({ ...workspace.data.timer, taskId })} onStart={() => void start()} onPause={() => void pause()} onReset={() => void reset()} onSkip={() => void advance(true)} onAcknowledge={() => void advance(false)} onPhaseChange={selectPhase} autoStart={workspace.data.settings.autoStart} onAutoStartChange={(autoStart) => void workspace.updateSettings({ autoStart })} onCustomTimer={() => setSettingsOpen(true)} />
        </div>
        <section className="below-timer-grid support-dashboard">
          <TaskPanel tasks={workspace.data.tasks} activeTaskId={workspace.data.timer.taskId} onSelect={(taskId) => setTimerLocal({ ...workspace.data.timer, taskId })} onAdd={workspace.addTask} onUpdate={workspace.updateTask} onDelete={workspace.deleteTask} />
          <StatsPanel sessions={workspace.data.sessions} tasks={workspace.data.tasks} />
          <SpotifyPanel playlists={workspace.data.playlists} onAdd={workspace.addPlaylist} onActivate={workspace.setActivePlaylist} onUpdate={workspace.updatePlaylist} onDelete={workspace.deletePlaylist} />
        </section>
      </main>

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} presets={workspace.data.presets} selectedPresetId={workspace.data.timer.presetId} settings={workspace.data.settings} onPresetSelect={selectPreset} onPresetSave={workspace.savePreset} onPresetDelete={workspace.deletePreset} onSettings={updateSettings} onEnableNotifications={enableNotifications} onOpenFeedback={session ? openFeedback : undefined} onOpenGuide={openGuide} />
      {profileOnboardingOpen && <ProfileOnboarding onSave={updateSettings} />}
      {feedbackOpen && !guideOpen && canShowFeedbackSurvey({ authenticated: Boolean(session), eligible: true, profileOnboardingOpen, settingsOpen, timerStatus: workspace.data.timer.status }) && <FeedbackSurvey feedback={workspace.data.feedback} onSubmit={async (feedback) => { await workspace.saveFeedback(feedback); setFeedbackOpen(false); toast("Thanks for helping Cooperodoro grow."); }} onDismiss={async () => { if (workspace.data.feedback?.status !== "submitted") await workspace.dismissFeedback(focusSessionCount); setFeedbackOpen(false); }} />}
      <ProductTour open={guideOpen && !profileOnboardingOpen && !showPostLoginAnimation} onClose={closeGuide} />
      <div className="toast-region" aria-live="polite">{toasts.map((item) => <div className={`toast ${item.kind ?? "success"}`} key={item.id}>{item.message}</div>)}</div>
    </div>
  );
}
