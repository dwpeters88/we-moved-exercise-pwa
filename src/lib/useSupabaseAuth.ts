import { useCallback, useEffect, useState } from 'react';
import type { SupabaseClient, User } from '@supabase/supabase-js';

export interface UseSupabaseAuthResult {
  user: User | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    userMetadata?: Record<string, unknown>,
  ) => ReturnType<SupabaseClient['auth']['signUp']>;
  signIn: (
    email: string,
    password: string,
  ) => ReturnType<SupabaseClient['auth']['signInWithPassword']>;
  signOut: () => ReturnType<SupabaseClient['auth']['signOut']>;
  getUser: () => Promise<User | null>;
}

export function useSupabaseAuth(supabase: SupabaseClient | null): UseSupabaseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setUser(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    void supabase.auth
      .getSession()
      .then((result) => {
        if (cancelled) return;
        const session = result?.data?.session ?? null;
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setUser(null);
        setLoading(false);
      });

    const sub = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const subscription = sub?.data?.subscription ?? null;

    return () => {
      cancelled = true;
      try {
        subscription?.unsubscribe();
      } catch {
        /* ignore */
      }
    };
  }, [supabase]);

  const signUp = useCallback(
    (email: string, password: string, userMetadata?: Record<string, unknown>) => {
      if (!supabase) {
        return Promise.resolve({
          data: { user: null, session: null },
          error: new Error('Supabase client not configured'),
        } as never);
      }
      const options: {
        emailRedirectTo?: string;
        data?: Record<string, unknown>;
      } = {};
      if (typeof window !== 'undefined' && window.location?.origin) {
        options.emailRedirectTo = `${window.location.origin}/`;
      }
      if (userMetadata && Object.keys(userMetadata).length > 0) {
        options.data = userMetadata;
      }
      return supabase.auth.signUp({
        email,
        password,
        ...(Object.keys(options).length > 0 ? { options } : {}),
      });
    },
    [supabase],
  );

  const signIn = useCallback(
    (email: string, password: string) => {
      if (!supabase) {
        return Promise.resolve({
          data: { user: null, session: null },
          error: new Error('Supabase client not configured'),
        } as never);
      }
      return supabase.auth.signInWithPassword({ email, password });
    },
    [supabase],
  );

  const signOut = useCallback(() => {
    if (!supabase) {
      return Promise.resolve({ error: new Error('Supabase client not configured') } as never);
    }
    return supabase.auth.signOut();
  }, [supabase]);

  const getUser = useCallback(async () => {
    if (!supabase) return null;
    try {
      const result = await supabase.auth.getSession();
      return result?.data?.session?.user ?? null;
    } catch {
      return null;
    }
  }, [supabase]);

  return { user, loading, signUp, signIn, signOut, getUser };
}
