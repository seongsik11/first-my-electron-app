<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-04 | Updated: 2026-03-04 -->

# TopBar/main/

## Purpose
앱 상단 창 제어 바 컴포넌트. "My AppSpace" 타이틀 + 최소화/최대화(disabled)/닫기 버튼. `window.electronAPI`로 IPC 창 제어 명령을 전송한다.

## Key Files

| File | Description |
|------|-------------|
| `TopBar.js` | 창 제어 버튼 컴포넌트 |
| `TopBar.module.css` | 탑바/드래그영역/버튼 스타일 |

## For AI Agents

### Working In This Directory
- 새 창 제어 기능 추가 시 IPC 추가 순서: `main.js` → `preload.js` → `TopBar.js`
- 최대화 버튼은 현재 `disabled` — 활성화 원할 시 `main.js`의 `window-maximize` 핸들러와 함께 수정
- 드래그 가능 영역: `.dragRegion` CSS 클래스 (`-webkit-app-region: drag`)

## Dependencies

### Internal
- `window.electronAPI.windowMinimize/windowMaximize/windowClose` — preload.js 브릿지

<!-- MANUAL: -->
