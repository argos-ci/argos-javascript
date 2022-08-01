# gatsby-plugin-argos

Push your gatsby screenshots to [Argos](https://www.argos-ci.com/), and check for visual regression before releasing.

## Install

If you already have a screenshots available:

`npm install --save-dev gatsby-plugin-argos argos-cli`

If you don't have screenshots available:

`npm install --save-dev gatsby-plugin-argos argos-cli gatsby-plugin-screenshot puppeteer`

## How to use

Just add the plugin to the plugins array in your `gatsby-config.js`.

Here's a travis example with available screenshots:

```javascript
// in your gatsby-config.js
module.exports = {
  plugins: [
    ...(process.env.CI
      ? [
          {
            resolve: "gatsby-plugin-argos",
            options: {
              branch: process.env.TRAVIS_BRANCH,
              commit: process.env.TRAVIS_COMMIT,
              dir: "./where-your-screenshots-are",
              token: process.env.ARGOS_TOKEN,
            },
          },
        ]
      : []),
  ],
};
```

Here's a travis example without available screenshots:

```javascript
// in your gatsby-config.js
module.exports = {
  plugins: [
    ...(process.env.CI
      ? [
          {
            resolve: "gatsby-plugin-argos",
            options: {
              branch: process.env.TRAVIS_BRANCH,
              commit: process.env.TRAVIS_COMMIT,
              token: process.env.ARGOS_TOKEN,
            },
          },
        ]
      : []),
  ],
};
```

You can also override [gatsby-plugin-screenshot](https://github.com/argos-ci/argos-javascript/tree/master/packages/gatsby-plugin-screenshot#readme) options if needed:

```javascript
// in your gatsby-config.js
module.exports = {
  plugins: [
    ...(process.env.CI
      ? [
          {
            resolve: "gatsby-plugin-argos",
            options: {
              branch: process.env.TRAVIS_BRANCH,
              browser: {
                args: [
                  "--no-sandbox",
                  "--disable-setuid-sandbox",
                  "--start-fullscreen",
                ],
              },
              commit: process.env.TRAVIS_COMMIT,
              dir: "./screenshots",
              port: 8000,
              token: process.env.ARGOS_TOKEN,
            },
          },
        ]
      : []),
  ],
};
```
