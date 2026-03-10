<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-04 | Updated: 2026-03-04 -->

# FolderIcon/main/

## Purpose
앱 아이콘 관련 컴포넌트 구현부. 세 가지 컴포넌트를 export한다:
- `AppIcon` (default) — 드래그 가능한 앱 아이콘
- `AppIconOverlay` — DragOverlay용 드래그 중 표시 아이콘
- `EmptySlot` — 빈 슬롯 (드롭 대상, 직접 드래그 불가)

## Key Files

| File | Description |
|------|-------------|
| `FolderIcon.js` | AppIcon, AppIconOverlay, EmptySlot 컴포넌트 |
| `FolderIcon.module.css` | 아이콘/레이블/슬롯 스타일 |
| `Icon.module.css` | 아이콘 이미지 전용 스타일 |

## For AI Agents

### Working In This Directory
- `animateLayoutChanges` → 항상 `false` 반환 — FLIP 애니메이션 완전 비활성화 (드롭 후 역방향 슬라이드 버그 방지)
- `AppIcon` transform: scale 없이 translate3d만 사용 (scaleX/Y 왜곡 방지)
- `EmptySlot`: `listeners` 미적용 — 드롭 대상으로만 사용, 직접 드래그 불가
- `data-sortable="true"` 속성 — Desktop.js에서 마우스 스와이프 충돌 방지용으로 감지함

### Common Patterns
```javascript
// transform 적용 패턴 (scale 제거)
const style = {
  transform: transform
    ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
    : undefined,
  opacity: isDragging ? 0.5 : 1,
};
```

## Dependencies

### External
- `@dnd-kit/sortable` — useSortable

<!-- MANUAL: -->
