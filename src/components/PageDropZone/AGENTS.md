<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-04 | Updated: 2026-03-04 -->

# PageDropZone/

## Purpose
드래그 중 화면 좌우 가장자리(40px)에 표시되는 페이지 전환 트리거 드롭 영역. `@dnd-kit/core`의 `useDroppable`을 사용하며, 드래그가 올라오면 그라데이션 하이라이트로 시각적 피드백을 제공한다.

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `main/` | PageDropZone 컴포넌트 구현 (see `main/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- `EDGE_ZONE_WIDTH`(40px)는 `Desktop.js`의 상수와 동기화 필요 — 한쪽만 변경 금지
- `id="page-left"`, `id="page-right"` — `Desktop.js` handleDragEnd에서 이 id로 감지

<!-- MANUAL: -->
