<p align="center">
  <a href="https://argos-ci.com/?utm_source=github&utm_medium=logo" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-dark.png">
    <img alt="Argos" src="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-light.png" width="360" height="70">
  </picture>
  </a>
</p>

<p align="center"><strong>The open source visual testing platform for AI-native engineering teams.</strong></p>

# Argos GitLab

GitLab utilities to report Argos build statuses back to your merge requests when running Argos with a self-managed GitLab instance.

[![npm version](https://img.shields.io/npm/v/@argos-ci/gitlab.svg)](https://www.npmjs.com/package/@argos-ci/gitlab)
[![npm dm](https://img.shields.io/npm/dm/@argos-ci/gitlab.svg)](https://www.npmjs.com/package/@argos-ci/gitlab)
[![npm dt](https://img.shields.io/npm/dt/@argos-ci/gitlab.svg)](https://www.npmjs.com/package/@argos-ci/gitlab)

Visit the [GitLab integration documentation](https://argos-ci.com/docs/learn/integrations/gitlab-integration) for the full setup guide.

## Usage

Run the `argos-gitlab update-statuses` command in your GitLab CI pipeline. It waits for the Argos builds of the current commit to complete and reports their status to the related merge request:

```yaml
# .gitlab-ci.yml
argos-status:
  script:
    - npx @argos-ci/gitlab update-statuses
  variables:
    ARGOS_TOKEN: $ARGOS_TOKEN
    ARGOS_GITLAB_TOKEN: $ARGOS_GITLAB_TOKEN
```

`ARGOS_GITLAB_TOKEN` is a GitLab access token allowed to post commit statuses. The `CI_PROJECT_ID`, `CI_SERVER_URL`, and `CI_COMMIT_SHA` variables are provided by GitLab CI automatically.

## Links

- [GitLab integration guide](https://argos-ci.com/docs/learn/integrations/gitlab-integration)
- [Official Docs](https://argos-ci.com/docs)
- [Discord](https://argos-ci.com/discord)
