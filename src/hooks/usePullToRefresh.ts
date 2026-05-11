import { useCallback, useRef, useState } from 'react';
import type { RefObject, TouchEvent as ReactTouchEvent } from 'react';

const PULL_THRESHOLD_PX = 72;

export type UsePullToRefreshOptions = {
  onRefresh: () => Promise<void>;
  scrollElRef: RefObject<HTMLElement | null>;
  disabled?: boolean;
};

export type UsePullToRefreshResult = {
  pullPx: number;
  isRefreshing: boolean;
  handlers: {
    onTouchStart: (e: ReactTouchEvent<HTMLElement>) => void;
    onTouchMove: (e: ReactTouchEvent<HTMLElement>) => void;
    onTouchEnd: (e: ReactTouchEvent<HTMLElement>) => void;
  };
};

function dampenPull(raw: number): number {
  const max = 140;
  const k = 0.35;
  return Math.min(max, raw * k + raw * (1 - k) * (raw / (raw + 90)));
}

export function usePullToRefresh(
  options: UsePullToRefreshOptions,
): UsePullToRefreshResult {
  const [pullPx, setPullPx] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startYRef = useRef(0);
  const activeRef = useRef(false);
  const refreshingRef = useRef(false);
  const lastRawPullRef = useRef(0);

  const moveListenerRef = useRef<((e: TouchEvent) => void) | null>(null);
  const cancelListenerRef = useRef<(() => void) | null>(null);
  const boundElRef = useRef<HTMLElement | null>(null);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const detachMove = useCallback(() => {
    const el = boundElRef.current;
    const move = moveListenerRef.current;
    const cancel = cancelListenerRef.current;
    if (el && move) {
      el.removeEventListener('touchmove', move);
    }
    if (el && cancel) {
      el.removeEventListener('touchcancel', cancel);
    }
    moveListenerRef.current = null;
    cancelListenerRef.current = null;
    boundElRef.current = null;
  }, []);

  const resetPullUi = useCallback(() => {
    lastRawPullRef.current = 0;
    setPullPx(0);
    activeRef.current = false;
  }, []);

  const endGesture = useCallback(
    (rawPull: number) => {
      detachMove();
      const { onRefresh: run, disabled: off, scrollElRef: scrollRef } =
        optionsRef.current;
      const scrollEl = scrollRef.current;
      setPullPx(0);
      lastRawPullRef.current = 0;
      activeRef.current = false;

      if (
        off ||
        refreshingRef.current ||
        !scrollEl ||
        scrollEl.scrollTop > 0 ||
        rawPull < PULL_THRESHOLD_PX
      ) {
        return;
      }

      refreshingRef.current = true;
      setIsRefreshing(true);
      void Promise.resolve(run())
        .catch(() => {
          /* caller owns error UX */
        })
        .finally(() => {
          refreshingRef.current = false;
          setIsRefreshing(false);
        });
    },
    [detachMove],
  );

  const attachMove = useCallback((el: HTMLElement) => {
    detachMove();
    boundElRef.current = el;

    const move = (e: TouchEvent) => {
      const { disabled: off, scrollElRef: scrollRef } = optionsRef.current;
      if (off || refreshingRef.current || !activeRef.current) return;
      const scrollEl = scrollRef.current;
      if (!scrollEl) return;

      if (scrollEl.scrollTop > 0) {
        lastRawPullRef.current = 0;
        setPullPx(0);
        return;
      }

      const t = e.touches[0];
      if (!t) return;

      const raw = Math.max(0, t.clientY - startYRef.current);
      lastRawPullRef.current = raw;

      if (raw > 0) {
        e.preventDefault();
      }
      setPullPx(dampenPull(raw));
    };

    const cancel = () => {
      if (!activeRef.current) return;
      detachMove();
      resetPullUi();
    };

    moveListenerRef.current = move;
    cancelListenerRef.current = cancel;
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchcancel', cancel);
  }, [detachMove, resetPullUi]);

  const onTouchStart = useCallback(
    (e: ReactTouchEvent<HTMLElement>) => {
      const { disabled: off, scrollElRef: scrollRef } = optionsRef.current;
      if (off || refreshingRef.current || isRefreshing) return;

      const scrollEl = scrollRef.current;
      if (!scrollEl || scrollEl.scrollTop > 0) return;

      const t = e.touches[0];
      if (!t) return;

      activeRef.current = true;
      startYRef.current = t.clientY;
      lastRawPullRef.current = 0;
      setPullPx(0);
      attachMove(e.currentTarget);
    },
    [attachMove, isRefreshing],
  );

  /** Pull distance is driven by the non-passive `touchmove` listener from `onTouchStart`. */
  const onTouchMove = useCallback((_e: ReactTouchEvent<HTMLElement>) => {}, []);

  const onTouchEnd = useCallback(
    (e: ReactTouchEvent<HTMLElement>) => {
      if (!activeRef.current) return;
      let raw = lastRawPullRef.current;
      const t = e.changedTouches[0];
      if (t) {
        raw = Math.max(0, t.clientY - startYRef.current);
      }
      endGesture(raw);
    },
    [endGesture],
  );

  return {
    pullPx,
    isRefreshing,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  };
}
