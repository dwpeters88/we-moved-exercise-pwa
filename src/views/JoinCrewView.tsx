import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Users } from 'lucide-react';
import { useRpgEnv } from '../lib/rpg';
import { useToast } from '../lib/toast';

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
  const { pushToast } = useToast();
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
        const msg = mapJoinRpcError(rpcError.message ?? '');
        setError(msg);
        pushToast({ variant: 'error', message: msg });
        return;
      }
      pushToast({ variant: 'success', message: 'Joined your crew — welcome!' });
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
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-surface text-ink">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(62,232,181,0.1),transparent_55%),radial-gradient(ellipse_80%_50%_at_100%_100%,rgba(31,107,85,0.14),transparent_45%)]"
        aria-hidden
      />

      <div className="relative z-10 flex w-full max-w-md flex-1 flex-col self-center px-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-12">
        <motion.header className="mb-10 text-center" {...fadeUp}>
          <div className="mb-4 flex justify-center text-accent">
            <Users className="h-12 w-12" strokeWidth={1.5} aria-hidden />
          </div>
          <h1 className="font-display text-[1.75rem] font-extrabold leading-tight tracking-tight text-ink">
            Join your crew
          </h1>
          <p className="mx-auto mt-2 max-w-[320px] text-base leading-relaxed text-muted">
            You&apos;re entering a shared performance zone. Enter the single invite code to link both
            profiles.
          </p>
        </motion.header>

        <motion.form
          onSubmit={(e) => void submit(e)}
          className="flex min-h-0 flex-1 flex-col"
          {...formBlock}
        >
          <motion.section
            className="mb-8"
            {...(reduceMotion
              ? {}
              : {
                  initial: { opacity: 0, y: 12 },
                  animate: { opacity: 1, y: 0 },
                  transition: { ...spring, delay: 0.1 },
                })}
          >
            <h2 className="mb-3 text-center font-mono text-xs font-medium uppercase tracking-[0.2em] text-muted">
              Select your profile
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {NAMES.map((n, i) => {
                const selected = name === n;
                return (
                  <motion.button
                    key={n}
                    type="button"
                    layout={reduceMotion ? false : true}
                    onClick={() => setName(n)}
                    transition={spring}
                    whileHover={reduceMotion ? undefined : { scale: selected ? 1.02 : 1.02 }}
                    whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                    {...(reduceMotion
                      ? {}
                      : {
                          initial: { opacity: 0, y: 10 },
                          animate: { opacity: 1, y: 0 },
                          transition: { ...spring, delay: 0.12 + i * 0.05 },
                        })}
                    className={`relative overflow-hidden rounded-xl border p-5 backdrop-blur-xl transition-opacity ${
                      selected
                        ? 'border-accent bg-white/[0.06] shadow-[0_0_24px_rgba(62,232,181,0.12)]'
                        : 'border-white/[0.08] bg-white/[0.04] opacity-60 hover:opacity-100'
                    }`}
                  >
                    {selected ? (
                      <span
                        className="pointer-events-none absolute inset-0 bg-accent/[0.06]"
                        aria-hidden
                      />
                    ) : null}
                    <span
                      className={`relative z-10 block text-center font-display text-xl font-bold tracking-tight text-ink`}
                    >
                      {n}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.section>

          <motion.section
            className="mb-auto flex flex-1 flex-col"
            {...(reduceMotion
              ? {}
              : {
                  initial: { opacity: 0, y: 12 },
                  animate: { opacity: 1, y: 0 },
                  transition: { ...spring, delay: 0.14 },
                })}
          >
            <label
              htmlFor="invite-code"
              className="mb-3 block text-center font-mono text-xs font-medium uppercase tracking-[0.2em] text-muted"
            >
              Invite code
            </label>
            <div className="group relative">
              <motion.input
                id="invite-code"
                type="text"
                autoComplete="off"
                required
                value={code}
                onChange={(ev) => setCode(ev.target.value)}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                className="relative z-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-4 text-center font-mono text-2xl font-bold uppercase tracking-[0.22em] text-accent outline-none backdrop-blur-xl placeholder:text-muted/30 focus:border-accent focus:ring-1 focus:ring-accent"
                placeholder="XXXX-XXXX"
              />
              <div
                className="pointer-events-none absolute inset-0 rounded-xl shadow-none transition-shadow duration-300 group-focus-within:shadow-[0_0_30px_rgba(62,232,181,0.15)]"
                aria-hidden
              />
            </div>
          </motion.section>

          <div className="mt-10 flex flex-col gap-3">
            <div
              className="flex min-h-[1.5rem] w-full flex-col items-center justify-center text-center"
              aria-live="polite"
            >
              <AnimatePresence initial={false}>
                {error ? (
                  <motion.div
                    key={error}
                    role="alert"
                    initial={reduceMotion ? false : { opacity: 0, y: -6, scale: 0.99 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -4, scale: 0.99 }}
                    transition={
                      reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }
                    }
                    className="rounded-lg border border-red-500/35 bg-red-950/55 px-3 py-2 font-mono text-xs tracking-wide text-red-100 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.55)]"
                  >
                    {error}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

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
                    transition: { ...spring, delay: 0.18 },
                  })}
              className="w-full rounded-xl bg-accent py-4 font-display text-xl font-bold text-surface shadow-[0_0_40px_rgba(62,232,181,0.15)] transition-[opacity,box-shadow] hover:shadow-[0_0_52px_rgba(62,232,181,0.22)] disabled:opacity-50"
            >
              {busy ? 'Joining…' : 'Join shared log'}
            </motion.button>
          </div>
        </motion.form>
      </div>
    </div>
  );
}
