#!/usr/bin/env bash
# Rebuild the PWA icons from assets/glyph.png — the original white dollar-sign
# artwork on a transparent background — so it lands dead centre at every size.
#
# Rounded corners (transparent outside) for the manifest icons and for
# apple-touch — iOS composites that transparency, which shifts the look
# between light and dark mode. Only the Android maskable icon is full-bleed,
# since its mask is applied to the whole square.
set -euo pipefail
cd "$(dirname "$0")/.."

BG="#2d6a4f"   # must match --accent / theme_color
R=102          # corner radius at 512px

# $1=size $2=out — solid rounded square, transparent outside
round_bg() {
  local r; r=$(( R * $1 / 512 ))
  magick -size "${1}x${1}" xc:none -fill "$BG" \
    -draw "roundrectangle 0,0 $(( $1 - 1 )),$(( $1 - 1 )) $r,$r" "$2"
}

# $1=size $2=out — solid square, edge to edge
flat_bg() { magick -size "${1}x${1}" xc:"$BG" "$2"; }

# $1=bg $2=size $3=glyph height as fraction of canvas $4=out
compose() {
  local h; h=$(awk "BEGIN{printf \"%d\", $2 * $3}")
  magick "$1" \( assets/glyph.png -resize "x${h}" \) \
    -gravity center -compose Over -composite "$4"
}

TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT

round_bg 512 "$TMP/r512.png"; compose "$TMP/r512.png" 512 0.586 public/icon-512.png
round_bg 192 "$TMP/r192.png"; compose "$TMP/r192.png" 192 0.586 public/icon-192.png
round_bg 180 "$TMP/r180.png"; compose "$TMP/r180.png" 180 0.560 public/apple-touch-icon.png
flat_bg  512 "$TMP/f512.png"; compose "$TMP/f512.png" 512 0.500 public/icon-maskable.png

echo "icons rebuilt:"
for f in public/icon-192.png public/icon-512.png public/apple-touch-icon.png public/icon-maskable.png; do
  printf '  %-30s %s\n' "$f" "$(magick "$f" -format '%wx%h' info:)"
done
