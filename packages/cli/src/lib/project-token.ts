import { Option } from "commander";
import type { ArgosAPISchema } from "@argos-ci/api-client";
import { fail } from "./cli-error";

export type ProjectTokenPermission =
  ArgosAPISchema.components["schemas"]["ProjectTokenPermission"];

/** Every permission a project token can hold, in the order Argos lists them. */
export const PROJECT_TOKEN_PERMISSIONS = [
  "builds:write",
  "deployments:write",
  "projects:read",
  "media:read",
  "media:write",
] as const satisfies ProjectTokenPermission[];

const DAY_MS = 24 * 60 * 60 * 1000;

export type CreateProjectTokenOptions = {
  name: string;
  permissions?: string | undefined;
  expireAt?: string | undefined;
  expiresIn?: string | undefined;
};

export const tokenNameOption = new Option(
  "--name <name>",
  "Name to recognize the token by, e.g. the CI it is set in",
).makeOptionMandatory();

export const tokenPermissionsOption = new Option(
  "--permissions <permissions>",
  `What the token can do, comma-separated, among ${PROJECT_TOKEN_PERMISSIONS.join(", ")}. Defaults to all of them`,
);

export const tokenExpireAtOption = new Option(
  "--expire-at <date>",
  "When the token stops working, as an ISO 8601 date (e.g. 2027-01-31 or 2027-01-31T12:00:00Z). Never, by default",
).conflicts("expiresIn");

export const tokenExpiresInOption = new Option(
  "--expires-in <days>",
  "Number of days the token works for, from now. Never expires, by default",
).conflicts("expireAt");

/**
 * Parse a comma-separated `--permissions` value, refusing anything Argos would
 * not accept rather than letting the API answer for it.
 */
export function parsePermissions(value: string): ProjectTokenPermission[] {
  const permissions = [
    ...new Set(
      value
        .split(",")
        .map((permission) => permission.trim())
        .filter(Boolean),
    ),
  ];
  if (permissions.length === 0) {
    fail(
      `--permissions needs at least one of ${PROJECT_TOKEN_PERMISSIONS.join(", ")}.`,
    );
  }
  const unknown = permissions.filter(
    (permission) =>
      !(PROJECT_TOKEN_PERMISSIONS as readonly string[]).includes(permission),
  );
  if (unknown.length > 0) {
    fail(
      `Unknown permission: ${unknown.join(", ")}. Choose among ${PROJECT_TOKEN_PERMISSIONS.join(", ")}.`,
    );
  }
  return permissions as ProjectTokenPermission[];
}

/**
 * Resolve `--expire-at` or `--expires-in` into the ISO date the API takes, or
 * `null` for a token that never expires.
 */
export function resolveExpireAt(
  options: Pick<CreateProjectTokenOptions, "expireAt" | "expiresIn">,
  now: Date = new Date(),
): string | null {
  if (options.expiresIn !== undefined) {
    const days = Number(options.expiresIn);
    if (!Number.isInteger(days) || days < 1) {
      fail(
        `--expires-in must be a positive number of days, received "${options.expiresIn}".`,
      );
    }
    return new Date(now.getTime() + days * DAY_MS).toISOString();
  }
  if (options.expireAt !== undefined) {
    const date = new Date(options.expireAt);
    if (Number.isNaN(date.getTime())) {
      fail(
        `--expire-at must be an ISO 8601 date, received "${options.expireAt}".`,
      );
    }
    if (date.getTime() <= now.getTime()) {
      fail(
        `--expire-at must be in the future, received "${options.expireAt}".`,
      );
    }
    return date.toISOString();
  }
  return null;
}

/** Build the body shared by both token creation endpoints. */
export function buildCreateTokenBody(options: CreateProjectTokenOptions): {
  name: string;
  permissions?: ProjectTokenPermission[];
  expireAt: string | null;
} {
  return {
    name: options.name,
    ...(options.permissions !== undefined
      ? { permissions: parsePermissions(options.permissions) }
      : {}),
    expireAt: resolveExpireAt(options),
  };
}

/** Parse a comma-separated `--projects` value into project names. */
export function parseProjectNames(value: string): string[] {
  const names = [
    ...new Set(
      value
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean),
    ),
  ];
  if (names.length === 0) {
    fail("--projects needs at least one project name.");
  }
  const qualified = names.filter((name) => name.includes("/"));
  if (qualified.length > 0) {
    fail(
      `--projects takes project names without their account, received "${qualified.join(", ")}". The account comes from --account.`,
    );
  }
  return names;
}
