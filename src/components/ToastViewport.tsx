import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useToast, type ToastItem, type ToastVariant } from '../lib/toast';

function variantIcon(variant: ToastVariant): JSX.Element {
  const common = 'h-5 w-5 shrink-0';
  switch (variant) {
    case 'success':
      return <CheckCircle2 className={`${common} text-accent`} aria-hidden />;
    case 'error':
      return <AlertCircle className={`${common} text-red-400`} aria-hidden />;
    case 'info':
      return <Info className={`${common} text-partner`} aria-hidden />;
  }
}

function variantBorder(variant: ToastVariant): string {
  switch (variant) {
    case 'success':
      return 'border-accent/35 shadow-[0_10px_30px_rgba(0,0,0,0.45)]';
    case 'error':
      return 'border-red-400/35 shadow-[0_10px_30px_rgba(0,0,0,0.45)]';
    case 'info':
      return 'border-partner/35 shadow-[0_10px_30px_rgba(0,0,0,0.45)]';
  }
}

function ToastRow({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }): JSX.Element {
  const reduceMotion = useReducedMotion() === true;

  return (
    <motion.div
      layout
      role="status"
      initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
      transition={
        reduceMotion
          ? { duration: 0.15 }
          : { type: 'tween', ease: [0.22, 1, 0.36, 1], duration: 0.32 }
      }
      className={`pointer-events-auto flex max-w-full items-start gap-3 rounded-xl border bg-surface-high/90 px-3.5 py-3 backdrop-blur-md motion-reduce:transition-opacity motion-reduce:duration-150 ${variantBorder(toast.variant)}`}
    >
      {variantIcon(toast.variant)}
      <p className="min-w-0 flex-1 pt-0.5 text-sm leading-snug text-ink">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded-lg p-1 text-muted transition-colors hover:bg-white/5 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </motion.div>
  );
}

export function ToastViewport(): JSX.Element {
  const { toasts, dismissToast } = useToast();

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-stretch justify-end gap-2 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-6"
      aria-live="polite"
      aria-relevant="additions text"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastRow key={t.id} toast={t} onDismiss={() => dismissToast(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}
