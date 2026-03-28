cmake_minimum_required(VERSION 3.20)
project(DXFViewer CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# ---------------------------------------------------------------------------
# Source files
# ---------------------------------------------------------------------------
set(SOURCES
    src/main.cpp
    src/dxf_parser.cpp
    src/renderer.cpp
)

add_executable(renderer ${SOURCES})

# ---------------------------------------------------------------------------
# Emscripten link flags
# ---------------------------------------------------------------------------
if(EMSCRIPTEN)
    set(EM_LINK_FLAGS
        "-s WASM=1"
        "--bind"
        "-s ALLOW_MEMORY_GROWTH=1"
        "-s MAXIMUM_MEMORY=512mb"
        "-s ENVIRONMENT=web"
        "-s MODULARIZE=1"
        "-s EXPORT_NAME=createRenderer"
        "-s USE_WEBGL2=1"
        "-s FULL_ES3=1"
        "-s MIN_WEBGL_VERSION=2"
        "-s MAX_WEBGL_VERSION=2"
        "-s EXPORTED_RUNTIME_METHODS=[]"
    )

    # Release vs Debug flags (controlled by CMAKE_BUILD_TYPE)
    if(CMAKE_BUILD_TYPE STREQUAL "Debug")
        target_compile_options(renderer PRIVATE -O0 -g)
        list(APPEND EM_LINK_FLAGS
            "-s ASSERTIONS=2"
            "-gsource-map"
        )
    else()
        target_compile_options(renderer PRIVATE -O2)
    endif()

    string(JOIN " " EM_LINK_FLAGS_STR ${EM_LINK_FLAGS})
    set_target_properties(renderer PROPERTIES
        LINK_FLAGS "${EM_LINK_FLAGS_STR}"
        SUFFIX ".js"
        RUNTIME_OUTPUT_DIRECTORY "${CMAKE_SOURCE_DIR}/public/wasm"
    )
else()
    message(FATAL_ERROR
        "이 프로젝트는 Emscripten으로만 빌드할 수 있습니다.\n"
        "emcmake cmake 를 사용하세요:\n"
        "  emcmake cmake -B build/wasm -DCMAKE_BUILD_TYPE=Release .\n"
        "  cmake --build build/wasm\n"
    )
endif()
