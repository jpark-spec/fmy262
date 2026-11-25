#!/bin/sh
# Fetches the sources FMY262's firmware is built on into vendor/ (not kept in git), at the commits this
# version was made and tested with. fm1-base brings felucca-bsp as its submodule (bsp/).
#   fm1-base     https://github.com/charlesvestal/fm1-base  (MPL-2.0)
#   felucca-bsp  https://github.com/hugelton/felucca-bsp   (MPL-2.0)
# After this: cd vendor/fm1-base && tools/setup_toolchain.sh (JieLi toolchain, see its README).
set -e
cd "$(dirname "$0")/.."
FM1_BASE_COMMIT=2bb8e74
mkdir -p vendor
if [ ! -d vendor/fm1-base/.git ]; then
  git clone https://github.com/charlesvestal/fm1-base vendor/fm1-base
fi
git -C vendor/fm1-base fetch --quiet origin
git -C vendor/fm1-base checkout --quiet "$FM1_BASE_COMMIT"
git -C vendor/fm1-base submodule update --init --recursive
echo "vendor/fm1-base at $(git -C vendor/fm1-base rev-parse --short HEAD), bsp at $(git -C vendor/fm1-base/bsp rev-parse --short HEAD)"
