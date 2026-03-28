#!/usr/bin/env bash
set -euo pipefail

EMSDK_PATH="${EMSDK:-/d/emsdk}"
EMSCRIPTEN="${EMSDK_PATH}/upstream/emscripten"

export EM_CONFIG="${EMSDK_PATH}/.emscripten"

# Git Bash에서는 emcc가 .py로만 존재하므로 python으로 래핑
EMCMAKE="python ${EMSCRIPTEN}/emcmake.py"
CMAKE_CMD="cmake"

mkdir -p build/wasm public/wasm

${EMCMAKE} ${CMAKE_CMD} -B build/wasm \
  -DCMAKE_BUILD_TYPE=Release \
  .

${CMAKE_CMD} --build build/wasm

echo ""
echo "WASM build complete:"
echo "  public/wasm/renderer.js"
echo "  public/wasm/renderer.wasm"
