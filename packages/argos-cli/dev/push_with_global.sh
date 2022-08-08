#!/bin/bash
set -ev

export ARGOS_COMMIT=51becaa7a4da00f9e542ca39446fd0ef68bf13dd
export ARGOS_BRANCH=pull/25
yarn dev:upload
