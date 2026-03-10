<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-04 | Updated: 2026-03-04 -->

# src/

## Purpose
React **renderer process** 루트 디렉터리. Electron의 BrowserWindow에서 실행되는 React 앱 전체를 포함한다. Node.js API에 직접 접근할 수 없으며, 모든 시스템 작업은 `window.electronAPI`(preload 브릿지)를 통해 IPC로 처리한다.

## Key Files

| File | Description |
|------|-------------|
| `App.js` | 앱 루트 — `TopBar` + `Desktop` 조합 |
| `App.css` | 앱 전역 스타일 |
| `index.js` | React DOM 렌더링 진입점 |
| `index.css` | 전역 CSS 초기화 |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `components/` | React UI 컴포넌트 모음 (see `components/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- **`require('fs')` 등 Node API 직접 사용 금지** — `window.electronAPI.*` 경유 필수
- 새 컴포넌트: `src/components/ComponentName/main/` 구조로 생성
- 전역 상태 필요 시 해당 컴포넌트 폴더 내 `store/state.js`에 Zustand store 생성
- **Recoil 사용 금지** — Zustand로 통일 (`src/recoil/` 폴더는 삭제됨)

### Testing Requirements
```bash
npm start  # React dev server (localhost:3000) 시작
```
브라우저 개발자 도구 Console에서 에러 확인.

### Common Patterns
```javascript
// window.electronAPI 사용 패턴 (silent failure)
try {
  await window.electronAPI?.runApp?.(appPath);
} catch (e) {
  console.warn('앱 실행 실패:', e);
}
```

## Dependencies

### Internal
- `public/preload.js` — `window.electronAPI` 브릿지

### External
- `react 18` — UI 프레임워크
- `zustand ^5` — 전역 상태
- `@dnd-kit/*` — 드래그&드롭

<!-- MANUAL: -->
