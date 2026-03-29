# builds

Detailed flag specifications for `argos builds` commands.

---

## builds get

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
Status: failure (changes-detected)
Snapshots: total 42, changed 3, added 1, removed 0, unchanged 38
Conclusion: rejected
Branch: main
Commit: abc123
Base branch: main
Base commit: def456
URL: https://app.argos-ci.com/...
```

Use `--json` whenever another tool needs to parse stdout.

**`--json` output:**

```json
{
  "id": "<uuid>",
  "number": 72652,
  "status": "success" | "failure" | "pending",
  "rawStatus": "accepted" | "no-changes" | "rejected" | "changes-detected" | "expired" | "error" | "aborted" | "pending" | "progress",
  "conclusion": "accepted" | "rejected" | null,
  "branch": "main",
  "commit": "<sha>",
  "baseBranch": "main",
  "baseCommit": "<sha>",
  "url": "https://app.argos-ci.com/...",
  "stats": { "total": 42, "changed": 3, "added": 1, "removed": 0, "unchanged": 38 },
  "testReport": null,
  "notification": null
}
```

**Status mapping:**

- `success` → `accepted` or `no-changes`
- `failure` → `rejected`, `changes-detected`, `expired`, `error`, or `aborted`
- `pending` → all other statuses

---

## builds snapshots

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
  Diff image: https://cdn.argos-ci.com/...
  Score: 0.042
  Group: homepage
```

Use `--json` whenever another tool needs to parse stdout.

If `--needs-review` is passed, the API returns only diffs that need review.

**`--json` output:** Array of snapshot diff objects:

```json
[
  {
    "id": "<uuid>",
    "name": "homepage / desktop",
    "status": "changed" | "added" | "removed" | "unchanged" | "pending" | "failure" | "ignored" | "retryFailure",
    "score": 0.042,
    "buildUrl": "https://app.argos-ci.com/...",
    "reviewUrl": "https://app.argos-ci.com/.../<snapshot-id>",
    "diffImageUrl": "https://cdn.argos-ci.com/...",
    "group": "homepage",
    "parentName": null,
    "base": {
      "id": "<uuid>",
      "name": "homepage / desktop",
      "imageUrl": "https://cdn.argos-ci.com/...",
      "contentType": "image/png",
      "width": 1280,
      "height": 800,
      "pageUrl": "https://example.com",
      "previewUrl": null,
      "viewport": { "width": 1280, "height": 800 },
      "browser": { "name": "chromium", "version": "120.0" },
      "automationLibrary": null,
      "sdk": null,
      "test": null,
      "story": null,
      "tags": null
    },
    "head": { ... }
  }
]
```

**Notes:**

- `diffImageUrl` is the visual diff overlay — the most efficient signal for automated review.
- `score` ranges from `0` (identical) to `1` (completely different). `null` for added/removed snapshots.
- `base` is `null` for `added` snapshots; `head` is `null` for `removed` snapshots.
- Paginates automatically — all results are returned in a single call.
