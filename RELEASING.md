# Releasing

Both releases go through the **Release** workflow
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

### Why the preid carries a timestamp

Lerna builds a canary version as:

```
${nextVersion}-${preid}.${refCount - 1}.sha-${sha}
```

where `nextVersion` comes from the package's last release tag, `refCount` is the
number of commits since that tag, and `sha` is the current commit. Every one of
those is a property of **the commit being released**, so with a fixed preid the
version is a pure function of the commit — and a second canary from the same
commit regenerates a version that is already on npm, which npm refuses to
overwrite:

```
403 You cannot publish over the previously published versions: 6.7.1-alpha.1.sha-4c8577c
```

That made a canary a one-shot per commit. It bites in two ordinary ways: cutting
a second canary to re-test something, and resuming a publish that half landed —
if one package fails partway through (a network blip, an expired OTP), re-running
now collides on the packages that already succeeded, so the run can never be
finished. The only way out was an empty commit.

So `--preid canary-$(date -u +%Y%m%d%H%M%S)` puts the release _time_ in the
version, which is the one thing that differs between two runs of the same commit:

```
6.7.1-canary-20260810193000.1.sha-4c8577c
6.7.1-canary-20260810200500.1.sha-4c8577c
```

The stamp is fixed-width and UTC, so the identifier compares as a string in
chronological order — each canary sorts above the last, and the `canary` dist-tag
always moves forward. Keep it if you touch that script.
