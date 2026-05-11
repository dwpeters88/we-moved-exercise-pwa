import { createAppSupabaseClient, hasSupabaseConfig as coreHasConfig } from './supabaseClient';

const url = import.meta.env.VITE_SUPABASE_URL ?? '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

/** Isolated auth storage key so this app never clashes with other PWAs on the same origin. */
export const supabase = createAppSupabaseClient({
  url,
  anonKey,
  storageKey: 'we-moved-exercise-pwa-auth',
});

export const hasSupabaseConfig = (): boolean => coreHasConfig({ url, anonKey });
