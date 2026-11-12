import { describe, expect, it } from "vitest";
import { CliError } from "./cli-error";
import { buildCreateTokenBody, resolveExpireAt } from "./project-token";

const now = new Date("2026-11-05T12:00:00.000Z");

describe("resolveExpireAt", () => {
  it("never expires by default", () => {
    expect(resolveExpireAt({}, now)).toBeNull();
  });

  it("counts --expires-in days from now", () => {
    expect(resolveExpireAt({ expiresIn: "30" }, now)).toBe(
      "2026-12-05T12:00:00.000Z",
    );
  });

  it("rejects --expires-in values that are not a positive integer", () => {
    for (const expiresIn of ["0", "-1", "1.5", "soon"]) {
      expect(() => resolveExpireAt({ expiresIn }, now)).toThrow(CliError);
      expect(() => resolveExpireAt({ expiresIn }, now)).toThrow(
        /--expires-in must be a positive integer/,
      );
    }
  });

  it("normalizes --expire-at into the UTC ISO format the API takes", () => {
    expect(resolveExpireAt({ expireAt: "2027-01-31" }, now)).toBe(
      "2027-01-31T00:00:00.000Z",
    );
    expect(
      resolveExpireAt({ expireAt: "2027-01-31T14:00:00+02:00" }, now),
    ).toBe("2027-01-31T12:00:00.000Z");
  });

  it("rejects an invalid --expire-at", () => {
    expect(() => resolveExpireAt({ expireAt: "next week" }, now)).toThrow(
      /Invalid --expire-at value/,
    );
  });

  it("rejects an --expire-at in the past", () => {
    expect(() => resolveExpireAt({ expireAt: "2026-01-01" }, now)).toThrow(
      /--expire-at must be in the future/,
    );
  });
});

describe("buildCreateTokenBody", () => {
  it("leaves permissions out so the API applies its default", () => {
    const body = buildCreateTokenBody({ name: "GitHub Actions" });
    expect(JSON.parse(JSON.stringify(body))).not.toHaveProperty("permissions");
  });

  it("always sends expireAt, which the API requires, null for never", () => {
    const body = buildCreateTokenBody({ name: "GitHub Actions" });
    expect(JSON.parse(JSON.stringify(body))).toEqual({
      name: "GitHub Actions",
      expireAt: null,
    });
    expect(
      buildCreateTokenBody({ name: "GitHub Actions", expiresIn: "1" }),
    ).toHaveProperty("expireAt", expect.any(String));
  });

  it("passes the permissions", () => {
    expect(
      buildCreateTokenBody({
        name: "Deploys",
        permissions: ["deployments:write"],
      }),
    ).toEqual({
      name: "Deploys",
      permissions: ["deployments:write"],
      expireAt: null,
    });
  });
});
