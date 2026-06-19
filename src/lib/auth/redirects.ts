const DEFAULT_SIGNED_IN_PATH = "/app";

export function sanitizeNextPath(value: string | null | undefined) {
  if (!value) {
    return DEFAULT_SIGNED_IN_PATH;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_SIGNED_IN_PATH;
  }

  try {
    const parsed = new URL(value, "https://introbase.local");

    if (parsed.origin !== "https://introbase.local") {
      return DEFAULT_SIGNED_IN_PATH;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return DEFAULT_SIGNED_IN_PATH;
  }
}

export function buildLoginPath(nextPath: string) {
  return `/login?next=${encodeURIComponent(sanitizeNextPath(nextPath))}`;
}
