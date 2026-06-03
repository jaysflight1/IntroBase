import { describe, expect, it } from "vitest";

import { buildLoginPath, sanitizeNextPath } from "@/lib/auth/redirects";

describe("sanitizeNextPath", () => {
  it("allows relative app paths with query strings", () => {
    expect(sanitizeNextPath("/app/board?source=gmail")).toBe(
      "/app/board?source=gmail",
    );
  });

  it("falls back for external URLs", () => {
    expect(sanitizeNextPath("https://evil.example/app")).toBe(
      "/app/integrations",
    );
  });

  it("falls back for protocol-relative URLs", () => {
    expect(sanitizeNextPath("//evil.example/app")).toBe("/app/integrations");
  });
});

describe("buildLoginPath", () => {
  it("encodes the sanitized next path", () => {
    expect(buildLoginPath("/app/import?sample=1")).toBe(
      "/login?next=%2Fapp%2Fimport%3Fsample%3D1",
    );
  });
});
