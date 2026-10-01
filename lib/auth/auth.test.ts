import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { hashPassword, verifyPassword } from "./password";
import { generateToken, hashToken } from "./token";
import { normalizeEmail, validatePassword, validateRegistration } from "./validation";

const valid = {
  name: "Nicole",
  email: "Nicole@Example.com",
  password: "correct horse",
  confirmPassword: "correct horse",
};

describe("validateRegistration", () => {
  it("accepts valid input", () => {
    expect(validateRegistration(valid)).toEqual({});
  });
  it("rejects a blank name", () => {
    expect(validateRegistration({ ...valid, name: "   " }).name).toBeDefined();
  });
  it("rejects bad emails", () => {
    for (const email of ["", "nope", "a@b", "a b@c.de"]) {
      expect(validateRegistration({ ...valid, email }).email).toBeDefined();
    }
  });
  it("rejects mismatched confirmation", () => {
    const errors = validateRegistration({ ...valid, confirmPassword: "different pw" });
    expect(errors.confirmPassword).toBeDefined();
    expect(errors.password).toBeUndefined();
  });
  it("normalizes email", () => {
    expect(normalizeEmail("  Nicole@Example.COM ")).toBe("nicole@example.com");
  });
});

describe("validatePassword (UTF-8 bytes)", () => {
  it("rejects 7 bytes, accepts 8 and 72, rejects 73", () => {
    expect(validatePassword("a".repeat(7))).toBeDefined();
    expect(validatePassword("a".repeat(8))).toBeUndefined();
    expect(validatePassword("a".repeat(72))).toBeUndefined();
    expect(validatePassword("a".repeat(73))).toBeDefined();
  });
  it("counts bytes, not characters", () => {
    // 30 characters x 3 bytes = 90 bytes
    expect(validatePassword("€".repeat(30))).toBeDefined();
    // 24 characters x 3 bytes = exactly 72 bytes
    expect(validatePassword("€".repeat(24))).toBeUndefined();
    // 4 characters x 2 bytes = 8 bytes
    expect(validatePassword("éééé")).toBeUndefined();
  });
});

describe("password hashing", () => {
  it("stores a bcrypt hash, not the password, and verifies it", async () => {
    const hash = await hashPassword("correct horse");
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
    expect(hash).not.toContain("correct horse");
    expect(await verifyPassword("correct horse", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
  it("produces different hashes for the same password", async () => {
    expect(await hashPassword("same password")).not.toBe(await hashPassword("same password"));
  });
});

describe("session tokens", () => {
  it("generates unique 32-byte base64url tokens", () => {
    const a = generateToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(generateToken()).not.toBe(a);
  });
  it("hashes to 64 hex chars and never equals the token", () => {
    const token = generateToken();
    const hash = hashToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toBe(token);
    expect(hashToken(token)).toBe(hash);
  });
});
