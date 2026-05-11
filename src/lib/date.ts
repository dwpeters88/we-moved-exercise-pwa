/** Local calendar day YYYY-MM-DD (user's device timezone). */
export function localDayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Move a local calendar day key by `delta` days (same timezone rules as `localDayKey`). */
export function addLocalDays(isoDay: string, delta: number): string {
  const parts = isoDay.split('-').map(Number);
  const y = parts[0];
  const mo = parts[1];
  const d = parts[2];
  if (
    y === undefined ||
    mo === undefined ||
    d === undefined ||
    !Number.isFinite(y) ||
    !Number.isFinite(mo) ||
    !Number.isFinite(d)
  ) {
    return isoDay;
  }
  const dt = new Date(y, mo - 1, d + delta);
  return localDayKey(dt);
}

export function formatShortDate(isoDay: string): string {
  const parts = isoDay.split('-').map(Number);
  if (parts.length !== 3) return isoDay;
  const y = parts[0];
  const mo = parts[1];
  const da = parts[2];
  if (
    y === undefined ||
    mo === undefined ||
    da === undefined ||
    !Number.isFinite(y) ||
    !Number.isFinite(mo) ||
    !Number.isFinite(da)
  ) {
    return isoDay;
  }
  const dt = new Date(y, mo - 1, da);
  if (Number.isNaN(dt.getTime())) return isoDay;
  return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
