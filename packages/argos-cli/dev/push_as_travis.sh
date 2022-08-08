#!/bin/bash
set -ev

export TRAVIS_BUILD_ID=1234
export TRAVIS_BUILD_NUMBER=build-number
export TRAVIS_REPO_SLUG=travis/repo-slug
export TRAVIS_PULL_REQUEST=false
export TRAVIS_PULL_REQUEST_BRANCH=
export TRAVIS_PULL_REQUEST_SHA=
export TRAVIS_COMMIT=51becaa7a4da00f9e542ca39446fd0ef68bf13dd
export TRAVIS_BRANCH=upgrade

yarn dev:upload
