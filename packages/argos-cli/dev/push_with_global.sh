#!/bin/bash
set -ev

export ARGOS_COMMIT=e5ff79c2137ed3dd321d0e9a2ceba98bba11f579
export ARGOS_BRANCH=test
yarn argos upload packages/argos-cli/__fixtures__
