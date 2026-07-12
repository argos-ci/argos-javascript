# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.26.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/api-client@0.25.0...@argos-ci/api-client@0.26.0) (2026-07-12)


### Features

* **cli:** add `analytics` command to fetch account analytics ([2948e9d](https://github.com/argos-ci/argos-javascript/commit/2948e9d44bc11a2465c1b81d7cd276747f112a9d)), closes [argos-ci/argos#2357](https://github.com/argos-ci/argos/issues/2357)
* **cli:** add change ignore/unignore and test flakiness in build snapshots ([007a707](https://github.com/argos-ci/argos-javascript/commit/007a7077dc8b8402af54df26357fb57d7063196b))





# [0.25.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/api-client@0.24.4...@argos-ci/api-client@0.25.0) (2026-07-10)


### Features

* **cli:** add create-project command ([91a8494](https://github.com/argos-ci/argos-javascript/commit/91a849409e6910c338bb0def026f5ebdfcd0b674))





## [0.24.4](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/api-client@0.24.3...@argos-ci/api-client@0.24.4) (2026-07-09)

**Note:** Version bump only for package @argos-ci/api-client





## [0.24.3](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/api-client@0.24.2...@argos-ci/api-client@0.24.3) (2026-07-09)

**Note:** Version bump only for package @argos-ci/api-client





## [0.24.2](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/api-client@0.24.1...@argos-ci/api-client@0.24.2) (2026-07-09)

**Note:** Version bump only for package @argos-ci/api-client





## [0.24.1](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/api-client@0.24.0...@argos-ci/api-client@0.24.1) (2026-07-09)

**Note:** Version bump only for package @argos-ci/api-client





# [0.24.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/api-client@0.23.0...@argos-ci/api-client@0.24.0) (2026-07-01)


### Features

* **cli:** add whoami command ([d864363](https://github.com/argos-ci/argos-javascript/commit/d8643634645360b2350b22e55e7d95e982792462))





# [0.23.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/api-client@0.22.1...@argos-ci/api-client@0.23.0) (2026-06-29)


### Features

* **core:** split the updateBuild request to avoid PayloadTooLargeError ([b2babd5](https://github.com/argos-ci/argos-javascript/commit/b2babd5da22a8526914068ab6639d94f0facb04e))





## [0.22.1](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/api-client@0.22.0...@argos-ci/api-client@0.22.1) (2026-06-23)


### Bug Fixes

* surface HTTP status and raw body in API errors ([6c465a3](https://github.com/argos-ci/argos-javascript/commit/6c465a345ae95a3e20240653a4749831f3b94d79))





# [0.22.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/api-client@0.21.0...@argos-ci/api-client@0.22.0) (2026-05-28)


### Features

* **core:** allow to upload text to be compared by Argos ([#313](https://github.com/argos-ci/argos-javascript/issues/313)) ([5bb0f3c](https://github.com/argos-ci/argos-javascript/commit/5bb0f3c17a228eef2a9fe5db616eb76e4e05daaf))





# [0.21.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/api-client@0.20.1...@argos-ci/api-client@0.21.0) (2026-05-26)


### Features

* **api-client:** add custom request headers for better retry support ([0bdced9](https://github.com/argos-ci/argos-javascript/commit/0bdced989d3b36bf7794aa33e39db3878880f2db))





## [0.20.1](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/api-client@0.20.0...@argos-ci/api-client@0.20.1) (2026-05-20)


### Bug Fixes

* **api-client:** fix p-retry missing from deps ([bd741f5](https://github.com/argos-ci/argos-javascript/commit/bd741f5b6715eb6570d6f84a85a6d0abddb2d422))
* **api-client:** fix retry failing and add a timeout of 30s ([787f97c](https://github.com/argos-ci/argos-javascript/commit/787f97c07e5dc346c7e664445ffcd4b29cf55286))





# [0.20.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/api-client@0.19.0...@argos-ci/api-client@0.20.0) (2026-05-11)


### Features

* make GitHub tokenless auth more secure ([#301](https://github.com/argos-ci/argos-javascript/issues/301)) ([41b62d0](https://github.com/argos-ci/argos-javascript/commit/41b62d01df05cae2fb5d6145b4f62ccb65aebc4e))
* require Node.js v22+ ([460a431](https://github.com/argos-ci/argos-javascript/commit/460a431ffb003a743bfab8af6e8451da45483bfd))
* support GitHub Actions OIDC authentication ([#296](https://github.com/argos-ci/argos-javascript/issues/296)) ([a8956ce](https://github.com/argos-ci/argos-javascript/commit/a8956ce7a9ff37f3ccbc3440b811083ada675daf))


### BREAKING CHANGES

* Node.js 22+ required





# [0.19.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/api-client@0.18.0...@argos-ci/api-client@0.19.0) (2026-05-02)


### Features

* **deploy:** allow to deploy a static build ([#292](https://github.com/argos-ci/argos-javascript/issues/292)) ([4f1cfa9](https://github.com/argos-ci/argos-javascript/commit/4f1cfa9db40cef760779b553b622524abcf6b199))
* **deploy:** finalize deploy command ([#293](https://github.com/argos-ci/argos-javascript/issues/293)) ([5d29a15](https://github.com/argos-ci/argos-javascript/commit/5d29a153a04bdac28310d1f14f90dadbad7a7115))





# [0.18.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/api-client@0.17.0...@argos-ci/api-client@0.18.0) (2026-04-17)


### Features

* **cli:** add builds commands ([b2fbf3e](https://github.com/argos-ci/argos-javascript/commit/b2fbf3ec8a44a074fa871de6ada720bad60e37e0))
* **cli:** fix review comments ([b05fb9b](https://github.com/argos-ci/argos-javascript/commit/b05fb9bf9279e861f97f30c369a93929d0af54ec))
* **cli:** review build command ([0712094](https://github.com/argos-ci/argos-javascript/commit/0712094ba78777498cb0d165a26a0b16d4f92f17))
* **cli:** use new endpoint in build command ([7617772](https://github.com/argos-ci/argos-javascript/commit/76177722b78d6531260430fad6e92d9b1b6cf6e3))





# [0.17.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/api-client@0.16.1...@argos-ci/api-client@0.17.0) (2026-03-29)


### Features

* **merge-queue:** support custom merge queue systems ([#280](https://github.com/argos-ci/argos-javascript/issues/280)) ([05a253c](https://github.com/argos-ci/argos-javascript/commit/05a253c2495f7f1ffc124148b77fb965b2928b9d))





## [0.16.1](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/api-client@0.16.0...@argos-ci/api-client@0.16.1) (2026-03-27)

**Note:** Version bump only for package @argos-ci/api-client





# [0.16.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/api-client@0.15.0...@argos-ci/api-client@0.16.0) (2026-01-31)


### Features

* add `subset` option ([191d6ce](https://github.com/argos-ci/argos-javascript/commit/191d6ce2516e52cc5e94def3ca74e7b86c657147))





# [0.15.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/api-client@0.14.0...@argos-ci/api-client@0.15.0) (2025-12-13)


### Features

* **core:** add support for GitHub merge queue ([d5488c8](https://github.com/argos-ci/argos-javascript/commit/d5488c845bb6c64f2b58f950ca0e755db87afab1))





# [0.14.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/api-client@0.13.0...@argos-ci/api-client@0.14.0) (2025-11-03)


### Features

* **playwright:** support aria snapshots ([06fe7df](https://github.com/argos-ci/argos-javascript/commit/06fe7df8f2080146c1c3c01085fe7712555e3cd5))





# [0.13.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/api-client@0.12.0...@argos-ci/api-client@0.13.0) (2025-10-30)


### Features

* **storybook:** support Storybook v10 and Vitest 4 ([f988c7e](https://github.com/argos-ci/argos-javascript/commit/f988c7e4ecafb96a4a00be9389e1add505860df8)), closes [#239](https://github.com/argos-ci/argos-javascript/issues/239)





# [0.12.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/api-client@0.11.1...@argos-ci/api-client@0.12.0) (2025-10-05)


### Features

* **skip:** allow to mark a build as skipped ([5cd48f3](https://github.com/argos-ci/argos-javascript/commit/5cd48f3395d784e0fdca1c77850d16b86ae28f70))





## [0.11.1](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/api-client@0.11.0...@argos-ci/api-client@0.11.1) (2025-09-27)

**Note:** Version bump only for package @argos-ci/api-client





# [0.11.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/api-client@0.10.0...@argos-ci/api-client@0.11.0) (2025-08-22)


### Features

* **core:** retry network errors ([8dad001](https://github.com/argos-ci/argos-javascript/commit/8dad001ebc5dd83ed6286a1300fef5303a00857f))





# [0.10.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/api-client@0.9.0...@argos-ci/api-client@0.10.0) (2025-08-16)


### Features

* **playwright:** support test annotations ([e454086](https://github.com/argos-ci/argos-javascript/commit/e454086fbe408f7087cc0c7e07bbdb8f65429be5))





# [0.9.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/api-client@0.8.2...@argos-ci/api-client@0.9.0) (2025-08-02)


### Features

* require Node.js > 20 ([c894a82](https://github.com/argos-ci/argos-javascript/commit/c894a82c1b51acfced9892b32b31ebbf699282ca))


### BREAKING CHANGES

* Node.js v20 or higher is now required





## [0.8.2](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/api-client@0.8.1...@argos-ci/api-client@0.8.2) (2025-08-01)

**Note:** Version bump only for package @argos-ci/api-client





## [0.8.1](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/api-client@0.8.0...@argos-ci/api-client@0.8.1) (2025-03-25)

**Note:** Version bump only for package @argos-ci/api-client





# [0.8.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/api-client@0.7.2...@argos-ci/api-client@0.8.0) (2025-01-18)


### Features

* support preview URL ([cb541de](https://github.com/argos-ci/argos-javascript/commit/cb541de9b1d75fcb797066578cc3cfe6e8d1d886))





## [0.7.2](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/api-client@0.7.1...@argos-ci/api-client@0.7.2) (2025-01-14)

**Note:** Version bump only for package @argos-ci/api-client





## [0.7.1](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/api-client@0.7.0...@argos-ci/api-client@0.7.1) (2024-12-03)


### Bug Fixes

* fix open-api-fetch version ([cc97b63](https://github.com/argos-ci/argos-javascript/commit/cc97b63502509c3508948c35babcedd61f12f3ab))





# [0.7.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/api-client@0.6.2...@argos-ci/api-client@0.7.0) (2024-10-27)


### Features

* allow to customization stabilization options ([073c081](https://github.com/argos-ci/argos-javascript/commit/073c081228c6ef8f4bfed84a1caee6b44e6ae642))





## [0.6.2](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/api-client@0.6.1...@argos-ci/api-client@0.6.2) (2024-10-25)

**Note:** Version bump only for package @argos-ci/api-client





## [0.6.1](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/api-client@0.6.0...@argos-ci/api-client@0.6.1) (2024-10-21)


### Bug Fixes

* **api:** fix error message ([#156](https://github.com/argos-ci/argos-javascript/issues/156)) ([1be8635](https://github.com/argos-ci/argos-javascript/commit/1be8635994da7ec70780ea0a8befebb8370e105c))





# [0.6.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/api-client@0.5.1...@argos-ci/api-client@0.6.0) (2024-10-11)


### Features

* **no-access:** send a list of commits ([8d36568](https://github.com/argos-ci/argos-javascript/commit/8d36568c01b30aaf5fc80d27b08d63c7f6d3ab7d))





## [0.5.1](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/api-client@0.5.0...@argos-ci/api-client@0.5.1) (2024-10-08)


### Bug Fixes

* display error messages from API ([#152](https://github.com/argos-ci/argos-javascript/issues/152)) ([44def81](https://github.com/argos-ci/argos-javascript/commit/44def8170d62553695724448fb0a2748c0b77b6d))





# [0.5.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/api-client@0.4.0...@argos-ci/api-client@0.5.0) (2024-09-02)


### Features

* collect test report infos in cypress and playwright ([bc275a2](https://github.com/argos-ci/argos-javascript/commit/bc275a2ad1230bfd9a1aba9d85f86b780333f4a9))





# [0.4.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/api-client@0.3.0...@argos-ci/api-client@0.4.0) (2024-09-01)


### Features

* improve error handling ([baed0ef](https://github.com/argos-ci/argos-javascript/commit/baed0ef5a04386444ebcc5e3d734d6c7d3dc92db))





# 0.3.0 (2024-08-31)


### Features

* add finalize command ([53ce57d](https://github.com/argos-ci/argos-javascript/commit/53ce57d7bec003368575495e05781a31698b2816))





# [0.2.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/api-client@0.1.0...@argos-ci/api-client@0.2.0) (2024-08-24)


### Features

* support no-content access ([85f8491](https://github.com/argos-ci/argos-javascript/commit/85f8491a4191cc9f129d58ed0a80424f0c5c03e7))





# 0.1.0 (2024-04-15)


### Features

* **gitlab:** gitlab status updater ([#124](https://github.com/argos-ci/argos-javascript/issues/124)) ([b62e4bb](https://github.com/argos-ci/argos-javascript/commit/b62e4bbe0c3b6cedca5cf1c2f18e510f27b17159))
