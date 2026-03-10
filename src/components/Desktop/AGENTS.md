<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-04 | Updated: 2026-03-04 -->

# Desktop/

## Purpose
앱의 핵심 컴포넌트. 아이콘 그리드 렌더링, @dnd-kit 드래그&드롭 조율, 페이지 전환(스와이프/휠/엣지 감지), 레이아웃 자동 저장/복원을 담당한다.

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `main/` | Desktop 컴포넌트 구현 (see `main/AGENTS.md`) |
| `store/` | Zustand 전역 상태 (see `store/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- 드래그&드롭 로직 변경 시 `main/Desktop.js`의 `handleDragEnd` 함수 집중 수정
- 상태 추가 시 `store/state.js`에 Zustand 패턴으로 추가
- **PAGE_SIZE = 105 변경 금지** — 그리드 레이아웃 전체에 영향

<!-- MANUAL: -->
