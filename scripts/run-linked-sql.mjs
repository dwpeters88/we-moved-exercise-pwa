#!/usr/bin/env node
/**
 * Run `supabase db query --linked -f <sql>` with SUPABASE_ACCESS_TOKEN loaded
 * from this repo's `.env` or, if missing, `../rpg-platform/.env` (umbrella layout).
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

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

const sqlRel = process.argv[2];
if (!sqlRel) {
  console.error('usage: node scripts/run-linked-sql.mjs <path-to.sql>');
  process.exit(1);
}

const sqlPath = resolve(root, sqlRel);
if (!existsSync(sqlPath)) {
  console.error(`run-linked-sql: file not found: ${sqlPath}`);
  process.exit(1);
}

const candidates = [
  resolve(root, '.env'),
  resolve(root, '../rpg-platform/.env'),
];

let token = process.env.SUPABASE_ACCESS_TOKEN ?? '';
if (!token) {
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    try {
      const env = parseDotEnv(readFileSync(p, 'utf8'));
      token = env.SUPABASE_ACCESS_TOKEN ?? '';
      if (token) break;
    } catch {
      /* ignore */
    }
  }
}

if (!token) {
  console.error(
    'run-linked-sql: set SUPABASE_ACCESS_TOKEN or add it to .env / ../rpg-platform/.env',
  );
  process.exit(1);
}

const r = spawnSync(
  'npx',
  ['supabase', 'db', 'query', '--linked', '--yes', '-f', sqlPath],
  {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, SUPABASE_ACCESS_TOKEN: token },
    stdio: ['inherit', 'pipe', 'pipe'],
  },
);

if (r.stdout) process.stdout.write(r.stdout);
if (r.stderr) process.stderr.write(r.stderr);
process.exit(r.status ?? 1);
