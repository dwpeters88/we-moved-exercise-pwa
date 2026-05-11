import { useState, type FormEvent } from 'react';
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

  return (
    <div className="flex min-h-dvh flex-col px-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-12">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-bold text-ink">Join your crew</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Enter the shared invite code once. Delmaine and Hannah each use their own login — data stays
          in one place.
        </p>
      </header>

      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-6">
        <div>
          <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted">
            You are
          </span>
          <div className="flex gap-3">
            {NAMES.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setName(n)}
                className={`flex-1 rounded-2xl border py-4 font-display text-base font-semibold transition-all ${
                  name === n
                    ? 'border-accent bg-accent/15 text-accent shadow-[0_0_24px_rgba(62,232,181,0.15)]'
                    : 'border-white/10 bg-surface-high text-ink hover:border-white/20'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted">
            Invite code
          </span>
          <input
            type="text"
            autoComplete="off"
            required
            value={code}
            onChange={(ev) => setCode(ev.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-surface-high px-4 py-4 font-mono text-lg tracking-wide text-ink outline-none ring-accent/30 focus:ring-2"
            placeholder="e.g. DH-SHARED-2026"
          />
        </label>

        {error ? (
          <p className="rounded-xl bg-red-950/40 px-4 py-3 text-sm text-red-200" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="rounded-2xl bg-accent py-4 font-display text-lg font-bold text-surface transition-opacity hover:opacity-95 disabled:opacity-50"
        >
          {busy ? 'Joining…' : 'Join shared log'}
        </button>
      </form>
    </div>
  );
}
