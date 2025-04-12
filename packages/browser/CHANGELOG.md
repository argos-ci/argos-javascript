# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [4.1.1](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/browser@4.1.0...@argos-ci/browser@4.1.1) (2025-04-12)


### Bug Fixes

* remove unrelevant code to load images in `waitForAriaBusy` ([c7e6aed](https://github.com/argos-ci/argos-javascript/commit/c7e6aed4fbf2a9a596aa77f43706ce3493e61ddd))





# [4.1.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/browser@4.0.1...@argos-ci/browser@4.1.0) (2025-04-01)


### Features

* better dark mode detection ([ef78eee](https://github.com/argos-ci/argos-javascript/commit/ef78eeeb8894eacc475a2dcb6e060b59f08de6ae))





## [4.0.1](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/browser@4.0.0...@argos-ci/browser@4.0.1) (2025-03-26)


### Bug Fixes

* **stabilization:** fix stabilization on transformed images ([165ed33](https://github.com/argos-ci/argos-javascript/commit/165ed33f3654dfea04b1ade10cb2f3e48c068809))





# [4.0.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/browser@3.2.0...@argos-ci/browser@4.0.0) (2025-03-25)


### Features

* allow to disable every stabilization plugin ([60245ab](https://github.com/argos-ci/argos-javascript/commit/60245ab90a22ce2abd309761de6ac14fa5293e2d))


### BREAKING CHANGES

* `options.stabilize` has changed and now accepts any stabilization plugin





# [3.2.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/browser@3.1.3...@argos-ci/browser@3.2.0) (2025-03-22)


### Features

* split stabilization into plugins ([982e4e0](https://github.com/argos-ci/argos-javascript/commit/982e4e081fa30b83ff80d5d58c1644f4d10bbb8f))





## [3.1.3](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/browser@3.1.2...@argos-ci/browser@3.1.3) (2025-03-20)


### Bug Fixes

* fix restoration of image sizes ([cddc1f1](https://github.com/argos-ci/argos-javascript/commit/cddc1f103796753bdd8487bcab8962e4063c6b2d))





## [3.1.2](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/browser@3.1.1...@argos-ci/browser@3.1.2) (2025-03-20)


### Bug Fixes

* fix image size restoration ([28d1834](https://github.com/argos-ci/argos-javascript/commit/28d1834a08d9a88c0e1f7b01c61035bbfc190d3e))





## [3.1.1](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/browser@3.1.0...@argos-ci/browser@3.1.1) (2025-03-20)


### Bug Fixes

* fix image stabilization ([29fe2be](https://github.com/argos-ci/argos-javascript/commit/29fe2bed471d80fcfa07905706f70edf2530e1a5))
* fix image stabilization ([7e6d962](https://github.com/argos-ci/argos-javascript/commit/7e6d9627d547afe2606249385bbe4745ec8c617d))





# [3.1.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/browser@3.0.1...@argos-ci/browser@3.1.0) (2025-03-20)


### Features

* stabilize image sizes ([1c2ed33](https://github.com/argos-ci/argos-javascript/commit/1c2ed33563f04b142d1895199240d7ad046f9dea))





## [3.0.1](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/browser@3.0.0...@argos-ci/browser@3.0.1) (2025-01-18)

**Note:** Version bump only for package @argos-ci/browser





# [3.0.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/browser@2.2.2...@argos-ci/browser@3.0.0) (2025-01-18)


### Bug Fixes

* **chromium:** reduce text-aliasing issue ([10fa86f](https://github.com/argos-ci/argos-javascript/commit/10fa86ff97b3a8eef118a64c83ed1d707ec66287))


### BREAKING CHANGES

* **chromium:** if not using "-webkit-font-smoothing: antialiased"
you may experience differences on text after the update





## [2.2.2](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/browser@2.2.1...@argos-ci/browser@2.2.2) (2025-01-14)

**Note:** Version bump only for package @argos-ci/browser





## [2.2.1](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/browser@2.2.0...@argos-ci/browser@2.2.1) (2024-12-03)

**Note:** Version bump only for package @argos-ci/browser





# [2.2.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/browser@2.1.6...@argos-ci/browser@2.2.0) (2024-10-27)


### Features

* allow to customization stabilization options ([073c081](https://github.com/argos-ci/argos-javascript/commit/073c081228c6ef8f4bfed84a1caee6b44e6ae642))





## [2.1.6](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/browser@2.1.5...@argos-ci/browser@2.1.6) (2024-10-25)

**Note:** Version bump only for package @argos-ci/browser





## [2.1.5](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/browser@2.1.4...@argos-ci/browser@2.1.5) (2024-10-14)


### Bug Fixes

* **stabilization:** don't modify IFRAME to avoid reloads ([#155](https://github.com/argos-ci/argos-javascript/issues/155)) ([02b758a](https://github.com/argos-ci/argos-javascript/commit/02b758a28ef39c6387a7e797c0f64e54bd2d047a))





## 2.1.4 (2024-09-25)


### Bug Fixes

* wait for viewport resize (puppeteer, playwright) ([#151](https://github.com/argos-ci/argos-javascript/issues/151)) ([a07f529](https://github.com/argos-ci/argos-javascript/commit/a07f5295203a85620110c7a432f872c000442383))





## [2.1.3](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/browser@2.1.2...@argos-ci/browser@2.1.3) (2024-08-24)

**Note:** Version bump only for package @argos-ci/browser





## [2.1.2](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/browser@2.1.1...@argos-ci/browser@2.1.2) (2024-06-04)


### Bug Fixes

* fix reverting spellcheck stabilization ([#129](https://github.com/argos-ci/argos-javascript/issues/129)) ([c2aec7d](https://github.com/argos-ci/argos-javascript/commit/c2aec7d99321e6dab031083aa53fc845b3a114b6))





## [2.1.1](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/browser@2.1.0...@argos-ci/browser@2.1.1) (2024-05-25)


### Bug Fixes

* **stabilization:** safer positionning stabilization ([#127](https://github.com/argos-ci/argos-javascript/issues/127)) ([2d051d5](https://github.com/argos-ci/argos-javascript/commit/2d051d518c1cb0c878b21eb39820917d5a839d3e))





# [2.1.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/browser@2.0.0...@argos-ci/browser@2.1.0) (2024-04-15)


### Features

* **gitlab:** gitlab status updater ([#124](https://github.com/argos-ci/argos-javascript/issues/124)) ([b62e4bb](https://github.com/argos-ci/argos-javascript/commit/b62e4bbe0c3b6cedca5cf1c2f18e510f27b17159))





# [2.0.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/browser@1.5.0...@argos-ci/browser@2.0.0) (2024-04-05)


### Features

* upgrade dependencies ([dd66e29](https://github.com/argos-ci/argos-javascript/commit/dd66e29986fab384557e9be74ee5c8e8aad72d82))


### BREAKING CHANGES

* Node.js v18 or higher is required.





# [1.5.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/browser@1.4.1...@argos-ci/browser@1.5.0) (2024-02-22)


### Features

* **stability:** handle img with decoding="async" ([871ff56](https://github.com/argos-ci/argos-javascript/commit/871ff564a907ee737a3c1a75a5541ffa87b395fc))





## [1.4.1](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/browser@1.4.0...@argos-ci/browser@1.4.1) (2024-02-02)

**Note:** Version bump only for package @argos-ci/browser





# [1.4.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/browser@1.3.0...@argos-ci/browser@1.4.0) (2024-01-30)


### Features

* support no node_modules folder ([#109](https://github.com/argos-ci/argos-javascript/issues/109)) ([66aa120](https://github.com/argos-ci/argos-javascript/commit/66aa120b94a8990b3ce549d101ad733ac9bfd929))





# [1.3.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/browser@1.2.2...@argos-ci/browser@1.3.0) (2023-12-27)


### Features

* **cypress:** simplify setup ([de75af6](https://github.com/argos-ci/argos-javascript/commit/de75af62ba57a7cb9512435dd4c494fbfa42c927))





## [1.2.2](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/browser@1.2.1...@argos-ci/browser@1.2.2) (2023-12-21)


### Bug Fixes

* **stabilization:** wait for aria-busy on svg elements ([96e69da](https://github.com/argos-ci/argos-javascript/commit/96e69da4e0f3f6fedaf451cc67cf08c1d709ebc1))





## [1.2.1](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/browser@1.2.0...@argos-ci/browser@1.2.1) (2023-12-15)


### Bug Fixes

* **cypress:** improve compatibility with bundlers ([366b39c](https://github.com/argos-ci/argos-javascript/commit/366b39c374f9297cab53fb3919f63808cd13fcce))





# [1.2.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/browser@1.1.1...@argos-ci/browser@1.2.0) (2023-12-13)


### Features

* add "__argos__" class on root tag ([3949b94](https://github.com/argos-ci/argos-javascript/commit/3949b94fc7744326db3f968893ac8b2d11d442ba))
* add argosCSS option to inject custom CSS ([9ab7efd](https://github.com/argos-ci/argos-javascript/commit/9ab7efd9b7573657a92d73010e2d5bbddfced353))
* reset argos changes after screenshot ([23c4a3d](https://github.com/argos-ci/argos-javascript/commit/23c4a3d60c8d3b1d8357847d5589d3765be241a9))





## [1.1.1](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/browser@1.1.0...@argos-ci/browser@1.1.1) (2023-11-27)


### Bug Fixes

* **types:** fix types in browser package ([#91](https://github.com/argos-ci/argos-javascript/issues/91)) ([668aeb4](https://github.com/argos-ci/argos-javascript/commit/668aeb48abfe8204086902779ae1282c91d81d30))





# [1.1.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/browser@1.0.0...@argos-ci/browser@1.1.0) (2023-11-17)


### Features

* stabilize sticky & fixed elements in full page ([5f01dd9](https://github.com/argos-ci/argos-javascript/commit/5f01dd962a3a7a010eb2df8340d37e9d720c250b))
