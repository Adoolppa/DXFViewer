# DXF Viewer — 실행 방법

## 처음 세팅 또는 node_modules 초기화 후

### 1. node_modules junction 연결

node_modules는 `C:\DXFnm`에 설치 후 junction으로 연결 (D: 드라이브 병렬 mkdir ENOENT 버그 우회).

junction이 끊겼거나 처음 세팅할 때:

```powershell
# PowerShell (관리자 불필요)
Remove-Item -Path 'D:\Project\DXFViewer\node_modules' -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Junction -Path 'D:\Project\DXFViewer\node_modules' -Target 'C:\DXFnm\node_modules'
```

junction 확인: `(Get-Item 'D:\Project\DXFViewer\node_modules').Target` → `C:\DXFnm\node_modules` 가 출력되어야 함.

패키지 추가/변경 시에는 `C:\DXFnm` 디렉토리에서 `npm install` 실행.

### 2. WASM 빌드

C++ 소스(`src/*.cpp`)를 수정했거나 처음 실행할 때 필요. emsdk는 `/d/emsdk`에 설치되어 있음.

```bash
# Git Bash
npm run build:wasm
```

산출물: `public/wasm/renderer.js`, `public/wasm/renderer.wasm`

### 3. 개발 서버 실행

```bash
# Git Bash 또는 PowerShell (실행 정책 설정 필요 시: Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned)
npm run dev
```

브라우저에서 `http://localhost:5173` 접속.
