<!-- Generated: 2026-03-04 | Updated: 2026-03-04 -->

# my-electron (My AppSpace)

## Purpose
macOS 앱 런처 — iPhone 홈 스크린 스타일의 Electron 데스크탑 앱. `/Applications` 디렉터리를 스캔하여 앱 아이콘을 그리드로 표시하고, 드래그&드롭으로 아이콘 정렬 및 페이지 이동을 지원한다. 레이아웃은 SQLite DB에 자동 저장된다.

## Key Files

| File | Description |
|------|-------------|
| `package.json` | 프로젝트 의존성 및 스크립트 (패키지 매니저: yarn) |
| `CLAUDE.md` | Claude Code 개발 규칙 (최우선 참조) |
| `.claude/CLAUDE.md` | OMC 설정 (oh-my-claudecode) |
| `.claude/agents/git-workflow.md` | Git/GitHub 작업 전담 에이전트 지침 |
| `.env.local` | 환경 변수 (Notion API 토큰 등 — 커밋 금지) |
| `save-to-notion.js` | Notion 페이지 저장 유틸리티 스크립트 |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `public/` | Electron main process + 정적 자산 (see `public/AGENTS.md`) |
| `src/` | React renderer process (see `src/AGENTS.md`) |
| `.claude/` | Claude Code 에이전트 설정 (see `.claude/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- **패키지 매니저는 yarn** — `npm install` 절대 사용 금지
- 루트 파일 수정 시 `CLAUDE.md` 규칙을 항상 먼저 확인
- 새 IPC 채널 추가 시 `public/main.js` → `public/preload.js` → renderer 순서 준수
- Git 작업은 반드시 `git-workflow` 에이전트에 위임 (proactively delegate)

### Testing Requirements
```bash
npm start        # React dev server (localhost:3000)
npm run electron # Electron 실행 (별도 터미널)
```

### Common Patterns
- 모든 답변/주석은 한국어
- CSS Modules 필수 (CSS-in-JS 금지)
- Zustand selector 패턴 필수 (`useDesktopStore((state) => state.값)`)
- 커밋 형식: `type/#N 요약` (issue 브랜치) 또는 `type: summary` (예외)

## Dependencies

### External
- `electron 37` — 데스크탑 프레임
- `react 18` — UI 프레임워크
- `zustand ^5` — 전역 상태 관리
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/modifiers` — 드래그&드롭
- `better-sqlite3` — 레이아웃 영속 저장 (SQLite)
- `electron-log` — main process 로깅
- `simple-plist` — macOS plist 파싱 (아이콘 경로)

<!-- MANUAL: -->
