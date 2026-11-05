import { describe, expect, it } from "vitest";
import { CliError } from "./cli-error";
import {
  buildCreateTokenBody,
  parsePermissions,
  parseProjectNames,
  resolveExpireAt,
} from "./project-token";

const now = new Date("2026-11-05T12:00:00.000Z");

describe("parsePermissions", () => {
  it("parses a comma-separated list, trimmed and de-duplicated", () => {
    expect(
      parsePermissions("builds:write, deployments:write,builds:write"),
    ).toEqual(["builds:write", "deployments:write"]);
  });

  it("rejects an unknown permission, naming it", () => {
    expect(() => parsePermissions("builds:write,builds:read")).toThrow(
      CliError,
    );
    expect(() => parsePermissions("builds:write,builds:read")).toThrow(
      /Unknown permission: builds:read/,
    );
  });

  it("rejects an empty list", () => {
    expect(() => parsePermissions(" , ")).toThrow(/at least one/);
  });
});

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
      expect(() => resolveExpireAt({ expiresIn }, now)).toThrow(
        /--expires-in must be a positive number of days/,
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
      /--expire-at must be an ISO 8601 date/,
    );
  });

  it("rejects an --expire-at in the past", () => {
    expect(() => resolveExpireAt({ expireAt: "2026-01-01" }, now)).toThrow(
      /--expire-at must be in the future/,
    );
  });
});

describe("buildCreateTokenBody", () => {
  it("leaves permissions out so the API grants them all", () => {
    expect(buildCreateTokenBody({ name: "GitHub Actions" })).toEqual({
      name: "GitHub Actions",
      expireAt: null,
    });
  });

  it("passes the parsed permissions", () => {
    expect(
      buildCreateTokenBody({
        name: "Deploys",
        permissions: "deployments:write",
      }),
    ).toEqual({
      name: "Deploys",
      permissions: ["deployments:write"],
      expireAt: null,
    });
  });
});

describe("parseProjectNames", () => {
  it("parses a comma-separated list of names", () => {
    expect(parseProjectNames("web, docs,web")).toEqual(["web", "docs"]);
  });

  it("rejects owner/project paths, since the account comes from --account", () => {
    expect(() => parseProjectNames("acme/web")).toThrow(
      /without their account/,
    );
  });

  it("rejects an empty list", () => {
    expect(() => parseProjectNames(",")).toThrow(/at least one/);
  });
});
