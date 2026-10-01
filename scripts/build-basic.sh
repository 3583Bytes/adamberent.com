#!/usr/bin/env bash
# Builds Arcade BASIC (https://github.com/3583Bytes/Arcade-BASIC) for the browser and
# copies the runtime plus example programs into public/basic/ for Vite to serve.
set -euo pipefail

# Bump this to pick up a newer interpreter.
ARCADE_REF=a52d0e1bb5a2231406fa4c5defcaf1047c88e020
# Keep in sync with src/basic/programs.ts.
PROGRAMS="hello guess primes fibonacci pi mandelbrot graphics music lunar startrek snake tetris breakout invaders"

root="$(cd "$(dirname "$0")/.." && pwd)"
src="$root/.arcade-basic"
out="$root/.basic-out"
dest="$root/public/basic"

if [ ! -d "$src/.git" ]; then
  # Skip the large spec PDFs; the build only needs source files.
  git clone --quiet --filter=blob:limit=2m https://github.com/3583Bytes/Arcade-BASIC "$src"
fi
if [ "$(git -C "$src" rev-parse HEAD)" != "$ARCADE_REF" ]; then
  git -C "$src" fetch --quiet origin "$ARCADE_REF"
  git -C "$src" checkout --quiet "$ARCADE_REF"
fi

rm -rf "$out"
dotnet publish "$root/basic/ArcadeBasic.Web.csproj" -c Release -o "$out" -p:ArcadeBasicSrc="$src" --nologo -v quiet

rm -rf "$dest"
mkdir -p "$dest/_framework" "$dest/programs"
# GitHub Pages compresses on the fly and ignores precompressed files, so skip .br/.gz.
find "$out/wwwroot/_framework" -type f ! -name '*.br' ! -name '*.gz' -exec cp {} "$dest/_framework/" \;

for name in $PROGRAMS; do
  cp "$src/examples/$name.bas" "$dest/programs/$name.bas"
done

echo "Arcade BASIC $ARCADE_REF -> public/basic ($(du -sh "$dest" | cut -f1))"
