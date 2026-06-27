const NEW_ACCOUNT_ONBOARDING_WINDOW_MS = 30 * 60 * 1000;

interface NewUserOnboardingInput {
  authCreatedAt?: string | null;
  now?: number;
  profileExists: boolean;
  profileLookupFailed: boolean;
}

function wasAuthAccountJustCreated(
  authCreatedAt: string | null | undefined,
  now: number,
) {
  if (!authCreatedAt) return false;

  const createdAtMs = Date.parse(authCreatedAt);
  if (!Number.isFinite(createdAtMs)) return false;

  const ageMs = now - createdAtMs;
  return ageMs >= 0 && ageMs <= NEW_ACCOUNT_ONBOARDING_WINDOW_MS;
}

export function shouldShowNewUserOnboarding({
  authCreatedAt,
  now = Date.now(),
  profileExists,
  profileLookupFailed,
}: NewUserOnboardingInput) {
  if (!profileLookupFailed && !profileExists) {
    return true;
  }

  return wasAuthAccountJustCreated(authCreatedAt, now);
}
