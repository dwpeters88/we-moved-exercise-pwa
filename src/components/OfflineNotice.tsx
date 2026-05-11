import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { WifiOff } from 'lucide-react';

export function OfflineNotice(): JSX.Element | null {
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = prefersReducedMotion === true;
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={reduceMotion ? false : { opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }
      }
      className="pointer-events-none fixed left-0 right-0 top-0 z-[100] border-b border-amber-600/35 bg-surface-high/95 pt-[max(0.35rem,env(safe-area-inset-top))] shadow-[0_6px_24px_rgba(0,0,0,0.35)] backdrop-blur-md"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-amber-500/90 via-orange-600/85 to-red-600/80"
        aria-hidden
      />
      <div className="relative mx-auto flex max-w-lg items-center justify-center gap-2 px-4 pb-2">
        <WifiOff
          className="h-4 w-4 shrink-0 text-amber-400"
          strokeWidth={2.25}
          aria-hidden
        />
        <span className="font-display text-xs font-semibold tracking-wide text-ink">
          You&apos;re offline
        </span>
      </div>
    </motion.div>
  );
}
