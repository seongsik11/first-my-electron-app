<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-04 | Updated: 2026-03-04 -->

# Desktop/store/

## Purpose
Desktop 컴포넌트의 Zustand 전역 상태 저장소. 앱 페이지 구조, 현재 페이지, 터치/드래그 상태를 관리한다.

## Key Files

| File | Description |
|------|-------------|
| `state.js` | useDesktopStore — Zustand store 정의 |

## For AI Agents

### Working In This Directory
- **selector 패턴 필수** — `useDesktopStore((state) => state.값)` 형식만 허용
- `useDesktopStore()` 전체 구조분해 금지 (불필요한 리렌더링 유발)
- 새 상태 추가 시 상태값 + setter 쌍으로 추가

### 현재 상태 구조
```javascript
{
  pages: [[]],        // 페이지 배열 — 각 페이지는 105개 슬롯
  currentPage: 0,     // 현재 페이지 인덱스
  touchStartX: null,  // 터치 시작 X좌표 (스와이프용)
  activeId: null,     // 현재 드래그 중인 아이템 id
}
```

### Common Patterns
```javascript
// ✅ 올바른 패턴
const pages = useDesktopStore((state) => state.pages);
const setPages = useDesktopStore((state) => state.setPages);

// ❌ 금지
const { pages, setPages } = useDesktopStore();
```

<!-- MANUAL: -->
