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
  // folderCandidateTargetId: 면적 기반 폴더 생성 후보 시각 피드백용 (hoverTargetId에서 교체)
  const folderCandidateTargetId = useDesktopStore((state) => state.folderCandidateTargetId);
  const isHoverTarget = folderCandidateTargetId === app.id;

  const style = {
    // hoverTargetId가 설정된 동안 transform 동결 — 타겟 앱이 밀려나지 않도록
    // hoverTargetId=null(일반 드래그)이면 live reorder 그대로 동작
    transform: (transform && !hoverTargetId)
      ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
      : undefined,
    // useSortable이 반환한 transition을 activeId 조건부로 적용
    // activeId=null(드롭 시) → transition=undefined로 동시 적용 → FLIP 버그 불가 (React 18 batching)
    transition: activeId ? transition : undefined,
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
      className={`${styles.appIcon}${isHoverTarget ? ` ${styles.folderHoverTarget}` : ""}`}
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
  // folderCandidateTargetId: 면적 기반 폴더 생성 후보 시각 피드백용 (hoverTargetId에서 교체)
  const folderCandidateTargetId = useDesktopStore((state) => state.folderCandidateTargetId);
  const isHoverTarget = folderCandidateTargetId === folder.id;

  const style = {
    // hoverTargetId가 설정된 동안 transform 동결 — AppIcon과 동일 패턴
    transform: (transform && !hoverTargetId)
      ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
      : undefined,
    transition: activeId ? transition : undefined,
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
      className={`${styles.folderIcon}${isHoverTarget ? ` ${styles.folderHoverTarget}` : ""}`}
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

  const style = {
    transform: transform
      ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
      : undefined,
    // AppIcon과 동일한 조건부 transition -- activeId=null 시 undefined
    transition: activeId ? transition : undefined,
    height: "100px",
    width: "100%",
  };
  return <div ref={setNodeRef} style={style} {...attributes} className={styles.emptySlot} />;
}
