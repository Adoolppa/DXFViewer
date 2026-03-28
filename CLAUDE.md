# DXF Viewer — Claude 지침

## 프로젝트 개요

웹 기반 2D DXF 뷰어/에디터. C++17 렌더링 엔진을 Emscripten으로 WebAssembly 컴파일, React UI와 연동.

## 아키텍처

```
React (TypeScript) → RendererBridge (TS) → Emscripten Binding → C++ Renderer (WebGL2)
```

- **src/*.cpp / *.h** — C++ DXF 파서 + WebGL2 렌더러
- **src/*.tsx / *.ts** — React UI + WASM 브릿지
- **public/wasm/** — 빌드 산출물 (renderer.js, renderer.wasm)

## 빌드

```bash
# WASM 빌드 (Emscripten 필요, EMSDK=/d/emsdk)
npm run build:wasm

# 개발 서버
npm run dev
```

node_modules는 `C:\DXFnm`에 설치 후 junction 연결 (D: 드라이브 병렬 mkdir ENOENT 버그 우회).
세팅/실행 방법: [SETUP.md](SETUP.md)

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| Frontend | React 19, TypeScript 5, Vite 8, Tailwind 4, Radix UI |
| WASM | C++17, Emscripten, CMake 3.20+, Embind |
| 렌더링 | WebGL2, GLSL ES 3.0, GLM |

자세한 내용: [TECH_STACK.md](TECH_STACK.md)
