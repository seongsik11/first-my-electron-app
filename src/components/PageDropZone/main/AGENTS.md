<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-04 | Updated: 2026-03-04 -->

# PageDropZone/main/

## Purpose
드래그 중 화면 좌우 가장자리에 표시되는 페이지 전환 드롭 영역 컴포넌트. `useDroppable`로 드롭 감지, `isOver` 상태에 따라 그라데이션 하이라이트 표시.

## Key Files

| File | Description |
|------|-------------|
| `PageDropZone.js` | 좌/우 가장자리 드롭존 컴포넌트 |

## For AI Agents

### Working In This Directory
- `id` prop: `"page-left"` 또는 `"page-right"` — Desktop.js handleDragEnd에서 이 id로 감지
- `side` prop: `"left"` | `"right"` — 그라데이션 방향 결정
- width `40px` = `Desktop.js`의 `EDGE_ZONE_WIDTH` 상수와 반드시 동기화

## Dependencies

### External
- `@dnd-kit/core` — useDroppable

<!-- MANUAL: -->
