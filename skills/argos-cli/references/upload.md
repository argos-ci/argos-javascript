# upload

Detailed flag specifications for `argos upload`.

---

## upload

Upload screenshots from a directory to Argos.

**Argument:** `<dir>` — Directory containing screenshots

| Flag                        | Type     | Required                | Description                            |
| --------------------------- | -------- | ----------------------- | -------------------------------------- |
| `--token <token>`           | string   | No (uses `ARGOS_TOKEN`) | Argos project token                    |
| `--build-name <name>`       | string   | No                      | Custom build name                      |
| `--parallel-nonce <nonce>`  | string   | No                      | Unique identifier for parallel builds  |
| `--parallel-index <n>`      | number   | No                      | Index of this parallel shard (1-based) |
| `--parallel-total <n>`      | number   | No                      | Total number of parallel shards        |
| `--ignore <patterns>`       | string[] | No                      | Glob patterns to exclude               |
| `--branch <name>`           | string   | No                      | Override branch name                   |
| `--commit <sha>`            | string   | No                      | Override commit SHA                    |
| `--mode <mode>`             | string   | No                      | `ci` (default) or `monitoring`         |
| `--threshold <n>`           | number   | No                      | Diff score threshold (0–1)             |
| `--reference-branch <name>` | string   | No                      | Branch to compare against              |

**Parallel builds:**

Use `--parallel-nonce`, `--parallel-index`, and `--parallel-total` to split uploads across multiple CI jobs. Run `argos finalize --parallel-nonce <nonce>` after all shards complete.

```bash
# Each shard
argos upload ./screenshots \
  --parallel-nonce $CI_PIPELINE_ID \
  --parallel-index $CI_NODE_INDEX \
  --parallel-total $CI_NODE_TOTAL

# After all shards
argos finalize --parallel-nonce $CI_PIPELINE_ID
```

---

## finalize

Finalize a parallel build after all shards have uploaded.

| Flag                       | Type   | Required                         | Description                          |
| -------------------------- | ------ | -------------------------------- | ------------------------------------ |
| `--token <token>`          | string | No (uses `ARGOS_TOKEN`)          | Argos project token                  |
| `--parallel-nonce <nonce>` | string | No (uses `ARGOS_PARALLEL_NONCE`) | Nonce identifying the parallel build |
