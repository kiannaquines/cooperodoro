import { Cloud, LogIn, Sparkles } from "lucide-react";

interface AuthScreenProps {
  onGoogle: () => void;
  onFacebook: () => void;
  configured: boolean;
}

export function AuthScreen({ onGoogle, onFacebook, configured }: AuthScreenProps) {
  return (
    <main className="auth-page">
      <section className="auth-card glass-panel">
        <div className="auth-brand-mark" aria-hidden="true">
          <Sparkles className="auth-sparkle auth-sparkle-left" />
          <img src="/cooper-idle-chibi.webp" alt="" />
          <Sparkles className="auth-sparkle auth-sparkle-right" />
        </div>
        <span className="eyebrow auth-eyebrow">Focus with Cooper</span>
        <h1>Welcome to Cooperodoro</h1>
        <p className="auth-intro">A calm little studio for focused work, thoughtful breaks, and steady progress.</p>
        <div className="auth-benefits" aria-label="App highlights">
          <span>Gentle focus timer</span>
          <span>Simple task list</span>
          <span>Progress insights</span>
        </div>
        <div className="auth-divider"><span>Sign in to your studio</span></div>
        <div className="auth-actions">
          <button className="primary-button auth-button" onClick={onGoogle} disabled={!configured}><LogIn /> Continue with Google</button>
          <button className="auth-button facebook-auth-button" onClick={onFacebook} disabled={!configured}><span className="facebook-mark" aria-hidden="true">f</span> Continue with Facebook</button>
        </div>
        <p className="auth-footer-note">Your timer, tasks, and theme stay with you.</p>
        {!configured && <p className="auth-note"><Cloud /> Cloud sync is ready once Supabase credentials are added.</p>}
      </section>
    </main>
  );
}
