import { useEffect, useState, type FormEvent } from 'react';
import { formatAuthErrorForUi } from '../lib/authUi';
import { useAuth } from '../lib/rpg';

export default function LoginView(): JSX.Element {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
    <div className="flex min-h-dvh flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(3.5rem,env(safe-area-inset-top))]">
      <header className="mb-10 animate-[fadeIn_0.5s_ease-out]">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          We Moved
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight text-ink">
          Delmaine &amp; Hannah
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
          One tap when you have exercised. You both see the same timeline — works installed from the
          browser on Android and iPhone.
        </p>
      </header>

      <form
        onSubmit={(e) => void submit(e)}
        className="mt-auto flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-white/10 bg-surface-high/80 p-5 shadow-xl backdrop-blur-sm"
      >
        <div className="flex rounded-xl bg-track p-1">
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${mode === 'signin' ? 'bg-accent text-surface' : 'text-muted'}`}
            onClick={() => setMode('signin')}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${mode === 'signup' ? 'bg-accent text-surface' : 'text-muted'}`}
            onClick={() => setMode('signup')}
          >
            Create account
          </button>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            className="w-full rounded-xl border border-white/10 bg-surface px-4 py-3 text-ink outline-none ring-accent/40 placeholder:text-muted/60 focus:ring-2"
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
            className="w-full rounded-xl border border-white/10 bg-surface px-4 py-3 text-ink outline-none ring-accent/40 placeholder:text-muted/60 focus:ring-2"
            placeholder="••••••••"
          />
        </label>

        {message ? (
          <p className="rounded-xl bg-track px-3 py-2 text-sm text-muted" role="status">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-accent py-3.5 font-display text-base font-bold text-surface transition-opacity hover:opacity-95 disabled:opacity-50"
        >
          {busy ? 'Please wait…' : mode === 'signin' ? 'Continue' : 'Register'}
        </button>
      </form>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
