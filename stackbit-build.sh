#!/usr/bin/env bash

set -e
set -o pipefail
set -v

curl -s -X POST __STACKBIT_WEBHOOK_URL__/ssgbuild > /dev/null

next build && next export

curl -s -X POST __STACKBIT_WEBHOOK_URL__/publish > /dev/null