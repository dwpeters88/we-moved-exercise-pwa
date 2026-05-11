import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  CalendarDays,
  Flame,
  LogOut,
  Settings,
  Trophy,
} from 'lucide-react';
import { LayoutGroup, MotionConfig, motion } from 'framer-motion';
import { useRpgEnv } from '../lib/rpg';
import { useToast } from '../lib/toast';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import SettingsSheet from '../components/SettingsSheet';
import MemberAvatar from '../components/MemberAvatar';
import { formatShortDate, localDayKey } from '../lib/date';
import { streakStatsForMembers } from '../lib/streaks';
import type { BuddyCompletion, BuddyMember } from '../lib/types';

type Props = {
  crewId: string;
  userId: string;
  appVersion: string;
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

const glassCard =
  'rounded-[1.25rem] border border-white/[0.12] border-t-white/[0.15] border-b-white/[0.05] bg-white/10 shadow-[0_24px_48px_-28px_rgba(15,20,26,0.85)] backdrop-blur-xl';

const heroGlowChecked =
  'border-accent/50 bg-accent/20 shadow-[0_0_28px_rgba(62,232,181,0.18),0_24px_48px_-28px_rgba(15,20,26,0.85)]';

/** Enough rows for ~2 people × ~400 days of daily logs for streak stats. */
const FETCH_COMPLETION_LIMIT = 800;
const RECENT_ACTIVITY_DISPLAY_LIMIT = 50;

export default function HomeView({ crewId, userId, appVersion, onSignOut }: Props): JSX.Element {
  const { supabase } = useRpgEnv();
  const { pushToast } = useToast();
  const scrollElRef = useRef<HTMLDivElement>(null);
  const todayKey = localDayKey();
  const [members, setMembers] = useState<BuddyMember[]>([]);
  const [completions, setCompletions] = useState<BuddyCompletion[]>([]);
  const [myTodayId, setMyTodayId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggleBusy, setToggleBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
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

  const avatarByUser = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const row of members) m.set(row.user_id, row.avatar_url);
    return m;
  }, [members]);

  const myMember = useMemo(
    () => members.find((u) => u.user_id === userId),
    [members, userId],
  );

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

  const membersScoreboardOrder = useMemo(() => {
    return [...members].sort((a, b) => {
      if (a.user_id === userId) return -1;
      if (b.user_id === userId) return 1;
      return a.display_name.localeCompare(b.display_name, undefined, { sensitivity: 'base' });
    });
  }, [members, userId]);

  const streakByUser = useMemo(
    () =>
      streakStatsForMembers(
        completions,
        members.map((m) => m.user_id),
        todayKey,
      ),
    [completions, members, todayKey],
  );

  const recentActivityRows = useMemo(
    () => completions.slice(0, RECENT_ACTIVITY_DISPLAY_LIMIT),
    [completions],
  );

  const reload = useCallback(async () => {
    setLoadError(null);
    const day = localDayKey();
    try {
      const [memRes, compRes] = await Promise.all([
        supabase.from('exercise_buddy_member').select('crew_id, user_id, display_name, avatar_url').eq('crew_id', crewId),
        supabase
          .from('exercise_buddy_completion')
          .select('id, crew_id, user_id, completed_at, workout_day')
          .eq('crew_id', crewId)
          .order('completed_at', { ascending: false })
          .limit(FETCH_COMPLETION_LIMIT),
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exercise_buddy_member',
          filter: `crew_id=eq.${crewId}`,
        },
        () => void reload(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [crewId, reload, supabase]);

  const ptr = usePullToRefresh({
    scrollElRef,
    disabled: toggleBusy,
    onRefresh: async () => {
      setLoading(true);
      await reload();
    },
  });

  async function toggleToday(): Promise<void> {
    if (toggleBusy) return;
    setToggleBusy(true);
    setActionError(null);
    try {
      const day = localDayKey();
      if (myTodayId) {
        const { error } = await supabase.from('exercise_buddy_completion').delete().eq('id', myTodayId);
        if (error) {
          const msg = error.message || 'Could not undo check-in.';
          setActionError(msg);
          pushToast({ variant: 'error', message: msg });
          return;
        }
        setMyTodayId(null);
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(12);
        await reload();
        pushToast({ variant: 'success', message: 'Check-in removed.' });
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
          const msg = dup
            ? 'You already logged today — pull to refresh if this looks wrong.'
            : error.message || 'Could not save check-in.';
          setActionError(msg);
          pushToast({ variant: 'error', message: msg });
          return;
        }
        if (data?.id) {
          setMyTodayId(data.id);
          if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(20);
          await reload();
          pushToast({ variant: 'success', message: 'Logged today — great work!' });
        }
      }
    } finally {
      setToggleBusy(false);
    }
  }

  const checked = Boolean(myTodayId ?? myTodayRow);

  const fullDate = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <MotionConfig reducedMotion="user">
      <div
        className="flex min-h-dvh flex-col overflow-hidden bg-[#0f141a] text-[#dee3eb] pb-[max(1.75rem,env(safe-area-inset-bottom))]"
        style={{ paddingTop: 'max(0px, env(safe-area-inset-top))' }}
      >
        <motion.header
          className="sticky top-0 z-50 flex h-16 w-full shrink-0 items-center justify-between border-b border-white/10 bg-[#0f141a]/60 px-5 shadow-sm backdrop-blur-xl"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springLayout}
        >
          <div className="flex min-w-0 items-center gap-3">
            <CalendarDays className="h-6 w-6 shrink-0 text-accent" aria-hidden />
            <div className="min-w-0">
              <h1 className="font-display text-lg font-bold leading-tight tracking-tight text-ink">Today</h1>
              <p className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-[#bccac1]">
                {fullDate}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <motion.button
              type="button"
              onClick={() => setSettingsOpen(true)}
              whileTap={{ scale: 0.94 }}
              transition={springTap}
              className="rounded-full p-2.5 text-[#bccac1] transition-colors hover:bg-white/5 hover:text-ink"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5" aria-hidden />
            </motion.button>
            <motion.button
              type="button"
              onClick={onSignOut}
              whileTap={{ scale: 0.94 }}
              transition={springTap}
              className="rounded-full p-2.5 text-[#bccac1] transition-colors hover:bg-white/5 hover:text-ink"
              aria-label="Sign out"
            >
              <LogOut className="h-5 w-5" aria-hidden />
            </motion.button>
          </div>
        </motion.header>

        <div
          ref={scrollElRef}
          className="relative flex min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain scroll-smooth"
          onTouchStart={ptr.handlers.onTouchStart}
          onTouchMove={ptr.handlers.onTouchMove}
          onTouchEnd={ptr.handlers.onTouchEnd}
        >
          {(ptr.pullPx > 0 || ptr.isRefreshing) && (
            <div
              className="pointer-events-none sticky top-0 z-30 flex justify-center py-3"
              aria-hidden
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-accent ${
                  ptr.isRefreshing ? 'animate-spin border-t-transparent' : 'border-dashed opacity-80'
                }`}
              />
            </div>
          )}

          <div className="flex flex-col gap-6 px-5 py-6">
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
              className="relative overflow-hidden"
            >
              <motion.button
                type="button"
                layout
                disabled={loading || toggleBusy || Boolean(loadError)}
                onClick={() => void toggleToday()}
                aria-pressed={checked}
                aria-label={checked ? 'Exercise logged today. Tap to undo.' : 'Log exercise for today.'}
                whileTap={
                  loading || toggleBusy || Boolean(loadError) ? undefined : { scale: 0.985 }
                }
                transition={springTap}
                className={`${glassCard} relative flex w-full flex-col items-center gap-5 px-6 py-8 text-center transition-colors disabled:opacity-50 ${
                  checked ? heroGlowChecked : ''
                }`}
              >
                <div
                  className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-accent/25 blur-3xl"
                  aria-hidden
                />
                <div className="relative z-10 flex flex-col items-center gap-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#bccac1]">We Moved</p>
                  <h2 className="font-display text-2xl font-extrabold leading-tight tracking-tight text-ink sm:text-[1.65rem]">
                    I exercised today
                  </h2>
                  <p className="mt-1 max-w-[20rem] text-sm leading-snug text-[#bccac1]">
                    {myTodayRow
                      ? `Logged ${new Date(myTodayRow.completed_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} — tap to undo`
                      : 'Tap when you are done — Delmaine and Hannah share this log.'}
                  </p>
                </div>
                <div
                  className="relative z-10 h-10 w-20 shrink-0 rounded-full bg-[#252a31] shadow-inner ring-1 ring-black/20"
                  aria-hidden
                >
                  <motion.span
                    layout
                    transition={springTap}
                    className="absolute top-1 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white shadow-sm"
                    initial={false}
                    animate={{ left: checked ? 44 : 4 }}
                  >
                    {checked ? (
                      <span className="text-sm font-bold text-[#003827]" aria-hidden>
                        ✓
                      </span>
                    ) : null}
                  </motion.span>
                  <motion.span
                    layout
                    className={`pointer-events-none absolute inset-0 rounded-full ${
                      checked ? 'bg-accent/35' : 'bg-transparent'
                    }`}
                    transition={springLayout}
                  />
                </div>
              </motion.button>
            </motion.section>
          </LayoutGroup>

          <motion.section
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springLayout, delay: 0.05 }}
            className="flex flex-col gap-2"
          >
            <h3 className="px-0.5 font-display text-lg font-bold text-ink">Partner Status</h3>
            <div className={`${glassCard} flex items-center justify-between gap-4 p-4`}>
              <div className="flex min-w-0 items-center gap-3">
                <MemberAvatar
                  url={partner?.avatar_url}
                  label={partner?.display_name ?? 'Partner'}
                  size="lg"
                  variant="partner"
                />
                <p className="truncate font-display text-base font-semibold text-partner">
                  {partner?.display_name ?? (soloInCrew ? 'Invite them' : 'Partner')}
                </p>
              </div>
              <div className="shrink-0 text-right">
                {soloInCrew ? (
                  <p className="max-w-[11rem] text-sm text-[#bccac1]">
                    Share the invite code so they can join this log.
                  </p>
                ) : partnerDoneToday ? (
                  <div className="inline-flex flex-col items-end gap-0.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent ring-1 ring-accent/30">
                      <span className="text-[0.65rem]" aria-hidden>
                        ●
                      </span>
                      Done today
                    </span>
                    {partnerTimeToday ? (
                      <span className="text-xs tabular-nums text-[#bccac1]">{partnerTimeToday}</span>
                    ) : null}
                  </div>
                ) : (
                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-[#bccac1] ring-1 ring-white/10">
                    Not yet
                  </span>
                )}
              </div>
            </div>
          </motion.section>

          <motion.section
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springLayout, delay: 0.07 }}
            className="flex flex-col gap-2"
          >
            <h3 className="px-0.5 font-display text-lg font-bold text-ink">Streak scoreboard</h3>
            <div className={`${glassCard} overflow-hidden p-0`}>
              {loading ? (
                <p className="px-4 py-8 text-center text-sm text-[#bccac1]">Loading…</p>
              ) : members.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-[#bccac1]">No crew members yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[280px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#bccac1]">
                        <th scope="col" className="px-4 py-3 font-semibold">
                          Name
                        </th>
                        <th scope="col" className="px-2 py-3 text-center font-semibold">
                          <span className="inline-flex items-center justify-center gap-1" title="Current streak">
                            <Flame className="h-3.5 w-3.5 text-accent" aria-hidden />
                            <span className="sr-only">Current streak</span>
                          </span>
                        </th>
                        <th scope="col" className="px-2 py-3 text-center font-semibold">
                          <span className="inline-flex items-center justify-center gap-1" title="Longest streak">
                            <Trophy className="h-3.5 w-3.5 text-amber-300/90" aria-hidden />
                            <span className="sr-only">Longest streak</span>
                          </span>
                        </th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold tabular-nums">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {membersScoreboardOrder.map((m) => {
                        const s = streakByUser.get(m.user_id);
                        const isYou = m.user_id === userId;
                        return (
                          <tr
                            key={m.user_id}
                            className={isYou ? 'bg-accent/[0.06]' : undefined}
                          >
                            <th
                              scope="row"
                              className={`px-4 py-3 font-display font-semibold ${
                                isYou ? 'text-accent' : 'text-ink'
                              }`}
                            >
                              <div className="flex max-w-[14rem] items-center gap-2.5">
                                <MemberAvatar
                                  url={m.avatar_url}
                                  label={m.display_name}
                                  size="sm"
                                  variant={isYou ? 'accent' : 'default'}
                                />
                                <span className="min-w-0 truncate">
                                  {m.display_name}
                                  {isYou ? (
                                    <span className="ml-1.5 text-[0.65rem] font-normal uppercase tracking-wider text-[#bccac1]">
                                      You
                                    </span>
                                  ) : null}
                                </span>
                              </div>
                            </th>
                            <td className="px-2 py-3 text-center tabular-nums text-ink">
                              {s?.currentStreak ?? 0}
                            </td>
                            <td className="px-2 py-3 text-center tabular-nums text-[#bccac1]">
                              {s?.longestStreak ?? 0}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-[#bccac1]">
                              {s?.totalDaysLogged ?? 0}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <p className="px-0.5 text-xs leading-relaxed text-[#8c9890]">
              Streaks count consecutive calendar days on this device’s timezone. Longest streak may be capped if
              history exceeds loaded rows ({FETCH_COMPLETION_LIMIT} latest check-ins).
            </p>
          </motion.section>

          <section className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-0.5">
              <h3 className="font-display text-lg font-bold text-ink">Recent Activity</h3>
              {!loading && completions.length > RECENT_ACTIVITY_DISPLAY_LIMIT ? (
                <p className="text-xs text-[#8c9890]">
                  Showing latest {RECENT_ACTIVITY_DISPLAY_LIMIT} of {completions.length} loaded
                </p>
              ) : null}
            </div>
            <motion.ul
              className={`${glassCard} flex flex-col overflow-hidden divide-y divide-white/5`}
              variants={listContainer}
              initial="hidden"
              animate="show"
            >
              {loading ? (
                <motion.li
                  variants={listItem}
                  className="px-4 py-8 text-center text-sm text-[#bccac1]"
                >
                  Loading…
                </motion.li>
              ) : completions.length === 0 ? (
                <motion.li
                  variants={listItem}
                  className="px-4 py-10 text-center text-sm text-[#bccac1]"
                >
                  No entries yet — be the first to check in.
                </motion.li>
              ) : (
                recentActivityRows.map((c) => {
                  const timeOnly = new Date(c.completed_at).toLocaleTimeString(undefined, {
                    hour: 'numeric',
                    minute: '2-digit',
                  });
                  const who = nameByUser.get(c.user_id) ?? 'Someone';
                  return (
                    <motion.li
                      key={c.id}
                      layout
                      variants={listItem}
                      transition={springLayout}
                      className="flex items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-white/[0.04] active:bg-white/[0.07]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <MemberAvatar
                          url={avatarByUser.get(c.user_id)}
                          label={who}
                          size="md"
                          variant={c.user_id === userId ? 'accent' : 'default'}
                        />
                        <div className="min-w-0">
                          <p className="truncate font-display text-sm font-semibold text-ink">{who}</p>
                          <p className="mt-0.5 text-xs text-[#bccac1]">{formatShortDate(c.workout_day)}</p>
                        </div>
                      </div>
                      <time
                        className="shrink-0 text-sm tabular-nums text-[#bccac1]"
                        dateTime={c.completed_at}
                      >
                        {timeOnly}
                      </time>
                    </motion.li>
                  );
                })
              )}
            </motion.ul>
          </section>
        </div>
        </div>

        <SettingsSheet
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          appVersion={appVersion}
          supabase={supabase}
          userId={userId}
          myDisplayName={myMember?.display_name ?? 'You'}
          myAvatarUrl={myMember?.avatar_url ?? null}
          onAvatarUpdated={() => void reload()}
          onSignOut={() => {
            setSettingsOpen(false);
            onSignOut();
          }}
        />
      </div>
    </MotionConfig>
  );
}
