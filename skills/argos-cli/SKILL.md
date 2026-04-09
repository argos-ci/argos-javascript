---
name: argos-cli
description: >
  Operate the Argos visual regression platform from the terminal — fetch build
  metadata, inspect snapshot diffs, upload screenshots, and manage CI builds
  via the `argos` CLI. Use when the user wants to run Argos commands in the
  shell, scripts, or CI/CD pipelines.
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

- Supply `--token` or set `ARGOS_TOKEN`. The CLI exits with code 1 if no token is found.
- Exit `0` = success, `1` = error. All errors go to stderr: `Error: <message>`
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

## Build Status Reference

| Status             | Terminal? | Meaning                             |
| ------------------ | --------- | ----------------------------------- |
| `no-changes`       | ✅        | All snapshots identical to baseline |
| `accepted`         | ✅        | All changes approved                |
| `rejected`         | ✅        | Changes explicitly rejected         |
| `changes-detected` | ✅        | Diffs found, awaiting decision      |
| `error`            | ✅        | Build processing failed             |
| `aborted`          | ✅        | Build was cancelled                 |
| `expired`          | ✅        | Build expired before completion     |
| `pending`          | ⏳        | Waiting for screenshots to arrive   |
| `progress`         | ⏳        | Screenshots are being compared      |

Only `no-changes` and `accepted` are all-clear terminal states. For review
decision-making, keep the PR-review triage logic in the dedicated Argos review
skill rather than here.

## Snapshot Inspection

Use the CLI to fetch the build and the raw diffs that need attention:

```bash
argos build get <buildReference> --json
argos build snapshots <buildReference> --needs-review --json
```

This skill is the command-and-output reference for those operations. If you need
the full "review an Argos build as part of a PR review" workflow, keep that in
the dedicated public Argos review skill rather than here.

---

## Common Patterns

**Upload screenshots in CI:**

```bash
argos upload ./screenshots --token $ARGOS_TOKEN
```

**Parallel builds:**

```bash
argos upload ./screenshots --parallel-nonce $CI_PIPELINE_ID --parallel-index $CI_NODE_INDEX --parallel-total $CI_NODE_TOTAL
argos finalize --parallel-nonce $CI_PIPELINE_ID
```

---

## When to Load References

- **Fetching build data or reviewing snapshots** → [references/build.md](references/build.md)
- **Uploading screenshots or finalizing parallel builds** → [references/upload.md](references/upload.md)
- **Skipping a build** → [references/skip.md](references/skip.md)
