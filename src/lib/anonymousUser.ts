import { STORAGE_KEYS } from "@/lib/storageKeys";

function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function getAnonymousUserId(): string {
  if (typeof window === "undefined") return "";

  let id = window.localStorage.getItem(STORAGE_KEYS.anonymousUserId);

  if (!id) {
    id = makeId("anon");
    window.localStorage.setItem(STORAGE_KEYS.anonymousUserId, id);
  }

  return id;
}

export function hasExistingAnonymousUserId(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem(STORAGE_KEYS.anonymousUserId));
}

export function getSessionId(): string {
  if (typeof window === "undefined") return "";

  let id = window.sessionStorage.getItem(STORAGE_KEYS.sessionId);

  if (!id) {
    id = makeId("session");
    window.sessionStorage.setItem(STORAGE_KEYS.sessionId, id);
  }

  return id;
}
