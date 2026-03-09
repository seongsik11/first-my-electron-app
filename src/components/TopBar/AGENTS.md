<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-04 | Updated: 2026-03-04 -->

# TopBar/

## Purpose
앱 상단 창 제어 바. "My AppSpace" 타이틀과 최소화/최대화/닫기 버튼을 포함한다. `window.electronAPI`를 통해 IPC로 창 제어 명령을 전송한다. 최대화 버튼은 현재 `disabled` 상태.

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `main/` | TopBar 컴포넌트 구현 (see `main/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- 창 제어 기능 추가 시 `public/main.js` IPC 핸들러 → `public/preload.js` → `TopBar.js` 순서로 추가
- `-webkit-app-region: drag` CSS는 TopBar.module.css의 `.dragRegion`에서 처리

<!-- MANUAL: -->
