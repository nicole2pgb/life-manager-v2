import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));

const getCurrentUser = vi.fn();
vi.mock("./session", () => ({ getCurrentUser: () => getCurrentUser() }));

import { requireUser } from "./require-user";

beforeEach(() => getCurrentUser.mockReset());

describe("requireUser", () => {
  it("returns the signed-in user", async () => {
    const user = { id: 3, name: "Nicole", email: "n@example.com" };
    getCurrentUser.mockResolvedValue(user);
    expect(await requireUser()).toEqual(user);
  });
  it("redirects to /login without a valid session", async () => {
    getCurrentUser.mockResolvedValue(null);
    await expect(requireUser()).rejects.toThrow("REDIRECT:/login");
  });
});
