# skip

Detailed flag specifications for `argos skip`.

---

## skip

Mark a build as skipped (for example when no visual tests ran).

| Flag                  | Type   | Required                     | Description         |
| --------------------- | ------ | ---------------------------- | ------------------- |
| `--token <token>`     | string | No (uses `ARGOS_TOKEN`)      | Argos project token |
| `--build-name <name>` | string | No (uses `ARGOS_BUILD_NAME`) | Build name to skip  |

**Output:**

The CLI prints a success message with the created build URL:

```text
Build created: https://app.argos-ci.com/...
```

**Notes:**

- Auth resolves in this order: `--token`, then `ARGOS_TOKEN`.
- Use `--build-name` when the skipped build should be labeled explicitly in CI.
