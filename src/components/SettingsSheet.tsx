import { useCallback, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

export type SettingsSheetProps = {
  open: boolean;
  onClose: () => void;
  appVersion: string;
  onSignOut: () => void;
};

const glassSheet =
  'rounded-t-[1.35rem] border border-white/[0.12] border-t-white/[0.18] border-b-white/[0.06] bg-surface-high/75 shadow-[0_-28px_64px_-24px_rgba(0,0,0,0.65)] backdrop-blur-2xl';

function lockBodyScroll(lock: boolean): void {
  if (typeof document === 'undefined') return;
  const { body } = document;
  if (lock) {
    const scrollY = window.scrollY;
    body.dataset.settingsSheetScrollY = String(scrollY);
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.overflow = 'hidden';
    body.style.width = '100%';
  } else {
    const y = body.dataset.settingsSheetScrollY;
    body.style.position = '';
    body.style.top = '';
    body.style.left = '';
    body.style.right = '';
    body.style.overflow = '';
    body.style.width = '';
    delete body.dataset.settingsSheetScrollY;
    if (y !== undefined) window.scrollTo(0, Number(y) || 0);
  }
}

export default function SettingsSheet({
  open,
  onClose,
  appVersion,
  onSignOut,
}: SettingsSheetProps): JSX.Element | null {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);

  const handleSignOut = useCallback(() => {
    onSignOut();
    onClose();
  }, [onClose, onSignOut]);

  useEffect(() => {
    if (!open) return;
    lockBodyScroll(true);
    return () => {
      lockBodyScroll(false);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    lastFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const t = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>('button[data-sheet-close]')?.focus();
    }, 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;

      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      const list = [...focusables].filter(
        (el) => el.getClientRects().length > 0 || el === document.activeElement,
      );
      if (list.length === 0) return;

      const first = list[0]!;
      const last = list[list.length - 1]!;
      const active = document.activeElement as HTMLElement | null;

      if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKeyDown);
      lastFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (typeof document === 'undefined' || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col justify-end" role="presentation">
      <div
        role="presentation"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative mx-auto w-full max-w-lg px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`${glassSheet} flex max-h-[min(85dvh,32rem)] flex-col overflow-hidden`}>
          <div className="flex shrink-0 flex-col items-center pt-2 pb-1">
            <span className="h-1 w-10 rounded-full bg-white/25" aria-hidden />
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-5 pt-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id={titleId} className="font-display text-lg font-bold text-ink">
                  Settings &amp; About
                </h2>
                <p className="mt-1 font-mono text-xs text-muted">Version {appVersion}</p>
              </div>
              <button
                type="button"
                data-sheet-close
                onClick={onClose}
                className="rounded-full px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-white/10 hover:text-ink"
              >
                Done
              </button>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Tips</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[#bccac1]">
                <li>Pull down to refresh crew activity and check-ins.</li>
                <li>Install the app from your browser menu for a full-screen experience.</li>
              </ul>
            </div>

            <div className="mt-auto border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full rounded-xl border border-red-500/35 bg-red-950/35 px-4 py-3.5 font-display font-semibold text-red-200 shadow-inner transition-colors hover:bg-red-950/50 active:bg-red-950/60"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
