import { Option } from "commander";
import type { ArgosAPISchema } from "@argos-ci/api-client";
import { fail } from "./cli-error";
import { DAY_MS, toIsoOrFail, toPositiveInteger } from "../options";

type ProjectTokenPermission =
  ArgosAPISchema.components["schemas"]["ProjectTokenPermission"];

/** Every permission a project token can hold, in the order Argos lists them. */
const PROJECT_TOKEN_PERMISSIONS = [
  "builds:write",
  "deployments:write",
  "projects:read",
  "media:read",
  "media:write",
] as const satisfies ProjectTokenPermission[];

export type CreateProjectTokenOptions = {
  name: string;
  permissions?: ProjectTokenPermission[] | undefined;
  expireAt?: string | undefined;
  expiresIn?: string | undefined;
};

export const tokenNameOption = new Option(
  "--name <name>",
  "Name to recognize the token by, e.g. the CI it is set in",
).makeOptionMandatory();

export const tokenPermissionsOption = new Option(
  "--permissions <permissions...>",
  "What the token can do. Defaults to all of it",
).choices(PROJECT_TOKEN_PERMISSIONS);

export const tokenExpireAtOption = new Option(
  "--expire-at <date>",
  "When the token stops working, as an ISO 8601 date (e.g. 2027-01-31 or 2027-01-31T12:00:00Z). Never, by default",
).conflicts("expiresIn");

export const tokenExpiresInOption = new Option(
  "--expires-in <days>",
  "Number of days the token works for, from now. Never expires, by default",
);

/**
 * Resolve `--expire-at` or `--expires-in` into the UTC ISO date the API takes,
 * or `null` for a token that never expires.
 */
export function resolveExpireAt(
  options: Pick<CreateProjectTokenOptions, "expireAt" | "expiresIn">,
  now: Date = new Date(),
): string | null {
  if (options.expiresIn !== undefined) {
    const days = toPositiveInteger(options.expiresIn, "expires-in");
    return new Date(now.getTime() + days * DAY_MS).toISOString();
  }
  if (options.expireAt !== undefined) {
    const expireAt = toIsoOrFail(options.expireAt, "expire-at");
    if (Date.parse(expireAt) <= now.getTime()) {
      fail(
        `--expire-at must be in the future, received "${options.expireAt}".`,
      );
    }
    return expireAt;
  }
  return null;
}

/** Build the body shared by both token creation endpoints. */
export function buildCreateTokenBody(options: CreateProjectTokenOptions) {
  return {
    name: options.name,
    permissions: options.permissions,
    expireAt: resolveExpireAt(options),
  };
}
