---
name: argos-cli
description: >
  Operate Argos visual testing from the terminal with the `argos` CLI — inspect
  builds and snapshot diffs, submit reviews, post comments, inspect a test's
  flakiness and its recurring changes, ignore flaky test changes, fetch
  analytics, upload screenshots, and manage CI builds. Use
  whenever running `argos` commands or working with Argos builds, snapshots,
  flakiness, or visual-regression reviews from a shell, script, or CI pipeline.
  Load before running `argos` — it covers the token model and JSON output
  contract that prevent silent failures.
license: MIT
metadata:
  author: argos-ci
  homepage: https://argos-ci.com
  source: https://github.com/argos-ci/argos-javascript
argument-hint: Needs a token (ARGOS_TOKEN, --token, or `argos login`); add `--project owner/project` for build-number refs on review/comment commands, for every `change` command, and for `test` commands unless the token is a project token.
---

# Argos CLI

Run `argos <command> --help` for the exact flags of any command. This skill
covers only what `--help` can't: the token model, the output contract, and the
command map.

## Output contract (agents)

- Pass `--json` whenever you parse stdout; commands print human-readable text
  otherwise.
- Errors go to **stderr** as `Error: <message>`. Exit `0` = success, `1` = failure.
- Never print token values.

## Authentication

A `<buildReference>` is a build number (e.g. `72652`) or a full build URL. With a
number, add `--project owner/project`; a URL already contains it. A `<changeId>`
is not a build ref: it comes from a diff's `change.id` and does **not** carry the
account, so every `change` command needs `--project owner/project` (or
`ARGOS_PROJECT`). A `<testId>` comes from a diff's `test.id` and carries the
project name but not the account, so `test` commands need the same
`--project`/`ARGOS_PROJECT` — except with a project token, which already
identifies its own project.

Two token types — pick by command:

| Commands                                                                             | Token                       | Resolution order                            |
| ------------------------------------------------------------------------------------ | --------------------------- | ------------------------------------------- |
| `build get`, `build snapshots`, `test get`, `test changes`                           | Project token               | `--token` › `ARGOS_TOKEN`                   |
| `review *`, `comment *`, `test comment *`, `change *`, `analytics`, `create-project` | Personal access token (PAT) | `--token` › `ARGOS_TOKEN` › `argos login`   |
| `upload`, `finalize`, `skip`, `deploy`                                               | CI / project token          | `--token` › `ARGOS_TOKEN` (or tokenless CI) |

Project tokens read build data but **cannot** review, comment, or ignore
changes — those need a PAT. If no suitable token is available, ask the user. For
these actions, if no PAT exists, report the conclusion and evidence instead of
acting. `argos login` is for interactive humans, not CI.

## Commands

- **Inspect** — `build get <ref>` · `build snapshots <ref> [--needs-review] [--metrics-period 24h|3d|7d|30d|90d]`
- **Review** — `review list <ref>` · `review create <ref> --event <approve|reject|comment> [--body <md>]` · `review dismiss <ref> <reviewId>`
- **Comment** — `comment list <ref>` · `comment create <ref> --body <md> [--reply-to <id>] [--diff <id>] [--draft]` · `comment get|edit|delete|resolve|unresolve|subscribe|unsubscribe <ref> <id>` · `comment react|unreact <ref> <id> <emoji>`
- **Flakiness** — `test get <testId>` · `test changes <testId> [--ignored true|false] [--metrics-period …]` · `change ignore <changeId> --project owner/project` · `change unignore <changeId> --project owner/project`
- **Test comments** — `test comment list|create <testId>` · `test comment get|edit|delete|resolve|unresolve|subscribe|unsubscribe <testId> <id>` · `test comment react|unreact <testId> <id> <emoji>`
- **Account** — `analytics --account <slug>` · `create-project <name> --account <slug>` · `whoami`
- **CI** — `upload <dir>` · `finalize` · `skip` · `deploy <dir>`
- **Auth** — `login` · `logout`

`build snapshots --json` enriches each diff with `test.metrics` (flakiness:
`stability`, `consistency`, `flakiness`, all 0–1) and, on a change, `change`
(`id`, `ignored`, `occurrences`). High `occurrences` or `flakiness` flags a
change worth ignoring; pass its `change.id` to `change ignore`.

## Common flows

Review a build (inspect with a project token, decide with a PAT):

```bash
ARGOS_TOKEN=<project-token> argos build snapshots <ref> --needs-review --json
argos review create <ref> --token <pat> --event approve --json
# regression: argos review create <ref> --token <pat> --event reject --body "..."
```

Silence a flaky change (inspect with a project token, ignore with a PAT).
Ignored changes stop requiring review and are auto-approved on future builds:

```bash
ARGOS_TOKEN=<project-token> argos build snapshots <ref> --json   # read each diff's change.id + occurrences
argos change ignore <changeId> --token <pat> --project owner/project
# revert: argos change unignore <changeId> --token <pat> --project owner/project
```

Diagnose a flaky test before deciding whether to fix it or ignore it. `test get`
reports how flaky it is; `test changes` lists the distinct changes most-frequent
first, each with the diff, baseline and head image URLs to look at:

```bash
ARGOS_TOKEN=<project-token> argos test get <testId> --json          # flakiness, stability, consistency, series
ARGOS_TOKEN=<project-token> argos test changes <testId> --json      # occurrences + diff/base/head URLs per change
# a change with occurrences > 1 that nothing in the UI explains is flaky:
argos change ignore <changeId> --token <pat> --project owner/project
```

Upload screenshots in CI:

```bash
argos upload ./screenshots --token $ARGOS_TOKEN
```

Parallel builds:

```bash
argos upload ./screenshots --parallel-nonce $ID --parallel-index $i --parallel-total $n
argos finalize --parallel-nonce $ID
```
