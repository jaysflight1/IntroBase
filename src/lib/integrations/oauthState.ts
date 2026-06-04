import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const STATE_TTL_MS = 10 * 60 * 1000;

interface GmailOAuthStatePayload {
  userId: string;
  nextPath: string;
  nonce: string;
  createdAt: number;
}

function getStateSecret() {
  return (
    process.env.OAUTH_STATE_SECRET ||
    process.env.TOKEN_ENCRYPTION_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function sign(value: string) {
  const secret = getStateSecret();

  if (!secret) {
    throw new Error("OAUTH_STATE_SECRET or TOKEN_ENCRYPTION_KEY is required");
  }

  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function createOAuthState(userId: string, nextPath: string) {
  const payload: GmailOAuthStatePayload = {
    userId,
    nextPath,
    nonce: randomBytes(16).toString("base64url"),
    createdAt: Date.now(),
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );

  return `${encoded}.${sign(encoded)}`;
}

export function verifyOAuthState(state: string, expectedUserId: string) {
  const [encoded, signature] = state.split(".");

  if (!encoded || !signature) {
    return null;
  }

  const expected = sign(encoded);
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    return null;
  }

  const payload = JSON.parse(
    Buffer.from(encoded, "base64url").toString("utf8"),
  ) as GmailOAuthStatePayload;

  if (payload.userId !== expectedUserId) {
    return null;
  }

  if (Date.now() - payload.createdAt > STATE_TTL_MS) {
    return null;
  }

  return payload;
}
