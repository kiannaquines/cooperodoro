import { Cloud, LogIn } from "lucide-react";

interface AuthScreenProps {
  onGoogle: () => void;
  onFacebook: () => void;
  configured: boolean;
}

export function AuthScreen({ onGoogle, onFacebook, configured }: AuthScreenProps) {
  return (
    <main className="auth-page">
      <div className="auth-scrim" />
      <section className="auth-card glass-panel">
        <div className="brand-mark"><img src="/cooper-idle-chibi.webp" alt="" /></div>
        <span className="eyebrow">Your time, intentionally spent</span>
        <h1>Cooperodoro</h1>
        <p>A calm place for focused work, thoughtful breaks, and a little company from Cooper.</p>
        <button className="primary-button auth-button" onClick={onGoogle} disabled={!configured}><LogIn /> Continue with Google</button>
        <button className="auth-button facebook-auth-button" onClick={onFacebook} disabled={!configured}><span className="facebook-mark" aria-hidden="true">f</span> Continue with Facebook</button>
        {!configured && <p className="auth-note"><Cloud /> Cloud sync is ready once Supabase credentials are added.</p>}
      </section>
    </main>
  );
}
