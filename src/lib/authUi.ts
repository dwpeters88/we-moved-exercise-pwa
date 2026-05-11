/**
 * Human-readable auth errors for UI. Supabase often returns long copy such as
 * “check your email…” when `email_not_confirmed`; we replace that with an
 * operator-focused hint so users aren’t told to watch the inbox when the
 * project is supposed to allow immediate sign-in.
 */
export function formatAuthErrorForUi(error: Error | null | undefined): string {
  if (!error) return '';
  const msg = error.message?.trim() ?? '';
  const code =
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string'
      ? (error as { code: string }).code
      : undefined;

  if (
    code === 'email_not_confirmed' ||
    code === 'provider_email_needs_verification' ||
    /email_not_confirmed|email address not confirmed|confirm your signup|check your email|check your inbox/i.test(
      msg,
    )
  ) {
    return 'Supabase is still requiring email confirmation for this project. In the dashboard go to Authentication → Providers → Email, turn off “Confirm email”, save, wait a short moment, then try again.';
  }

  return msg;
}
