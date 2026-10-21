# Releasing

Every release goes through the **Release** workflow
(`.github/workflows/release.yml`), dispatched by hand with a release type. It
runs the matching script below with `--yes`.

## Normal release

```bash
npm run release
```

Lerna reads the conventional commits since each package's last tag, bumps the
packages that changed, tags them, and creates the GitHub release.

## Canary release

```bash
npm run release-canary
```

Publishes every package — `--force-publish`, so the set stays consistent — under
the `canary` dist-tag, without committing or tagging anything.

The preid carries a UTC timestamp (`--preid canary-$(date -u +%Y%m%d%H%M%S)`).
Every other part of a canary version derives from the commit, so without it a
second canary from the same commit regenerates a version already on npm and the
publish fails. Keep it if you touch that script.

## Recovering a partial release

```bash
npm run release-from-package
```

A normal release tags, commits and creates the GitHub releases before it
publishes, so when a publish fails midway the failed packages are tagged but
not on npm, and the next normal release sees nothing to bump for them. This
publishes every package whose `package.json` version is missing from the
registry, and nothing else. In the workflow, it is the `from-package` release
type.
