import { getAnonymousUserId, getSessionId } from "@/lib/anonymousUser";

export async function logEvent(
  eventName: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const anonymousUserId = getAnonymousUserId();
  const sessionId = getSessionId();

  if (!anonymousUserId || !sessionId) return;

  try {
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        anonymous_user_id: anonymousUserId,
        session_id: sessionId,
        event_name: eventName,
        metadata,
      }),
    });
  } catch {
    // Analytics should never block product usage.
  }
}
