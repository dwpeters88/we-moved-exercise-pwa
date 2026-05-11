# We Moved — exercise PWA

Standalone Vite + React PWA for shared crew exercise check-ins (Supabase Auth + Postgres). This repo is **not** part of `rpg-platform`.

## Setup

```bash
cp .env.example .env
# Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_* — see vite.config)
npm ci
npm run dev
```

Database migrations live in `supabase/migrations/` (apply with Supabase CLI or Dashboard SQL).

## Netlify

Site id `8fa966ce-44ef-44d8-853d-479c7a62099f`. Link once with `netlify link`, then:

```bash
npm run sync-env:netlify   # push .env → Netlify (keys only)
npm run deploy:netlify     # build + prod deploy
```
