import { useSortable, defaultAnimateLayoutChanges } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import styles from "./FolderIcon.module.css";

// 앱 아이콘이 없는 경우를 위해 간단한 플레이스홀더
function getAppIcon(app) {
  if (app.icon && typeof app.icon === "string" && app.icon.length > 0) {
    return app.icon;
  }
  return "/default-app-icon.png";
}

// 드롭 직후 layout 슬라이드 애니메이션 비활성화
// — @dnd-kit 내부의 useDerivedTransform이 "이전위치→새위치" 200ms 슬라이드를 만드는데,
//   wasDragging && !isSorting (드롭 직후) 일 때 false 반환 → useDerivedTransform 자체를 차단
function animateLayoutChanges(args) {
  const { isSorting, wasDragging } = args;
  if (wasDragging && !isSorting) return false;
  return defaultAnimateLayoutChanges(args);
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: app.id, animateLayoutChanges });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: "grab",
  };

  return (
    <div
      ref={setNodeRef}
      data-sortable="true"
      {...attributes}
      {...listeners}
      style={style}
      onDoubleClick={openApp}
      className={styles.appIcon}
    >
      <div className={styles.iconWrapper}>
        <img src={getAppIcon(app)} alt={app.name} />
      </div>
      <span className={styles.label}>{app.name}</span>
    </div>
  );
}

export function EmptySlot({ id }) {
  // listeners 미적용 — 빈 슬롯은 드롭 대상으로만 사용 (직접 드래그 불가)
  // → 빈 슬롯 위에서 클릭 시 DnD가 활성화되지 않아 스와이프 정상 동작
  const { setNodeRef, attributes, transform, transition } = useSortable({ id, animateLayoutChanges });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    height: "100px",
    width: "100%",
  };
  return <div ref={setNodeRef} style={style} {...attributes} className={styles.emptySlot} />;
}
