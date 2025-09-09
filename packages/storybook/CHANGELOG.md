# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [5.0.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@4.0.10...@argos-ci/storybook@5.0.0) (2025-09-09)


### Bug Fixes

* **storybook:** fix error while importing `@argos-ci/storybook/vitest` ([ec2a0a8](https://github.com/argos-ci/argos-javascript/commit/ec2a0a888fdd24c09ca82e4a7d14f3d525b5466d))


### Features

* **storybook:** improve addons and manual screenshots ([46cfd9f](https://github.com/argos-ci/argos-javascript/commit/46cfd9f3346e57972a8d27c805067b7bd167da78))


### BREAKING CHANGES

* **storybook:** - Remove `applyGlobals` function (now not needed)
- Replay the story before taking the screenshot
- Manual screenshots are now taken for each defined mode
- Story is now rendered in a `storybook-root` container





## [4.0.10](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@4.0.9...@argos-ci/storybook@4.0.10) (2025-08-27)

**Note:** Version bump only for package @argos-ci/storybook





## [4.0.9](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@4.0.8...@argos-ci/storybook@4.0.9) (2025-08-26)

**Note:** Version bump only for package @argos-ci/storybook





## [4.0.8](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@4.0.7...@argos-ci/storybook@4.0.8) (2025-08-22)

**Note:** Version bump only for package @argos-ci/storybook





## [4.0.7](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@4.0.6...@argos-ci/storybook@4.0.7) (2025-08-16)

**Note:** Version bump only for package @argos-ci/storybook





## [4.0.6](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@4.0.5...@argos-ci/storybook@4.0.6) (2025-08-14)


### Bug Fixes

* **storybook:** avoid changing viewport if not necessary ([0cf7483](https://github.com/argos-ci/argos-javascript/commit/0cf7483d486f478fbc36e4554b6e0c1138f1d36c))





## [4.0.5](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@4.0.4...@argos-ci/storybook@4.0.5) (2025-08-13)


### Bug Fixes

* **storybook:** fix timeout and instability with test runner ([0437d07](https://github.com/argos-ci/argos-javascript/commit/0437d072e357c8e64c0842f50bfb6390be241a47))





## [4.0.4](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@4.0.3...@argos-ci/storybook@4.0.4) (2025-08-13)

**Note:** Version bump only for package @argos-ci/storybook





## [4.0.3](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@4.0.2...@argos-ci/storybook@4.0.3) (2025-08-11)

**Note:** Version bump only for package @argos-ci/storybook





## [4.0.2](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@4.0.1...@argos-ci/storybook@4.0.2) (2025-08-07)

**Note:** Version bump only for package @argos-ci/storybook





## [4.0.1](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@4.0.0...@argos-ci/storybook@4.0.1) (2025-08-05)

**Note:** Version bump only for package @argos-ci/storybook





# [4.0.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@3.0.2...@argos-ci/storybook@4.0.0) (2025-08-02)


### Features

* require Node.js > 20 ([c894a82](https://github.com/argos-ci/argos-javascript/commit/c894a82c1b51acfced9892b32b31ebbf699282ca))


### BREAKING CHANGES

* Node.js v20 or higher is now required





## [3.0.2](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@3.0.1...@argos-ci/storybook@3.0.2) (2025-08-02)


### Bug Fixes

* **storybook:** fix `fitToContent` behaviour ([a44465a](https://github.com/argos-ci/argos-javascript/commit/a44465a1d4c02a58db8608cafbfd65348c2f34db))





## [3.0.1](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@3.0.0...@argos-ci/storybook@3.0.1) (2025-08-02)


### Bug Fixes

* **storybook:** fix fitElement selector in vitest ([536715f](https://github.com/argos-ci/argos-javascript/commit/536715f7cd7ab3c593c96a8081d80f054a470181))





# [3.0.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@2.1.7...@argos-ci/storybook@3.0.0) (2025-08-01)


### Features

* add support for Storybook Vitest Addon ([1fed57b](https://github.com/argos-ci/argos-javascript/commit/1fed57b8e1279e7919241c268ae782e9e2bae940))


### BREAKING CHANGES

* - `argosScreenshot` import path has changed to `@argos-ci/storybook/test-runner`.
- All screenshots are now named with `${context.storyId} mode-[<mode>].png` format.





## [2.1.7](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@2.1.6...@argos-ci/storybook@2.1.7) (2025-07-30)

**Note:** Version bump only for package @argos-ci/storybook





## [2.1.6](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@2.1.5...@argos-ci/storybook@2.1.6) (2025-07-23)

**Note:** Version bump only for package @argos-ci/storybook





## [2.1.5](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@2.1.4...@argos-ci/storybook@2.1.5) (2025-07-22)

**Note:** Version bump only for package @argos-ci/storybook





## [2.1.4](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@2.1.3...@argos-ci/storybook@2.1.4) (2025-07-14)

**Note:** Version bump only for package @argos-ci/storybook





## [2.1.3](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@2.1.2...@argos-ci/storybook@2.1.3) (2025-07-05)

**Note:** Version bump only for package @argos-ci/storybook





## [2.1.2](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@2.1.1...@argos-ci/storybook@2.1.2) (2025-05-15)

**Note:** Version bump only for package @argos-ci/storybook





## [2.1.1](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@2.1.0...@argos-ci/storybook@2.1.1) (2025-04-12)

**Note:** Version bump only for package @argos-ci/storybook





# [2.1.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@2.0.1...@argos-ci/storybook@2.1.0) (2025-04-01)


### Features

* better dark mode detection ([ef78eee](https://github.com/argos-ci/argos-javascript/commit/ef78eeeb8894eacc475a2dcb6e060b59f08de6ae))
* **storybook:** support argos.modes ([32a55ca](https://github.com/argos-ci/argos-javascript/commit/32a55ca07202e9b8306a0534f13d8ca0b9135187))





## [2.0.1](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@2.0.0...@argos-ci/storybook@2.0.1) (2025-03-26)

**Note:** Version bump only for package @argos-ci/storybook





# [2.0.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@1.0.6...@argos-ci/storybook@2.0.0) (2025-03-25)


### Features

* allow to disable every stabilization plugin ([60245ab](https://github.com/argos-ci/argos-javascript/commit/60245ab90a22ce2abd309761de6ac14fa5293e2d))


### BREAKING CHANGES

* `options.stabilize` has changed and now accepts any stabilization plugin





## [1.0.6](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@1.0.5...@argos-ci/storybook@1.0.6) (2025-03-22)

**Note:** Version bump only for package @argos-ci/storybook





## [1.0.5](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@1.0.4...@argos-ci/storybook@1.0.5) (2025-03-20)

**Note:** Version bump only for package @argos-ci/storybook





## [1.0.4](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@1.0.3...@argos-ci/storybook@1.0.4) (2025-03-20)

**Note:** Version bump only for package @argos-ci/storybook





## [1.0.3](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@1.0.2...@argos-ci/storybook@1.0.3) (2025-03-20)

**Note:** Version bump only for package @argos-ci/storybook





## [1.0.2](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@1.0.1...@argos-ci/storybook@1.0.2) (2025-03-20)

**Note:** Version bump only for package @argos-ci/storybook





## [1.0.1](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@1.0.0...@argos-ci/storybook@1.0.1) (2025-01-18)

**Note:** Version bump only for package @argos-ci/storybook





# [1.0.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@0.2.5...@argos-ci/storybook@1.0.0) (2025-01-18)

**Note:** Version bump only for package @argos-ci/storybook





## [0.2.5](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@0.2.4...@argos-ci/storybook@0.2.5) (2025-01-14)

**Note:** Version bump only for package @argos-ci/storybook





## [0.2.4](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@0.2.3...@argos-ci/storybook@0.2.4) (2024-12-03)

**Note:** Version bump only for package @argos-ci/storybook





## [0.2.3](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@0.2.2...@argos-ci/storybook@0.2.3) (2024-12-03)

**Note:** Version bump only for package @argos-ci/storybook





## [0.2.2](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@0.2.1...@argos-ci/storybook@0.2.2) (2024-11-20)

**Note:** Version bump only for package @argos-ci/storybook





## [0.2.1](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@0.2.0...@argos-ci/storybook@0.2.1) (2024-10-29)


### Bug Fixes

* **playwright:** make getCSPScriptHash synchronous ([86f3ee3](https://github.com/argos-ci/argos-javascript/commit/86f3ee3de937b6a1b58c078e9eba12da4f935028))





# [0.2.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@0.1.2...@argos-ci/storybook@0.2.0) (2024-10-27)


### Bug Fixes

* detect library version only from "@storybook/test-runner" ([20294d1](https://github.com/argos-ci/argos-javascript/commit/20294d16b5379b848993c6de689853154f186c04))
* **storybook:** disable aria-busy stabilization by default ([db781ec](https://github.com/argos-ci/argos-javascript/commit/db781ec31e8691bd0e2c0aae8d532b465c14cf6f))


### Features

* allow to customization stabilization options ([073c081](https://github.com/argos-ci/argos-javascript/commit/073c081228c6ef8f4bfed84a1caee6b44e6ae642))





## [0.1.2](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@0.1.1...@argos-ci/storybook@0.1.2) (2024-10-25)


### Bug Fixes

* **storybook:** remove bin ([c32c024](https://github.com/argos-ci/argos-javascript/commit/c32c024dd6d1e8543910b9cd95c3e3e8c679d07e))





## [0.1.1](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/storybook@0.1.0...@argos-ci/storybook@0.1.1) (2024-10-25)


### Bug Fixes

* **storybook:** fix metadata ([dd992aa](https://github.com/argos-ci/argos-javascript/commit/dd992aac34192b5f8326714caa96323995421710))





# 0.1.0 (2024-10-25)


### Features

* **storybook:** add Storybook SDK ([c42b95c](https://github.com/argos-ci/argos-javascript/commit/c42b95c4a2f20434fe1a0f4cd9f9ff0e227234cf))
