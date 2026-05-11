import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type ToastVariant = 'success' | 'error' | 'info';

export type PushToastInput = {
  variant: ToastVariant;
  message: string;
  durationMs?: number;
};

export type ToastItem = PushToastInput & { id: string };

const MAX_TOASTS = 4;
const DEFAULT_DURATION_MS = 4500;

type ToastContextValue = {
  toasts: ToastItem[];
  pushToast: (input: PushToastInput) => void;
  dismissToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }): JSX.Element {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearTimer = useCallback((id: string) => {
    const t = timersRef.current.get(id);
    if (t) {
      clearTimeout(t);
      timersRef.current.delete(id);
    }
  }, []);

  const dismissToast = useCallback(
    (id: string) => {
      clearTimer(id);
      setToasts((prev) => prev.filter((x) => x.id !== id));
    },
    [clearTimer],
  );

  const pushToast = useCallback(
    (input: PushToastInput) => {
      const id = crypto.randomUUID();
      const durationMs = input.durationMs ?? DEFAULT_DURATION_MS;
      const toast: ToastItem = { ...input, id };

      setToasts((prev) => {
        let next = [...prev, toast];
        if (next.length > MAX_TOASTS) {
          const removed = next.slice(0, next.length - MAX_TOASTS);
          for (const r of removed) clearTimer(r.id);
          next = next.slice(-MAX_TOASTS);
        }
        return next;
      });

      const t = setTimeout(() => dismissToast(id), durationMs);
      timersRef.current.set(id, t);
    },
    [clearTimer, dismissToast],
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    };
  }, []);

  const value = useMemo(
    () => ({ toasts, pushToast, dismissToast }),
    [toasts, pushToast, dismissToast],
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
