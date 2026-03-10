<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-04 | Updated: 2026-03-04 -->

# .claude/

## Purpose
Claude Code 에이전트 설정 디렉터리. 프로젝트별 CLAUDE.md, 전담 에이전트 지침, 로컬 설정 파일을 포함한다.

## Key Files

| File | Description |
|------|-------------|
| `CLAUDE.md` | OMC(oh-my-claudecode) 설정 — `<!-- OMC:START/END -->` 블록 포함 |
| `settings.local.json` | 로컬 훅 설정 (git-workflow 에이전트 시작/종료 로그) |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `agents/` | 전담 서브에이전트 지침 파일 모음 |

## Key Agents

| File | Role |
|------|------|
| `agents/git-workflow.md` | Git/GitHub IDD 작업 전담 — 브랜치 생성, 커밋, PR merge |
| `agents/electron-main-dev.md` | Electron main process 전담 개발자 |
| `agents/react-ui-dev.md` | React renderer process 전담 개발자 |
| `agents/code-reviewer.md` | 코드 리뷰 전담 (읽기 전용) |

## For AI Agents

### Working In This Directory
- `CLAUDE.md`의 OMC 블록은 `/oh-my-claudecode:omc-setup --local`로만 업데이트
- `settings.local.json`은 Git에 커밋되지 않음 (로컬 전용)
- 에이전트 지침 파일(`.md`)은 직접 편집 가능

### Agent Delegation Policy
- **모든 Git/GitHub 작업** → `git-workflow` 에이전트 위임 (proactively)
- **main.js, preload.js 수정** → `electron-main-dev` 에이전트
- **src/ UI 작업** → `react-ui-dev` 에이전트
- **코드 리뷰** → `code-reviewer` 에이전트 (읽기 전용, 직접 수정 안 함)

<!-- MANUAL: -->
