import { Clock3, Heart, ListChecks, Music2, Palette, PawPrint, Send, Star } from "lucide-react";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import type { FeedbackFeature, UserFeedback } from "../types";

const RATINGS = [
  { value: 1, label: "Not for me" },
  { value: 2, label: "Needs work" },
  { value: 3, label: "Pretty good" },
  { value: 4, label: "Really useful" },
  { value: 5, label: "Love it" },
];

const FEATURES: Array<{ value: FeedbackFeature; label: string; icon: LucideIcon }> = [
  { value: "timer", label: "Timer", icon: Clock3 },
  { value: "cooper-mascot", label: "Cooper", icon: PawPrint },
  { value: "tasks", label: "Tasks", icon: ListChecks },
  { value: "themes", label: "Themes", icon: Palette },
  { value: "spotify", label: "Spotify", icon: Music2 },
];

interface Props {
  feedback: UserFeedback | null;
  onSubmit: (feedback: Pick<UserFeedback, "rating" | "favoriteFeatures" | "improvementComment">) => Promise<void>;
  onDismiss: () => Promise<void>;
}

export function FeedbackSurvey({ feedback, onSubmit, onDismiss }: Props) {
  const [rating, setRating] = useState(feedback?.rating ?? 0);
  const [favoriteFeatures, setFavoriteFeatures] = useState<FeedbackFeature[]>(feedback?.favoriteFeatures ?? []);
  const [comment, setComment] = useState(feedback?.improvementComment ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!rating) return setError("Choose a rating from 1 to 5.");
    if (!favoriteFeatures.length) return setError("Choose at least one favorite feature.");
    setSaving(true);
    try { await onSubmit({ rating, favoriteFeatures, improvementComment: comment.trim() }); }
    catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Feedback could not be saved."); }
    finally { setSaving(false); }
  };

  return (
    <div className="onboarding-backdrop feedback-backdrop">
      <section className="onboarding-card feedback-card" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
        <header className="feedback-header">
          <div className="onboarding-icon"><Heart /></div>
          <div><span className="eyebrow">A quick check-in</span><h2 id="feedback-title">How is Cooperodoro treating you?</h2><p>Your feedback helps make each focus session calmer and more useful.</p></div>
          <span className="feedback-time">About 1 minute</span>
        </header>
        <form className="feedback-form" onSubmit={submit}>
          <fieldset className="survey-fieldset">
            <legend><strong>How satisfied are you overall?</strong><small>Choose the answer that feels closest.</small></legend>
            <div className="rating-options">{RATINGS.map((option) => <label className={rating === option.value ? "active" : ""} key={option.value}><input type="radio" name="rating" value={option.value} aria-label={`${option.value}: ${option.label}`} checked={rating === option.value} onChange={() => { setRating(option.value); setError(""); }} /><Star fill="currentColor" /><strong>{option.value}</strong><span>{option.label}</span></label>)}</div>
          </fieldset>
          <fieldset className="survey-fieldset">
            <legend><strong>What keeps you coming back?</strong><small>Select every feature you enjoy.</small></legend>
            <div className="feature-options">{FEATURES.map((feature) => { const selected = favoriteFeatures.includes(feature.value); const Icon = feature.icon; return <label className={selected ? "active" : ""} key={feature.value}><input type="checkbox" name="favorite-features" value={feature.value} checked={selected} onChange={() => { setFavoriteFeatures((current) => selected ? current.filter((value) => value !== feature.value) : [...current, feature.value]); setError(""); }} /><Icon /><span>{feature.label}</span></label>; })}</div>
          </fieldset>
          <label className="survey-comment" htmlFor="feedback-comment"><span><strong>What would make your next session better?</strong><small>Optional — ideas, friction, or something you miss.</small></span><textarea id="feedback-comment" value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} placeholder="Share one thing Cooper could improve…" aria-describedby="feedback-count" /><small id="feedback-count">{comment.length} of 1000 characters</small></label>
          {error && <p className="feedback-error" role="alert">{error}</p>}
          <div className="onboarding-actions feedback-actions"><button type="button" className="text-button" disabled={saving} onClick={() => { setSaving(true); void onDismiss().catch((dismissError) => setError(dismissError instanceof Error ? dismissError.message : "The reminder could not be saved.")).finally(() => setSaving(false)); }}>Maybe later</button><button className="primary-button" disabled={saving}>{saving ? "Sending…" : <><Send /> Send feedback</>}</button></div>
        </form>
      </section>
    </div>
  );
}
