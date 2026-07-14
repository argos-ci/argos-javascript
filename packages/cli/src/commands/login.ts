import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import type { Command } from "commander";
import open from "open";

import { saveOAuthTokens } from "../auth";
import {
  buildAuthorizeUrl,
  exchangeAuthorizationCode,
  generatePkce,
  getAppBaseUrl,
} from "../lib/oauth";

const LOGIN_CLI_SUCCESS_ROUTE = `/auth/cli/success`;

const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;

const CALLBACK_ERROR_HTML = `<!DOCTYPE html><html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Argos CLI</title>
  </head>
  <body>
    <p>Authorization failed. Please run <code>argos login</code> again.</p>
  </body>
</html>`;

type CallbackResult = { code: string; state: string };

function color(text: string, code: number) {
  if (!process.stderr.isTTY || process.env["NO_COLOR"]) {
    return text;
  }
  return `\x1b[${code}m${text}\x1b[0m`;
}

const successColor = (text: string) => color(text, 32);
const warningColor = (text: string) => color(text, 33);
const errorColor = (text: string) => color(text, 31);

function startCallbackServer(): Promise<{
  port: number;
  waitForCallback: () => Promise<CallbackResult>;
}> {
  return new Promise((resolve, reject) => {
    let resolveCallback: (result: CallbackResult) => void = () => {};
    let rejectCallback: (err: Error) => void = () => {};
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const callbackPromise = new Promise<CallbackResult>((res, rej) => {
      resolveCallback = res;
      rejectCallback = rej;
    });

    const closeServer = () => {
      if (timeout) {
        clearTimeout(timeout);
      }
      server.close();
      server.closeAllConnections();
    };

    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");

      if (url.pathname !== "/callback") {
        res.writeHead(404, { Connection: "close" });
        res.end();
        return;
      }

      const callbackError = url.searchParams.get("error");
      const callbackErrorDescription =
        url.searchParams.get("error_description");
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");

      if (callbackError) {
        const message = callbackErrorDescription ?? callbackError;
        res.writeHead(400, {
          "Content-Type": "text/html; charset=utf-8",
          Connection: "close",
        });
        res.end(CALLBACK_ERROR_HTML, () => {
          closeServer();
          rejectCallback(new Error(message));
        });
        return;
      }

      if (!code || !state) {
        res.writeHead(400, {
          "Content-Type": "text/html; charset=utf-8",
          Connection: "close",
        });
        res.end(CALLBACK_ERROR_HTML, () => {
          closeServer();
          rejectCallback(new Error("Missing code or state in callback"));
        });
        return;
      }

      res.writeHead(302, {
        Location: new URL(LOGIN_CLI_SUCCESS_ROUTE, getAppBaseUrl()).href,
        Connection: "close",
      });
      res.end(() => {
        closeServer();
        resolveCallback({ code, state });
      });
    });

    server.on("error", reject);

    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as { port: number };
      timeout = setTimeout(() => {
        closeServer();
        rejectCallback(new Error("Authentication timed out"));
      }, LOGIN_TIMEOUT_MS);
      timeout.unref();
      resolve({ port, waitForCallback: () => callbackPromise });
    });
  });
}

export function loginCommand(program: Command) {
  program
    .command("login")
    .description("Log in to Argos by opening your browser")
    .action(async () => {
      const state = randomBytes(16).toString("hex");
      const { codeVerifier, codeChallenge } = generatePkce();

      let port: number;
      let waitForCallback: () => Promise<CallbackResult>;

      try {
        ({ port, waitForCallback } = await startCallbackServer());
      } catch (err) {
        console.error(
          errorColor("Error: Failed to start local callback server."),
        );
        console.error(err);
        process.exit(1);
      }

      // Loopback redirect (RFC 8252): the registered `argos-cli` redirect URIs
      // match this host regardless of the ephemeral port.
      const redirectUri = `http://127.0.0.1:${port}/callback`;
      const authorizeUrl = buildAuthorizeUrl({
        redirectUri,
        state,
        codeChallenge,
      });

      console.log("\nOpening browser for authentication…");
      console.log(`If the browser doesn't open, visit:\n  ${authorizeUrl}\n`);

      if (process.env["ARGOS_CLI_DISABLE_BROWSER"] !== "1") {
        await open(authorizeUrl).catch((err) => {
          console.warn(
            warningColor(
              `Warning: Failed to open browser — ${err instanceof Error ? err.message : String(err)}`,
            ),
          );
          console.log(
            "Hint: Open the URL above manually to continue authentication.",
          );
        });
      }

      let result: CallbackResult;
      try {
        result = await waitForCallback();
      } catch (err) {
        console.error(
          errorColor(
            err instanceof Error
              ? `Error: ${err.message}. Please run \`argos login\` again.`
              : "Error: Authorization failed or was cancelled.",
          ),
        );
        process.exit(1);
      }

      if (result.state !== state) {
        console.error(
          errorColor("Error: State mismatch. Try logging in again."),
        );
        process.exit(1);
      }

      try {
        const tokens = await exchangeAuthorizationCode({
          code: result.code,
          codeVerifier,
          redirectUri,
        });
        await saveOAuthTokens(tokens);
      } catch (err) {
        console.error(
          errorColor(
            `Error: Authentication failed${
              err instanceof Error ? ` — ${err.message}` : ""
            }. Please run \`argos login\` again.`,
          ),
        );
        process.exit(1);
      }

      console.log(successColor("Logged in to Argos successfully."));
    });
}
