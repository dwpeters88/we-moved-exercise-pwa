import { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';

const DISMISS_KEY = 'wm-install-banner-dismissed';

/** Chromium install prompt (not in all TS DOM libs). */
type PwaBeforeInstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isStandaloneDisplay(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches;
}

export default function InstallAppBanner(): JSX.Element | null {
  const [deferredPrompt, setDeferredPrompt] = useState<PwaBeforeInstallPrompt | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.isSecureContext) return;
    if (isStandaloneDisplay()) return;

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      try {
        if (sessionStorage.getItem(DISMISS_KEY) === '1') return;
      } catch {
        /* ignore */
      }
      setDeferredPrompt(e as PwaBeforeInstallPrompt);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      try {
        sessionStorage.removeItem(DISMISS_KEY);
      } catch {
        /* ignore */
      }
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    const promptEvent = deferredPrompt;
    if (!promptEvent) return;
    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
    } finally {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setDeferredPrompt(null);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  }, []);

  if (!deferredPrompt) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 pointer-events-none"
      role="region"
      aria-label="Install We Moved on your device"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex w-full max-w-lg items-center gap-3 rounded-2xl border border-white/10 bg-surface-high/85 px-3 py-2.5 shadow-lg backdrop-blur-md">
        <p className="min-w-0 flex-1 font-sans text-sm leading-snug text-ink">
          <span className="font-display font-semibold text-accent">Install app</span>
          <span className="text-muted"> — quick access from your home screen.</span>
        </p>
        <button
          type="button"
          onClick={() => void handleInstall()}
          className="shrink-0 rounded-xl bg-accent px-3 py-2 font-display text-sm font-semibold text-surface transition-colors hover:bg-accent/90 active:bg-accent/85"
        >
          Install
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded-lg p-2 text-muted transition-colors hover:bg-white/5 hover:text-ink"
          aria-label="Dismiss install banner"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
