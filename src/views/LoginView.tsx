import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { formatAuthErrorForUi } from '../lib/authUi';
import { useAuth } from '../lib/rpg';

export default function LoginView(): JSX.Element {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion() === true;

  const { rootVariants, blockVariants, ctaGlow, modePillTransition } = useMemo(
    () =>
      prefersReducedMotion
        ? {
            rootVariants: {
              hidden: {},
              visible: { transition: { staggerChildren: 0, delayChildren: 0 } },
            },
            blockVariants: {
              hidden: { opacity: 1, y: 0 },
              visible: { opacity: 1, y: 0, transition: { duration: 0 } },
            },
            ctaGlow: {},
            modePillTransition: { duration: 0.01 },
          }
        : {
            rootVariants: {
              hidden: {},
              visible: {
                transition: { staggerChildren: 0.11, delayChildren: 0.05 },
              },
            },
            blockVariants: {
              hidden: { opacity: 0, y: 18 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.52, ease: [0.22, 1, 0.36, 1] },
              },
            },
            ctaGlow: {
              boxShadow: [
                '0 0 0 0 rgba(62, 232, 181, 0.28)',
                '0 0 28px 6px rgba(62, 232, 181, 0.22)',
                '0 0 0 0 rgba(62, 232, 181, 0.28)',
              ],
            },
            modePillTransition: { type: 'spring' as const, stiffness: 520, damping: 36 },
          },
    [prefersReducedMotion],
  );

  useEffect(() => {
    setMessage(null);
  }, [mode]);

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setMessage(null);
    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email.trim(), password);
        if (error) setMessage(formatAuthErrorForUi(error));
      } else {
        const { data, error } = await signUp(email.trim(), password);
        if (error) {
          setMessage(formatAuthErrorForUi(error));
          return;
        }
        if (!data.session) {
          const { error: signInError } = await signIn(email.trim(), password);
          if (signInError) {
            setMessage(formatAuthErrorForUi(signInError));
          }
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      className="relative flex min-h-dvh flex-col overflow-hidden px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(3.5rem,env(safe-area-inset-top))]"
      variants={rootVariants}
      initial="hidden"
      animate="visible"
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(62,232,181,0.12),transparent_55%)]"
        aria-hidden
      />

      <motion.header variants={blockVariants} className="login-hero mb-10">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          We Moved
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight tracking-tight text-ink">
          Delmaine &amp; Hannah
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
          One tap when you have exercised. You both see the same timeline — works installed from the
          browser on Android and iPhone.
        </p>
      </motion.header>

      <motion.form
        variants={blockVariants}
        onSubmit={(e) => void submit(e)}
        className="login-form mt-auto flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-accent/15 bg-surface-high/85 p-5 shadow-[0_0_0_1px_rgba(62,232,181,0.06),0_24px_48px_-24px_rgba(0,0,0,0.55),0_0_60px_-20px_rgba(62,232,181,0.12)] backdrop-blur-md"
      >
        <LayoutGroup id="login-mode-tabs">
          <div className="relative flex rounded-xl bg-track p-1 shadow-inner">
            <button
              type="button"
              className="relative z-10 flex-1 rounded-lg py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              onClick={() => setMode('signin')}
            >
              {mode === 'signin' ? (
                <motion.div
                  layoutId="loginAuthModePill"
                  className="absolute inset-0 -z-10 rounded-lg bg-accent shadow-[0_0_24px_rgba(62,232,181,0.35)]"
                  transition={modePillTransition}
                />
              ) : null}
              <span className={mode === 'signin' ? 'relative text-surface' : 'text-muted'}>Sign in</span>
            </button>
            <button
              type="button"
              className="relative z-10 flex-1 rounded-lg py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              onClick={() => setMode('signup')}
            >
              {mode === 'signup' ? (
                <motion.div
                  layoutId="loginAuthModePill"
                  className="absolute inset-0 -z-10 rounded-lg bg-accent shadow-[0_0_24px_rgba(62,232,181,0.35)]"
                  transition={modePillTransition}
                />
              ) : null}
              <span className={mode === 'signup' ? 'relative text-surface' : 'text-muted'}>
                Create account
              </span>
            </button>
          </div>
        </LayoutGroup>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            className="w-full rounded-xl border border-white/10 bg-surface px-4 py-3 text-ink outline-none ring-accent/40 placeholder:text-muted/60 focus:border-accent/30 focus:ring-2"
            placeholder="you@example.com"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Password</span>
          <input
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            required
            minLength={8}
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            className="w-full rounded-xl border border-white/10 bg-surface px-4 py-3 text-ink outline-none ring-accent/40 placeholder:text-muted/60 focus:border-accent/30 focus:ring-2"
            placeholder="••••••••"
          />
        </label>

        {message ? (
          <p className="rounded-xl bg-track px-3 py-2 text-sm text-muted" role="status">
            {message}
          </p>
        ) : null}

        <motion.button
          type="submit"
          disabled={busy}
          animate={ctaGlow}
          transition={
            prefersReducedMotion
              ? undefined
              : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
          }
          className="login-cta rounded-xl bg-accent py-3.5 font-display text-base font-bold text-surface shadow-[0_4px_24px_-4px_rgba(62,232,181,0.45)] transition-opacity hover:opacity-95 disabled:opacity-50"
        >
          {busy ? 'Please wait…' : mode === 'signin' ? 'Continue' : 'Register'}
        </motion.button>
      </motion.form>
    </motion.div>
  );
}
