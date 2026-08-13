import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_PRESET, DEFAULT_SETTINGS, initialTimer } from "../lib/constants";
import { remainingFromEnd } from "../lib/timer";
import { supabase } from "../lib/supabase";
import { loadCachedThemeKey, normalizeThemeKey, saveCachedThemeKey } from "../lib/themes";
import type {
  FocusSession,
  SpotifyPlaylist,
  TaskItem,
  TimerPreset,
  TimerState,
  UserFeedback,
  UserSettings,
  WorkspaceData,
} from "../types";

const localKey = (userId: string) => `pomodoro-studio:${userId}`;
const createId = (): string => crypto.randomUUID();

const initialWorkspace = (): WorkspaceData => ({
  presets: [DEFAULT_PRESET],
  tasks: [],
  sessions: [],
  playlists: [],
  settings: { ...DEFAULT_SETTINGS, themeKey: loadCachedThemeKey() },
  feedback: null,
  timer: initialTimer(),
});

export const loadLocalWorkspace = (userId: string): WorkspaceData => {
  try {
    const cachedThemeKey = loadCachedThemeKey();
    const saved = localStorage.getItem(localKey(userId));
    if (!saved) return initialWorkspace();
    const parsed = JSON.parse(saved) as Partial<WorkspaceData>;
    return {
      ...initialWorkspace(),
      ...parsed,
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings, themeKey: normalizeThemeKey(parsed.settings?.themeKey ?? cachedThemeKey) },
      timer: { ...initialTimer(), ...parsed.timer },
    };
  } catch {
    return initialWorkspace();
  }
};

const mapPreset = (row: any): TimerPreset => ({
  id: row.id,
  name: row.name,
  focusMinutes: row.focus_minutes,
  shortBreakMinutes: row.short_break_minutes,
  longBreakMinutes: row.long_break_minutes,
  roundsBeforeLongBreak: row.rounds_before_long_break,
  isDefault: row.is_default,
});

const mapTimer = (row: any): TimerState => {
  const remainingSeconds = row.status === "running" && row.ends_at
    ? remainingFromEnd(new Date(row.ends_at).getTime())
    : row.paused_remaining_seconds ?? row.duration_seconds;
  return {
    id: row.id,
    presetId: row.preset_id ?? DEFAULT_PRESET.id,
    phase: row.phase,
    round: row.round_number,
    status: row.status === "awaiting_acknowledgement" ? "awaiting_acknowledgement" : row.status,
    durationSeconds: row.duration_seconds,
    remainingSeconds,
    endsAt: row.ends_at ? new Date(row.ends_at).getTime() : null,
    taskId: row.task_id,
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : 0,
  };
};

export const newestTimer = (local: TimerState, remote: TimerState | null): TimerState => {
  if (!remote) return local;
  if (local.status === "paused" && remote.status === "running" && local.updatedAt && local.updatedAt > (remote.updatedAt ?? 0)) return local;
  return remote;
};

export const useWorkspace = (userId: string, cloudEnabled: boolean) => {
  const [data, setData] = useState<WorkspaceData>(() => loadLocalWorkspace(userId));
  const [loading, setLoading] = useState(cloudEnabled);
  const storageUserId = useRef(userId);

  useEffect(() => {
    storageUserId.current = userId;
    setData(loadLocalWorkspace(userId));
  }, [userId]);

  useEffect(() => {
    try {
      localStorage.setItem(localKey(storageUserId.current), JSON.stringify(data));
    } catch {
      // The timer remains usable even when the browser refuses local storage writes.
    }
  }, [data]);

  useEffect(() => {
    saveCachedThemeKey(data.settings.themeKey);
  }, [data.settings.themeKey]);

  useEffect(() => {
    if (!cloudEnabled || !supabase) {
      setLoading(false);
      return;
    }
    const client = supabase;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [presetsResult, tasksResult, sessionsResult, playlistsResult, settingsResult, feedbackResult, timerResult] = await Promise.all([
        client.from("timer_presets").select("*").order("created_at"),
        client.from("tasks").select("*").order("created_at", { ascending: false }),
        client.from("timer_runs").select("*").eq("status", "completed").order("completed_at", { ascending: false }).limit(500),
        client.from("spotify_embeds").select("*").order("sort_order"),
        client.from("user_settings").select("*").maybeSingle(),
        client.from("user_feedback").select("*").maybeSingle(),
        client.from("timer_runs").select("*").in("status", ["running", "paused", "awaiting_acknowledgement"]).maybeSingle(),
      ]);
      const firstError = [presetsResult, tasksResult, sessionsResult, playlistsResult, settingsResult, feedbackResult, timerResult]
        .map((result) => result.error)
        .find(Boolean);
      if (firstError) throw firstError;
      if (cancelled) return;
      const settingsRow = settingsResult.data;
      setData((current) => {
        const remoteTimer = timerResult.data ? mapTimer(timerResult.data) : null;
        const timer = newestTimer(current.timer, remoteTimer);
        if (timer === current.timer && timer.id && timer.status === "paused") {
          void client.from("timer_runs").update({
            status: "paused",
            ends_at: null,
            paused_remaining_seconds: timer.remainingSeconds,
          }).eq("id", timer.id);
        }
        return {
        presets: presetsResult.data?.length ? presetsResult.data.map(mapPreset) : current.presets,
        tasks: (tasksResult.data ?? []).map((row: any) => ({
          id: row.id,
          title: row.title,
          completed: row.is_completed,
          completedAt: row.completed_at,
          createdAt: row.created_at,
        })),
        sessions: (sessionsResult.data ?? []).map((row: any) => ({
          id: row.id,
          taskId: row.task_id,
          phase: row.phase,
          durationSeconds: row.duration_seconds,
          completedAt: row.completed_at,
        })),
        playlists: (playlistsResult.data ?? []).map((row: any) => ({
          id: row.id,
          name: row.name,
          playlistId: row.playlist_id,
          url: row.playlist_url,
          sortOrder: row.sort_order,
          active: row.is_active,
        })),
        settings: settingsRow ? {
          autoStart: settingsRow.auto_start,
          completionSound: settingsRow.completion_sound,
          browserNotifications: settingsRow.browser_notifications,
          themeKey: normalizeThemeKey(settingsRow.theme_key),
          genderIdentity: settingsRow.gender_identity ?? null,
        } : current.settings,
        feedback: feedbackResult.data ? {
          rating: feedbackResult.data.rating,
          favoriteFeatures: feedbackResult.data.favorite_features ?? [],
          improvementComment: feedbackResult.data.improvement_comment ?? "",
          status: feedbackResult.data.status,
          nextPromptSessionCount: feedbackResult.data.next_prompt_session_count,
          submittedAt: feedbackResult.data.submitted_at,
        } : null,
        timer,
      };
      });
      setLoading(false);
    };
    void load().catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, [cloudEnabled, userId]);

  useEffect(() => {
    if (!cloudEnabled || !supabase) return;
    const channel = supabase.channel(`timer-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "timer_runs", filter: `user_id=eq.${userId}` }, (payload) => {
        const row = payload.new as any;
        if (row && ["running", "paused", "awaiting_acknowledgement"].includes(row.status)) {
          setData((current) => ({ ...current, timer: newestTimer(current.timer, mapTimer(row)) }));
        }
      })
      .subscribe();
    return () => { void supabase?.removeChannel(channel); };
  }, [cloudEnabled, userId]);

  const setTimerLocal = useCallback((timer: TimerState) => {
    const timestamped = { ...timer, updatedAt: Date.now() };
    setData((current) => {
      const next = { ...current, timer: timestamped };
      try { localStorage.setItem(localKey(storageUserId.current), JSON.stringify(next)); } catch { /* state remains usable */ }
      return next;
    });
  }, []);

  const syncTimer = useCallback(async (timer: TimerState, preset: TimerPreset): Promise<string | null> => {
    setTimerLocal(timer);
    if (!cloudEnabled || !supabase) return timer.id;
    const payload = {
      user_id: userId,
      preset_id: preset.id === DEFAULT_PRESET.id ? null : preset.id,
      task_id: timer.taskId,
      phase: timer.phase,
      round_number: timer.round,
      focus_seconds: preset.focusMinutes * 60,
      short_break_seconds: preset.shortBreakMinutes * 60,
      long_break_seconds: preset.longBreakMinutes * 60,
      rounds_before_long_break: preset.roundsBeforeLongBreak,
      duration_seconds: timer.durationSeconds,
      started_at: timer.status === "running" ? new Date().toISOString() : null,
      ends_at: timer.endsAt ? new Date(timer.endsAt).toISOString() : null,
      paused_remaining_seconds: timer.status === "paused" ? timer.remainingSeconds : null,
      status: timer.status === "idle" ? "paused" : timer.status,
    };
    if (timer.id) {
      const { error } = await supabase.from("timer_runs").update(payload).eq("id", timer.id);
      if (error) throw error;
      return timer.id;
    }
    const { data: inserted, error } = await supabase.from("timer_runs").insert(payload).select("id").single();
    if (error) throw error;
    setData((current) => ({ ...current, timer: { ...current.timer, id: inserted.id } }));
    return inserted.id;
  }, [cloudEnabled, setTimerLocal, userId]);

  const finishTimer = useCallback(async (timer: TimerState, terminalStatus: "completed" | "skipped" | "reset") => {
    if (timer.id && cloudEnabled && supabase) {
      if (terminalStatus === "completed") {
        const { error } = await supabase.rpc("acknowledge_timer_run", { run_id: timer.id });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("timer_runs").update({ status: terminalStatus, completed_at: new Date().toISOString() }).eq("id", timer.id);
        if (error) throw error;
      }
    }
    if (terminalStatus === "completed" && timer.phase === "focus") {
      const completedAt = new Date().toISOString();
      const session: FocusSession = {
        id: timer.id ?? createId(),
        taskId: timer.taskId,
        phase: timer.phase,
        durationSeconds: timer.durationSeconds,
        completedAt,
      };
      setData((current) => ({
        ...current,
        sessions: [session, ...current.sessions.filter((item) => item.id !== session.id)],
        tasks: timer.taskId
          ? current.tasks.map((task) => task.id === timer.taskId ? { ...task, completed: true, completedAt } : task)
          : current.tasks,
      }));
    }
  }, [cloudEnabled]);

  const addTask = useCallback(async (title: string) => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    let task: TaskItem = { id: createId(), title: cleanTitle, completed: false, completedAt: null, createdAt: new Date().toISOString() };
    if (cloudEnabled && supabase) {
      const { data: row, error } = await supabase.from("tasks").insert({ user_id: userId, title: cleanTitle }).select("*").single();
      if (error) throw error;
      task = { id: row.id, title: row.title, completed: row.is_completed, completedAt: row.completed_at, createdAt: row.created_at };
    }
    setData((current) => ({ ...current, tasks: [task, ...current.tasks] }));
  }, [cloudEnabled, userId]);

  const updateTask = useCallback(async (id: string, patch: Partial<Pick<TaskItem, "title" | "completed">>) => {
    const completedAt = patch.completed === undefined ? undefined : patch.completed ? new Date().toISOString() : null;
    if (cloudEnabled && supabase) {
      const dbPatch: Record<string, unknown> = {};
      if (patch.title !== undefined) dbPatch.title = patch.title.trim();
      if (patch.completed !== undefined) { dbPatch.is_completed = patch.completed; dbPatch.completed_at = completedAt; }
      const { error } = await supabase.from("tasks").update(dbPatch).eq("id", id);
      if (error) throw error;
    }
    setData((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === id ? { ...task, ...patch, ...(completedAt !== undefined ? { completedAt } : {}) } : task) }));
  }, [cloudEnabled]);

  const deleteTask = useCallback(async (id: string) => {
    if (cloudEnabled && supabase) {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    }
    setData((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== id) }));
  }, [cloudEnabled]);

  const savePreset = useCallback(async (input: Omit<TimerPreset, "id">) => {
    let preset: TimerPreset = { ...input, id: createId() };
    if (cloudEnabled && supabase) {
      const { data: row, error } = await supabase.from("timer_presets").insert({
        user_id: userId,
        name: input.name.trim(),
        focus_minutes: input.focusMinutes,
        short_break_minutes: input.shortBreakMinutes,
        long_break_minutes: input.longBreakMinutes,
        rounds_before_long_break: input.roundsBeforeLongBreak,
      }).select("*").single();
      if (error) throw error;
      preset = mapPreset(row);
    }
    setData((current) => ({ ...current, presets: [...current.presets, preset] }));
    return preset;
  }, [cloudEnabled, userId]);

  const deletePreset = useCallback(async (id: string) => {
    if (cloudEnabled && supabase) {
      const { error } = await supabase.from("timer_presets").delete().eq("id", id).eq("is_default", false);
      if (error) throw error;
    }
    setData((current) => ({ ...current, presets: current.presets.filter((preset) => preset.id !== id || preset.isDefault) }));
  }, [cloudEnabled]);

  const updateSettings = useCallback(async (patch: Partial<UserSettings>) => {
    setData((current) => ({ ...current, settings: { ...current.settings, ...patch } }));
    if (cloudEnabled && supabase) {
      const next = { ...data.settings, ...patch };
      const { error } = await supabase.from("user_settings").upsert({
        user_id: userId,
        auto_start: next.autoStart,
        completion_sound: next.completionSound,
        browser_notifications: next.browserNotifications,
        theme_key: next.themeKey,
        gender_identity: next.genderIdentity,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      if (error) throw error;
    }
  }, [cloudEnabled, data.settings, userId]);

  const saveFeedback = useCallback(async (feedback: Pick<UserFeedback, "rating" | "favoriteFeatures" | "improvementComment">) => {
    if (!cloudEnabled || !supabase) throw new Error("Sign in to share feedback.");
    const submittedAt = new Date().toISOString();
    const next: UserFeedback = { ...feedback, status: "submitted", nextPromptSessionCount: data.sessions.filter((session) => session.phase === "focus").length + 3, submittedAt };
    const { error } = await supabase.from("user_feedback").upsert({
      user_id: userId,
      rating: next.rating,
      favorite_features: next.favoriteFeatures,
      improvement_comment: next.improvementComment.trim() || null,
      status: next.status,
      next_prompt_session_count: next.nextPromptSessionCount,
      submitted_at: submittedAt,
    });
    if (error) throw error;
    setData((current) => ({ ...current, feedback: next }));
  }, [cloudEnabled, data.sessions, userId]);

  const dismissFeedback = useCallback(async (completedFocusSessions: number) => {
    if (!cloudEnabled || !supabase) return;
    const next: UserFeedback = { rating: null, favoriteFeatures: [], improvementComment: "", status: "dismissed", nextPromptSessionCount: completedFocusSessions + 3, submittedAt: null };
    const { error } = await supabase.from("user_feedback").upsert({
      user_id: userId,
      rating: null,
      favorite_features: [],
      improvement_comment: null,
      status: next.status,
      next_prompt_session_count: next.nextPromptSessionCount,
      submitted_at: null,
    });
    if (error) throw error;
    setData((current) => ({ ...current, feedback: next }));
  }, [cloudEnabled, userId]);

  const addPlaylist = useCallback(async (name: string, playlistId: string, url: string) => {
    let playlist: SpotifyPlaylist = { id: createId(), name: name.trim(), playlistId, url, sortOrder: data.playlists.length, active: data.playlists.length === 0 };
    if (cloudEnabled && supabase) {
      const { data: row, error } = await supabase.from("spotify_embeds").insert({
        user_id: userId,
        name: playlist.name,
        playlist_id: playlistId,
        playlist_url: url,
        sort_order: playlist.sortOrder,
        is_active: playlist.active,
      }).select("*").single();
      if (error) throw error;
      playlist = { id: row.id, name: row.name, playlistId: row.playlist_id, url: row.playlist_url, sortOrder: row.sort_order, active: row.is_active };
    }
    setData((current) => ({ ...current, playlists: [...current.playlists, playlist] }));
  }, [cloudEnabled, data.playlists.length, userId]);

  const setActivePlaylist = useCallback(async (id: string) => {
    if (cloudEnabled && supabase) {
      await supabase.from("spotify_embeds").update({ is_active: false }).neq("id", id);
      const { error } = await supabase.from("spotify_embeds").update({ is_active: true }).eq("id", id);
      if (error) throw error;
    }
    setData((current) => ({ ...current, playlists: current.playlists.map((playlist) => ({ ...playlist, active: playlist.id === id })) }));
  }, [cloudEnabled]);

  const updatePlaylist = useCallback(async (id: string, patch: Partial<Pick<SpotifyPlaylist, "name" | "sortOrder">>) => {
    if (cloudEnabled && supabase) {
      const { error } = await supabase.from("spotify_embeds").update({ name: patch.name, sort_order: patch.sortOrder }).eq("id", id);
      if (error) throw error;
    }
    setData((current) => ({ ...current, playlists: current.playlists.map((playlist) => playlist.id === id ? { ...playlist, ...patch } : playlist).sort((a, b) => a.sortOrder - b.sortOrder) }));
  }, [cloudEnabled]);

  const deletePlaylist = useCallback(async (id: string) => {
    if (cloudEnabled && supabase) {
      const { error } = await supabase.from("spotify_embeds").delete().eq("id", id);
      if (error) throw error;
    }
    setData((current) => ({ ...current, playlists: current.playlists.filter((playlist) => playlist.id !== id) }));
  }, [cloudEnabled]);

  return {
    data,
    loading,
    setTimerLocal,
    syncTimer,
    finishTimer,
    addTask,
    updateTask,
    deleteTask,
    savePreset,
    deletePreset,
    updateSettings,
    saveFeedback,
    dismissFeedback,
    addPlaylist,
    setActivePlaylist,
    updatePlaylist,
    deletePlaylist,
  };
};
