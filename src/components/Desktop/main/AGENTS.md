<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-04 | Updated: 2026-03-04 -->

# Desktop/main/

## Purpose
Desktop 컴포넌트 구현부. 아이콘 그리드 렌더링, @dnd-kit DnD 조율, 페이지 전환(스와이프/휠/엣지감지), 레이아웃 저장/복원 로직이 모두 여기에 있다.

## Key Files

| File | Description |
|------|-------------|
| `Desktop.js` | 메인 컴포넌트 — DndContext, SortableContext, 페이지 렌더링 |
| `Desktop.module.css` | 그리드/페이지/인디케이터 스타일 |

## For AI Agents

### Working In This Directory
- `handleDragEnd` — 드래그&드롭 시나리오별 분기 처리 (엣지 이동 / 빈슬롯 교체 / 앱↔앱 arrayMove)
- `createEdgeCollision` — 커스텀 충돌 감지 전략 (좌우 40px 엣지 + rectIntersection)
- `chunkIntoPagesWithEmptySlots` — 앱 배열을 PAGE_SIZE(105)개 페이지로 분할
- `isInitialLoad` ref — 초기 로딩 중 debounce 저장 방지 플래그
- stale closure 방지용 ref: `currentPageRef`, `pagesLengthRef`, `activeIdRef`

### 드래그 시나리오 (handleDragEnd)
1. `overId === "page-left" | "page-right"` → 페이지 이동
2. `toItem.type === 'empty'` → 빈 슬롯 위치 교체
3. `fromPage === toPage` → 같은 페이지 내 `arrayMove`
4. 다른 페이지 → 두 아이템 위치 교환

### Testing Requirements
- 드래그&드롭 변경 시 반드시 실제 Electron 앱에서 좌/우/위/아래 방향 드래그 모두 확인
- 페이지 간 이동, 빈 슬롯 드롭, 앱↔앱 드롭 시나리오 모두 테스트

### Common Patterns
```javascript
// Zustand selector (필수 패턴)
const pages = useDesktopStore((state) => state.pages);
const setPages = useDesktopStore((state) => state.setPages);

// transform — scale 왜곡 방지 (x/y translate만 사용)
transform: transform
  ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
  : undefined,
```

## Dependencies

### Internal
- `../store/state.js` — useDesktopStore (Zustand)
- `../../FolderIcon/main/FolderIcon.js` — AppIcon, EmptySlot, AppIconOverlay
- `../../PageDropZone/main/PageDropZone.js` — 페이지 전환 드롭존

### External
- `@dnd-kit/core` — DndContext, DragOverlay, PointerSensor
- `@dnd-kit/sortable` — SortableContext, arrayMove

<!-- MANUAL: -->
