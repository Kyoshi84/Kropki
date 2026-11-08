#!/usr/bin/env bash
# Buduje paczkę gry do wysłania na CrazyGames: dist/notebook-dots-crazygames.zip
# Zawiera tylko pliki potrzebne do gry (bez materiałów promocyjnych i dokumentacji).
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p dist
OUT="dist/notebook-dots-crazygames.zip"
rm -f "$OUT"
zip -qr "$OUT" index.html css js fonts
echo "Gotowe: $OUT ($(du -h "$OUT" | cut -f1), $(unzip -Z1 "$OUT" | grep -vc '/$') plików)"
