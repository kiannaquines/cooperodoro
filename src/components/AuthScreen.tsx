import { Cloud, Sparkles } from "lucide-react";

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
          <button className="primary-button auth-button" onClick={onGoogle} disabled={!configured}>
            <svg className="google-mark" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285f4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.87h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.31 2.98-7.35Z" />
              <path fill="#34a853" d="M12 22c2.7 0 4.96-.9 6.62-2.42l-3.23-2.51c-.9.6-2.04.95-3.39.95-2.6 0-4.81-1.76-5.6-4.12H3.06v2.59A10 10 0 0 0 12 22Z" />
              <path fill="#fbbc05" d="M6.4 13.9A6 6 0 0 1 6.09 12c0-.66.11-1.3.31-1.9V7.51H3.06A10 10 0 0 0 2 12c0 1.61.39 3.14 1.06 4.49L6.4 13.9Z" />
              <path fill="#ea4335" d="M12 5.98c1.47 0 2.79.5 3.82 1.49l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.94 5.51L6.4 10.1c.79-2.36 3-4.12 5.6-4.12Z" />
            </svg>
            Continue with Google
          </button>
          <button className="auth-button facebook-auth-button" onClick={onFacebook} disabled={!configured}><span className="facebook-mark" aria-hidden="true">f</span> Continue with Facebook</button>
        </div>
        <p className="auth-footer-note">Your timer, tasks, and theme stay with you.</p>
        {!configured && <p className="auth-note"><Cloud /> Cloud sync is ready once Supabase credentials are added.</p>}
      </section>
    </main>
  );
}
