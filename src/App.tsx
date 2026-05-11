import { useCallback, useEffect, useRef, useState } from 'react';
import { RpgProvider, useAuth } from './lib/rpg';
import { hasSupabaseConfig, supabase } from './lib/supabase';
import LoginView from './views/LoginView';
import JoinCrewView from './views/JoinCrewView';
import HomeView from './views/HomeView';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

function Shell(): JSX.Element {
  const { user, loading, signOut } = useAuth();
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
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent"
          aria-label="Loading"
        />
      </div>
    );
  }

  if (!user) return <LoginView />;

  if (gateError) {
    return (
      <div className="flex min-h-dvh flex-col justify-center gap-4 px-6">
        <h1 className="font-display text-xl font-bold text-ink">Could not load crew</h1>
        <p className="text-sm leading-relaxed text-muted">{gateError}</p>
        <button
          type="button"
          onClick={() => void refreshMembership()}
          className="rounded-xl bg-accent px-4 py-3 font-display font-semibold text-surface"
        >
          Retry
        </button>
      </div>
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
      <div className="flex min-h-dvh flex-col justify-center px-6">
        <h1 className="font-display text-xl font-bold text-ink">Configuration needed</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Set <code className="rounded bg-track px-1 py-0.5 text-accent">VITE_SUPABASE_URL</code> and{' '}
          <code className="rounded bg-track px-1 py-0.5 text-accent">VITE_SUPABASE_ANON_KEY</code> for
          this app, then rebuild.
        </p>
      </div>
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
