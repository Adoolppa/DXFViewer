#!/usr/bin/env bash
set -euo pipefail

EMSDK_PATH="${EMSDK:-/d/emsdk}"

# shellcheck disable=SC1091
source "$EMSDK_PATH/emsdk_env.sh"

mkdir -p build/wasm public/wasm

emcmake cmake -B build/wasm \
  -DCMAKE_BUILD_TYPE=Release \
  .

cmake --build build/wasm

echo ""
echo "WASM build complete:"
echo "  public/wasm/renderer.js"
echo "  public/wasm/renderer.wasm"
