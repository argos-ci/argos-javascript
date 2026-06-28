---
name: argos-cli
description: >
  Operate Argos visual testing from the terminal with the `argos` CLI — inspect
  builds and snapshot diffs, submit reviews, post comments, upload screenshots,
  and manage CI builds. Use whenever running `argos` commands or working with
  Argos builds, snapshots, or visual-regression reviews from a shell, script, or
  CI pipeline. Load before running `argos` — it covers the token model and JSON
  output contract that prevent silent failures.
license: MIT
metadata:
  author: argos-ci
  homepage: https://argos-ci.com
  source: https://github.com/argos-ci/argos-javascript
argument-hint: Needs a token (ARGOS_TOKEN, --token, or `argos login`); add `--project owner/project` for build-number refs on review/comment commands.
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
number, add `--project owner/project`; a URL already contains it.

Two token types — pick by command:

| Commands                              | Token                            | Resolution order                       |
| ------------------------------------- | -------------------------------- | -------------------------------------- |
| `build get`, `build snapshots`        | Project token                    | `--token` › `ARGOS_TOKEN`              |
| `review *`, `comment *`               | Personal access token (PAT)      | `--token` › `ARGOS_TOKEN` › `argos login` |
| `upload`, `finalize`, `skip`, `deploy`| CI / project token               | `--token` › `ARGOS_TOKEN` (or tokenless CI) |

Project tokens read build data but **cannot** review or comment — those need a
PAT. If no suitable token is available, ask the user. For review/comment, if no
PAT exists, report the conclusion and evidence instead of acting. `argos login`
is for interactive humans, not CI.

## Commands

- **Inspect** — `build get <ref>` · `build snapshots <ref> [--needs-review]`
- **Review** — `review list <ref>` · `review create <ref> --event <approve|reject|comment> [--body <md>]` · `review dismiss <ref> <reviewId>`
- **Comment** — `comment list <ref>` · `comment create <ref> --body <md> [--reply-to <id>] [--diff <id>] [--draft]` · `comment get|edit|delete|resolve|unresolve|subscribe|unsubscribe <ref> <id>` · `comment react|unreact <ref> <id> <emoji>`
- **CI** — `upload <dir>` · `finalize` · `skip` · `deploy <dir>`
- **Auth** — `login` · `logout`

## Common flows

Review a build (inspect with a project token, decide with a PAT):

```bash
ARGOS_TOKEN=<project-token> argos build snapshots <ref> --needs-review --json
argos review create <ref> --token <pat> --event approve --json
# regression: argos review create <ref> --token <pat> --event reject --body "..."
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
