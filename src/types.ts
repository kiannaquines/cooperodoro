export type TimerPhase = "focus" | "short_break" | "long_break";
export type TimerStatus = "idle" | "running" | "paused" | "awaiting_acknowledgement";

export interface TimerPreset {
  id: string;
  name: string;
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  roundsBeforeLongBreak: number;
  isDefault?: boolean;
}

export interface TimerState {
  id: string | null;
  presetId: string;
  phase: TimerPhase;
  round: number;
  status: TimerStatus;
  durationSeconds: number;
  remainingSeconds: number;
  endsAt: number | null;
  taskId: string | null;
  updatedAt?: number;
  phaseSnapshots?: Partial<Record<TimerPhase, { durationSeconds: number; remainingSeconds: number }>>;
}

export interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
}

export interface FocusSession {
  id: string;
  taskId: string | null;
  phase: TimerPhase;
  durationSeconds: number;
  completedAt: string;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  playlistId: string;
  url: string;
  sortOrder: number;
  active: boolean;
}

export type ThemeKey = "strawberry-milk" | "blueberry-cloud" | "lavender-dream" | "matcha-cream" | "midnight-navy" | "forest-trail" | "graphite-blue";
export type GenderIdentity = "woman" | "man" | "non-binary" | "prefer-not-to-say";

export interface UserSettings {
  autoStart: boolean;
  completionSound: "soft-bell" | "wood-block" | "digital-chime" | "none";
  browserNotifications: boolean;
  themeKey: ThemeKey;
  genderIdentity: GenderIdentity | null;
}

export type FeedbackFeature = "timer" | "cooper-mascot" | "tasks" | "themes" | "spotify";
export type FeedbackStatus = "submitted" | "dismissed";

export interface UserFeedback {
  rating: number | null;
  favoriteFeatures: FeedbackFeature[];
  improvementComment: string;
  status: FeedbackStatus;
  nextPromptSessionCount: number;
  submittedAt: string | null;
}

export interface WorkspaceData {
  presets: TimerPreset[];
  tasks: TaskItem[];
  sessions: FocusSession[];
  playlists: SpotifyPlaylist[];
  settings: UserSettings;
  feedback: UserFeedback | null;
  timer: TimerState;
}
