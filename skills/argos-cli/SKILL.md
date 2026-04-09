---
name: argos-cli
description: >
  Operate the Argos visual regression platform from the terminal — fetch build
  metadata, review snapshot diffs, upload screenshots, and manage CI builds via
  the `argos` CLI. Use when the user wants to run Argos commands in the shell,
  scripts, or CI/CD pipelines, or when reviewing visual regression builds.
  Always load this skill before running `argos` commands — it contains the flag
  contract and output shapes that prevent silent failures.
license: MIT
metadata:
  author: argos-ci
  homepage: https://argos-ci.com
  source: https://github.com/argos-ci/argos-javascript
argument-hint: Requires `ARGOS_TOKEN` or an explicit `--token` when running authenticated `argos` commands.
---

# Argos CLI

## Agent Protocol

The CLI writes errors to stderr. Some commands support both human-readable text
and JSON output.

**Rules for agents:**

- Supply `--token` or set `ARGOS_TOKEN`. The CLI exits with code 1 if no token is found.
- Exit `0` = success, `1` = error.
- All errors go to stderr: `Error: <message>`
- Use `--json` whenever stdout will be parsed by a script or agent.

## Authentication

Auth resolves: `--token` flag > `ARGOS_TOKEN` env var.

## Available Commands

| Command                 | What it does                     |
| ----------------------- | -------------------------------- |
| `build get <ref>`       | Fetch build metadata             |
| `build snapshots <ref>` | Fetch snapshot diffs for a build |
| `upload <dir>`          | Upload screenshots to Argos      |
| `finalize`              | Finalize a parallel build        |
| `skip`                  | Mark a build as skipped          |

Read the matching reference file for detailed flags and output shapes.

## Common Patterns

**Review a build (fetch metadata first, then diffs that need review):**

```bash
argos build get 72652
argos build snapshots 72652 --needs-review
argos build get 72652 --json
argos build snapshots 72652 --needs-review --json
```

**Upload screenshots in CI:**

```bash
argos upload ./screenshots --token $ARGOS_TOKEN
```

**Parallel builds:**

```bash
argos upload ./screenshots --parallel-nonce $CI_PIPELINE_ID --parallel-index $CI_NODE_INDEX --parallel-total $CI_NODE_TOTAL
argos finalize --parallel-nonce $CI_PIPELINE_ID
```

## When to Load References

- **Fetching build data or reviewing snapshots** → [references/build.md](references/build.md)
- **Uploading screenshots or finalizing parallel builds** → [references/upload.md](references/upload.md)
- **Skipping a build** → [references/skip.md](references/skip.md)
