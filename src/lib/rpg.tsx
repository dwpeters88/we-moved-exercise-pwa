import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useSupabaseAuth } from './useSupabaseAuth';

export type AppEnv = {
  supabase: SupabaseClient;
  supabaseUrl: string;
  supabaseAnonKey: string;
  appId: string;
};

const Ctx = createContext<AppEnv | null>(null);

export function RpgProvider({
  children,
  supabase,
  supabaseUrl,
  supabaseAnonKey,
  appId = 'we-moved-exercise-pwa',
}: {
  children: ReactNode;
  supabase: SupabaseClient;
  supabaseUrl: string;
  supabaseAnonKey: string;
  appId?: string;
}) {
  const value = useMemo(
    () => ({ supabase, supabaseUrl, supabaseAnonKey, appId }),
    [supabase, supabaseUrl, supabaseAnonKey, appId],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRpgEnv(): AppEnv {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error('useRpgEnv must be used within <RpgProvider>');
  }
  return v;
}

export function useAuth() {
  const { supabase } = useRpgEnv();
  return useSupabaseAuth(supabase);
}
