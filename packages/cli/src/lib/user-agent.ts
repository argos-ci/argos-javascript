import { determineAgent } from "@vercel/detect-agent";

/**
 * The `User-Agent` the CLI sends on every API request.
 *
 * Beyond the usual product token, it carries an `agent/<name>` token when a
 * coding agent is driving the CLI. That token is the only thing telling the API
 * apart a command a person typed from one an agent ran on their behalf — the
 * token signing the request is the same either way — and is what lets Argos
 * mark the resulting comment as agent-made.
 */

/** Product token of the CLI itself, e.g. `argos-cli/6.7.0`. */
const PRODUCT = "argos-cli";

/**
 * Longest agent name we forward. `AI_AGENT` is free-form, so a caller could put
 * anything in it; the API only needs enough to recognize the agent.
 */
const MAX_AGENT_LENGTH = 64;

/**
 * Reduce an agent name to a `token` as the HTTP grammar defines it (RFC 9110
 * §5.6.2), lowercased.
 *
 * `@vercel/detect-agent` returns the `AI_AGENT` environment variable verbatim
 * when it is set, so the value is user input: anything outside the allowed set —
 * spaces, and control characters that would otherwise let it inject a header —
 * becomes a hyphen. Returns `null` when nothing usable is left.
 */
function sanitizeAgentName(name: string): string | null {
  const sanitized = name
    .trim()
    .toLowerCase()
    .slice(0, MAX_AGENT_LENGTH)
    .replaceAll(/[^a-z0-9.@_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return sanitized || null;
}

/**
 * Format the `User-Agent` value, e.g.
 * `argos-cli/6.7.0 node/22.11.0 agent/claude`.
 */
export function formatUserAgent(input: {
  version: string;
  agent?: string | null | undefined;
}): string {
  const tokens = [
    `${PRODUCT}/${input.version}`,
    `node/${process.versions.node}`,
  ];
  const agent = input.agent ? sanitizeAgentName(input.agent) : null;
  if (agent) {
    tokens.push(`agent/${agent}`);
  }
  return tokens.join(" ");
}

let userAgent: string | undefined;

/**
 * Detect the agent driving the CLI and build the `User-Agent` from it, once per
 * process. Called at startup, before any command runs.
 */
export async function initUserAgent(version: string): Promise<void> {
  const { agent } = await determineAgent();
  userAgent = formatUserAgent({ version, agent: agent?.name });
}

/**
 * The `User-Agent` for API requests, `undefined` until {@link initUserAgent} has
 * run — the API client then falls back to the runtime's own default rather than
 * claiming a version we do not know.
 */
export function getUserAgent(): string | undefined {
  return userAgent;
}
