import { addLocalDays } from './date';
import type { BuddyCompletion } from './types';

export type MemberStreakStats = {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  totalDaysLogged: number;
};

export function daySetForUser(completions: BuddyCompletion[], userId: string): Set<string> {
  const s = new Set<string>();
  for (const c of completions) {
    if (c.user_id === userId) s.add(c.workout_day);
  }
  return s;
}

/** Count consecutive logged days ending today or yesterday (if today not logged yet). */
export function computeCurrentStreak(loggedDays: Set<string>, todayKey: string): number {
  let cursor = todayKey;
  if (!loggedDays.has(todayKey)) {
    cursor = addLocalDays(todayKey, -1);
  }
  if (!loggedDays.has(cursor)) return 0;
  let n = 0;
  while (loggedDays.has(cursor)) {
    n++;
    cursor = addLocalDays(cursor, -1);
  }
  return n;
}

export function computeLongestStreak(loggedDays: Set<string>): number {
  if (loggedDays.size === 0) return 0;
  const sorted = [...loggedDays].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const cur = sorted[i]!;
    if (addLocalDays(prev, 1) === cur) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }
  return best;
}

export function streakStatsForMembers(
  completions: BuddyCompletion[],
  memberUserIds: string[],
  todayKey: string,
): Map<string, MemberStreakStats> {
  const map = new Map<string, MemberStreakStats>();
  for (const uid of memberUserIds) {
    const days = daySetForUser(completions, uid);
    map.set(uid, {
      userId: uid,
      currentStreak: computeCurrentStreak(days, todayKey),
      longestStreak: computeLongestStreak(days),
      totalDaysLogged: days.size,
    });
  }
  return map;
}
