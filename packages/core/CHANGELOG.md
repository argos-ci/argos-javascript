# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.7.3](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/core@0.7.2...@argos-ci/core@0.7.3) (2023-01-18)

### Bug Fixes

- **github-actions:** better commit & branch detection ([2131752](https://github.com/argos-ci/argos-javascript/commit/21317527ba61848f43221f02e8dc1ef5827601a0))

## [0.7.2](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/core@0.7.1...@argos-ci/core@0.7.2) (2023-01-09)

### Bug Fixes

- better CI handling, specially Buildkite ([b6bc04c](https://github.com/argos-ci/argos-javascript/commit/b6bc04c43c3b0d5db88744495f0c5115faca5ad6))

## [0.7.1](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/core@0.7.0...@argos-ci/core@0.7.1) (2023-01-08)

### Bug Fixes

- add ARGOS_PR_NUMBER, remove --pull-request arg ([362bd57](https://github.com/argos-ci/argos-javascript/commit/362bd5725334ebaca2ce66a0bfabc3f8206dce74))
- **core:** branch is now required ([840aec6](https://github.com/argos-ci/argos-javascript/commit/840aec63cece1dee589c90cb2bf0fd63563f17b5))
- make ARGOS\_ environment variables prioritary ([b8e0ea7](https://github.com/argos-ci/argos-javascript/commit/b8e0ea7f6be7e381a0faeaf23892f39873425adb))

# [0.7.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/core@0.6.2...@argos-ci/core@0.7.0) (2023-01-04)

### Bug Fixes

- options overrides ci ([047d865](https://github.com/argos-ci/argos-javascript/commit/047d865e2d5638c3021010ca9fd928f93eb2f1b0))

### Features

- add buildkite pr number ([0111827](https://github.com/argos-ci/argos-javascript/commit/01118275e58d41abb6826d9a650a030cc9adee9c))
- add circle pr number ([4512cd9](https://github.com/argos-ci/argos-javascript/commit/4512cd93c253e5bd2737b720464e72aa0db07f81))
- add github pr number ([61c455d](https://github.com/argos-ci/argos-javascript/commit/61c455d35d18b841979430f69b2d17375b31bf37))
- add prNumber option ([6ae3824](https://github.com/argos-ci/argos-javascript/commit/6ae38249c1cbe4901d464925f92982104cbc73df))
- add travis pr number ([4b1aad8](https://github.com/argos-ci/argos-javascript/commit/4b1aad81977cc4423e3735f8ab0f4049fb5b8da9))

## [0.6.2](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/core@0.6.1...@argos-ci/core@0.6.2) (2022-12-10)

**Note:** Version bump only for package @argos-ci/core

## [0.6.1](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/core@0.6.0...@argos-ci/core@0.6.1) (2022-11-23)

### Bug Fixes

- stabilize axios version ([2a1d487](https://github.com/argos-ci/argos-javascript/commit/2a1d487756d01bfc93ae2371cf361c96c5d087b9))

# [0.6.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/core@0.5.1...@argos-ci/core@0.6.0) (2022-11-23)

### Features

- **cli:** log stack when an error occurs ([0c47590](https://github.com/argos-ci/argos-javascript/commit/0c47590879fbff1ab6ae9ca01390bc14059e3c91))

## [0.5.1](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/core@0.5.0...@argos-ci/core@0.5.1) (2022-10-15)

### Bug Fixes

- **ci:** fix repository detection in GitHub Actions ([46ed1b9](https://github.com/argos-ci/argos-javascript/commit/46ed1b99228c8e2d9c17b698b0f0c39f813fd0ca))

# [0.5.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/core@0.4.1...@argos-ci/core@0.5.0) (2022-10-15)

### Features

- github tokenless strategy ([8ee6251](https://github.com/argos-ci/argos-javascript/commit/8ee625172b27ca4b35fe75da24dd4ae6cbac6613))
- **tokenless:** add runId to github token ([4d18900](https://github.com/argos-ci/argos-javascript/commit/4d189005c42211d3a4c6b61b76e99c84b80a7965))

## [0.4.1](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/core@0.4.0...@argos-ci/core@0.4.1) (2022-09-14)

### Bug Fixes

- **core:** fix branch detection on CircleCI ([24549b1](https://github.com/argos-ci/argos-javascript/commit/24549b19ad026e24fd5a1235f23a164c1d8f077f))

# [0.4.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/core@0.3.0...@argos-ci/core@0.4.0) (2022-09-07)

### Bug Fixes

- **core:** use correct content-type for image ([22625c0](https://github.com/argos-ci/argos-javascript/commit/22625c0faa6562946298fe0850a1b24b4bd44715))

### Features

- **core:** optimize compression ([d27e96b](https://github.com/argos-ci/argos-javascript/commit/d27e96b0b8edd1d87d6774b9b9fbfd0f0e225bd9))

# [0.3.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/core@0.2.0...@argos-ci/core@0.3.0) (2022-09-06)

### Features

- allow Node.js v14 ([3dff9a8](https://github.com/argos-ci/argos-javascript/commit/3dff9a8656e24dea5cc9d7fa659a114c6f5f7b29))

# [0.2.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/core@0.1.0...@argos-ci/core@0.2.0) (2022-08-25)

### Bug Fixes

- **upload:** handle same screenshots ([cfb8895](https://github.com/argos-ci/argos-javascript/commit/cfb88956a1af518ec8be86998998410bbafa06ed))

### Features

- **core:** improve errors ([49360d8](https://github.com/argos-ci/argos-javascript/commit/49360d85350c2963567c53d297da3e5bca8d0c5c))

# 0.1.0 (2022-08-24)

### Features

- **cli:** setup cli package ([4f589a5](https://github.com/argos-ci/argos-javascript/commit/4f589a5c7e1355e05f82174424e8d3eab8875a0f))
- **core:** create @argos-ci/core package ([2a5f35d](https://github.com/argos-ci/argos-javascript/commit/2a5f35dab0f638922fbd72a9483ab020db1cee82))
- **core:** finalize core package ([a832d13](https://github.com/argos-ci/argos-javascript/commit/a832d139cfa3a3dc5b16966c81b65a18ae98a487))
