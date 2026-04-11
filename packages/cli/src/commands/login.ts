import type { Command } from "commander";
import { createServer } from "node:http";
import { createHash, randomBytes } from "node:crypto";
import open from "open";
import { saveToken, removeToken, getStoredToken } from "../auth";

const APP_BASE_URL =
  process.env["ARGOS_APP_BASE_URL"] ?? "https://app.argos-ci.com";

const API_BASE_URL = process.env["ARGOS_API_BASE_URL"]
  ? new URL(process.env["ARGOS_API_BASE_URL"]).origin
  : "https://api.argos-ci.com/v2/";

const LOGIN_CLI_SUCCESS_ROUTE = `/auth/cli/success`;

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

function startCallbackServer(): Promise<{
  port: number;
  waitForCallback: () => Promise<CallbackResult>;
}> {
  return new Promise((resolve, reject) => {
    let resolveCallback: (result: CallbackResult) => void;
    let rejectCallback: (err: Error) => void;

    const callbackPromise = new Promise<CallbackResult>((res, rej) => {
      resolveCallback = res;
      rejectCallback = rej;
    });

    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://localhost");

      if (url.pathname !== "/callback") {
        res.writeHead(404);
        res.end();
        return;
      }

      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");

      if (!code || !state) {
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end(CALLBACK_ERROR_HTML);
        rejectCallback(new Error("Missing code or state in callback"));
        server.close();
        return;
      }

      res.writeHead(302, {
        Location: new URL(LOGIN_CLI_SUCCESS_ROUTE, APP_BASE_URL).href,
      });
      res.end();
      server.close();
      resolveCallback({ code, state });
    });

    server.on("error", reject);

    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as { port: number };
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
        console.error("Error: Failed to start local callback server.", err);
        process.exit(1);
      }

      const loginUrl = `${APP_BASE_URL}/auth/cli?port=${port}&state=${encodeURIComponent(state)}&pkce=${encodeURIComponent(codeChallenge)}`;

      console.log("Opening browser for authentication…");
      console.log(`If the browser doesn't open, visit:\n  ${loginUrl}\n`);

      open(loginUrl);

      let result: CallbackResult;
      try {
        result = await waitForCallback();
      } catch {
        console.error("Error: Authorization failed or was cancelled.");
        process.exit(1);
      }

      if (result.state !== state) {
        console.error("Error: State mismatch. Possible CSRF attack.");
        process.exit(1);
      }

      const exchangeUrl = `${API_BASE_URL}/auth/cli/token`;
      let token: string;
      try {
        const response = await fetch(exchangeUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: result.code,
            code_verifier: codeVerifier,
          }),
        });

        if (!response.ok) {
          console.error(
            `Error: Token exchange failed (HTTP ${response.status} from ${exchangeUrl}).`,
          );
          if (!process.env["ARGOS_API_BASE_URL"]) {
            console.error(
              "Hint: Set ARGOS_API_BASE_URL to target a local backend, e.g. ARGOS_API_BASE_URL=https://api.argos-ci.dev:4001/v2/",
            );
          }
          process.exit(1);
        }

        const data = (await response.json()) as { token: string };
        token = data.token;
      } catch (err) {
        console.error(
          `Error: Failed to reach ${exchangeUrl} — ${err instanceof Error ? err.message : String(err)}`,
        );
        if (!process.env["ARGOS_API_BASE_URL"]) {
          console.error(
            "Hint: Set ARGOS_API_BASE_URL to target a local backend, e.g. ARGOS_API_BASE_URL=https://api.argos-ci.dev:4001/v2/",
          );
        }
        process.exit(1);
      }

      await saveToken(token);
      console.log("Logged in to Argos successfully.");
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
