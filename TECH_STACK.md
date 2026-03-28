# Tech Stack

이 프로젝트는 **웹 기반 DXF Viewer 및 Editor**로, C++ 렌더링 엔진을 WebAssembly로 컴파일하고 React UI가 그 위에 얹힌 하이브리드 아키텍처입니다.

---

## 전체 아키텍처

```
┌─────────────────────────────────┐
│         React (Frontend)        │
│  TypeScript + Tailwind + Radix  │
└────────────┬────────────────────┘
             │  JS Bridge (Emscripten Bindings)
┌────────────▼────────────────────┐
│      WebAssembly (Backend)      │
│   C++17 + WebGL2 + GLM          │
└─────────────────────────────────┘
```

---

## 1. Frontend (React 레이어)

| 기술 | 버전 | 역할 |
|------|------|------|
| React | 19.2 | UI 프레임워크 |
| TypeScript | 5.9 | 타입 안전성 |
| Vite | 8.0 | 번들러 / 개발 서버 |
| Tailwind CSS | 4.2 | 스타일링 |
| Radix UI | 다수 | 접근성 있는 UI 컴포넌트 (Slider, Switch, Tabs, Tooltip, DropdownMenu) |
| Lucide React | 0.577 | 아이콘 라이브러리 |

### 구조 패턴

- `RendererContext` (React Context) + `useWasmModule` / `useRendererBridge` Custom Hook으로 WASM 모듈을 앱 전역에 공유
- `RendererBridge`가 WASM C++ 함수들을 TypeScript 인터페이스로 래핑

---

## 2. Backend / Viewer and Editor (C++ → WASM 레이어)

### 컴파일 도구

| 기술 | 역할 |
|------|------|
| Emscripten | C++ → WebAssembly 크로스 컴파일러 |
| CMake 3.20+ | C++ 빌드 시스템 |
| C++17 | 언어 표준 |

Emscripten의 `--bind` (Embind)를 사용해 C++ 클래스/함수를 JavaScript에 직접 노출.

### 렌더링

| 기술 | 역할 |
|------|------|
| WebGL2 (OpenGL ES 3.0) | GPU 렌더링 API |
| GLSL ES 3.0 | 셰이더 언어 |
| GLM | 수학 라이브러리 (벡터 / 행렬) |

**구현된 렌더링 기능:**

## 3. 데이터 흐름

```
사용자 입력 (React UI)
    → TypeScript Bridge 함수 호출
    → Emscripten Binding으로 C++ 함수 직접 호출
    → Renderer::renderFrame()  →  WebGL2 draw call
    → Canvas에 렌더링
```

---

## 4. 빌드 시스템

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | Vite 개발 서버 실행 |
| `npm run build` | TypeScript 컴파일 + Vite 프로덕션 빌드 |
| `npm run build:wasm` | `scripts/build-wasm.sh` 실행 → Emscripten으로 C++ 빌드 |

WASM은 `MODULARIZE=1` 옵션으로 빌드되어 `window.createRenderer()` 팩토리 패턴으로 로드됩니다.
빌드 산출물: `public/wasm/renderer.js` + `public/wasm/renderer.wasm`

### Vite 설정 포인트

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

SharedArrayBuffer 사용을 위한 COOP/COEP 헤더가 개발 서버에 설정되어 있습니다.
