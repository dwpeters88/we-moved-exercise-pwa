import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { formatAuthErrorForUi } from '../lib/authUi';
import { useAuth } from '../lib/rpg';
import { useToast } from '../lib/toast';

function BoltIcon(props: { className?: string }): JSX.Element {
  return (
    <svg
      className={props.className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.87 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z" />
    </svg>
  );
}

function MailIcon(props: { className?: string }): JSX.Element {
  return (
    <svg className={props.className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6h16v12H4V6zm0 0 8 6 8-6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon(props: { className?: string }): JSX.Element {
  return (
    <svg className={props.className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 11V8a4 4 0 0 1 8 0v3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function LoginView(): JSX.Element {
  const { signIn, signUp } = useAuth();
  const { pushToast } = useToast();
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
        if (error) {
          const m = formatAuthErrorForUi(error);
          setMessage(m);
          pushToast({ variant: 'error', message: m });
        }
      } else {
        const { data, error } = await signUp(email.trim(), password);
        if (error) {
          const m = formatAuthErrorForUi(error);
          setMessage(m);
          pushToast({ variant: 'error', message: m });
          return;
        }
        if (!data.session) {
          const { error: signInError } = await signIn(email.trim(), password);
          if (signInError) {
            const m = formatAuthErrorForUi(signInError);
            setMessage(m);
            pushToast({ variant: 'error', message: m });
          }
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      className="relative flex min-h-dvh flex-col items-center overflow-hidden bg-surface text-ink antialiased selection:bg-accent/35 selection:text-ink"
      variants={rootVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Stitch-style dual radial backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_50%_0%,rgba(62,232,181,0.08)_0%,transparent_50%),radial-gradient(circle_at_100%_100%,rgba(62,232,181,0.05)_0%,transparent_50%)]" aria-hidden />

      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="absolute -left-[20%] -top-[10%] h-[40%] w-[70%] rounded-full bg-accent/10 blur-[100px]" />
        <div className="absolute -right-[30%] top-[40%] h-[50%] w-[80%] rounded-full bg-accent/5 blur-[120px]" />
      </div>

      <main className="relative z-10 flex w-full max-w-[390px] flex-1 flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))]">
        <motion.header variants={blockVariants} className="login-hero flex w-full flex-col items-start pb-10 pt-6">
          <p className="mb-2 flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-[0.28em] text-accent">
            <BoltIcon className="shrink-0 text-accent" />
            We Moved
          </p>
          <h1 className="font-display text-4xl font-extrabold uppercase leading-[0.95] tracking-tight text-ink">
            Delmaine
            <br />
            <span className="text-accent">&amp;</span> Hannah
          </h1>
          <p className="mt-4 max-w-[90%] text-base leading-relaxed text-muted">
            One tap when you have exercised. You both see the same timeline — works installed from the
            browser on Android and iPhone.
          </p>
        </motion.header>

        <motion.form
          variants={blockVariants}
          onSubmit={(e) => void submit(e)}
          className="login-form relative z-10 mt-auto flex w-full flex-col gap-6 overflow-hidden rounded-[24px] border border-accent/15 border-b-accent/5 border-l-accent/5 border-r-accent/5 border-t-accent/15 bg-track/60 p-6 shadow-[0_4px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl backdrop-saturate-150"
        >
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent/10 blur-2xl"
            aria-hidden
          />

          <LayoutGroup id="login-mode-tabs">
            <div className="relative flex rounded-xl border border-white/10 bg-surface-high/50 p-1 shadow-inner">
              <button
                type="button"
                className="relative z-10 flex-1 rounded-lg py-2.5 text-center text-sm font-semibold tracking-wide transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                onClick={() => setMode('signin')}
              >
                {mode === 'signin' ? (
                  <motion.div
                    layoutId="loginAuthModePill"
                    className="absolute inset-0 -z-10 rounded-lg bg-surface shadow-sm"
                    transition={modePillTransition}
                  />
                ) : null}
                <span className={mode === 'signin' ? 'relative text-accent' : 'text-muted'}>Sign in</span>
              </button>
              <button
                type="button"
                className="relative z-10 flex-1 rounded-lg py-2.5 text-center text-sm font-semibold tracking-wide transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                onClick={() => setMode('signup')}
              >
                {mode === 'signup' ? (
                  <motion.div
                    layoutId="loginAuthModePill"
                    className="absolute inset-0 -z-10 rounded-lg bg-surface shadow-sm"
                    transition={modePillTransition}
                  />
                ) : null}
                <span className={mode === 'signup' ? 'relative text-accent' : 'text-muted'}>
                  Create account
                </span>
              </button>
            </div>
          </LayoutGroup>

          <label className="group relative block" htmlFor="login-email">
            <span className="mb-1 block text-xs font-medium text-muted">Email</span>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-0.5 text-muted transition-colors group-focus-within:text-accent">
                <MailIcon className="shrink-0" />
              </div>
              <input
                id="login-email"
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                className="w-full border-0 border-b border-white/15 bg-transparent py-3 pl-9 pr-1 text-base text-ink outline-none ring-0 placeholder:text-muted/50 focus:border-accent focus:ring-0"
                placeholder="you@example.com"
              />
            </div>
          </label>

          <label className="group relative block" htmlFor="login-password">
            <span className="mb-1 block text-xs font-medium text-muted">Password</span>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-0.5 text-muted transition-colors group-focus-within:text-accent">
                <LockIcon className="shrink-0" />
              </div>
              <input
                id="login-password"
                type="password"
                name="password"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
                minLength={8}
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                className="w-full border-0 border-b border-white/15 bg-transparent py-3 pl-9 pr-1 text-base text-ink outline-none ring-0 placeholder:text-muted/50 focus:border-accent focus:ring-0"
                placeholder="••••••••"
              />
            </div>
          </label>

          <div className="min-h-[1.5rem]">
            {message ? (
              <p
                className="flex items-start gap-2 text-sm leading-snug text-[#ffb4ab]"
                role="status"
              >
                <span className="mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#ffb4ab]" aria-hidden />
                {message}
              </p>
            ) : null}
          </div>

          <motion.button
            type="submit"
            disabled={busy}
            animate={ctaGlow}
            transition={
              prefersReducedMotion
                ? undefined
                : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
            }
            className="login-cta flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-4 font-display text-base font-bold text-surface shadow-[0_4px_24px_-4px_rgba(62,232,181,0.45)] transition hover:brightness-105 active:scale-[0.98] active:transition-none disabled:opacity-50"
          >
            {busy ? (
              'Please wait…'
            ) : (
              <>
                {mode === 'signin' ? 'Continue' : 'Register'}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M5 12h14m-6-6 6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </>
            )}
          </motion.button>
        </motion.form>
      </main>
    </motion.div>
  );
}
