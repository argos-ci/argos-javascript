# build

Detailed flag specifications for `argos build` commands.

---

## build get

Fetch build metadata. Use `--json` for machine-readable output.

**Argument:** `<buildReference>` — Build number (e.g. `72652`) or Argos build URL (e.g. `https://app.argos-ci.com/team/project/builds/72652`)

| Flag              | Type    | Required                | Description                                               |
| ----------------- | ------- | ----------------------- | --------------------------------------------------------- |
| `--token <token>` | string  | No (uses `ARGOS_TOKEN`) | Argos project token                                       |
| `--json`          | boolean | No                      | Emit machine-readable JSON instead of human-readable text |

**Default output:** Human-readable text summary.

Example:

```text
Build #72652
Status: changes-detected
Snapshots: total 42, changed 3, added 1, removed 0, unchanged 38
Conclusion: changes-detected
Branch: main
Commit: abc123
Base branch: main
Base commit: def456
URL: https://app.argos-ci.com/...
```

Use `--json` whenever another tool needs to parse stdout.

**`--json` output:** The full Build object from the OpenAPI spec:

```json
{
  "id": "<uuid>",
  "number": 72652,
  "head": { "sha": "<sha>", "branch": "main" },
  "base": { "sha": "<sha>", "branch": "main" },
  "status": "accepted" | "no-changes" | "rejected" | "changes-detected" | "expired" | "error" | "aborted" | "pending" | "progress",
  "conclusion": "no-changes" | "changes-detected" | null,
  "stats": { "total": 42, "changed": 3, "added": 1, "removed": 0, "unchanged": 38, "ignored": 0, "failure": 0, "retryFailure": 0 },
  "metadata": { "testReport": null },
  "url": "https://app.argos-ci.com/...",
  "notification": null
}
```

**Status values:**

- Terminal statuses: `accepted`, `no-changes`, `rejected`, `changes-detected`, `expired`, `error`, `aborted`
- Pending statuses: `pending`, `progress`

---

## build snapshots

Fetch snapshot diffs for a build. Use `--json` for machine-readable output.

**Argument:** `<buildReference>` — Build number or Argos build URL

| Flag              | Type    | Required                | Description                                               |
| ----------------- | ------- | ----------------------- | --------------------------------------------------------- |
| `--needs-review`  | boolean | No                      | Only include snapshot diffs that require review           |
| `--token <token>` | string  | No (uses `ARGOS_TOKEN`) | Argos project token                                       |
| `--json`          | boolean | No                      | Emit machine-readable JSON instead of human-readable text |

Use `--needs-review` to delegate review filtering to the API.

**Default output:** Human-readable snapshot list.

Example:

```text
Snapshots for build #72652
Count: 3
Summary: changed 2, added 1

homepage / desktop [changed]
  Review: https://app.argos-ci.com/.../<snapshot-id>
  Mask: https://cdn.argos-ci.com/...
  Base file: https://cdn.argos-ci.com/...
  Head file: https://cdn.argos-ci.com/...
  Score: 0.042
  Group: homepage
```

Use `--json` whenever another tool needs to parse stdout.

If `--needs-review` is passed, the API returns only diffs that need review.

**`--json` output:** Raw array of SnapshotDiff objects from the OpenAPI spec:

```json
[
  {
    "id": "<uuid>",
    "name": "homepage / desktop",
    "status": "changed" | "added" | "removed" | "unchanged" | "pending" | "failure" | "ignored" | "retryFailure",
    "score": 0.042,
    "group": "homepage",
    "parentName": null,
    "url": "https://cdn.argos-ci.com/...",
    "base": {
      "id": "<uuid>",
      "name": "homepage / desktop",
      "metadata": { ... },
      "width": 1280,
      "height": 800,
      "url": "https://cdn.argos-ci.com/...",
      "contentType": "image/png"
    },
    "head": { ... }
  }
]
```

**Notes:**

- `url` on the diff is the mask (visual diff overlay) — the most efficient signal for automated review.
- `base.url` / `head.url` are the snapshot file URLs (can be images or YAML for Aria snapshots).
- `score` ranges from `0` (identical) to `1` (completely different). `null` for added/removed snapshots.
- `base` is `null` for `added` snapshots; `head` is `null` for `removed` snapshots.
- Paginates automatically — all results are returned in a single call.

---

## build review

Create a review on a build. Use `--json` for machine-readable output.

**Argument:** `<buildReference>` — Build number or Argos build URL

| Flag                        | Type    | Required | Description                                                             |
| --------------------------- | ------- | -------- | ----------------------------------------------------------------------- |
| `--conclusion <conclusion>` | string  | Yes      | Overall review conclusion for the build: `approve` or `request-changes` |
| `--project <project>`       | string  | Cond.    | Project path (`owner/project`), required for build-number refs          |
| `--token <token>`           | string  | No       | Override token (must be a personal access token for review)             |
| `--json`                    | boolean | No       | Emit machine-readable JSON instead of human-readable text               |

Inspect the build first with `build get` and `build snapshots --needs-review`,
then submit the review decision.

Before running `build get` or `build snapshots`, ensure a CLI token is available
without printing its value. Check `ARGOS_TOKEN` first, or use an explicit
`--token <token>` value. If no CLI token is available, ask the user to provide
`ARGOS_TOKEN` or `--token`. If the user does not provide one, stop before
running Argos CLI commands.

Creating a review requires a personal access token. Check whether one is stored
in `~/.config/argos-ci/config.json` under the `token` field. If no personal
access token is available, do not post the review on Argos; give the conclusion
and evidence to the user instead, because CLI access is not sufficient to create
the review. Do not use project tokens for review creation. When
`<buildReference>` is a build number, `--project owner/project` is required. A
full build URL already contains the project reference.

**Default output:** Human-readable review summary.

Example:

```text
Review #review_123
State: approved
Build: #72652
```

**`--json` output:** Review object returned by the API:

```json
{
  "id": "<uuid>",
  "state": "approved"
}
```

`--conclusion request-changes` returns `"state": "rejected"`.
