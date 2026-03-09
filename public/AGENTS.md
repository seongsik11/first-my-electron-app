<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-04 | Updated: 2026-03-04 -->

# public/

## Purpose
Electron **main process** 및 정적 자산 디렉터리. Node.js 환경에서 실행되며 파일시스템, SQLite DB, IPC 핸들러, 창 제어 등 시스템 레벨 작업을 담당한다. React/renderer process와 완전히 분리된 환경이다.

## Key Files

| File | Description |
|------|-------------|
| `main.js` | Electron main process 진입점 — 창 생성, DB 초기화, IPC 핸들러 등록 |
| `preload.js` | IPC 보안 브릿지 — `contextBridge`로 `window.electronAPI` 노출 |
| `index.html` | React 앱 진입 HTML (CRA 기본 템플릿) |
| `manifest.json` | PWA 매니페스트 |

## For AI Agents

### Working In This Directory
- **renderer에서 Node.js API 직접 사용 금지** — 반드시 preload를 통해 IPC 경유
- **`contextIsolation: false` 또는 `nodeIntegration: true` 설정 금지** — 보안 위반
- 새 IPC 채널 추가 순서:
  1. `main.js` — `registerHandler('채널명', handler)` 호출
  2. `preload.js` — `contextBridge.exposeInMainWorld`에 메서드 추가
  3. renderer — `window.electronAPI.메서드명()` 호출
- IPC 채널명: **kebab-case** (예: `get-applications`, `save-layout`)
- **`registerHandler()` 헬퍼 함수 필수 사용** — 직접 `ipcMain.handle()` 금지 (중복 방지)
- 로깅: `electron-log` 사용 (`console.log` 대신 `log.info/warn/error`)

### DB 관련 주의사항
- DB 경로: `~/Library/Application Support/my-electron/appspace.db`
- 테이블: `layout` (pages_data JSON, current_page), `icon_cache` (app_path PK, icon_data base64)
- 모든 DB 핸들러 첫 줄에 `if (!db) return;` null 가드 필수
- `initDatabase()`는 try-catch로 감싸져 있음 — 실패 시 `db = null`

### Testing Requirements
- Electron 재시작 후 IPC 동작 확인
- DB 변경 시 `~/Library/Application Support/my-electron/appspace.db` 직접 확인 가능

### Common Patterns
```javascript
// IPC 핸들러 등록 패턴
registerHandler('channel-name', async (event, arg) => {
  if (!db) return null; // DB null 가드
  try {
    // 로직
  } catch (e) {
    log.warn('설명:', e);
  }
});

// preload.js 패턴
contextBridge.exposeInMainWorld('electronAPI', {
  newFeature: (arg) => ipcRenderer.invoke('new-feature', arg),
});
```

## Dependencies

### External
- `electron 37` — 데스크탑 프레임
- `better-sqlite3` — SQLite DB (ABI rebuild 필요: `@electron/rebuild`)
- `electron-log` — 로깅
- `simple-plist` — macOS Info.plist 파싱
- `electron-squirrel-startup` — 설치 이벤트 처리

<!-- MANUAL: -->
