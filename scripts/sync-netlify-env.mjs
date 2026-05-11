#!/usr/bin/env node
/**
 * Push VITE_SUPABASE_* from repo-root `.env` to Netlify via `env:import`.
 * Requires Netlify CLI logged in and `netlify link` in this directory.
 */
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const envPath = resolve(root, '.env');

function parseDotEnv(content) {
  /** @type {Record<string, string>} */
  const out = {};
  for (let line of content.split('\n')) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

let raw;
try {
  raw = readFileSync(envPath, 'utf8');
} catch {
  console.error(
    'sync-netlify-env: missing repo-root .env — add SUPABASE_URL + SUPABASE_ANON_KEY (or VITE_* equivalents).',
  );
  process.exit(1);
}

const env = parseDotEnv(raw);
const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL || '';
const anon = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '';

if (!url || !anon) {
  console.error(
    'sync-netlify-env: need URL + anon in repo-root .env (VITE_SUPABASE_* or SUPABASE_*).',
  );
  process.exit(1);
}

const tmpName = `.env.netlify-sync.${process.pid}.tmp`;
const tmpPath = resolve(root, tmpName);
writeFileSync(tmpPath, `VITE_SUPABASE_URL=${url}\nVITE_SUPABASE_ANON_KEY=${anon}\n`);

try {
  const r = spawnSync(
    'npx',
    ['netlify', 'env:import', tmpName, '--json'],
    {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, NETLIFY_CI: '1' },
    },
  );
  if (r.stderr?.trim()) {
    console.error(r.stderr.trim());
  }
  if (r.status !== 0) {
    console.error(`sync-netlify-env: netlify env:import failed (${r.status}).`);
    process.exit(r.status ?? 1);
  }
  try {
    const imported = JSON.parse(r.stdout || '{}');
    const keys = Object.keys(imported);
    console.log(`sync-netlify-env: imported ${keys.length} var(s): ${keys.join(', ')}.`);
  } catch {
    console.log('sync-netlify-env: Netlify env updated.');
  }
  console.log('sync-netlify-env: redeploy the site for new build env to apply.');
} finally {
  try {
    unlinkSync(tmpPath);
  } catch {
    /* ignore */
  }
}
