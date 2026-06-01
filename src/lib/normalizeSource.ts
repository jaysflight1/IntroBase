export function normalizeSourceValue(source: string): string {
  const trimmed = source.trim();
  if (!trimmed || /^(other|unknown|n\/a)$/i.test(trimmed)) {
    return "";
  }
  return trimmed;
}
