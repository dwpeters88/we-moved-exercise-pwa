import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { RpgProvider, useAuth } from './lib/rpg';
import { hasSupabaseConfig, supabase } from './lib/supabase';
import LoginView from './views/LoginView';
import JoinCrewView from './views/JoinCrewView';
import HomeView from './views/HomeView';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

function BrandedLoadingScreen({ reduceMotion }: { reduceMotion: boolean }): JSX.Element {
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center bg-surface px-6"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-8">
        <div className="relative flex h-[5.5rem] w-[5.5rem] items-center justify-center">
          {!reduceMotion ? (
            <>
              <motion.span
                className="absolute inset-0 rounded-full border border-accent/40"
                aria-hidden
                animate={{ scale: [1, 1.35], opacity: [0.45, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
              />
              <motion.span
                className="absolute inset-0 rounded-full border border-accent/25"
                aria-hidden
                animate={{ scale: [1, 1.35], opacity: [0.35, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.75 }}
              />
            </>
          ) : null}
          {reduceMotion ? (
            <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border-2 border-accent/80 bg-surface-high shadow-[0_0_32px_rgba(62,232,181,0.12)]">
              <span className="font-display text-xl font-extrabold text-accent">W</span>
            </div>
          ) : (
            <motion.div
              className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border-2 border-accent/80 bg-surface-high shadow-[0_0_32px_rgba(62,232,181,0.12)]"
              animate={{ scale: [1, 1.035, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <motion.span
                className="font-display text-xl font-extrabold text-accent"
                animate={{ opacity: [0.82, 1, 0.82] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                W
              </motion.span>
            </motion.div>
          )}
        </div>
        <div className="text-center">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            We Moved
          </p>
          <p className="mt-3 text-sm text-muted">Loading your crew…</p>
        </div>
      </div>
    </div>
  );
}

function ScreenCard({
  eyebrow = 'We Moved',
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <div className="flex min-h-dvh flex-col justify-center px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(3.5rem,env(safe-area-inset-top))]">
      <div className="mx-auto w-full max-w-sm rounded-2xl border border-white/10 bg-surface-high/80 p-6 shadow-xl backdrop-blur-sm">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          {eyebrow}
        </p>
        <h1 className="mt-3 font-display text-2xl font-extrabold leading-tight text-ink">{title}</h1>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function Shell(): JSX.Element {
  const { user, loading, signOut } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = prefersReducedMotion === true;
  const [crewId, setCrewId] = useState<string | null>(null);
  const [gateLoading, setGateLoading] = useState(true);
  const [gateError, setGateError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refreshMembership = useCallback(async () => {
    if (!user) {
      setCrewId(null);
      setGateError(null);
      setGateLoading(false);
      return;
    }
    setGateLoading(true);
    setGateError(null);
    try {
      const { data, error } = await supabase
        .from('exercise_buddy_member')
        .select('crew_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!mountedRef.current) return;
      if (error) {
        setGateError(error.message || 'Could not verify crew membership.');
        setCrewId(null);
        return;
      }
      setCrewId(data?.crew_id ?? null);
    } catch (e) {
      if (!mountedRef.current) return;
      setGateError(e instanceof Error ? e.message : 'Something went wrong.');
      setCrewId(null);
    } finally {
      if (mountedRef.current) setGateLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refreshMembership();
  }, [refreshMembership]);

  if (loading || gateLoading) {
    return <BrandedLoadingScreen reduceMotion={reduceMotion} />;
  }

  if (!user) return <LoginView />;

  if (gateError) {
    return (
      <ScreenCard title="Could not load crew">
        <p className="text-sm leading-relaxed text-muted">{gateError}</p>
        <button
          type="button"
          onClick={() => void refreshMembership()}
          className="mt-6 w-full rounded-xl bg-accent px-4 py-3 font-display font-semibold text-surface transition-colors hover:bg-accent/90 active:bg-accent/85"
        >
          Retry
        </button>
      </ScreenCard>
    );
  }

  if (!crewId) {
    return (
      <JoinCrewView
        onJoined={async () => {
          await refreshMembership();
        }}
      />
    );
  }

  return (
    <HomeView crewId={crewId} userId={user.id} onSignOut={() => void signOut()} />
  );
}

export default function App(): JSX.Element {
  if (!hasSupabaseConfig()) {
    return (
      <ScreenCard title="Configuration needed">
        <p className="text-sm leading-relaxed text-muted">
          Set{' '}
          <code className="rounded bg-track px-1.5 py-0.5 font-mono text-[0.8125rem] text-accent">
            VITE_SUPABASE_URL
          </code>{' '}
          and{' '}
          <code className="rounded bg-track px-1.5 py-0.5 font-mono text-[0.8125rem] text-accent">
            VITE_SUPABASE_ANON_KEY
          </code>{' '}
          for this app, then rebuild.
        </p>
      </ScreenCard>
    );
  }

  return (
    <RpgProvider
      supabase={supabase}
      supabaseUrl={supabaseUrl}
      supabaseAnonKey={supabaseAnonKey}
      appId="exercise-pwa"
    >
      <Shell />
    </RpgProvider>
  );
}
