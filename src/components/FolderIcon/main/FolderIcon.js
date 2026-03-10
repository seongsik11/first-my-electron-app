import { useSortable } from "@dnd-kit/sortable";
import styles from "./FolderIcon.module.css";
import useDesktopStore from "../../Desktop/store/state";

// 앱 아이콘이 없는 경우를 위해 간단한 플레이스홀더
// named export — FolderModal에서도 import해서 사용
export function getAppIcon(app) {
  if (app.icon && typeof app.icon === "string" && app.icon.length > 0) {
    return app.icon;
  }
  return "/default-app-icon.png";
}

// DragOverlay 사용 시 FLIP 애니메이션 불필요
// @dnd-kit/sortable의 useDerivedTransform이 생성하는 레이아웃 변경 애니메이션은
// 드래그 후 아이템이 반대 방향으로 찰나 이동한 후 정착하는 버그를 야기함
// 원본 아이콘의 이동은 DragOverlay가 담당하므로 FLIP 애니메이션 완전 비활성화
function animateLayoutChanges() {
  return false;
}

/** 드래그 오버레이용 */
export function AppIconOverlay({ app }) {
  return (
    <div className={styles.appIcon} style={{ cursor: "grabbing" }}>
      <div className={styles.iconWrapper}>
        <img src={getAppIcon(app)} alt={app.name} />
      </div>
      <span className={styles.label}>{app.name}</span>
    </div>
  );
}

export default function AppIcon({ app, openApp }) {
  // transition을 destructuring에 추가 -- smooth reorder를 위해 사용
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: app.id, animateLayoutChanges });

  // activeId: smooth reorder transition 조건부 적용용
  const activeId = useDesktopStore((state) => state.activeId);
  // folderCandidateTargetId: 면적 80% 이상 감지된 타겟 id (시각 피드백용)
  const folderCandidateTargetId = useDesktopStore((state) => state.folderCandidateTargetId);
  const isFolderCandidate = folderCandidateTargetId === app.id;

  const style = {
    transform: transform
      ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
      : undefined,
    // FOLDER_CANDIDATE 상태(folderCandidateTargetId !== null)에서는 transition 차단
    // → 주변 아이콘의 Reorder 애니메이션 완전 중단 (drag-logic.md 요구사항)
    transition: (activeId && folderCandidateTargetId === null) ? transition : undefined,
    // 드래그 중인 원본 아이콘은 완전 숨김 (DragOverlay가 대체)
    opacity: isDragging ? 0 : 1,
    cursor: "grab",
  };

  return (
    <div
      ref={setNodeRef}
      data-sortable="true"
      data-id={app.id}
      {...attributes}
      {...listeners}
      style={style}
      onDoubleClick={openApp}
      className={`${styles.appIcon}${isFolderCandidate ? ` ${styles.folderHoverTarget}` : ""}`}
    >
      <div className={styles.iconWrapper}>
        <img src={getAppIcon(app)} alt={app.name} />
      </div>
      <span className={styles.label}>{app.name}</span>
    </div>
  );
}

/** 폴더 아이콘 (정렬 가능한 폴더) */
export function FolderIcon({ folder, openFolder }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: folder.id, animateLayoutChanges });

  const activeId = useDesktopStore((state) => state.activeId);
  // folderCandidateTargetId: 면적 80% 이상 감지된 타겟 id (시각 피드백용)
  const folderCandidateTargetId = useDesktopStore((state) => state.folderCandidateTargetId);
  const isFolderCandidate = folderCandidateTargetId === folder.id;

  const style = {
    transform: transform
      ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
      : undefined,
    // FOLDER_CANDIDATE 상태(folderCandidateTargetId !== null)에서는 transition 차단
    // → 주변 아이콘의 Reorder 애니메이션 완전 중단 (drag-logic.md 요구사항)
    transition: (activeId && folderCandidateTargetId === null) ? transition : undefined,
    opacity: isDragging ? 0 : 1,
    cursor: "grab",
  };

  // 최대 9개 썸네일 (3×3 그리드)
  const thumbItems = (folder.items || []).slice(0, 9);

  return (
    <div
      ref={setNodeRef}
      data-sortable="true"
      data-id={folder.id}
      {...attributes}
      {...listeners}
      style={style}
      onDoubleClick={openFolder}
      className={`${styles.folderIcon}${isFolderCandidate ? ` ${styles.folderHoverTarget}` : ""}`}
    >
      <div className={styles.thumbGrid}>
        {thumbItems.map((app) => (
          <div key={app.id} className={styles.thumbItem}>
            <img src={getAppIcon(app)} alt={app.name} />
          </div>
        ))}
      </div>
      <span className={styles.label}>{folder.name}</span>
    </div>
  );
}

/** 폴더 드래그 오버레이용 */
export function FolderIconOverlay({ folder }) {
  const thumbItems = (folder.items || []).slice(0, 9);
  return (
    <div className={styles.folderIcon} style={{ cursor: "grabbing" }}>
      <div className={styles.thumbGrid}>
        {thumbItems.map((app) => (
          <div key={app.id} className={styles.thumbItem}>
            <img src={getAppIcon(app)} alt={app.name} />
          </div>
        ))}
      </div>
      <span className={styles.label}>{folder.name}</span>
    </div>
  );
}

export function EmptySlot({ id }) {
  // listeners 미적용 — 빈 슬롯은 드롭 대상으로만 사용 (직접 드래그 불가)
  // → 빈 슬롯 위에서 클릭 시 DnD가 활성화되지 않아 스와이프 정상 동작
  // transition을 destructuring에 추가 -- AppIcon과 동일한 smooth reorder 패턴 적용
  const { setNodeRef, attributes, transform, transition } = useSortable({ id, animateLayoutChanges });
  // EmptySlot도 smooth reorder를 위해 activeId 읽기
  const activeId = useDesktopStore((state) => state.activeId);
  // folderCandidateTargetId: FOLDER_CANDIDATE 상태에서 transition 차단 (AppIcon/FolderIcon과 동일)
  const folderCandidateTargetId = useDesktopStore((state) => state.folderCandidateTargetId);

  const style = {
    transform: transform
      ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
      : undefined,
    // FOLDER_CANDIDATE 상태(folderCandidateTargetId !== null)에서는 transition 차단
    // → 주변 아이콘의 Reorder 애니메이션 완전 중단 (drag-logic.md 요구사항)
    transition: (activeId && folderCandidateTargetId === null) ? transition : undefined,
    height: "100px",
    width: "100%",
  };
  return <div ref={setNodeRef} style={style} {...attributes} className={styles.emptySlot} />;
}
