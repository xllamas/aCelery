#!/bin/sh
# Packs bundle/ into assets/aCelery.zip, the asset BundleInstaller unzips into
# the app's documents directory on first run.
#
# bundle/ is the source of truth; the zip is a build artifact. Entries are
# prefixed with "aCelery/" because the installer extracts into the parent of
# that folder (see ACeleryPaths).
#
# Run after editing anything under bundle/, then bump
# ACeleryRuntime.bundleVersion so installed devices pick the change up.
set -e
cd "$(dirname "$0")/.."

rm -f assets/aCelery.zip
mkdir -p assets

# Zip from a staging directory so entries carry the aCelery/ prefix without
# needing a real folder of that name in the repo.
STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$STAGE/aCelery"
cp -R bundle/. "$STAGE/aCelery/"
find "$STAGE" -name '.DS_Store' -delete

(cd "$STAGE" && zip -q -r -X "$OLDPWD/assets/aCelery.zip" aCelery)

echo "assets/aCelery.zip: $(unzip -l assets/aCelery.zip | tail -1)"
