# DXF Viewer — 개발 기록

> 작성일: 2026-03-28
> 환경: Emscripten 5.0.4 / C++17 / Vanilla JS / HTML Canvas 2D

---

## 프로젝트 개요

WebAssembly를 사용한 브라우저 기반 2D DXF 파일 뷰어.
C++로 DXF를 파싱하고 Emscripten으로 WASM 컴파일 후, HTML Canvas에 렌더링한다.

---

## 최종 파일 구조

```
DXFViewer/
├── src/
│   ├── dxf_parser.h       # DXF 파서 헤더 (엔티티 클래스 정의)
│   ├── dxf_parser.cpp     # DXF 파싱 구현 + ACI 색상 테이블
│   └── main.cpp           # Emscripten Embind 바인딩
├── web/
│   ├── index.html         # 메인 UI
│   ├── style.css          # 다크 테마 스타일
│   └── viewer.js          # Canvas 렌더러 + UI 로직
├── build/                 # 빌드 출력 (자동 생성)
│   ├── dxfviewer.js       # Emscripten JS 글루 코드 (29 KB)
│   └── dxfviewer.wasm     # WebAssembly 바이너리 (165 KB)
└── Makefile
```

---

## 아키텍처

### 데이터 흐름

```
[사용자] DXF 파일 드롭 / 파일 선택
    ↓  FileReader.readAsText()
[JS]  Module.parseDXF(text)          ← WASM 호출
[C++] DXFParser::parse()             → DXFDocument (전역 g_doc)
    ↓
[JS]  getLayersJSON()   → 레이어 패널 구성
[JS]  getEntitiesJSON() → 엔티티 배열
[JS]  getBlocksJSON()   → 블록 정의 (INSERT 참조용)
[JS]  getBoundsJSON()   → 바운딩 박스 → fit-to-screen
    ↓
[Canvas 2D] 엔티티 렌더링 (줌/팬 transform 적용)
```

### C++ → JS 인터페이스 (Embind)

| 함수 | 반환 | 설명 |
|------|------|------|
| `parseDXF(string)` | `bool` | DXF 텍스트 파싱 |
| `getEntitiesJSON()` | `string` | 전체 엔티티 JSON 배열 |
| `getLayersJSON()` | `string` | 레이어 목록 (이름, ACI 색상) |
| `getBlocksJSON()` | `string` | 블록 정의 (INSERT 해석용) |
| `getBoundsJSON()` | `string` | 도면 바운딩 박스 |

---

## C++ 구현 (src/)

### 지원 엔티티

| 엔티티 | 처리 방식 |
|--------|-----------|
| `LINE` | 시작/끝점 직접 렌더링 |
| `ARC` | center, radius, startAngle, endAngle |
| `CIRCLE` | center, radius |
| `LWPOLYLINE` | vertex 배열 + bulge(호 세그먼트) 지원 |
| `POLYLINE` | VERTEX 엔티티 읽어 LWPOLYLINE으로 변환 |
| `TEXT` / `MTEXT` | 위치, 높이, 회전각, 텍스트 |
| `ELLIPSE` | majorAxis 벡터 + ratio + param 범위 |
| `INSERT` | 블록 참조 (xScale, yScale, rotation, 배열) |
| `SPLINE` | 제어점을 폴리라인으로 근사 |

### DXF 섹션 파싱

- **TABLES** → LAYER 엔티티: 이름, ACI colorIndex, 가시성
- **BLOCKS** → 블록 정의 (baseX/Y + 내부 엔티티)
- **ENTITIES** → 실제 도면 엔티티

### 좌표계 처리

DXF는 Y-up, Canvas는 Y-down.
렌더링 시 도면 중심 기준으로 Y축 반전:

```
canvasY = -(worldY - docCenterY) * scale + canvasHeight/2
```

### ACI 색상

AutoCAD Color Index(0~255)를 RGB로 변환하는 256-entry 테이블 내장.
`aciToRGB(int aci) → Color{r,g,b}`

---

## JS 구현 (web/viewer.js)

### 뷰포트 Transform

```
canvasX = worldX * scale + tx
canvasY = -(worldY - docCenterY) * scale + ty + canvasHeight/2
```

### 줌 / 팬

- **줌**: 마우스 휠, 마우스 위치 기준으로 확대/축소
- **팬**: 마우스 드래그 (mousedown + mousemove on window)
- **버튼**: +/- 버튼으로 캔버스 중심 기준 25% 단계 줌

### 렌더링

- `requestAnimationFrame` 기반 (중복 요청 방지)
- 레이어 `isOff` 플래그로 가시성 필터
- BYLAYER 색상: 엔티티 color=-1이면 레이어 색상 사용
- LWPOLYLINE bulge 세그먼트: 직접 arc 계산

### INSERT 처리

블록 엔티티를 JS 상태(`state.blocks`)에 캐싱.
`ctx.save()` → transform 적용 → 블록 엔티티 재귀 렌더링 → `ctx.restore()`

---

## UI 기능

### 툴바

| 버튼 | 기능 |
|------|------|
| 열기 | 파일 선택 다이얼로그 |
| 화면 맞춤 | Fit to Screen (바운딩 박스 기준) |
| +/− | 25% 단계 줌 |
| 레이어 | 레이어 패널 토글 |

### 레이어 패널

- 레이어 목록 (알파벳 순 정렬)
- **체크박스**: 레이어 가시성 토글
- **색상 칩**: 클릭 → 브라우저 컬러 피커로 색상 변경 (BYLAYER 엔티티 즉시 반영)
- 전체/없음 버튼으로 일괄 토글

### 파일 로드

- Drag & Drop
- 파일 선택 버튼

---

## 빌드

### 환경

- Emscripten 5.0.4 (`D:\emsdk`)
- Node.js 22.16.0 (emsdk 내장)
- Python 3.13.3 (emsdk 내장)

### 빌드 명령

```bash
# 릴리즈 빌드
make

# 디버그 빌드 (ASSERTIONS=2 + source map)
make debug

# 직접 실행
/d/emsdk/upstream/emscripten/emcc.bat -O2 -std=c++17 \
  -s WASM=1 --bind \
  -s ALLOW_MEMORY_GROWTH=1 -s MAXIMUM_MEMORY=512mb \
  -s ENVIRONMENT=web \
  src/main.cpp src/dxf_parser.cpp -o build/dxfviewer.js
```

### 빌드 결과

| 파일 | 크기 |
|------|------|
| `build/dxfviewer.js` | 29 KB |
| `build/dxfviewer.wasm` | 165 KB |

### 로컬 서버 실행

```cmd
cd D:\Project\DXFViewer
python -m http.server 8080
```

접속: `http://localhost:8080/web/index.html`

---

## 주요 설계 결정

| 항목 | 결정 | 이유 |
|------|------|------|
| 렌더러 | Canvas 2D (WebGL 아님) | 2D DXF에 충분, 구현 단순 |
| 바인딩 | Embind (cwrap 아님) | 문자열 전달이 자연스러움 |
| 데이터 전달 | JSON 문자열 | 추가 Embind 타입 정의 불필요 |
| 메모리 | ALLOW_MEMORY_GROWTH | 대형 DXF 파일 대응 |
| 색상 | ACI 테이블 JS/C++ 양쪽 보유 | 레이어 커스텀 색상 기능 지원 |

---

## 알려진 한계 및 향후 개선

- SPLINE은 제어점 폴리라인으로 근사 (B-spline 미구현)
- HATCH, SOLID, 3DFACE 미지원
- 매우 큰 파일(수십만 엔티티)은 JS 렌더링 병목 발생 가능 → 레이어별 OffscreenCanvas 캐싱으로 개선 가능
- INSERT 중첩 깊이 제한 없음 (순환 참조 시 무한루프 위험)
- 텍스트 폰트는 monospace 고정
