# login

Detailed behavior for `argos login` and `argos logout`.

---

## login

Authenticate a local machine by opening the Argos web app in a browser and storing the returned token.

| Flag | Type | Required | Description                                  |
| ---- | ---- | -------- | -------------------------------------------- |
| None | -    | -        | The command is interactive and browser-based |

**Flow:**

1. Starts a local HTTP callback server on `127.0.0.1` using a random available port.
2. Opens `${ARGOS_APP_BASE_URL}/auth/cli?port=<port>&state=<state>&pkce=<codeChallenge>` in the system browser.
3. Waits for the browser callback at `/callback`.
4. Verifies the returned `state`.
5. Saves the returned token to `~/.config/argos-ci/config.json`.

If the browser does not open automatically, the CLI prints the login URL so it can be opened manually.

**Output:**

```text
Opening browser for authentication…
If the browser doesn't open, visit:
  https://app.argos-ci.com/auth/cli?port=<port>&state=<state>&pkce=<codeChallenge>

Logged in to Argos successfully.
```

The browser callback page shows either "Authorization successful" or "Authorization failed".

**Errors:**

- Callback server startup failure: `Error: Failed to start local callback server.`
- Browser callback failure or cancellation: `Error: Authorization failed or was cancelled.`
- State mismatch: `Error: State mismatch. Possible CSRF attack.`

**Notes:**

- The login command is designed for interactive, human use only. Do not use it in CI pipelines.
- The saved config file is written with mode `0600`.
- The stored token is used by `argos build review` when no `--token` flag or `ARGOS_TOKEN` env var is set.
- Do not use `argos login` as a CI auth strategy. CI upload/skip/finalize commands should use `ARGOS_TOKEN`, `--token`, or tokenless CI auth where supported.

---

## logout

Remove the locally stored Argos token.

| Flag | Type | Required | Description                              |
| ---- | ---- | -------- | ---------------------------------------- |
| None | -    | -        | Removes the token saved by `argos login` |

**Output when a token exists:**

```text
Logged out from Argos.
```

**Output when no token exists:**

```text
No token found. You are already logged out.
```
