# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.3.2](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/vitest@0.3.1...@argos-ci/vitest@0.3.2) (2026-07-23)


### Bug Fixes

* **vitest:** fail the run instead of exiting 0 when the upload fails ([ce16b7f](https://github.com/argos-ci/argos-javascript/commit/ce16b7f5f785a62365756bd20c77a9e42c20fa02))





## [0.3.1](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/vitest@0.3.0...@argos-ci/vitest@0.3.1) (2026-07-12)

**Note:** Version bump only for package @argos-ci/vitest





# [0.3.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/vitest@0.2.4...@argos-ci/vitest@0.3.0) (2026-07-11)


* feat(vitest)!: default output directory to `snapshots` ([b1d6162](https://github.com/argos-ci/argos-javascript/commit/b1d6162591769096a139ee7bafbc4fbf6dc63930))


### Features

* **vitest:** add automatic naming for screenshots and snapshots ([fe878d6](https://github.com/argos-ci/argos-javascript/commit/fe878d6d4096fae39cdbfc9ad0205e49e78ab348))
* **vitest:** attach test metadata to screenshots and snapshots ([720d3e5](https://github.com/argos-ci/argos-javascript/commit/720d3e5db7e4b80c3f003d4aad9c3300363bd508))
* **vitest:** auto-detect sharding for parallel builds (ARG-458) ([69db44d](https://github.com/argos-ci/argos-javascript/commit/69db44d1deb0b7292d71a9f6a4e4d13b2b34a08e))
* **vitest:** report `vitest` as the screenshot automation library ([05cf218](https://github.com/argos-ci/argos-javascript/commit/05cf2185e6d87212359df398b9cdd5d612d8df2b))
* **vitest:** scope auto names to the test file and cap filename length ([ab6ff2f](https://github.com/argos-ci/argos-javascript/commit/ab6ff2f7aab9e8cfdb2ff31c03864df2da1f01c8))


### BREAKING CHANGES

* `@argos-ci/vitest` now writes to `./snapshots` by default.
Pass `root: "./screenshots"` to the plugin (and `argosSnapshot`'s `root`
option) to keep the previous location.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
* **vitest:** `argosSnapshot(name, content, options)` is now
`argosSnapshot(content, { name, ...options })`.

Closes ARG-460

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>





## [0.2.4](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/vitest@0.2.3...@argos-ci/vitest@0.2.4) (2026-07-10)

**Note:** Version bump only for package @argos-ci/vitest





## [0.2.3](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/vitest@0.2.2...@argos-ci/vitest@0.2.3) (2026-07-09)

**Note:** Version bump only for package @argos-ci/vitest





## [0.2.2](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/vitest@0.2.1...@argos-ci/vitest@0.2.2) (2026-07-09)

**Note:** Version bump only for package @argos-ci/vitest





## [0.2.1](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/vitest@0.2.0...@argos-ci/vitest@0.2.1) (2026-07-09)

**Note:** Version bump only for package @argos-ci/vitest





# 0.2.0 (2026-07-09)


### Bug Fixes

* **vitest:** upload ARIA snapshots to Argos ([8b4c563](https://github.com/argos-ci/argos-javascript/commit/8b4c5637719574b8f14df1c8fc941e7e77799ed4))


### Features

* **vitest:** add argosSnapshot for value snapshots anywhere ([0a6201f](https://github.com/argos-ci/argos-javascript/commit/0a6201f7e3ad8f26045c50130978a1aacc8fe6c6))
* **vitest:** add standalone @argos-ci/vitest package ([e27f7d2](https://github.com/argos-ci/argos-javascript/commit/e27f7d2823ea8e60f50ae54977434cb5aa93448a))
