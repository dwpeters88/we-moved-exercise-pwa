import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Camera, Trash2 } from 'lucide-react';
import {
  AVATAR_BUCKET,
  parseAvatarStoragePathFromPublicUrl,
  uploadBuddyAvatar,
} from '../lib/avatarUpload';
import { useToast } from '../lib/toast';
import MemberAvatar from './MemberAvatar';

export type SettingsSheetProps = {
  open: boolean;
  onClose: () => void;
  appVersion: string;
  onSignOut: () => void;
  supabase: SupabaseClient;
  userId: string;
  myDisplayName: string;
  myAvatarUrl: string | null;
  onAvatarUpdated: () => void;
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
  supabase,
  userId,
  myDisplayName,
  myAvatarUrl,
  onAvatarUpdated,
}: SettingsSheetProps): JSX.Element | null {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { pushToast } = useToast();
  const [avatarBusy, setAvatarBusy] = useState(false);

  const handleSignOut = useCallback(() => {
    onSignOut();
    onClose();
  }, [onClose, onSignOut]);

  const removeOldStorageObject = useCallback(
    async (publicUrl: string | null) => {
      if (!publicUrl) return;
      const path = parseAvatarStoragePathFromPublicUrl(publicUrl);
      if (!path) return;
      await supabase.storage.from(AVATAR_BUCKET).remove([path]);
    },
    [supabase],
  );

  const applyAvatarUrl = useCallback(
    async (nextUrl: string | null, previousUrl: string | null) => {
      const { error } = await supabase.rpc('exercise_buddy_set_avatar_url', {
        p_url: nextUrl,
      });
      if (error) {
        const msg =
          error.message?.includes('invalid_avatar_url')
            ? 'That image URL is not allowed.'
            : error.message || 'Could not save profile photo.';
        pushToast({ variant: 'error', message: msg });
        return false;
      }
      void removeOldStorageObject(previousUrl);
      onAvatarUpdated();
      pushToast({
        variant: 'success',
        message: nextUrl ? 'Profile photo updated.' : 'Profile photo removed.',
      });
      return true;
    },
    [onAvatarUpdated, pushToast, removeOldStorageObject, supabase],
  );

  const onPickAvatar = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onAvatarFile = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || avatarBusy) return;
      if (!file.type.startsWith('image/')) {
        pushToast({ variant: 'error', message: 'Choose an image file.' });
        return;
      }
      setAvatarBusy(true);
      try {
        const prev = myAvatarUrl;
        const up = await uploadBuddyAvatar(supabase, userId, file);
        if ('error' in up) {
          pushToast({ variant: 'error', message: up.error });
          return;
        }
        await applyAvatarUrl(up.publicUrl, prev);
      } finally {
        setAvatarBusy(false);
      }
    },
    [applyAvatarUrl, avatarBusy, myAvatarUrl, pushToast, supabase, userId],
  );

  const onRemoveAvatar = useCallback(async () => {
    if (avatarBusy || !myAvatarUrl) return;
    setAvatarBusy(true);
    try {
      const prev = myAvatarUrl;
      await applyAvatarUrl(null, prev);
    } finally {
      setAvatarBusy(false);
    }
  }, [applyAvatarUrl, avatarBusy, myAvatarUrl]);

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

            <div className="border-t border-white/10 pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Profile photo</p>
              <p className="mt-1 text-sm leading-relaxed text-[#bccac1]">
                Shown to your crew on the home screen. Images are resized on-device before upload.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                tabIndex={-1}
                onChange={(ev) => void onAvatarFile(ev)}
              />
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <MemberAvatar
                  url={myAvatarUrl}
                  label={myDisplayName}
                  size="lg"
                  variant="accent"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <button
                    type="button"
                    disabled={avatarBusy}
                    onClick={onPickAvatar}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent/15 px-4 py-2.5 font-display text-sm font-semibold text-accent ring-1 ring-accent/35 transition-colors hover:bg-accent/25 disabled:opacity-50"
                  >
                    <Camera className="h-4 w-4 shrink-0" aria-hidden />
                    {avatarBusy ? 'Working…' : 'Upload photo'}
                  </button>
                  {myAvatarUrl ? (
                    <button
                      type="button"
                      disabled={avatarBusy}
                      onClick={() => void onRemoveAvatar()}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-[#bccac1] transition-colors hover:bg-white/5 hover:text-ink disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
                      Remove photo
                    </button>
                  ) : null}
                </div>
              </div>
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
