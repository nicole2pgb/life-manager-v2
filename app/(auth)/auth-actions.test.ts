import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));

const findUserByEmail = vi.fn();
const createUser = vi.fn();
vi.mock("@/db/users", () => ({
  findUserByEmail: (...args: unknown[]) => findUserByEmail(...args),
  createUser: (...args: unknown[]) => createUser(...args),
}));
const createSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({ createSession: (...args: unknown[]) => createSession(...args) }));
const verifyPassword = vi.fn();
const verifyAgainstDummy = vi.fn();
const hashPassword = vi.fn();
vi.mock("@/lib/auth/password", () => ({
  verifyPassword: (...args: unknown[]) => verifyPassword(...args),
  verifyAgainstDummy: (...args: unknown[]) => verifyAgainstDummy(...args),
  hashPassword: (...args: unknown[]) => hashPassword(...args),
}));

import { AUTH_UNEXPECTED_ERROR } from "@/lib/auth/errors";
import { loginAction } from "./login/actions";
import { registerAction } from "./register/actions";

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
};

const loginFields = { email: "Nicole@Example.com", password: "correct horse" };
const registerFields = {
  name: "Nicole",
  email: "nicole@example.com",
  password: "correct horse",
  confirmPassword: "correct horse",
};

// A driver-style error that carries the failed SQL and its parameters.
const dbError = () =>
  Object.assign(new Error("Failed query: insert into users ... params: nicole@example.com,$2a$12$secrethash"), {
    code: "ECONNREFUSED",
  });

const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

beforeEach(() => {
  for (const mock of [findUserByEmail, createUser, createSession, verifyPassword, verifyAgainstDummy, hashPassword]) {
    mock.mockReset();
  }
  hashPassword.mockResolvedValue("hashed");
  consoleError.mockClear();
});

function expectSafeLog(action: string) {
  expect(consoleError).toHaveBeenCalledTimes(1);
  const logged = JSON.stringify(consoleError.mock.calls[0]);
  expect(logged).toContain(action);
  expect(logged).toContain("ECONNREFUSED");
  for (const secret of ["secrethash", "nicole@example.com", "correct horse"]) {
    expect(logged).not.toContain(secret);
  }
}

describe("loginAction", () => {
  it("signs in and redirects on success", async () => {
    findUserByEmail.mockResolvedValue({ id: 5, passwordHash: "h" });
    verifyPassword.mockResolvedValue(true);
    await expect(loginAction(null, form(loginFields))).rejects.toThrow("REDIRECT:/dashboard");
    expect(findUserByEmail).toHaveBeenCalledWith("nicole@example.com");
    expect(createSession).toHaveBeenCalledWith(5);
  });

  it("gives the same generic error for a wrong password and an unknown email", async () => {
    findUserByEmail.mockResolvedValue({ id: 5, passwordHash: "h" });
    verifyPassword.mockResolvedValue(false);
    const wrongPassword = await loginAction(null, form(loginFields));
    findUserByEmail.mockResolvedValue(null);
    const unknownEmail = await loginAction(null, form(loginFields));
    expect(wrongPassword?.errors?.form).toBe("Invalid email or password.");
    expect(unknownEmail?.errors?.form).toBe("Invalid email or password.");
    expect(verifyAgainstDummy).toHaveBeenCalledTimes(1);
    expect(createSession).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("returns a friendly error and logs safely when the user lookup fails", async () => {
    findUserByEmail.mockRejectedValue(dbError());
    const state = await loginAction(null, form(loginFields));
    expect(state?.errors?.form).toBe(AUTH_UNEXPECTED_ERROR);
    expect(JSON.stringify(state)).not.toContain("secrethash");
    expect(state?.values).toEqual({ email: loginFields.email });
    expect(createSession).not.toHaveBeenCalled();
    expectSafeLog("loginAction");
  });

  it("returns a friendly error when creating the session fails", async () => {
    findUserByEmail.mockResolvedValue({ id: 5, passwordHash: "h" });
    verifyPassword.mockResolvedValue(true);
    createSession.mockRejectedValue(dbError());
    const state = await loginAction(null, form(loginFields));
    expect(state?.errors?.form).toBe(AUTH_UNEXPECTED_ERROR);
    expectSafeLog("loginAction");
  });
});

describe("registerAction", () => {
  it("creates the account, signs in and redirects on success", async () => {
    createUser.mockResolvedValue({ ok: true, id: 9 });
    await expect(registerAction(null, form(registerFields))).rejects.toThrow("REDIRECT:/dashboard");
    expect(createUser).toHaveBeenCalledWith({ name: "Nicole", email: "nicole@example.com", passwordHash: "hashed" });
    expect(createSession).toHaveBeenCalledWith(9);
  });

  it("reports a taken email as a field error, without logging", async () => {
    createUser.mockResolvedValue({ ok: false, reason: "email_taken" });
    const state = await registerAction(null, form(registerFields));
    expect(state?.errors?.email).toBe("This email is already in use.");
    expect(createSession).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("returns a friendly error and logs safely when creating the user fails", async () => {
    createUser.mockRejectedValue(dbError());
    const state = await registerAction(null, form(registerFields));
    expect(state?.errors?.form).toBe(AUTH_UNEXPECTED_ERROR);
    expect(JSON.stringify(state)).not.toContain("secrethash");
    expect(state?.values).toEqual({ name: "Nicole", email: "nicole@example.com" });
    expect(createSession).not.toHaveBeenCalled();
    expectSafeLog("registerAction");
  });

  it("returns a friendly error when hashing fails", async () => {
    hashPassword.mockRejectedValue(new Error("boom"));
    const state = await registerAction(null, form(registerFields));
    expect(state?.errors?.form).toBe(AUTH_UNEXPECTED_ERROR);
    expect(createUser).not.toHaveBeenCalled();
  });

  it("tells the user to sign in when the account exists but the session fails", async () => {
    createUser.mockResolvedValue({ ok: true, id: 9 });
    createSession.mockRejectedValue(dbError());
    const state = await registerAction(null, form(registerFields));
    expect(state?.errors?.form).toMatch(/account was created/i);
    expect(state?.errors?.form).toMatch(/sign in/i);
    expect(consoleError).toHaveBeenCalledTimes(1);
  });

  it("does not touch the database for invalid input", async () => {
    const state = await registerAction(null, form({ ...registerFields, email: "nope" }));
    expect(state?.errors?.email).toBeDefined();
    expect(createUser).not.toHaveBeenCalled();
  });
});
