---
name: argos-build-review
description: >
  Approve or reject an Argos visual regression build after
  inspecting its snapshot diffs. Use this skill when asked to review and decide
  on an Argos build — either a full build or specific diffs within it. Requires
  the user to be logged in via `argos login`.
---

# Argos Build Review

Inspect the snapshot diffs of an Argos build and submit an approve or reject
decision — optionally with per-diff granularity.

## When To Use This Skill

- The user asks you to approve or reject an Argos build.
- The user asks you to review the diffs in a build and decide whether they are
  acceptable.
- A CI gate is blocked on an Argos review decision.

## Prerequisites

This skill requires a **user access token** stored via `argos login`. Project tokens
cannot review builds. If the token is missing, prompt the user to run:

```bash
argos login
```

## Review Workflow

### 1. Fetch build metadata

```bash
argos build get <buildReference> --json
```

Check the build status before proceeding:

| Status             | Action                                                        |
| ------------------ | ------------------------------------------------------------- |
| `accepted`         | Already approved — nothing to do                              |
| `rejected`         | Already rejected — confirm with user before re-reviewing      |
| `no-changes`       | No visual diff — nothing to do                                |
| `pending`          | Not ready yet — wait and retry                                |
| `progress`         | Comparison running — wait and retry                           |
| `changes-detected` | Needs a decision — proceed to next step                       |
| `error`            | Build failed — do not approve until the failure is understood |
| `aborted`          | Build did not complete — do not approve without investigating |
| `expired`          | Build timed out — a new valid build is needed                 |

### 2. Fetch the snapshot diffs that need review

```bash
argos build snapshots <buildReference> --needs-review --json
```

For each diff, inspect:

- `name` — human-readable snapshot identifier
- `status` — `changed`, `added`, or `removed`
- `score` — diff magnitude (0 = identical, 1 = completely different)
- `url` — diff mask overlay image
- `base.url` — baseline screenshot (what it looked like before)
- `head.url` — new screenshot (what it looks like now)
- `head.metadata.test` — test title, file, `retry`, `retries`
- `head.metadata.browser` — browser name and version

**Load the images** at `base.url`, `head.url`, and `url` to perform a visual
inspection before deciding.

### 3. Classify each diff

For each diff ask:

- Is the change **intentional**? Does it match the described intent of the
  build or the surrounding context (branch name, commit message, PR)?
- Is the change a **regression**? Look for broken layouts, missing content,
  wrong state, clipped text, or unintended removals.
- Is the change **flaky**? Look for spinners, partially loaded content,
  animation frames, or `head.metadata.test.retry > 0`.

### 4. Decide the overall review state

- **Approve** if all diffs are intentional or otherwise acceptable.
- **Reject** if any diff is a regression that should not be merged.
- When flakiness is suspected, explain the signal and do not approve until the
  test is stabilized — unless the user explicitly confirms it is safe to approve.

### 5. Submit the review

**Approve the whole build (no per-diff breakdown):**

```bash
argos build review approve <buildReference>
```

**Reject the whole build:**

```bash
argos build review reject <buildReference>
```

**With per-diff decisions (mixed approve/reject):**

```bash
argos build review approve <buildReference> \
  --diff <diffId>=approved \
  --diff <diffId2>=rejected
```

The `--diff` flag can be repeated for as many diffs as needed.
The overall `approve`/`reject` verb sets the build-level decision;
individual `--diff` flags add granular diff-level decisions on top.

Use `--json` to get machine-readable output if needed:

```bash
argos build review approve <buildReference> --json
```

## Per-Diff Review Strategy

When diffs are heterogeneous (some intentional, some suspicious), prefer
submitting per-diff decisions so the review record is granular:

1. Collect all diff IDs from step 2.
2. Classify each diff.
3. Build the `--diff <id>=<state>` list.
4. Use `approve` as the overall verb if the majority are acceptable,
   `reject` if any regression warrants blocking the build.

## Reporting

After submitting, report:

- The overall decision (approved / rejected).
- For any rejected or flagged diffs: the diff name, the review URL
  (`<buildUrl>/<diffId>`), and the reason.
- For flaky captures: include the signal and a suggested fix.

## Flake Signals

Treat a diff as likely flaky when you see:

- A spinner, skeleton, or loading indicator in the screenshot.
- Async content that has not finished rendering.
- `head.metadata.test.retry > 0` (the test needed a retry to pass).
- Identical `score` or identical `head.url` across multiple browsers
  (both captured the same broken transient state).

## Authentication Note

The `--token` flag and `ARGOS_TOKEN` env var accept **project tokens** for most
commands, but **`argos build review` requires a user token** from `argos login`.
If you see a 401 error, remind the user to run `argos login`.
