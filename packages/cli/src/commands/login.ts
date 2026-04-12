import type { Command } from "commander";
import { createServer } from "node:http";
import { createHash, randomBytes } from "node:crypto";
import open from "open";
import { createClient } from "@argos-ci/api-client";
import { saveToken, removeToken, getStoredToken } from "../auth";

const APP_BASE_URL =
  process.env["ARGOS_APP_BASE_URL"] ?? "https://app.argos-ci.com/";

const API_BASE_URL =
  process.env["ARGOS_API_BASE_URL"] ?? "https://api.argos-ci.com/v2/";

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
  return `\u001B[${code}m${text}\u001B[0m`;
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
      const url = new URL(req.url ?? "/", "http://localhost");

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
        Location: new URL(LOGIN_CLI_SUCCESS_ROUTE, APP_BASE_URL).href,
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
      const codeVerifier = randomBytes(32).toString("base64url");
      const codeChallenge = createHash("sha256")
        .update(codeVerifier)
        .digest("base64url");

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

      const loginUrl = new URL("/auth/cli", APP_BASE_URL);
      loginUrl.searchParams.set("port", port.toString());
      loginUrl.searchParams.set("state", state);
      loginUrl.searchParams.set("pkce", codeChallenge);

      console.log("\nOpening browser for authentication…");
      console.log(`If the browser doesn't open, visit:\n  ${loginUrl.href}\n`);

      if (process.env["ARGOS_CLI_DISABLE_BROWSER"] !== "1") {
        await open(loginUrl.href).catch((err) => {
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

      const client = createClient({ baseUrl: API_BASE_URL });

      const { data, error } = await client.POST("/auth/cli/token", {
        body: {
          code: result.code,
          code_verifier: codeVerifier,
        },
      });

      if (error || !data?.token) {
        console.error(
          errorColor(
            "Error: Authentication failed. Please run `argos login` again.",
          ),
        );
        process.exit(1);
      }

      await saveToken(data.token);
      console.log(successColor("Logged in to Argos successfully."));
    });

  program
    .command("logout")
    .description("Log out from Argos")
    .action(async () => {
      const existing = await getStoredToken();
      if (!existing) {
        console.log("No token found. You are already logged out.");
        return;
      }
      await removeToken();
      console.log("Logged out from Argos.");
    });
}
