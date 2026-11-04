# Lumen

The FYP research desk for Hasnat, Fatima and Atta: domains → papers → six sections per paper, plus a permanent group chat with `@` tags.

- `web/` — the website (Vite + React + shadcn/ui)
- `mcp/` — MCP server so AI assistants (Claude, Gemini, Cursor…) can read and fill Lumen
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
3. Authentication → Users → Add user → Create new user for each teammate, with "Auto Confirm User" ticked. Use `hasnat@lumen.com`, `fatima@lumen.com`, `atta@lumen.com` and `labiba@lumen.com`, and set each password to that person's PIN. Keep PINs out of this repo.

4. SQL Editor → paste `supabase/seed.sql` → Run. It should list all four people.
5. Authentication → Sign In / Providers → turn off "Allow new users to sign up".
6. Project Settings → API → copy the Project URL and the anon (or publishable) key into `web/.env`.

## Deploy on Netlify

Import the GitHub repo, keep the settings from `netlify.toml`, and add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under Site configuration → Environment variables.

## AI assistants (MCP)

`mcp/` lets an AI assistant create domains, add papers and fill their sections while you research with it. It signs in as one team member, so the website's normal permissions apply and edits are credited to that person.

```bash
cd mcp
npm install            # needs Node 22.18 or newer
cp .env.example .env   # set LUMEN_EMAIL and LUMEN_PIN
npm run check          # should print "Lumen MCP is ready. Signed in as …"
```

Supabase settings are read from `web/.env` when `mcp/.env` leaves them empty. Then add the server to your AI app as a local (stdio) MCP server that runs `node <full path>/mcp/src/index.ts`, and restart the app.

The assistant learns the structure itself: the section list comes straight from `web/src/lib/sections.ts`, so pulling new changes and restarting the AI app is enough. When adding or renaming a section, update the `paper_sections` key check in `supabase/schema.sql` too.

## Changing a PIN

Authentication → Users → pick the user → reset/update password to the new PIN (digits only, 6–12 long). Update `PIN_LENGTH` in `web/src/pages/login-page.tsx` if the length changes.
