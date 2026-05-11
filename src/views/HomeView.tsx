import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LogOut } from 'lucide-react';
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from 'framer-motion';
import { useRpgEnv } from '../lib/rpg';
import { formatShortDate, localDayKey } from '../lib/date';
import type { BuddyCompletion, BuddyMember } from '../lib/types';

type Props = {
  crewId: string;
  userId: string;
  onSignOut: () => void;
};

const springTap = { type: 'spring' as const, stiffness: 520, damping: 28, mass: 0.6 };
const springLayout = { type: 'spring' as const, stiffness: 380, damping: 32 };

const listContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.055, delayChildren: 0.04 },
  },
};

const listItem = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 400, damping: 34 },
  },
};

export default function HomeView({ crewId, userId, onSignOut }: Props): JSX.Element {
  const { supabase } = useRpgEnv();
  const todayKey = localDayKey();
  const [members, setMembers] = useState<BuddyMember[]>([]);
  const [completions, setCompletions] = useState<BuddyCompletion[]>([]);
  const [myTodayId, setMyTodayId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggleBusy, setToggleBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const nameByUser = useMemo(() => {
    const m = new Map<string, string>();
    for (const row of members) m.set(row.user_id, row.display_name);
    return m;
  }, [members]);

  const partner = useMemo(() => members.find((u) => u.user_id !== userId), [members, userId]);

  const soloInCrew = partner === undefined && members.length === 1;

  const myTodayRow = useMemo(
    () => completions.find((c) => c.user_id === userId && c.workout_day === todayKey),
    [completions, todayKey, userId],
  );

  const partnerDoneToday = useMemo(() => {
    if (!partner) return false;
    return completions.some((c) => c.user_id === partner.user_id && c.workout_day === todayKey);
  }, [completions, partner, todayKey]);

  const partnerTimeToday = useMemo(() => {
    if (!partner) return null;
    const row = completions.find(
      (c) => c.user_id === partner.user_id && c.workout_day === todayKey,
    );
    if (!row) return null;
    return new Date(row.completed_at).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [completions, partner, todayKey]);

  const reload = useCallback(async () => {
    setLoadError(null);
    const day = localDayKey();
    try {
      const [memRes, compRes] = await Promise.all([
        supabase.from('exercise_buddy_member').select('crew_id, user_id, display_name').eq('crew_id', crewId),
        supabase
          .from('exercise_buddy_completion')
          .select('id, crew_id, user_id, completed_at, workout_day')
          .eq('crew_id', crewId)
          .order('completed_at', { ascending: false })
          .limit(48),
      ]);
      if (!mountedRef.current) return;
      const qErr = memRes.error ?? compRes.error;
      if (qErr) {
        setLoadError(qErr.message || 'Could not load data.');
        return;
      }
      setMembers((memRes.data ?? []) as BuddyMember[]);
      const list = (compRes.data ?? []) as BuddyCompletion[];
      setCompletions(list);
      const mine = list.find((c) => c.user_id === userId && c.workout_day === day);
      setMyTodayId(mine?.id ?? null);
    } catch (e) {
      if (!mountedRef.current) return;
      setLoadError(e instanceof Error ? e.message : 'Could not load data.');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [crewId, supabase, userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const channel = supabase
      .channel(`exercise_buddy:${crewId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exercise_buddy_completion',
          filter: `crew_id=eq.${crewId}`,
        },
        () => void reload(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [crewId, reload, supabase]);

  async function toggleToday(): Promise<void> {
    if (toggleBusy) return;
    setToggleBusy(true);
    setActionError(null);
    try {
      const day = localDayKey();
      if (myTodayId) {
        const { error } = await supabase.from('exercise_buddy_completion').delete().eq('id', myTodayId);
        if (error) {
          setActionError(error.message || 'Could not undo check-in.');
          return;
        }
        setMyTodayId(null);
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(12);
        await reload();
      } else {
        const { data, error } = await supabase
          .from('exercise_buddy_completion')
          .insert({
            crew_id: crewId,
            user_id: userId,
            workout_day: day,
          })
          .select('id')
          .maybeSingle();
        if (error) {
          const dup =
            error.code === '23505' ||
            error.message.toLowerCase().includes('duplicate') ||
            error.message.toLowerCase().includes('unique');
          setActionError(
            dup
              ? 'You already logged today — pull to refresh if this looks wrong.'
              : error.message || 'Could not save check-in.',
          );
          return;
        }
        if (data?.id) {
          setMyTodayId(data.id);
          if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(20);
          await reload();
        }
      }
    } finally {
      setToggleBusy(false);
    }
  }

  const checked = Boolean(myTodayId ?? myTodayRow);

  return (
    <MotionConfig reducedMotion="user">
      <div
        className="flex min-h-dvh flex-col pb-[max(1.75rem,env(safe-area-inset-bottom))]"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <motion.header
          className="relative overflow-hidden px-5 pb-8"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springLayout}
        >
          <div
            className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-accent/15 blur-3xl"
            aria-hidden
          />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-display text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-accent">
                Today
              </p>
              <h1 className="mt-2 font-display text-3xl font-bold leading-tight tracking-tight text-ink sm:text-[2rem]">
                {new Date().toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </h1>
            </div>
            <motion.button
              type="button"
              onClick={onSignOut}
              whileTap={{ scale: 0.96 }}
              transition={springTap}
              className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-surface-high/40 px-3 py-2 text-sm text-muted backdrop-blur-sm hover:bg-white/5"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Out
            </motion.button>
          </div>
        </motion.header>

        <main className="flex flex-1 flex-col gap-5 px-5">
          {loadError ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
              <p>{loadError}</p>
              <button
                type="button"
                className="mt-3 font-medium text-accent underline"
                onClick={() => {
                  setLoading(true);
                  void reload();
                }}
              >
                Retry
              </button>
            </div>
          ) : null}

          {actionError ? (
            <p className="rounded-xl bg-red-950/40 px-4 py-3 text-sm text-red-200" role="alert">
              {actionError}
            </p>
          ) : null}

          <LayoutGroup id="checkin-card">
            <motion.section
              layout
              transition={springLayout}
              className="relative overflow-hidden rounded-[1.75rem] border border-white/12 bg-gradient-to-br from-accent/12 via-surface-high to-surface p-1 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.55)]"
            >
              <div className="rounded-[1.6rem] border border-white/5 bg-surface-high/30 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Your check-in</p>
                  <motion.span
                    layout
                    className="rounded-full bg-white/5 px-2.5 py-0.5 text-[0.65rem] font-medium tabular-nums text-muted"
                  >
                    {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </motion.span>
                </div>
                <motion.button
                  type="button"
                  layout
                  disabled={loading || toggleBusy || Boolean(loadError)}
                  onClick={() => void toggleToday()}
                  aria-pressed={checked}
                  aria-label={checked ? 'Exercise logged today. Tap to undo.' : 'Log exercise for today.'}
                  whileTap={
                    loading || toggleBusy || Boolean(loadError)
                      ? undefined
                      : { scale: 0.97 }
                  }
                  transition={springTap}
                  className="mt-5 flex w-full items-center gap-4 rounded-2xl border border-white/12 bg-track/90 px-4 py-5 text-left shadow-inner backdrop-blur-sm transition-colors hover:bg-track disabled:opacity-50"
                >
                  <motion.span
                    layout
                    transition={springLayout}
                    className={`relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 text-2xl font-bold ${
                      checked
                        ? 'border-accent bg-accent text-surface shadow-[0_0_20px_-6px_rgba(0,0,0,0.35)]'
                        : 'border-muted/45 bg-surface-high/50 text-muted'
                    }`}
                    aria-hidden
                  >
                    <AnimatePresence mode="popLayout" initial={false}>
                      {checked ? (
                        <motion.span
                          key="tick"
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.6, opacity: 0 }}
                          transition={springTap}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          ✓
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                  </motion.span>
                  <motion.div layout="position" className="min-w-0 flex-1" transition={springLayout}>
                    <p className="font-display text-xl font-bold text-ink sm:text-[1.35rem]">I exercised today</p>
                    <p className="mt-1.5 text-sm leading-snug text-muted">
                      {myTodayRow
                        ? `Logged ${new Date(myTodayRow.completed_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} — tap to undo`
                        : 'Tap when you are done — Delmaine and Hannah share this log.'}
                    </p>
                  </motion.div>
                </motion.button>
              </div>
            </motion.section>
          </LayoutGroup>

          <motion.section
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springLayout, delay: 0.05 }}
            className="rounded-3xl border border-white/10 bg-gradient-to-br from-partner/8 to-surface-high/70 p-5 shadow-lg"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Partner</p>
            <div className="mt-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-display text-xl font-semibold text-partner">
                  {partner?.display_name ?? (soloInCrew ? 'Invite them' : 'Partner')}
                </p>
              </div>
              <div className="shrink-0 text-right">
                {soloInCrew ? (
                  <p className="max-w-[11rem] text-sm text-muted">
                    Share the invite code so they can join this log.
                  </p>
                ) : partnerDoneToday ? (
                  <>
                    <p className="text-sm font-medium text-accent">Done today</p>
                    <p className="text-xs text-muted">{partnerTimeToday ?? ''}</p>
                  </>
                ) : (
                  <p className="text-sm text-muted">Not yet today</p>
                )}
              </div>
            </div>
          </motion.section>

          <section>
            <h2 className="mb-3 px-1 font-display text-sm font-semibold uppercase tracking-wider text-muted">
              Recent
            </h2>
            <motion.ul
              className="flex flex-col gap-2.5"
              variants={listContainer}
              initial="hidden"
              animate="show"
            >
              {loading ? (
                <motion.li
                  variants={listItem}
                  className="rounded-2xl bg-surface-high/40 px-4 py-6 text-center text-sm text-muted"
                >
                  Loading…
                </motion.li>
              ) : completions.length === 0 ? (
                <motion.li
                  variants={listItem}
                  className="rounded-2xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-muted"
                >
                  No entries yet — be the first to check in.
                </motion.li>
              ) : (
                completions.map((c) => (
                  <motion.li
                    key={c.id}
                    layout
                    variants={listItem}
                    transition={springLayout}
                    className="flex items-center justify-between rounded-2xl border border-white/8 bg-surface-high/45 px-4 py-3.5 shadow-sm"
                  >
                    <div>
                      <p className="font-medium text-ink">{nameByUser.get(c.user_id) ?? 'Someone'}</p>
                      <p className="text-xs text-muted">{formatShortDate(c.workout_day)}</p>
                    </div>
                    <time className="text-sm tabular-nums text-muted" dateTime={c.completed_at}>
                      {new Date(c.completed_at).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </time>
                  </motion.li>
                ))
              )}
            </motion.ul>
          </section>
        </main>
      </div>
    </MotionConfig>
  );
}
