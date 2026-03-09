<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-04 | Updated: 2026-03-04 -->

# src/components/

## Purpose
React UI 컴포넌트 모음. 각 컴포넌트는 독립적인 `ComponentName/main/` 구조로 조직되어 있으며, 전역 상태가 필요한 컴포넌트는 동일 폴더 내 `store/state.js`에 Zustand store를 가진다.

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `Desktop/` | 메인 그리드 + 드래그&드롭 + 페이지 전환 (see `Desktop/AGENTS.md`) |
| `FolderIcon/` | 앱 아이콘 + 빈 슬롯 컴포넌트 (see `FolderIcon/AGENTS.md`) |
| `PageDropZone/` | 드래그 시 페이지 전환 트리거 영역 (see `PageDropZone/AGENTS.md`) |
| `TopBar/` | 창 제어 바 (최소화/최대화/닫기) (see `TopBar/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- 새 컴포넌트 추가 시 반드시 `ComponentName/main/ComponentName.js` + `ComponentName.module.css` 구조로 생성
- 컴포넌트 파일명: **PascalCase** (예: `FolderIcon.js`)
- CSS 파일명: **PascalCase.module.css** (예: `FolderIcon.module.css`)
- 전역 CSS 및 CSS-in-JS 사용 금지 — **CSS Modules 전용**
- 2개 이상 컴포넌트에서 재사용되는 로직은 `src/hooks/`에 커스텀 훅으로 추출

### Common Patterns
```
ComponentName/
  main/
    ComponentName.js          ← 컴포넌트 구현
    ComponentName.module.css  ← CSS Modules 스타일
  store/
    state.js                  ← Zustand store (전역 상태 필요 시만)
```

<!-- MANUAL: -->
