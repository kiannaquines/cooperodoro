import { createClient, type Session } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

export const isSupabaseConfigured = Boolean(
  url && key && !url.includes("your-project") && !key.includes("your_key"),
);

export const supabase = isSupabaseConfigured ? createClient(url, key) : null;

const signInWithProvider = async (provider: "google" | "facebook"): Promise<void> => {
  if (!supabase) throw new Error(`Add Supabase credentials before using ${provider} sign-in.`);
  const redirectTo = `${window.location.origin}/auth/callback`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  });
  if (error) throw error;
};

export const signInWithGoogle = (): Promise<void> => signInWithProvider("google");

export const signInWithFacebook = (): Promise<void> => signInWithProvider("facebook");

export const completeAuthCallback = async (): Promise<void> => {
  if (window.location.pathname !== "/auth/callback") return;
  try {
    if (!supabase) return;
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
    } else {
      // Wait for Supabase to restore hash-based OAuth sessions before removing the hash.
      await supabase.auth.getSession();
    }
  } finally {
    window.history.replaceState({}, "", "/");
  }
};

export const getSession = async (): Promise<Session | null> => {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
};
