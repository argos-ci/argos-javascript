---
name: argos-pr-review
description: >
  Use Argos visual regression builds as one input to a complete pull request
  review. Use this skill when a PR includes an Argos build URL, an Argos status
  check, or a bot comment linking to an Argos build, and you need to determine
  whether the visual diffs match the developer's likely intent based on the PR
  context, code changes, and screenshots before approving the PR.
---

# Argos PR Review

Treat the Argos build as one input to the PR review, not as a separate task and
not as the sole source of truth.

## When To Use This Skill

- A PR includes an Argos build link.
- A PR has an Argos check with `changes-detected`.
- An Argos bot comment says screenshots are waiting for review.

## Review Principles

- Start from the PR context, not from the screenshots alone.
- Infer likely developer intent from the PR title, description, linked issue,
  branch name, commit messages, and code diff before judging the visual result.
- Use Argos to confirm whether the rendered outcome matches that intent.
- If the code suggests one intent and the screenshots show another result, treat
  that mismatch as an important review signal.
- Do not let a clean screenshot override a code-level concern, or let a strange
  screenshot override clear evidence that the change is intentional.

## Review Workflow

### 1. Inspect the PR context first

Before opening snapshot diffs, inspect:

- the PR title and description
- any linked issue or ticket context
- the branch name and commit messages when useful
- the code diff, especially the UI and test files related to the changed area

Form a working hypothesis for the intended user-facing change before relying on
the screenshots.

### 2. Resolve Argos authentication

Before running Argos CLI commands, separate build inspection access from review
submission access.

1. For build inspection, check whether `ARGOS_TOKEN` is already set in the
   environment or whether a token was provided with `--token`, without printing
   the token value.
2. If no CLI token is available, ask the user to provide `ARGOS_TOKEN` or a
   `--token` value. If the user does not provide one, stop before running Argos
   CLI commands.
3. For review submission, check whether a personal access token is stored in
   `~/.config/argos-ci/config.json` under the `token` field.
4. If no personal access token is available, do not post the review on the Argos
   build. Finish by giving the review conclusion and evidence to the user
   instead, because CLI access is not sufficient to create the review.

The Argos CLI needs a token to access build data. `argos build get` and
`argos build snapshots` require `ARGOS_TOKEN` or `--token`.

Do not print tokens in logs, command summaries, or review text.

### 3. Inspect the build status

Use the Argos CLI with the build URL or build number. Fetch metadata first:

```bash
ARGOS_TOKEN=<token> argos build get <buildReference> --json
# or
argos build get <buildReference> --token <token> --json
```

Use the build status to decide the next review step:

| Status             | Review meaning                              | Next step                                             |
| ------------------ | ------------------------------------------- | ----------------------------------------------------- |
| `accepted`         | Diffs already approved                      | No visual review needed                               |
| `no-changes`       | No visual diff against baseline             | No visual review needed                               |
| `pending`          | Build is not ready yet                      | Stop and report that the build cannot be reviewed yet |
| `progress`         | Comparison is still running                 | Stop and report that the build cannot be reviewed yet |
| `changes-detected` | Screenshots need a decision                 | Fetch snapshots and inspect them                      |
| `rejected`         | A prior decision already rejected the build | Do not approve without understanding why              |
| `error`            | Build processing failed                     | Do not approve until the failure is understood        |
| `aborted`          | Build did not complete normally             | Do not approve until the reason is understood         |
| `expired`          | Build was not completed in time             | Do not approve until a valid build exists             |

### 4. Fetch only snapshots that need review

```bash
ARGOS_TOKEN=<token> argos build snapshots <buildReference> --needs-review --json
# or
argos build snapshots <buildReference> --token <token> --needs-review --json
```

For each diff, inspect:

- the diff mask `url`
- the previous screenshot `base.url`
- the new screenshot `head.url`
- metadata in `head.metadata`

### 5. Compare screenshots against intended change

For each changed snapshot, ask:

- does the screenshot match the UI change implied by the PR and code diff?
- is the changed area the one you would expect from the files touched?
- does the visual result reveal a regression the code review alone would not catch?
- does the screenshot contradict the claimed intent in the PR description or
  linked ticket?

### 6. Decide whether the change is intentional, broken, or flaky

- Intentional change: the new screenshot matches the code change and the UI is stable.
- Regression: layout break, wrong state, missing content, wrong theme, clipped content, incorrect data, or an unexpected removed snapshot.
- Flaky capture: loading indicator, partially rendered content, animation frame, dynamic content drift, or the same transient state captured in multiple browsers.

### 7. Always check for flake signals

Pay special attention to:

- `head.metadata.test.retry > 0`
- `head.metadata.test.retries` only as context for how many retries the test is allowed to use
- a visible loader or spinner in the screenshot
- partially loaded data
- identical scores across browsers
- identical `head.url` values across browsers

If the page is clearly captured mid-load, report it as flaky even if the branch name sounds related to loading or data changes.

### 8. Submit or report the result

- Before submitting, briefly state the inferred PR intent, the snapshots
  reviewed, the approval or rejection evidence, and the exact conclusion.
- Only submit the Argos review if a personal access token is available from
  `~/.config/argos-ci/config.json` or another explicit personal-token source.
- If everything looks intentional, approve the build:
  `argos build review <buildReference> --token <personal-token> --conclusion approve --json`.
  For build-number references, add `--project owner/project`.
- If you find a regression, request changes:
  `argos build review <buildReference> --token <personal-token> --conclusion request-changes --json`.
  For build-number references, add `--project owner/project`.
- Do not use project tokens for review creation.
- If no personal access token is available, do not post the review on Argos.
  Give the user the conclusion, the evidence, and say that posting was skipped
  because the CLI does not have sufficient access.
- If blocked unexpectedly, report the exact command, the exact error, and
  whether the token was missing, unreadable, rejected, or insufficiently
  privileged.
- In the PR review, call out regressions with the Argos build URL, the affected snapshot names, and the mismatch between the intended change and the rendered result.
- If you find flakiness, explain the signal and recommend a stabilization fix before approval.
- When relevant, mention both the code evidence and the screenshot evidence in the same finding.

Use this format for flaky captures:

> `snapshot-name` looks flaky.
> Test: `test.title` in `test.location.file:test.location.line`
> Signal: loader visible / retry > 0 / identical head image across browsers / ...
> Fix: wait for the page to finish loading. If the SDK uses `waitForAriaBusy`, mark loading UI with `aria-busy="true"` so Argos waits for it to clear
> Review: `<snapshot url>`

## What To Inspect In Snapshot Data

For each snapshot diff, inspect:

- `name`: human-readable snapshot identifier
- `status`: usually `changed`, `added`, or `removed`
- `score`: rough diff magnitude
- `url`: diff mask / review overlay
- `base.url`: previous screenshot
- `head.url`: new screenshot
- `head.metadata.test`: test file, line, title, `retry`, `retries`
- `head.metadata.browser`: browser information

## Review Heuristics

### Expected changes

These are usually safe when they match the PR:

- intentional content updates
- deliberate theme or layout redesigns
- newly added screens
- removed screenshots that correspond to intentionally deleted pages or tests

### Regressions

Flag the review when you see:

- missing content
- wrong empty state
- unexpected loader
- broken layout or overlap
- text clipping
- wrong route or wrong page captured
- mismatched theme or styling
- removed snapshots without an intentional test removal

### Flaky captures

Treat the snapshot as likely flaky when you see:

- a spinner, skeleton, or loading state
- async content not yet rendered
- animation mid-transition
- dynamic values drifting between runs
- `retry > 0`
- identical `score` across multiple browsers
- identical `head.url` across multiple browsers

Identical `head.url` values across browsers are a particularly strong signal that both browsers captured the same transient broken state.
`retry` is the current retry count for this run. `retries` is only the configured
retry budget, so do not treat `retries > 0` alone as evidence of flakiness.

## Typical Fixes

- Loading UI visible:
  wait for settled content before capture; if the SDK uses `waitForAriaBusy`, add `aria-busy="true"` to the loading container so Argos waits for it to clear
- Test captures too early:
  wait for content that depends on the async data before calling the screenshot helper
- Dynamic values:
  freeze the data or mask the unstable element
- JS animation:
  stabilize or remove the animated element from the capture

## Suggested PR Review Wording

Use short, actionable language.

Flaky example:

```text
The Argos build shows a flaky capture rather than an intentional visual change.
The screenshot is taken before async data has loaded, so the page is captured in
an intermediate state (spinner visible / empty values / incomplete content).
Please wait for settled content before taking the screenshot, or mark the
loading UI with aria-busy="true" if your SDK is configured to wait for it.
```

Intent mismatch example:

```text
The code changes suggest the intent is to update X, but the Argos snapshots show
Y instead. This looks like an unintended visual regression rather than the
expected UI outcome of the PR.
```

## Tooling

- Use `argos build get` and `argos build snapshots --needs-review` to inspect
  the build before making a decision.
- Use `argos build review <buildReference> --conclusion approve` or
  `argos build review <buildReference> --conclusion request-changes` to create
  the Argos build review. Add `--project owner/project` when passing a build
  number instead of a full build URL.
- Use `--json` when parsing CLI output.
- Read the PR title, description, linked context, and code diff before relying on screenshots.
- Use the PR diff and test code to confirm whether the visual change matches the code.
- Load [references/baseline.md](references/baseline.md) when the review depends on baseline selection or orphan build semantics.
- Load [references/flaky-fixes.md](references/flaky-fixes.md) when you need concrete remediation examples for flaky captures.

## Authentication

For build inspection (`argos build get`, `argos build snapshots`):

1. `--token <token>` flag
2. `ARGOS_TOKEN` environment variable

These commands require an explicit token. If no CLI token is available, ask the
user to provide `ARGOS_TOKEN` or `--token`. If the user does not provide one,
stop before running Argos CLI commands.

Creating a review requires a personal access token. For review submission
(`argos build review`), check for a personal token in
`~/.config/argos-ci/config.json` under the `token` field. If no personal access
token is available, do not post the review on Argos; give the conclusion and
evidence to the user instead.

When `<buildReference>` is a build number (not a full URL), `--project owner/project` is also required to identify the Argos project.

If no CLI token is found for build inspection, the CLI will error. For agent
workflows, ask the user to provide `ARGOS_TOKEN` or `--token` before running
build inspection commands. For interactive human setup of review submission,
run `argos login` once to authenticate via browser:

```bash
argos login
# Opens browser → authorize → token saved automatically
```

> Note: `argos login` is only for interactive, human use (PR review workflows). CI commands like `upload`, `finalize`, and `skip` use `ARGOS_TOKEN`, `--token`, or tokenless CI auth — do not rely on `argos login` for those.
