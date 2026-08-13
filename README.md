# Cooperodoro

An installable productivity PWA with timestamp-based Pomodoro cycles, reusable timer presets, tasks, seven-day focus insights, authenticated Spotify Premium playback, Google and Facebook sign-in, and closed-app web push.

## Run locally

Requirements: Node.js 22+ and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Google or Facebook sign-in and configured Supabase credentials are required to enter the workspace. After sign-in, cached timer state keeps an active session usable during temporary network loss while Supabase provides Auth, Postgres, Storage, Realtime, and Edge Functions.

## Hosted Supabase setup

The checked-in frontend is configured through these public Vite variables:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
VITE_VAPID_PUBLIC_KEY=your_vapid_public_key
VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id
VITE_SPOTIFY_REDIRECT_URI=http://127.0.0.1:5173/spotify/callback
```

Never place the service-role key or VAPID private key in a `VITE_` variable.

### Spotify Premium playback

1. Create an app in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and select Web API and Web Playback SDK.
2. Add the exact redirect URI used by the app. For local development use `http://127.0.0.1:5173/spotify/callback` because Spotify does not accept `localhost` redirect URIs.
3. Put the app's public Client ID in `VITE_SPOTIFY_CLIENT_ID`. Do not add the Spotify client secret to the frontend.
4. Add `https://YOUR_DEPLOYED_DOMAIN/spotify/callback` to Spotify and set `VITE_SPOTIFY_REDIRECT_URI` to that exact HTTPS URL in production.

The player uses OAuth Authorization Code with PKCE and requires a Spotify Premium account for full-track playback.

1. Authenticate and link the CLI:

   ```bash
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   ```

2. Review and apply the schema:

   ```bash
   supabase db push
   ```

   The migration creates all tables, owner-only RLS policies, default user data, private `user-backgrounds` storage policies, timer acknowledgement, and notification dispatch functions.

3. In Supabase Authentication, enable Google and Facebook. For Facebook, create a Meta app, add the Facebook Login product, and use the Supabase callback URL shown in the Facebook provider settings as the Meta app's valid OAuth redirect URI. Add the provider credentials to Supabase, then add these app redirect URLs to Supabase's redirect allow list:

   - `http://localhost:5173/auth/callback`
   - `https://YOUR_DEPLOYED_DOMAIN/auth/callback`

4. Generate VAPID keys locally (do not commit the private key):

   ```bash
   npx web-push generate-vapid-keys
   ```

   Put the public key in the frontend environment and set Edge Function secrets:

   ```bash
   supabase secrets set VAPID_SUBJECT=mailto:YOUR_EMAIL
   supabase secrets set VAPID_PUBLIC_KEY=YOUR_PUBLIC_KEY
   supabase secrets set VAPID_PRIVATE_KEY=YOUR_PRIVATE_KEY
   supabase functions deploy dispatch-timer-notifications
   ```

5. Follow [`supabase/cron.sql.example`](supabase/cron.sql.example) to store the project URL and publishable key in Vault, then create the once-per-minute Cron job. The Edge Function uses Supabase-provided `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` secrets automatically.

6. Serve the production build over HTTPS so installability, service workers, OAuth, and push subscriptions work outside localhost:

   ```bash
   npm run build
   npm run preview
   ```

## Verification

```bash
npm test
npm run lint
npm run build
npm run test:e2e
```

Database policy tests live in `supabase/tests/database/schema.test.sql` and run through `supabase test db` when Docker Desktop is available.

## Timer and notification behavior

- A running timer stores an absolute `ends_at` timestamp. Refreshing, sleeping the device, or opening another tab cannot add time to it.
- Open-app alarms are exact to the client clock. Closed-app delivery is dispatched once per minute and may be delayed by browser or operating-system push policies.
- A completed closed-app timer waits for acknowledgement; it does not auto-start another phase in the background.
- Offline sessions remain locally usable. Pending completions synchronize after connectivity returns.
- Focus phases contribute to statistics; breaks do not.

## Generated backgrounds

The four bundled WebP backgrounds were created with Codex's built-in image generation workflow and optimized for a quiet central timer zone:

- Rainy night desk
- Café at dawn
- Warm library
- City studio

The final prompt specifications emphasized wide cinematic framing, no people, no text or trademarks, and overlay-safe contrast. User uploads are resized to fit within 2560×1440, re-encoded as WebP, and stored in the authenticated user's private folder.
# cooperodoro
