# Lumen

The FYP research desk for Hasnat, Fatima and Atta: domains → papers → six sections per paper, plus a permanent group chat with `@` tags.

- `web/` — the website (Vite + React + shadcn/ui)
- `supabase/schema.sql` — database, security rules, PDF storage, realtime chat
- `supabase/seed.sql` — links the three team accounts to their names and roles
- `netlify.toml` — Netlify build settings

## Run locally

```bash
cd web
npm install
cp .env.example .env   # then fill in the two Supabase values
npm run dev
```

## One-time Supabase setup

1. Create a free project at [supabase.com](https://supabase.com).
2. SQL Editor → New query → paste all of `supabase/schema.sql` → Run.
3. Authentication → Users → Add user → Create new user, three times, with "Auto Confirm User" ticked. Use `hasnat@lumen.com`, `fatima@lumen.com` and `atta@lumen.com`, and set each password to that person's PIN. Keep PINs out of this repo.

4. SQL Editor → paste `supabase/seed.sql` → Run. It should list all three people.
5. Authentication → Sign In / Providers → turn off "Allow new users to sign up".
6. Project Settings → API → copy the Project URL and the anon (or publishable) key into `web/.env`.

## Deploy on Netlify

Import the GitHub repo, keep the settings from `netlify.toml`, and add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under Site configuration → Environment variables.

## Changing a PIN

Authentication → Users → pick the user → reset/update password to the new PIN (digits only, 6–12 long). Update `PIN_LENGTH` in `web/src/pages/login-page.tsx` if the length changes.
