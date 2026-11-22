#!/usr/bin/env bash
# Buduje paczkę gry dla Playgama: dist/notebook-dots-playgama-<wersja>.zip
# Podmienia CrazyGames SDK na Playgama Bridge (pierwszy skrypt w <head>)
# i js/platform.js na js/platform-playgama.js. Źródła w repo zostają bez zmian.
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION="${1:-1.1.0}"
BUILD="dist/playgama"
OUT="dist/notebook-dots-playgama-${VERSION}.zip"
rm -rf "$BUILD" "$OUT"
mkdir -p "$BUILD/js"
cp -r css fonts "$BUILD/"
cp js/i18n.js js/engine.js js/app.js "$BUILD/js/"
cp js/platform-playgama.js "$BUILD/js/platform.js"
cp playgama/playgama-bridge-config.json "$BUILD/"
python3 - "$BUILD/index.html" <<'PY'
import re, sys
src = open('index.html', encoding='utf-8').read()
src = re.sub(r'\s*<!-- CrazyGames SDK[^>]*-->\s*<script src="https://sdk\.crazygames\.com/[^"]+"></script>', '', src)
src = src.replace('<head>', '<head>\n  <script src="https://bridge.playgama.com/v2/stable/playgama-bridge.js"></script>', 1)
assert 'crazygames' not in src.lower() and 'playgama-bridge.js' in src
open(sys.argv[1], 'w', encoding='utf-8').write(src)
PY
(cd "$BUILD" && zip -qr "../../$OUT" .)
echo "Gotowe: $OUT ($(du -h "$OUT" | cut -f1), $(unzip -Z1 "$OUT" | grep -vc '/$') plików)"
