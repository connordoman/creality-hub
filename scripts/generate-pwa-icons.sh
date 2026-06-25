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

square_icon() {
  local size="$1"
  local output="$2"
  magick "${SOURCE}" -resize "${size}x${size}" -background black -gravity center \
    -extent "${size}x${size}" "${output}"
}

maskable_icon() {
  local safe_zone="$1"
  local canvas="$2"
  local output="$3"
  magick "${SOURCE}" -resize "${safe_zone}x${safe_zone}" -background black -gravity center \
    -extent "${safe_zone}x${safe_zone}" -background black -gravity center \
    -extent "${canvas}x${canvas}" "${output}"
}

for size in 72 96 128 144 152 192 384 512; do
  square_icon "${size}" "${OUT_DIR}/icon-${size}x${size}.png"
done

maskable_icon 154 192 "${OUT_DIR}/icon-maskable-192x192.png"
maskable_icon 410 512 "${OUT_DIR}/icon-maskable-512x512.png"

square_icon 180 "${ROOT}/public/apple-touch-icon.png"
square_icon 32 "${ROOT}/public/favicon-32x32.png"
square_icon 16 "${ROOT}/public/favicon-16x16.png"
magick "${ROOT}/public/favicon-16x16.png" "${ROOT}/public/favicon-32x32.png" \
  "${ROOT}/public/favicon.ico"

echo "Generated PWA icons in ${OUT_DIR}"
