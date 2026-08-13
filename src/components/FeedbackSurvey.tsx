import { Heart, Star } from "lucide-react";
import { useState } from "react";
import type { FeedbackFeature, UserFeedback } from "../types";

const FEATURES: Array<{ value: FeedbackFeature; label: string }> = [
  { value: "timer", label: "Timer" },
  { value: "cooper-mascot", label: "Cooper mascot" },
  { value: "tasks", label: "Tasks" },
  { value: "themes", label: "Themes" },
  { value: "spotify", label: "Spotify" },
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
        <div className="onboarding-icon"><Heart /></div>
        <span className="eyebrow">A quick check-in</span>
        <h2 id="feedback-title">How is Cooperodoro treating you?</h2>
        <p>Your feedback helps make focus time calmer, cuter, and more useful.</p>
        <form onSubmit={submit}>
          <fieldset className="survey-fieldset"><legend>Overall satisfaction</legend><div className="rating-options">{[1, 2, 3, 4, 5].map((value) => <label className={rating === value ? "active" : ""} key={value}><input type="radio" name="rating" value={value} checked={rating === value} onChange={() => { setRating(value); setError(""); }} /><Star fill="currentColor" /><span>{value}</span></label>)}</div></fieldset>
          <fieldset className="survey-fieldset"><legend>What are your favorite features? <small>Select all that apply</small></legend><div className="feature-options">{FEATURES.map((feature) => { const selected = favoriteFeatures.includes(feature.value); return <label className={selected ? "active" : ""} key={feature.value}><input type="checkbox" name="favorite-features" value={feature.value} checked={selected} onChange={() => { setFavoriteFeatures((current) => selected ? current.filter((value) => value !== feature.value) : [...current, feature.value]); setError(""); }} /><span>{feature.label}</span></label>; })}</div></fieldset>
          <label className="survey-comment"><span>What could we improve? <small>Optional</small></span><textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} placeholder="Tell Cooper what would make the app better…" /><small>{comment.length}/1000</small></label>
          {error && <p className="drawer-error" role="alert">{error}</p>}
          <div className="onboarding-actions"><button type="button" className="text-button" disabled={saving} onClick={() => { setSaving(true); void onDismiss().catch((dismissError) => setError(dismissError instanceof Error ? dismissError.message : "The reminder could not be saved.")).finally(() => setSaving(false)); }}>Maybe later</button><button className="primary-button" disabled={saving}>{saving ? "Sending…" : "Send feedback"}</button></div>
        </form>
      </section>
    </div>
  );
}
