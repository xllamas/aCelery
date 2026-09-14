#!/bin/sh
# Builds web/src/ into bundle/www/tools/js/, the vendored JS the pages load.
#
# web/ is the source of truth; the output under bundle/ is a build artifact,
# and it is committed so that a checkout without node still packs a working
# bundle (tool/build_bundle.sh does not need this script to have run).
#
# The capability modules are plain ES modules with no dependencies, so they are
# transformed rather than bundled: one input file, one output file, relative
# imports left intact. That keeps a stack trace from a user's app pointing at a
# readable line, which is the debugging property
# doc/js-ui-framework-evaluation.md §6.1 leans on.
#
# Entries that pull in npm dependencies — the Preact widget layer in Phase 4c,
# a tree-shaken CodeMirror 6 in Phase 4d — get their own bundling pass here;
# the split is deliberate, and it is why the build step exists at all (§4).
set -e
cd "$(dirname "$0")/.."

if [ ! -d web/node_modules ]; then
  echo "web/node_modules is missing; run: (cd web && npm install)" >&2
  exit 1
fi

ESBUILD=web/node_modules/.bin/esbuild
OUT=bundle/www/tools/js/acelery

rm -rf "$OUT"
"$ESBUILD" web/src/acelery/*.js \
  --format=esm \
  --target=es2022 \
  --sourcemap \
  --outdir="$OUT" \
  --log-level=warning

# A stamp over the inputs, so a test can tell that the committed output was
# built from the sources next to it without needing node to rebuild and diff.
cat web/src/acelery/*.js | shasum -a 256 | cut -d' ' -f1 > "$OUT/.sources.sha256"

echo "$OUT: $(ls "$OUT"/*.js | wc -l | tr -d ' ') modules, $(du -sh "$OUT" | cut -f1)"
