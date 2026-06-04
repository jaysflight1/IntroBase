import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_TIMESTAMP_AGE_SECONDS = 60 * 5;

export function verifySlackSignature(input: {
  body: string;
  timestamp: string | null;
  signature: string | null;
  signingSecret?: string;
  nowSeconds?: number;
}) {
  const signingSecret = input.signingSecret ?? process.env.SLACK_SIGNING_SECRET;

  if (!signingSecret) {
    return false;
  }

  if (!input.timestamp || !input.signature) {
    return false;
  }

  const timestamp = Number(input.timestamp);

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  const nowSeconds = input.nowSeconds ?? Math.floor(Date.now() / 1000);

  if (Math.abs(nowSeconds - timestamp) > MAX_TIMESTAMP_AGE_SECONDS) {
    return false;
  }

  const base = `v0:${input.timestamp}:${input.body}`;
  const expected = `v0=${createHmac("sha256", signingSecret)
    .update(base)
    .digest("hex")}`;
  const receivedBuffer = Buffer.from(input.signature);
  const expectedBuffer = Buffer.from(expected);

  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}
