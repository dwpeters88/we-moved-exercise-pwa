import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Users } from 'lucide-react';
import { useRpgEnv } from '../lib/rpg';

const NAMES = ['Delmaine', 'Hannah'] as const;

type Props = {
  onJoined: () => Promise<void>;
};

function mapJoinRpcError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid_invite_code')) return 'That invite code is not valid.';
  if (m.includes('display_name_required')) return 'Pick how your name appears.';
  return message.trim() || 'Could not join the crew.';
}

export default function JoinCrewView({ onJoined }: Props): JSX.Element {
  const { supabase } = useRpgEnv();
  const [code, setCode] = useState('');
  const [name, setName] = useState<(typeof NAMES)[number]>('Delmaine');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { error: rpcError } = await supabase.rpc('exercise_buddy_join', {
        p_code: code.trim(),
        p_display_name: name,
      });
      if (rpcError) {
        setError(mapJoinRpcError(rpcError.message ?? ''));
        return;
      }
      await onJoined();
    } finally {
      setBusy(false);
    }
  }

  const spring = reduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 420, damping: 32, mass: 0.85 };

  const fadeUp = reduceMotion
    ? { initial: false, animate: {} }
    : {
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        transition: { ...spring, delay: 0 },
      };

  const formBlock = reduceMotion
    ? { initial: false, animate: {} }
    : {
        initial: { opacity: 0, y: 18 },
        animate: { opacity: 1, y: 0 },
        transition: { ...spring, delay: 0.06 },
      };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden px-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-12">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(62,232,181,0.12),transparent_55%),radial-gradient(ellipse_80%_50%_at_100%_100%,rgba(31,107,85,0.18),transparent_45%)]"
        aria-hidden
      />

      <motion.header
        className="relative z-10 mb-8 rounded-2xl border border-white/10 bg-surface-high/90 p-6 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_20px_50px_-24px_rgba(0,0,0,0.55)] backdrop-blur-sm"
        {...fadeUp}
      >
        <div className="mb-4 inline-flex rounded-xl border border-accent/25 bg-accent/10 p-2.5 text-accent shadow-[0_0_28px_rgba(62,232,181,0.12)]">
          <Users className="h-6 w-6" strokeWidth={2} aria-hidden />
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Join your crew</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Enter the shared invite code once. Delmaine and Hannah each use their own login — data stays
          in one place.
        </p>
      </motion.header>

      <motion.form
        onSubmit={(e) => void submit(e)}
        className="relative z-10 flex flex-col gap-5"
        {...formBlock}
      >
        <motion.div
          className="rounded-2xl border border-white/10 bg-surface-high/85 p-5 shadow-[0_1px_0_rgba(255,255,255,0.05)_inset,0_16px_40px_-20px_rgba(0,0,0,0.45)] backdrop-blur-sm"
          {...(reduceMotion
            ? {}
            : {
                initial: { opacity: 0, y: 12 },
                animate: { opacity: 1, y: 0 },
                transition: { ...spring, delay: 0.1 },
              })}
        >
          <span className="mb-3 block text-xs font-medium uppercase tracking-wider text-muted">
            You are
          </span>
          <div className="flex gap-3">
            {NAMES.map((n, i) => (
              <motion.button
                key={n}
                type="button"
                layout={reduceMotion ? false : true}
                onClick={() => setName(n)}
                transition={spring}
                animate={{
                  scale: name === n ? 1.03 : 1,
                }}
                whileHover={reduceMotion ? undefined : { scale: name === n ? 1.04 : 1.02 }}
                whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                {...(reduceMotion
                  ? {}
                  : {
                      initial: { opacity: 0, y: 10 },
                      animate: { opacity: 1, y: 0 },
                      transition: { ...spring, delay: 0.12 + i * 0.05 },
                    })}
                className={`flex-1 rounded-2xl border py-4 font-display text-base font-semibold transition-colors ${
                  name === n
                    ? 'border-accent bg-accent/15 text-accent shadow-[0_0_0_1px_rgba(62,232,181,0.35),0_8px_28px_-8px_rgba(62,232,181,0.35)]'
                    : 'border-white/10 bg-surface text-ink hover:border-accent/30 hover:bg-surface-high'
                }`}
              >
                {n}
              </motion.button>
            ))}
          </div>
        </motion.div>

        <motion.label
          className="block rounded-2xl border border-white/10 bg-surface-high/85 p-5 shadow-[0_1px_0_rgba(255,255,255,0.05)_inset,0_16px_40px_-20px_rgba(0,0,0,0.45)] backdrop-blur-sm"
          {...(reduceMotion
            ? {}
            : {
                initial: { opacity: 0, y: 12 },
                animate: { opacity: 1, y: 0 },
                transition: { ...spring, delay: 0.16 },
              })}
        >
          <span className="mb-3 block text-xs font-medium uppercase tracking-wider text-muted">
            Invite code
          </span>
          <motion.input
            type="text"
            autoComplete="off"
            required
            value={code}
            onChange={(ev) => setCode(ev.target.value)}
            whileFocus={
              reduceMotion
                ? undefined
                : {
                    scale: 1.02,
                    boxShadow:
                      '0 0 0 3px rgba(62, 232, 181, 0.35), 0 12px 36px -14px rgba(62, 232, 181, 0.22)',
                  }
            }
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="w-full origin-center rounded-2xl border border-white/10 bg-surface px-4 py-4 font-mono text-lg tracking-wide text-ink outline-none ring-accent/20 focus:border-accent/40"
            placeholder="e.g. DH-SHARED-2026"
          />
        </motion.label>

        <AnimatePresence initial={false}>
          {error ? (
            <motion.div
              key={error}
              role="alert"
              initial={reduceMotion ? false : { opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -6, scale: 0.98 }}
              transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }}
              className="rounded-2xl border border-red-500/30 bg-red-950/50 px-4 py-3 text-sm text-red-100 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.5)]"
            >
              {error}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <motion.button
          type="submit"
          disabled={busy}
          whileHover={reduceMotion || busy ? undefined : { scale: 1.01 }}
          whileTap={reduceMotion || busy ? undefined : { scale: 0.99 }}
          transition={spring}
          {...(reduceMotion
            ? {}
            : {
                initial: { opacity: 0, y: 10 },
                animate: { opacity: 1, y: 0 },
                transition: { ...spring, delay: 0.2 },
              })}
          className="rounded-2xl bg-accent py-4 font-display text-lg font-bold text-surface shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_12px_32px_-8px_rgba(62,232,181,0.45)] transition-opacity hover:opacity-95 disabled:opacity-50"
        >
          {busy ? 'Joining…' : 'Join shared log'}
        </motion.button>
      </motion.form>
    </div>
  );
}
