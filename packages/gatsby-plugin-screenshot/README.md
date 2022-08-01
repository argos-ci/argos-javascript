# gatsby-plugin-screenshot

Screenshots all your pages in a configured directory.

Puppeteer is a Chrome headless framework which allows you to render your app in Chromium.

With this plugin, all you Gatsby pages will be browsed and screenshotted. You can then use
these screenshots as documentation or to avoid visual regressions with services like [Argos](https://www.argos-ci.com/).

## Install

`npm install --save-dev gatsby-plugin-screenshot puppeteer`

## How to use

Just add the plugin to the plugins array in your `gatsby-config.js`

```javascript
plugins: [`gatsby-plugin-screenshot`];
```

By default, the plugin will run `gatsby serve` to port 8000, and save screenshots in `./screenshots` directory.
You can configure the default behaviour using the followin plugin options:

```javascript
// in your gatsby-config.js
module.exports = {
  plugins: [
    {
      resolve: `gatsby-plugin-screenshot`,
      options: {
        // The puppeteer launch options
        browser: {
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--start-fullscreen",
          ],
        },
        dir: "./screenshots",
        port: 8000,
      },
    },
  ],
};
```
