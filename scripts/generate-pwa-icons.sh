#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="${ROOT}/scripts/assets/creality-logo.png"
OUT_DIR="${ROOT}/public/icons"

if ! command -v magick >/dev/null 2>&1; then
  echo "ImageMagick is required. Install with: brew install imagemagick" >&2
  exit 1
fi

if [[ ! -f "${SOURCE}" ]]; then
  echo "Source logo not found at ${SOURCE}" >&2
  exit 1
fi

mkdir -p "${OUT_DIR}"

for size in 72 96 128 144 152 192 384 512; do
  magick "${SOURCE}" -resize "${size}x${size}" "${OUT_DIR}/icon-${size}x${size}.png"
done

# Maskable icons keep the logo inside the 80% safe zone.
magick "${SOURCE}" -resize 154x154 -background black -gravity center -extent 192x192 \
  "${OUT_DIR}/icon-maskable-192x192.png"
magick "${SOURCE}" -resize 410x410 -background black -gravity center -extent 512x512 \
  "${OUT_DIR}/icon-maskable-512x512.png"

magick "${SOURCE}" -resize 180x180 "${ROOT}/public/apple-touch-icon.png"
magick "${SOURCE}" -resize 32x32 "${ROOT}/public/favicon-32x32.png"
magick "${SOURCE}" -resize 16x16 "${ROOT}/public/favicon-16x16.png"
magick "${ROOT}/public/favicon-16x16.png" "${ROOT}/public/favicon-32x32.png" \
  "${ROOT}/public/favicon.ico"

echo "Generated PWA icons in ${OUT_DIR}"
