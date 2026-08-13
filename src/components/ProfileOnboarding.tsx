import { Palette } from "lucide-react";
import { useState } from "react";
import { COLOR_THEMES, recommendedThemeForGender } from "../lib/themes";
import type { GenderIdentity, ThemeKey, UserSettings } from "../types";

const OPTIONS: Array<{ value: GenderIdentity; label: string }> = [
  { value: "woman", label: "Woman" },
  { value: "man", label: "Man" },
  { value: "non-binary", label: "Non-binary" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
];

export function ProfileOnboarding({ onSave }: { onSave: (patch: Partial<UserSettings>) => Promise<void> }) {
  const [gender, setGender] = useState<GenderIdentity | null>(null);
  const [themeKey, setThemeKey] = useState<ThemeKey>("blueberry-cloud");
  const [saving, setSaving] = useState(false);

  const chooseGender = (value: GenderIdentity) => {
    setGender(value);
    setThemeKey(recommendedThemeForGender(value));
  };

  const save = async () => {
    const genderIdentity = gender ?? "prefer-not-to-say";
    setSaving(true);
    try { await onSave({ genderIdentity, themeKey: gender ? themeKey : recommendedThemeForGender(genderIdentity) }); }
    finally { setSaving(false); }
  };

  return (
    <div className="onboarding-backdrop">
      <section className="onboarding-card" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <div className="onboarding-icon"><Palette /></div>
        <span className="eyebrow">Make it yours</span>
        <h2 id="onboarding-title">Choose your starting style</h2>
        <p>How do you describe yourself? This optional answer only helps us suggest a color theme.</p>
        <div className="gender-options" role="radiogroup" aria-label="Gender identity">
          {OPTIONS.map((option) => <label className={gender === option.value ? "active" : ""} key={option.value}><input type="radio" name="gender-identity" value={option.value} checked={gender === option.value} onChange={() => chooseGender(option.value)} /><span>{option.label}</span></label>)}
        </div>
        {gender && <div className="recommended-theme"><span>Suggested theme</span><div className="theme-options compact" role="radiogroup" aria-label="Starting color theme">{COLOR_THEMES.map((theme) => <label className={`theme-option ${themeKey === theme.key ? "active" : ""}`} key={theme.key}><input type="radio" name="onboarding-theme" value={theme.key} checked={themeKey === theme.key} onChange={() => setThemeKey(theme.key)} /><span className="theme-swatches" aria-hidden="true">{theme.swatches.map((color) => <i key={color} style={{ backgroundColor: color }} />)}</span><strong>{theme.label}</strong></label>)}</div></div>}
        <div className="onboarding-actions"><button className="text-button" disabled={saving} onClick={() => void save()}>Prefer not to say</button><button className="primary-button" disabled={!gender || saving} onClick={() => void save()}>{saving ? "Saving…" : "Use this style"}</button></div>
      </section>
    </div>
  );
}
