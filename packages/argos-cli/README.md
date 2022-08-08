# argos-cli

> Argos command line interface.

[![npm version](https://img.shields.io/npm/v/argos-cli.svg?style=flat-square)](https://www.npmjs.com/package/argos-cli)
[![npm downloads](https://img.shields.io/npm/dm/argos-cli.svg?style=flat-square)](https://www.npmjs.com/package/argos-cli)
[![Build Status](https://travis-ci.org/argos-ci/argos-cli.svg?branch=master)](https://travis-ci.org/argos-ci/argos-cli)

[![Dependencies](https://img.shields.io/david/argos-ci/argos-cli.svg?style=flat-square)](https://david-dm.org/argos-ci/argos-cli)
[![DevDependencies](https://img.shields.io/david/dev/argos-ci/argos-cli.svg?style=flat-square)](https://david-dm.org/argos-ci/argos-cli#info=devDependencies&view=list)

## Usage

```sh
Usage:  [options] [command]

Options:
  -V, --version                 output the version number
  -h, --help                    output usage information

Commands:
  upload [options] <directory>  Upload screenshots
  cancel [options]              Cancel the build (batch mode only)
```

### Upload

```sh
Usage: argos upload [options] <directory>

Upload screenshots

Options:
  -T, --token <token>           Repository token
  -C, --commit <commit>         Git commit
  -B, --branch <branch>         Git branch
  --external-build-id [string]  ID of the build (batch mode only)
  --batchCount [int]            Number of batches expected (batch mode)
  --build-name [string]         Name of the build
  --ignore <list>               List of glob files to ignore (ex: "**/*.png,**/diff.jpg")
  -h, --help                    display help for command
```

### Cancel

```sh
Usage: argos cancel [options]

Cancel the build (batch mode only)

Options:
  -T, --token <token>         Repository token
  --external-build-id [string]  ID of the build (batch mode only)
  -h, --help                  output usage information
```

## License

MIT
