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
argument-hint: Requires a token (`ARGOS_TOKEN`, `--token`, or `argos login`) and `--project owner/project` for build-number references.
---

# Argos CLI

## Agent Protocol

The CLI writes errors to stderr. Some commands support both human-readable text
and JSON output.

**Rules for agents:**

- Supply the token type required by the command. The CLI exits with code 1 if no token is found.
- Exit `0` = success, `1` = error.
- All errors go to stderr: `Error: <message>`
- Use `--json` whenever stdout will be parsed by a script or agent.

## Authentication

Auth for build read commands resolves: `--token` flag > `ARGOS_TOKEN` env var. Both are project tokens.

Creating a review requires a personal access token. For `build review`, auth resolves: `--token` flag > `ARGOS_TOKEN` env var > token stored by `argos login`.

When `<buildReference>` is a build number (not a full URL), `--project owner/project` is also required to identify the Argos project. A full build URL already contains the owner and project.

Auth for upload, skip, and finalize follows the CI/core auth path. Use `--token`, `ARGOS_TOKEN`, or tokenless CI auth where supported; do not rely on `argos login` for CI uploads.

## Available Commands

| Command                 | What it does                         |
| ----------------------- | ------------------------------------ |
| `login`                 | Store a local Argos API token        |
| `logout`                | Remove the stored local token        |
| `build get <ref>`       | Fetch build metadata                 |
| `build snapshots <ref>` | Fetch snapshot diffs for a build     |
| `build review <ref>`    | Create a review on a build |
| `upload <dir>`          | Upload screenshots to Argos          |
| `finalize`              | Finalize a parallel build            |
| `skip`                  | Mark a build as skipped              |

Read the matching reference file for detailed flags and output shapes.

## Common Patterns

**Log in locally for build review commands:**

```bash
argos login
argos build review 72652 --project argos-ci/argos-javascript --conclusion approve
```

**Review a build (fetch metadata first, then diffs that need review):**

```bash
argos build get 72652 --json
argos build snapshots 72652 --needs-review --json
argos build review 72652 --project argos-ci/argos-javascript --conclusion approve
```

Use `build review ... --conclusion request-changes` when the visual diffs reveal a regression. When passing a full build URL, `--project` is not needed.

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

- **Logging in or out locally** -> [references/login.md](references/login.md)
- **Fetching build data or reviewing snapshots** → [references/build.md](references/build.md)
- **Uploading screenshots or finalizing parallel builds** → [references/upload.md](references/upload.md)
- **Skipping a build** → [references/skip.md](references/skip.md)
