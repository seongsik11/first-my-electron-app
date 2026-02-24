# my-electron 개발 규칙 (Claude Code용)

---

# 1. 최우선 불변 규칙

이 규칙들은 모든 작업에서 **절대 어길 수 없는 원칙**입니다.

1. **사용자 명시 범위 외 변경 금지** — 사용자가 명시적으로 요청한 변경 범위를 제외하고, 디자인과 기능은 절대 바꾸지 않는다.
2. **UI 무단 변경 금지** — 요청과 무관한 UI 변경(간격, 색상, 폰트, 정렬, 애니메이션, 반응형 동작 등)은 금지한다.
3. **동작 무단 변경 금지** — 요청과 무관한 동작 변경(API 응답 형태, 상태 전이, 권한 정책, 유효성 규칙 등)은 금지한다.
4. **리팩터링/최적화 금지** — 리팩터링, 최적화, 스타일 정리도 요청 범위를 벗어나면 적용하지 않는다.
5. **주석 규칙** — 주석 추가는 요청 범위를 벗어나지 않는 한 허용하지만, 기존 주석을 수정하거나 제거하지 않는다. 중요한 컨텍스트에는 주석을 항상 추가할 것.

---

# 2. 변경 범위 통제 규칙

1. **사전 명시** — 작업 시작 전, "무엇을 바꾸고 무엇을 절대 안 바꾸는지"를 먼저 명시한다.
2. **최소 파일 원칙** — 변경 파일은 요청 해결에 필요한 최소 파일만 수정한다.
3. **계약 유지** — 기존 컴포넌트/함수 계약(입출력, props, 이벤트 흐름)을 유지한다.
4. **의도된 동작만** — 명시된 요청 범위 내에서만 변경을 진행한다.

---

# 3. 변경 리포트 형식 (필수)

모든 변경 후 아래 5개 항목을 포함한 리포트를 작성합니다:

1. **변경 파일 목록** — 수정된 파일 경로 명시 (예: `a.ts`, `b.jsx`)
2. **핵심 diff 요약** — 어떤 부분이 어떻게 바뀌었는지 간결하게 (예: 인증 헤더 파싱 로직 통합)
3. **리스크(사이드이펙트)** — 예상되는 부작용이나 호환성 문제 (예: 구버전 클라이언트 헤더 포맷과 충돌 가능)
4. **롤백 방법** — 문제 발생 시 되돌리는 방법 (예: 해당 커밋 revert 또는 기존 로직 재활성화)
5. **검증/확인 결과** — 실행한 테스트, 수동 확인, 미실행 사유 포함

**고위험 변경** (리팩터링, 권한/인증, 결제, 인프라/배포, DB 스키마/마이그레이션)은 추가로:
- 변경 전 영향 범위와 실패 시나리오를 먼저 명시
- 적용 전 확인 단계 수행 (필요 시 사용자 승인)
- 적용 후 검증 결과와 롤백 가능 상태를 반드시 보고

---

# 4. 소통 및 문서화 규칙

- **기본 언어:** 모든 답변, 설명, 코드 주석은 항상 **한국어**로 작성한다.
- **답변 스타일:** 기술적인 내용은 명확하게 설명하되, 핵심 위주로 간결하게 답변한다.
- **맥락 공유:** 단순 결과물뿐만 아니라, 구현의 **이유와 목적**을 명확히 드러내어 충분히 이해할 수 있도록 설명한다.

---

# 5. 파일 및 네이밍 컨벤션

- **파일 생성:** `.js`, `.ts` 등 개발 관련 파일은 기본적으로 **PascalCase(파스칼 케이스)**를 사용한다. (예: `UserAccount.ts`)
- **언어별 유연성:** 특정 언어나 프레임워크의 표준 관례가 위 규칙과 다를 경우, 해당 기술 스택의 **표준 네이밍 컨벤션**을 우선하여 따른다.

---

# 6. 개발 환경 및 종속성

- **버전 관리:** React와 Node.js의 버전은 항상 **최신 버전 중에서 가장 안전하고 안정적인(Stable/LTS)** 버전을 기준으로 업데이트하고 유지한다.
- **패키지 관리:** 종속성 변경이나 버전 업데이트 시 작업 전 의도와 영향을 사용자에게 먼저 공유한다.

---

# 7. 커뮤니케이션 규칙

1. **범위 분리** — "요청 범위 내 변경"과 "추천사항"을 반드시 분리해서 보고한다.
2. **무단 확장 금지** — 사용자가 원치 않은 확장 작업은 하지 않는다.
3. **불확실 시 질문** — 불확실한 경우 임의로 바꾸지 말고 먼저 질문한다.

---

# 8. 추측 금지 규칙 (근거 기반 작업)

- 코드 의도나 요구사항을 추측하지 않는다.
- 불명확한 부분은 반드시 사용자에게 확인한다.
- 기존 코드의 패턴을 따르되, 상충되는 경우 먼저 질문한다.

---

## 프로젝트 개요

macOS 앱 런처 — iPhone 홈 스크린 스타일의 Electron 데스크탑 앱.
`/Applications` 디렉터리를 스캔하여 앱 아이콘을 그리드로 표시하고, 드래그&드롭으로 폴더 생성 및 페이지 이동을 지원한다.

---

## 기술 스택 (확정)

| 역할 | 패키지 | 비고 |
|------|--------|------|
| 데스크탑 프레임 | electron 37 | main process: `public/main.js` |
| UI | React 18 | renderer process: `src/` |
| 상태 관리 | **Zustand ^5** | `Desktop/store/state.js` — selector 패턴 사용 |
| 드래그&드롭 | **@dnd-kit** (core/sortable/modifiers) | react-beautiful-dnd는 미사용 |
| 스타일링 | **CSS Modules** (.module.css) | CSS-in-JS 사용 금지 |
| 빌드 | react-scripts (CRA) | webpack 직접 설정 없음 |
| 로깅 | electron-log | main process 전용 |
| 이미지 처리 | sharp | 아이콘 변환 (main process) |
| macOS plist | simple-plist | 앱 아이콘 경로 파싱 |

---

## 아키텍처 규칙

### 프로세스 분리 원칙

```
Main Process (public/)        Renderer Process (src/)
──────────────────────        ───────────────────────
main.js                       App.js → Desktop.js
  - 파일시스템 접근              - React UI
  - 앱 실행 (exec)              - 드래그&드롭
  - 창 제어                     - 페이지 네비게이션
  - IPC 핸들러 등록

preload.js
  - contextBridge 노출 (window.electronAPI)
  - 보안 경계 유지
```

- **renderer에서 Node.js API 직접 사용 금지** — 반드시 preload를 통해 IPC로 처리한다.
- **main.js에서 React import 금지** — 완전히 분리된 환경이다.

### IPC 통신 규칙

- 채널명: **kebab-case** (예: `window-minimize`, `get-applications`)
- 핸들러 등록 시 반드시 `registerHandler()` 헬퍼 함수를 사용한다 (중복 방지).
- 새 IPC 채널 추가 순서:
  1. `public/main.js` — `registerHandler()` 호출
  2. `public/preload.js` — `contextBridge.exposeInMainWorld`에 메서드 추가
  3. renderer — `window.electronAPI.메서드명()` 으로 호출

```javascript
// preload.js 패턴
contextBridge.exposeInMainWorld('electronAPI', {
  newFeature: (arg) => ipcRenderer.invoke('new-feature', arg),
});
```

---

## 파일/폴더 구조 규칙

```
public/          ← Electron main process + 정적 파일만
src/
  App.js
  components/
    Desktop/
      main/        ← Desktop.js, Desktop.module.css
      store/       ← state.js (Zustand store)
    FolderIcon/
      main/        ← FolderIcon.js, FolderIcon.module.css, Icon.module.css
    FolderModal/
      main/        ← FolderModal.js, FolderModal.module.css
    PageDropZone/
      main/        ← PageDropZone.js
    TopBar/
      main/        ← TopBar.js, TopBar.module.css
  hooks/           ← 커스텀 훅 (재사용 로직 생기면 여기)
```

- 새 UI 컴포넌트: `src/components/ComponentName/main/` 구조로 생성
- 컴포넌트 파일: `PascalCase.js` + 동일 이름의 `PascalCase.module.css`
- 컴포넌트에 전역 상태가 필요하면 같은 폴더 안 `store/state.js`에 Zustand store 생성
- 상수는 해당 파일 상단에 `UPPER_SNAKE_CASE`로 선언 (예: `PAGE_SIZE`, `EDGE_ZONE_WIDTH`)

---

## 코드 컨벤션

### 네이밍

| 대상 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 파일 | PascalCase | `FolderIcon.js` |
| CSS 모듈 파일 | PascalCase.module.css | `FolderIcon.module.css` |
| 함수/변수 | camelCase | `handleDragEnd`, `currentPage` |
| 상수 | UPPER_SNAKE_CASE | `PAGE_SIZE = 105` |
| IPC 채널 | kebab-case | `'get-applications'` |
| Zustand 훅 | use + 도메인 + Store | `useDesktopStore` |

### React 패턴

- **함수형 컴포넌트 + hooks** — 클래스 컴포넌트 사용 금지
- `useRef`를 적극 활용해 이벤트 리스너 내 stale closure 방지 (패턴: `currentPageRef`, `pagesLengthRef`)
- 재사용 로직이 2개 이상 컴포넌트에서 필요하면 `src/hooks/`에 커스텀 훅으로 추출
- `React.memo`는 FolderIcon 같은 리스트 아이템에 적용 권장 (페이지당 최대 105개)

### 상태 관리 — Zustand

전역 상태는 **Zustand**를 사용한다. Recoil은 제거됐으며 사용하지 않는다.

#### Store 정의 (`store/state.js`)

```javascript
import { create } from 'zustand';

const useDesktopStore = create((set) => ({
  // 상태
  pages: [[]],
  currentPage: 0,

  // 액션 (setter)
  setPages: (pages) => set({ pages }),
  setCurrentPage: (index) => set({ currentPage: index }),
}));

export default useDesktopStore;
```

#### 컴포넌트에서 사용 — **selector 패턴 필수**

상태 값과 setter 함수 모두 **개별 selector**로 불러온다. 객체 구조분해(`useStore()`) 방식은 사용하지 않는다.

```javascript
// ✅ 올바른 패턴 — 상태 값
const pages = useDesktopStore((state) => state.pages);
const currentPage = useDesktopStore((state) => state.currentPage);

// ✅ 올바른 패턴 — setter 함수
const setPages = useDesktopStore((state) => state.setPages);
const setCurrentPage = useDesktopStore((state) => state.setCurrentPage);

// ❌ 금지 — 객체 전체 구조분해 (불필요한 리렌더링 유발)
const { pages, setPages } = useDesktopStore();
```

### 에러 처리

```javascript
// 표준 패턴 — 조용한 실패 (silent failure)
try {
  await window.electronAPI.runApp(appPath);
} catch (e) {
  console.warn('앱 실행 실패:', e);
}
```

- renderer에서 throw로 에러 전파하지 않음 — warn 로깅 후 graceful degradation
- main process에서는 `electron-log`로 기록

---

## 데이터 구조 (변경 금지)

### 아이템 타입

```javascript
// 앱
{ type: 'app',    id: string, name: string, path: string, icon: string | null }

// 폴더
{ type: 'folder', id: string, name: string, items: AppItem[] }

// 빈 슬롯
{ type: 'empty',  id: `empty-${pageIndex}-${itemIndex}` }
```

### pages 구조

```javascript
pages: [
  [item, item, ..., empty, empty],  // page 0 — 항상 PAGE_SIZE(105)개
  [item, item, ..., empty, empty],  // page 1
  ...
]
```

- 각 페이지는 항상 **105개** 슬롯을 유지 (`chunkIntoPagesWithEmptySlots` 참조)
- `empty` 슬롯의 id는 `empty-{pageIndex}-{itemIndex}` 포맷 유지

---

## 스타일링 규칙

- **CSS Modules 필수** — `import styles from './Component.module.css'`
- 동적 스타일(트랜지션, transform)은 **인라인 스타일** 허용
- CSS-in-JS 라이브러리(styled-components, emotion 등) 도입 금지
- 색상 팔레트: 다크 배경 + 화이트 텍스트 + 반투명 오버레이 (프로젝트 톤 유지)
- 아이콘 크기: `80×80px`, border-radius: `12px` (변경 시 전체 그리드에 영향)

---

## 드래그&드롭 규칙

- **@dnd-kit 전용** — react-beautiful-dnd 사용 금지 (이미 설치되어 있으나 미사용)
- 충돌 감지: `createEdgePriorityCollision` 커스텀 전략 사용 (좌우 40px 엣지 감지)
- 드래그 시나리오별 처리 (Desktop.js `handleDragEnd` 참조):
  - 엣지 → 페이지 이동
  - 앱 → 빈 슬롯: 위치 교환
  - 앱 → 폴더: 폴더에 추가
  - 앱 → 앱: 새 폴더 생성
  - 같은 페이지 내: `arrayMove` 정렬

---

## 빌드/실행 규칙

```bash
# 개발 (React dev server + Electron)
npm start        # 1. React 서버 시작 (localhost:3000)
npm run electron # 2. Electron 실행 (별도 터미널)

# 프로덕션
npm run build    # build/ 디렉터리 생성
npm run electron # build/index.html 로드
```

- **패키지 매니저: yarn** (yarn.lock 기준 — npm install 금지)
- 환경 감지: `app.isPackaged` 로 dev/prod 분기 (main.js 패턴 유지)

---

## 9. Git Commit 규칙

1. **한 목적 한 커밋** — 한 커밋에는 하나의 목적만 담는다 (기능 추가, 버그 수정, TS 변환, 문서 수정 분리)
2. **요청 범위만** — 요청 범위 밖 변경이 섞인 상태로 커밋하지 않는다.
3. **파일 확인** — 커밋 직전 `git status`로 포함 파일을 확인하고, 의도하지 않은 파일은 제외한다.
4. **자동 생성물 제외** — `.DS_Store`, 로그, 캐시 파일 등 자동 생성물은 커밋 금지한다.
5. **민감정보 제외** — `.env`, 토큰, 비밀번호, 키는 절대 커밋하지 않는다.
6. **커밋 메시지 형식** — `type: summary` 형식을 사용한다.
   - `type`: `feat|fix|chore|refactor|docs|test|build|ci` 중 하나
   - `summary`: 명확하고 짧게, 명령형 현재시제 (권장 50자 내외)
7. **큰 변경 설명** — 큰 변경은 커밋 본문에 변경 이유와 영향을 기술한다.

---

## 10. JS → TS 변환 규칙

1. **변환의 목적** — JS → TS 변환의 1차 목적은 타입 안정성 확보이며, 런타임 동작/UI/기능은 기존과 동일하게 유지한다.
2. **변환 범위** — 변환 범위는 요청 단위로 최소화하며, 기본적으로 파일 단위로 진행한다. (대형 파일/연쇄 수정은 사전 승인)
3. **확장자 변경** — 변환은 확장자 변경(`.js -> .ts`, `.jsx -> .tsx`) 후 최소 타입 추가를 원칙으로 한다.
4. **타입 추론 활용** — 타입 추론이 가능한 부분은 명시적 타입 추가를 생략한다.
5. **실무 스타일** — 타입은 필요한 부분만, 간결하게 작성한다.
6. **TS 문법 주석** — JS에서 TS로 전환 시 TS만의 문법이 사용되면 주석으로 기존 JS 코드와의 차이점 및 설명을 추가한다.
7. **검증** — 변환 후 최소 검증으로 대상 파일 lint를 수행하고, 가능한 경우 타입 체크(`tsc --noEmit`) 또는 빌드 검증을 수행한다.

---

## 금지 사항 (Do NOT)

1. **renderer에서 `require('fs')` 등 Node API 직접 사용** — preload + IPC 경유 필수
2. **`contextIsolation: false` 또는 `nodeIntegration: true` 설정** — 보안 위반
3. **Recoil 또는 기타 전역 상태 라이브러리 추가** — Zustand로 통일
4. **CSS-in-JS 라이브러리 추가** — CSS Modules 원칙 유지
5. **react-beautiful-dnd 사용** — @dnd-kit으로 통일
6. **페이지 크기(105) 임의 변경** — 그리드 레이아웃 전체에 영향
7. **IPC 핸들러를 `registerHandler()` 없이 직접 등록** — 중복 핸들러 오류 발생
8. **`useDesktopStore()` 전체 구조분해** — selector 패턴 필수 (`useDesktopStore((state) => state.값)`)
9. **무단 UI 리디자인**
10. **무단 API 계약 변경**
11. **무단 의존성 교체/추가**
12. **무단 대규모 리팩터링**
13. **요청과 무관한 파일 대량 수정**

---

## 미사용 의존성 (정리 대상)

다음 패키지는 설치되어 있으나 현재 코드에서 사용되지 않는다.
제거 전 사용 여부 재확인 후 결정할 것:

- `react-beautiful-dnd` — @dnd-kit으로 대체됨
- `react-swipeable` — 현재 네이티브 touch 이벤트로 처리 중

---

## 참고 파일 위치

| 관심사 | 파일 |
|--------|------|
| Electron 창 생성/IPC 핸들러 | `public/main.js` |
| IPC 브릿지 (보안 경계) | `public/preload.js` |
| 메인 그리드/드래그 로직 | `src/components/Desktop/main/Desktop.js` |
| 데스크탑 전역 상태 (Zustand) | `src/components/Desktop/store/state.js` |
| 아이콘 컴포넌트 | `src/components/FolderIcon/main/FolderIcon.js` |
| 폴더 모달 | `src/components/FolderModal/main/FolderModal.js` |
| 창 컨트롤 바 | `src/components/TopBar/main/TopBar.js` |

---

## 11. Git Workflow (Issue-Driven Development)

### 개발 프로세스

**1단계: GitHub Issue 생성**
- 저장소의 Issues 탭에서 새 issue 생성
- 제목: 기능 설명 (예: "레이아웃 자동 저장 기능 구현")
- 내용: 상세한 요구사항, 예상 동작, 검증 방법
- Issue 번호 확인 (예: #15)

**2단계: Issue 브랜치 생성**
```bash
git checkout -b issue/#123
```
- 브랜치명: `issue/#이슈번호` (자동화 예정)

**3단계: 기능 구현 및 커밋**
```bash
git add .
git commit -m "feat/#123 레이아웃 자동 저장 기능 구현"
```
- 커밋 메시지 형식: `feat/#이슈번호 이슈제목`
- type은 `feat|fix|chore|refactor|docs|test|build|ci` 중 선택

**4단계: Push 및 Pull Request**
```bash
git push -u origin issue/#123
```
- GitHub 웹사이트에서 PR 생성: `issue/#123` → `main`

---

### Branch 전략 (Git Flow with CI/CD)

```
issue/#123 (작업 브랜치)
  ↓ PR & Merge
main (메인 브랜치 - 항상 안정적)
  │
  ├─→ develop (개발 배포 브랜치)
  │    ↓ PR & Merge (테스트 후)
  │  release (상용 배포 브랜치)
  │
  └─→ release (특수한 경우 직접 merge)
       예: 서명 테스트, 버그 패치, 급속 수정
```

**각 브랜치 역할:**

| 브랜치 | 목적 | 배포 파이프라인 | 비고 |
|--------|------|-----------------|------|
| `main` | 메인 브랜치 (PR 병합 대상) | 없음 | 항상 배포 가능 상태 유지 |
| `develop` | 개발 환경 배포 | `deploy-dev.yml` | 테스트용 배포 |
| `release` | 상용 환경 배포 | `deploy-prod.yml` | 실제 배포 |

---

### Pull Request 흐름

**일반적인 경우 (기능 개발):**
```
1. issue/#123 → main (PR 1 - 코드 리뷰)
   ↓ Merge
2. main → develop (PR 2 - 개발 배포)
   ↓ Merge & deploy-dev.yml 자동 실행
3. 개발 환경에서 테스트
   ↓ 문제 없으면
4. develop → release (PR 3 - 상용 배포)
   ↓ Merge & deploy-prod.yml 자동 실행
```

**특수한 경우 (서명 테스트, 긴급 패치 등):**
```
main → release (PR - 직접 상용 배포)
  ↓ Merge & deploy-prod.yml 자동 실행
```

---

### Commit 메시지 형식

**필수 형식:**
```
type/#이슈번호 요약 메시지

선택적 본문 (큰 변경시)
```

**예시:**
```
feat/#15 레이아웃 자동 저장 기능 구현

- 2초 debounce 추가
- pages, currentPage 변경 감지
- saveLayout IPC 호출

Closes #15
```

**Type 가이드:**
- `feat` — 새로운 기능
- `fix` — 버그 수정
- `chore` — 빌드, 의존성, 설정 변경
- `refactor` — 코드 리팩토링
- `docs` — 문서 수정
- `test` — 테스트 추가/수정
- `build` — 빌드 시스템 변경
- `ci` — CI/CD 파이프라인 변경

---

### Merge 후 자동화 (Git Hook + Notion)

**현재 상태:**
- Post-commit hook이 설정되어 있음
- `save-to-notion.js` 스크립트 준비 완료

**자동 실행 시점:**
```
Merge 완료 (develop 또는 release에 push)
  ↓
Git Hook 감지
  ↓
save-to-notion.js 실행
  ↓
Notion 자동 업데이트 (작업 완료 내용 기록)
```

---

### 자동화 스크립트 (완전 구현 ✅)

**작업 시작:**
```bash
node start-feature.js "기능 제목" "상세 설명 (선택)"
```

자동 수행:
- ✅ GitHub Issue 생성
- ✅ Issue 번호 추출
- ✅ issue/#번호 브랜치 생성
- ✅ 해당 브랜치로 checkout

**예시:**
```bash
node start-feature.js "레이아웃 자동 저장" "2초 debounce로 pages 변경 감지"
```

---

**작업 완료:**
```bash
node finish-feature.js
```

자동 수행:
- ✅ 변경사항 확인
- ✅ git add .
- ✅ git commit (Issue 번호 자동 포함)
- ✅ git push
- ✅ GitHub PR 생성 (issue/#번호 → main)

---

**완전한 워크플로우:**
```
당신: node start-feature.js "기능 설명"
  ↓
나: Issue #123 생성 → issue/#123 브랜치 생성 → 작업
  ↓
당신: 기능 구현 완료 확인
  ↓
당신: node finish-feature.js
  ↓
나: Commit + Push + PR 생성 자동화
  ↓
당신: GitHub에서 PR 검토 후 merge
  ↓
Git Hook 자동 실행: Notion 업데이트
```

---

### 자동화 설정 (현재 상태)

**구현 완료:**
- ✅ GitHub CLI 설치 및 인증
- ✅ start-feature.js (Issue + 브랜치 자동 생성)
- ✅ finish-feature.js (Commit + Push + PR 자동 생성)
- ✅ Git Hook + save-to-notion.js (Merge 후 Notion 자동 업데이트)

**향후 계획:**
- ⏳ GitHub Actions (PR 검토 자동화)
- ⏳ CI/CD 파이프라인 (자동 배포)

---

## 12. 작업 중단 시 프로토콜

Claude API의 Rate Limit 또는 기타 이유로 작업을 중단해야 할 때:

1. **작업 상태 저장** — 현재까지 구현/변경한 내용을 기억장치에 기록
   - 파일: `/Users/imseongsig/.claude/projects/.../memory/MEMORY.md`
   - 내용: 완료한 작업, 남은 작업, 핵심 구현 사항

2. **저장 내용 예시**
   ```markdown
   ## [기능명] 구현 진행 상황

   ### 완료한 것
   - [X] DB 초기화 구현 (better-sqlite3 rebuild)
   - [X] 모든 IPC 핸들러에 에러 핸들링 추가
   - [X] E2E 검증 완료

   ### 남은 것
   - [ ] 없음 (완료)

   ### 핵심 코드/변경 사항
   - `public/main.js`: initDatabase() try-catch 추가 (라인 22)
   - 모든 DB 사용 핸들러에 `if (!db) return` 가드 추가
   ```

3. **Session 종료** — 메모리 저장 후 터미널/Session 닫기

4. **복구** — 지정된 시간 이후 새 Session 시작
   - Memory.md 자동 로드 → 이전 진행 상황 파악
   - 바로 남은 작업부터 시작
