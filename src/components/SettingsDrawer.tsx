import { Bell, MessageCircleHeart, Palette, Plus, Settings, Trash2, X } from "lucide-react";
import { useState } from "react";
import { validatePreset } from "../lib/timer";
import { COLOR_THEMES } from "../lib/themes";
import type { GenderIdentity, TimerPreset, UserSettings } from "../types";

const GENDER_LABELS: Record<GenderIdentity, string> = { woman: "Woman", man: "Man", "non-binary": "Non-binary", "prefer-not-to-say": "Prefer not to say" };

interface Props {
  open: boolean;
  onClose: () => void;
  presets: TimerPreset[];
  selectedPresetId: string;
  settings: UserSettings;
  onPresetSelect: (id: string) => void;
  onPresetSave: (preset: Omit<TimerPreset, "id">) => Promise<TimerPreset>;
  onPresetDelete: (id: string) => Promise<void>;
  onSettings: (patch: Partial<UserSettings>) => Promise<void>;
  onEnableNotifications: () => Promise<void>;
  onOpenFeedback?: () => void;
}

const blankPreset = { name: "", focusMinutes: 50, shortBreakMinutes: 10, longBreakMinutes: 20, roundsBeforeLongBreak: 4 };

export function SettingsDrawer(props: Props) {
  const [draft, setDraft] = useState(blankPreset);
  const [error, setError] = useState("");
  if (!props.open) return null;
  const savePreset = async (event: React.FormEvent) => {
    event.preventDefault();
    const validation = validatePreset(draft);
    if (validation) return setError(validation);
    const preset = await props.onPresetSave(draft);
    props.onPresetSelect(preset.id);
    setDraft(blankPreset);
    setError("");
  };
  return (
    <div className="drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && props.onClose()}>
      <aside className="settings-drawer" aria-label="Studio settings">
        <div className="drawer-heading"><div><span className="eyebrow">Personalize</span><h2>Studio settings</h2></div><button className="icon-button" onClick={props.onClose} aria-label="Close settings"><X /></button></div>

        <section><h3><Settings /> Timer preset</h3>
          <div className="preset-list">
            {props.presets.map((preset) => <div className={`preset-option ${preset.id === props.selectedPresetId ? "active" : ""}`} key={preset.id}><button onClick={() => props.onPresetSelect(preset.id)}><strong>{preset.name}</strong><span>{preset.focusMinutes} / {preset.shortBreakMinutes} / {preset.longBreakMinutes} min · {preset.roundsBeforeLongBreak} rounds</span></button>{!preset.isDefault && <button onClick={() => void props.onPresetDelete(preset.id)} aria-label={`Delete ${preset.name}`}><Trash2 /></button>}</div>)}
          </div>
          <form className="preset-form" onSubmit={savePreset}>
            <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="New preset name" maxLength={80} />
            <div className="number-grid">
              <label>Focus<input type="number" min="1" max="180" value={draft.focusMinutes} onChange={(event) => setDraft({ ...draft, focusMinutes: Number(event.target.value) })} /></label>
              <label>Short break<input type="number" min="1" max="60" value={draft.shortBreakMinutes} onChange={(event) => setDraft({ ...draft, shortBreakMinutes: Number(event.target.value) })} /></label>
              <label>Long break<input type="number" min="1" max="60" value={draft.longBreakMinutes} onChange={(event) => setDraft({ ...draft, longBreakMinutes: Number(event.target.value) })} /></label>
              <label>Rounds<input type="number" min="1" max="12" value={draft.roundsBeforeLongBreak} onChange={(event) => setDraft({ ...draft, roundsBeforeLongBreak: Number(event.target.value) })} /></label>
            </div>
            <button className="secondary-button"><Plus /> Save preset</button>
          </form>
        </section>

        <section><h3><Bell /> Alerts & flow</h3>
          <label className="toggle-row"><span><strong>Auto-start next phase</strong><small>Only while the app is open</small></span><input type="checkbox" checked={props.settings.autoStart} onChange={(event) => void props.onSettings({ autoStart: event.target.checked })} /></label>
          <label className="select-row"><span>Completion sound</span><select value={props.settings.completionSound} onChange={(event) => void props.onSettings({ completionSound: event.target.value as UserSettings["completionSound"] })}><option value="soft-bell">Soft bell</option><option value="wood-block">Wood block</option><option value="digital-chime">Digital chime</option><option value="none">None</option></select></label>
          <button className="secondary-button" onClick={() => void props.onEnableNotifications()}><Bell /> {props.settings.browserNotifications ? "Notifications enabled" : "Enable notifications"}</button>
        </section>
        <section><h3><Palette /> Color theme</h3>
          <label className="select-row"><span>Profile</span><select aria-label="Gender identity" value={props.settings.genderIdentity ?? "prefer-not-to-say"} onChange={(event) => void props.onSettings({ genderIdentity: event.target.value as GenderIdentity })}>{Object.entries(GENDER_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <div className="theme-options" role="radiogroup" aria-label="Color theme">
            {COLOR_THEMES.map((theme) => (
              <label className={`theme-option ${props.settings.themeKey === theme.key ? "active" : ""}`} key={theme.key}>
                <input type="radio" name="color-theme" value={theme.key} checked={props.settings.themeKey === theme.key} onChange={() => void props.onSettings({ themeKey: theme.key })} />
                <span className="theme-swatches" aria-hidden="true">{theme.swatches.map((color) => <i key={color} style={{ backgroundColor: color }} />)}</span>
                <strong>{theme.label}</strong>
              </label>
            ))}
          </div>
        </section>
        {props.onOpenFeedback && <section><h3><MessageCircleHeart /> Feedback</h3><p className="settings-help">Have an idea or want to tell Cooper what is working?</p><button className="secondary-button" onClick={props.onOpenFeedback}><MessageCircleHeart /> Share feedback</button></section>}
        {error && <p className="drawer-error" role="alert">{error}</p>}
      </aside>
    </div>
  );
}
