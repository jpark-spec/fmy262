#!/bin/sh
# Makes the files of a release in release/ (not kept in git):
#   fmy262-VERSION.zip                the firmware package, the two single-file pages, LICENSE, NOTICE, CHANGELOG
#   fmy262-workbench-site-VERSION.zip the workbench site (dist/workbench) that .github/workflows/pages.yml publishes
# Usage: tools/release.sh 0.8.1   (FMY_REPO=https://github.com/OWNER/REPO to link it from the install page)
# Needs vendor/fm1-base with its toolchain (tools/fetch-vendor.sh, then its README) and Docker on macOS.
# M-VAVE's stock firmware is never put in (FMY_PUBLIC): the install page asks for it as fm1-base's does.
set -e
V="$1"
[ -n "$V" ] || { echo "usage: tools/release.sh VERSION (e.g. 0.8.1)"; exit 2; }
cd "$(dirname "$0")/.."
ROOT=$(pwd)
for f in web/template.html firmware/ui/ui.c; do
  grep -q "V$V" "$f" || { echo "$f does not show V$V: change the version first (CLAUDE.md, Version)"; exit 1; }
done
grep -q "^## $V" CHANGELOG.md || { echo "CHANGELOG.md has no '## $V'"; exit 1; }
[ -d vendor/fm1-base ] || { echo "no vendor/fm1-base: tools/fetch-vendor.sh first"; exit 1; }
PATH="$HOME/.docker/bin:$PATH"; export PATH
PY=python3; [ -x vendor/fm1-base/.venv/bin/python ] && PY="$ROOT/vendor/fm1-base/.venv/bin/python"

npm run build
(cd vendor/fm1-base && "$PY" tools/build.py ../../firmware/tracker >/dev/null && "$PY" tools/build.py --web ../../firmware/tracker >/dev/null)
FMY_PUBLIC=1 "$PY" firmware/tracker/tools/make_workbench.py "$V"
[ ! -e dist/workbench/firmware/FM-1-stock.fwsc ] || { echo "stock firmware in the site: stop"; exit 1; }
cp LICENSE NOTICE.md dist/workbench/   # (the site carries FMY262's licence and notices too)

OUT=release/fmy262-$V
rm -rf "$OUT" "release/fmy262-$V.zip" "release/fmy262-workbench-site-$V.zip"
mkdir -p "$OUT"
cp firmware/tracker/build/fmy262.fwsc "$OUT/fmy262-$V.fwsc"
cp dist/fm1-opl3-tracker.html "$OUT/fmy262-prototype-$V.html"
cp dist/fmy262-workbench.html "$OUT/fmy262-workbench-$V.html"
cp LICENSE NOTICE.md CHANGELOG.md "$OUT/"
(cd release && zip -qr "fmy262-$V.zip" "fmy262-$V")
(cd dist/workbench && zip -qr "$ROOT/release/fmy262-workbench-site-$V.zip" .)
shasum -a 256 "$OUT/fmy262-$V.fwsc" "release/fmy262-$V.zip" "release/fmy262-workbench-site-$V.zip" | tee "release/SHA256SUMS-$V.txt"
echo "release/: upload fmy262-$V/fmy262-$V.fwsc (The Firmware Hub takes the .fwsc asset), fmy262-$V.zip, fmy262-workbench-site-$V.zip and SHA256SUMS-$V.txt to the GitHub release v$V"
