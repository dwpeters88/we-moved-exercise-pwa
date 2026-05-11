import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

type AuthStorageAdapter = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

function createBrowserAuthStorage(): AuthStorageAdapter {
  const mem = new Map<string, string>();
  let mode: 'local' | 'session' | 'memory' = 'memory';

  function probe(store: Storage | null): store is Storage {
    if (!store) return false;
    try {
      const k = '__wm_auth_probe__';
      store.setItem(k, '1');
      store.removeItem(k);
      return true;
    } catch {
      return false;
    }
  }

  if (typeof window !== 'undefined') {
    if (probe(window.localStorage)) mode = 'local';
    else if (probe(window.sessionStorage)) mode = 'session';
  }

  const read = (key: string): string | null => {
    try {
      if (mode === 'local' && typeof window !== 'undefined') {
        return window.localStorage.getItem(key);
      }
      if (mode === 'session' && typeof window !== 'undefined') {
        return window.sessionStorage.getItem(key);
      }
      return mem.get(key) ?? null;
    } catch {
      return mem.get(key) ?? null;
    }
  };

  const write = (key: string, value: string) => {
    try {
      if (mode === 'local' && typeof window !== 'undefined') {
        window.localStorage.setItem(key, value);
        return;
      }
      if (mode === 'session' && typeof window !== 'undefined') {
        window.sessionStorage.setItem(key, value);
        return;
      }
      mem.set(key, value);
    } catch {
      mem.set(key, value);
      mode = 'memory';
    }
  };

  const remove = (key: string) => {
    try {
      if (mode === 'local' && typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      } else if (mode === 'session' && typeof window !== 'undefined') {
        window.sessionStorage.removeItem(key);
      } else {
        mem.delete(key);
      }
    } catch {
      mem.delete(key);
    }
  };

  return { getItem: read, setItem: write, removeItem: remove };
}

export interface AppSupabaseOptions {
  url: string;
  anonKey: string;
  storageKey?: string;
}

export function createAppSupabaseClient(options: AppSupabaseOptions): SupabaseClient {
  const auth: {
    storageKey?: string;
    storage?: AuthStorageAdapter;
    persistSession?: boolean;
    autoRefreshToken?: boolean;
  } = {
    persistSession: true,
    autoRefreshToken: true,
  };

  if (options.storageKey) {
    auth.storageKey = options.storageKey;
  }

  if (typeof window !== 'undefined') {
    auth.storage = createBrowserAuthStorage();
  }

  return createClient(options.url || PLACEHOLDER_URL, options.anonKey || PLACEHOLDER_KEY, {
    auth,
  });
}

export function hasSupabaseConfig(
  options: Pick<AppSupabaseOptions, 'url' | 'anonKey'>,
): boolean {
  return Boolean(options.url && options.anonKey);
}
