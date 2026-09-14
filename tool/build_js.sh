#!/bin/sh
# Builds web/src/ into bundle/www/tools/js/acelery/, the vendored JS the pages
# load.
#
# web/ is the source of truth; the output under bundle/ is a build artifact,
# and it is committed so that a checkout without node still packs a working
# bundle (tool/build_bundle.sh does not need this script to have run).
#
# Two passes, because the two halves want different treatment:
#
#   1. The capability modules have no dependencies, so they are transformed
#      rather than bundled -- one input file, one output file, relative imports
#      left intact. A stack trace from a user's app then points at a readable
#      line, which is the debugging property §6.1 leans on.
#
#   2. The widget layer pulls preact, htm and react-bootstrap, so it is bundled
#      into a single ui.js, minified and without a sourcemap. This is why the
#      build step exists at all (§4). The readability argument above does not
#      reach here: nobody debugs into react-bootstrap's internals, and a
#      ~700 KB map is real install footprint on a bundle being shrunk to
#      ~1.2 MB. Authors' own code and the API they call stay readable.
set -e
cd "$(dirname "$0")/.."

if [ ! -d web/node_modules ]; then
  echo "web/node_modules is missing; run: (cd web && npm install)" >&2
  exit 1
fi

ESBUILD=web/node_modules/.bin/esbuild
OUT=bundle/www/tools/js/acelery

rm -rf "$OUT"

# 1. Capability modules: transform only.
"$ESBUILD" web/src/acelery/*.js \
  --format=esm \
  --target=es2022 \
  --sourcemap \
  --outdir="$OUT" \
  --log-level=warning

# 2. Widget layer: bundled.
#
# react-bootstrap resolves through preact/compat while htm/preact resolves
# preact directly. On esbuild's default browser platform both land on
# preact.module.js, so one copy of the core is bundled and hooks register their
# options on the instance that actually renders. Under --platform=node they do
# not: two copies come in, and the first render dies with "Cannot read
# properties of undefined (reading 'context')" inside useBootstrapPrefix -- a
# stack pointing nowhere near the cause. That is a hazard for anything that
# re-bundles this for node, which is why web/test/ui.test.js imports the built
# browser bundle rather than rebuilding. The check below pins the property
# instead of trusting the default to stay put.
# Run from web/, because esbuild resolves --alias targets against the current
# working directory -- "preact/compat" is only findable from there.
(cd web && node_modules/.bin/esbuild src/ui/index.js \
  --bundle \
  --format=esm \
  --target=es2022 \
  --minify \
  --alias:react=preact/compat \
  --alias:react-dom=preact/compat \
  --outfile="../$OUT/ui.js" \
  --metafile=../"$OUT"/.meta.json \
  --log-level=warning)

# Fail the build, not a page at runtime, if the resolution trap above reopens.
# The metafile names every input esbuild pulled in, so two copies of preact's
# core are visible here and nowhere else once the output is minified.
node - "$OUT/.meta.json" "$OUT/.build-info.json" <<'NODE'
const fs = require("fs");
const [, , metaPath, infoPath] = process.argv;
const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
const inputs = Object.keys(meta.inputs);

const cores = inputs.filter((f) => /node_modules\/preact\/dist\/preact\.[^/]+$/.test(f));
const packages = [...new Set(
  inputs.map((f) => (f.match(/node_modules\/((?:@[^/]+\/)?[^/]+)\//) || [])[1])
        .filter(Boolean))].sort();

if (cores.length !== 1) {
  console.error(
    `tool/build_js.sh: ${cores.length} copies of preact core bundled ` +
    `(${cores.join(", ") || "none"}).\n` +
    "  More than one means hooks register their options on a different " +
    "instance than the one rendering,\n" +
    "  and the first render dies inside useBootstrapPrefix with a stack that " +
    "points nowhere near the cause.\n" +
    "  Check the build still resolves on esbuild's browser platform.");
  process.exit(1);
}

fs.writeFileSync(infoPath, JSON.stringify(
  { preactCores: cores.length, packages, inputs: inputs.length }, null, 2) + "\n");
NODE

rm -f "$OUT/.meta.json"

# 3. Themes: all 18 as CSS custom properties on one stylesheet (§3.4), from the
#    bootswatch npm package, so 4.1 MB of theme builds lives in neither the repo
#    nor the install.
node tool/build_themes.mjs

# A stamp over the inputs, so a test can tell that the committed output was
# built from the sources next to it without needing node to rebuild and diff.
cat web/src/acelery/*.js web/src/ui/*.js | shasum -a 256 | cut -d' ' -f1 \
  > "$OUT/.sources.sha256"

echo "$OUT: $(ls "$OUT"/*.js | wc -l | tr -d ' ') modules, $(du -sh "$OUT" | cut -f1)"
echo "  ui.js: $(wc -c < "$OUT/ui.js" | tr -d ' ') bytes raw, $(gzip -9 -c "$OUT/ui.js" | wc -c | tr -d ' ') gzipped"
