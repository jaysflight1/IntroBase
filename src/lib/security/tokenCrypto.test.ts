import { afterEach, describe, expect, it } from "vitest";

import { decryptToken, encryptToken } from "@/lib/security/tokenCrypto";

const originalKey = process.env.TOKEN_ENCRYPTION_KEY;

afterEach(() => {
  process.env.TOKEN_ENCRYPTION_KEY = originalKey;
});

describe("tokenCrypto", () => {
  it("encrypts and decrypts tokens without storing plaintext", () => {
    process.env.TOKEN_ENCRYPTION_KEY = "test-key-with-enough-length";

    const encrypted = encryptToken("refresh-token-123");

    expect(encrypted).not.toContain("refresh-token-123");
    expect(decryptToken(encrypted)).toBe("refresh-token-123");
  });

  it("requires an encryption key", () => {
    delete process.env.TOKEN_ENCRYPTION_KEY;

    expect(() => encryptToken("token")).toThrow("TOKEN_ENCRYPTION_KEY");
  });
});
