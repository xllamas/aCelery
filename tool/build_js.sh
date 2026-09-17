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
# acelery/* is external: ImageCropper imports cropImage from acelery/picker.js
# by its bare name, so the page loads the one capability module rather than a
# copy of it inside ui.js.
# Run from web/, because esbuild resolves --alias targets against the current
# working directory -- "preact/compat" is only findable from there.
(cd web && node_modules/.bin/esbuild src/ui/index.js \
  --bundle \
  --format=esm \
  --target=es2022 \
  --minify \
  --external:acelery/* \
  --alias:react=preact/compat \
  --alias:react-dom=preact/compat \
  --outfile="../$OUT/ui.js" \
  --metafile=../"$OUT"/.meta-ui.json \
  --log-level=warning)

# Fail the build, not a page at runtime, if the resolution trap above reopens.
# The metafile names every input esbuild pulled in, so two copies of preact's
# core are visible here and nowhere else once the output is minified.
node - "$OUT/.meta-ui.json" "$OUT/.build-info.json" <<'NODE'
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



# 3. Charts: Chart.js, registered piecewise rather than through chart.js/auto.
#    Its own bundle, because it is 68 KB gzipped and most apps never draw one
#    (§3.8) -- an app pays for it only by importing acelery/chart.js.
#    acelery/* stays external so preact is not embedded a second time: two
#    copies means this file's hooks register on a different instance than the
#    one rendering, which is the failure §3.1a documents.
(cd web && node_modules/.bin/esbuild src/ui/chart.js \
  --bundle \
  --format=esm \
  --target=es2022 \
  --minify \
  --external:acelery/* \
  --outfile="../$OUT/chart.js" \
  --metafile=../"$OUT"/.meta-chart.json \
  --log-level=warning)

# 4. The editor: CodeMirror 6, tree-shaken to the six languages the IDE opens
#    (§3.7). Its own bundle, so a page that does not edit code does not pay
#    for it -- launcher.html and errorlog.html never load this.
(cd web && node_modules/.bin/esbuild src/editor/index.js \
  --bundle \
  --format=esm \
  --target=es2022 \
  --minify \
  --outfile="../$OUT/editor.js" \
  --metafile=../"$OUT"/.meta-editor.json \
  --log-level=warning)

# 5. The IDE shell. Bundled the same way an app would be, because it is one:
#    it imports acelery/ui.js and the capability modules by bare name and has
#    no privileged access to anything (§8 step 10).
(cd web && node_modules/.bin/esbuild src/ide/index.js \
  --bundle \
  --format=esm \
  --target=es2022 \
  --minify \
  --external:acelery/* \
  --outfile="../$OUT/ide.js" \
  --metafile=../"$OUT"/.meta-ide.json \
  --log-level=warning)

# 6. Icons: Font Awesome subset to the glyphs the product actually draws, which
#    it finds by searching the source (§5). 367 KB -> ~2.5 KB.
node tool/build_icons.mjs

# 7. Themes: all 18 as CSS custom properties on one stylesheet (§3.4), from the
#    bootswatch npm package, so 4.1 MB of theme builds lives in neither the repo
#    nor the install.
node tool/build_themes.mjs

# Exactly one bundle may embed preact. Two copies of the core means the hooks
# in one file register on a different instance than the one rendering, and the
# first render dies inside useBootstrapPrefix with a stack that points nowhere
# near the cause (§3.1a). The per-bundle check above catches it within ui.js;
# this catches it across bundles, which is how chart.js would have shipped it.
#
# Read from the metafiles, not from the output: minification mangles preact's
# internal names, so there is nothing dependable to grep for.
#
# For chart.js the stronger protection is the source itself: it imports preact
# through the bare specifier "acelery/ui.js", so dropping --external makes
# esbuild refuse the build rather than quietly embed a second copy. This check
# is for a future bundle that imports preact directly, where nothing would
# complain.
node - "$OUT" <<'NODE'
const fs = require("fs");
const dir = process.argv[2];

const embeds = fs.readdirSync(dir)
  .filter((f) => f.startsWith(".meta-") && f.endsWith(".json"))
  .filter((f) => {
    const meta = JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8"));
    return Object.keys(meta.inputs)
      .some((i) => /node_modules\/preact\/dist\/preact\./.test(i));
  })
  .map((f) => f.slice(6, -5) + ".js");

if (embeds.length !== 1 || embeds[0] !== "ui.js") {
  console.error(
    `tool/build_js.sh: preact must be embedded in ui.js and nowhere else.\n` +
    `  Bundles embedding it: ${embeds.join(", ") || "none"}.\n` +
    `  A second bundle needs --external:acelery/* and should import preact\n` +
    `  through acelery/ui.js, so the import map resolves one copy at runtime.`);
  process.exit(1);
}
NODE

rm -f "$OUT"/.meta-*.json

# A stamp over the inputs, so a test can tell that the committed output was
# built from the sources next to it without needing node to rebuild and diff.
cat web/src/acelery/*.js web/src/ui/*.js web/src/editor/*.js web/src/ide/*.js | shasum -a 256 | cut -d' ' -f1 \
  > "$OUT/.sources.sha256"

echo "$OUT: $(ls "$OUT"/*.js | wc -l | tr -d ' ') modules, $(du -sh "$OUT" | cut -f1)"
echo "  ui.js: $(wc -c < "$OUT/ui.js" | tr -d ' ') bytes raw, $(gzip -9 -c "$OUT/ui.js" | wc -c | tr -d ' ') gzipped"
