# gatsby-plugin-argos

Travis integration example:

```javascript
// gatsby-config.js
module.exports = {
  plugins: [
    ...(process.env.CI
      ? [
          {
            resolve: 'gatsby-plugin-argos',
            options: {
              branch: process.env.TRAVIS_BRANCH,
              commit: process.env.TRAVIS_COMMIT,
              token: process.env.ARGOS_TOKEN,
            },
          },
        ]
      : []),
  ]
}

// or

module.exports = {
  plugins: [
    {
      resolve: 'gatsby-plugin-screenshot',
      options: {
        dir: './screenshots'
      },
    },
    ...(process.env.CI
      ? [
          {
            resolve: 'gatsby-plugin-argos',
            options: {
              branch: process.env.TRAVIS_BRANCH,
              commit: process.env.TRAVIS_COMMIT,
              dir: './screenshots'
              token: process.env.ARGOS_TOKEN,
            },
          },
        ]
      : []),
  ]
}
```
