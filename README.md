# We Moved — exercise PWA

Standalone Vite + React PWA for shared crew exercise check-ins (Supabase Auth + Postgres). This repo is **not** part of `rpg-platform`.

## Setup

```bash
cp .env.example .env
# Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_* — see vite.config)
npm ci
npm run dev
```

Database migrations live in `supabase/migrations/`.

This app is often pointed at the **same Supabase project** as `rpg-platform`, which already has its own migration history. In that case `supabase db push` from this repo will **not** apply our SQL chain end-to-end. Instead:

1. `npx supabase link --project-ref <ref>` once from this repo (needs `SUPABASE_ACCESS_TOKEN`).
2. Apply a specific file against the linked DB:

   ```bash
   npm run db:query:linked -- supabase/migrations/20260511130000_exercise_buddy_avatars.sql
   ```

   The script loads `SUPABASE_ACCESS_TOKEN` from `./.env` or `../rpg-platform/.env`.

Alternatively run the same SQL in the Supabase Dashboard SQL editor.

## Netlify

Site id `8fa966ce-44ef-44d8-853d-479c7a62099f`. Link once with `netlify link`, then:

```bash
npm run sync-env:netlify   # push .env → Netlify (keys only)
npm run deploy:netlify     # build + prod deploy
```
