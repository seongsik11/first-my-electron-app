import { useSortable } from "@dnd-kit/sortable";
import styles from "./FolderIcon.module.css";

// 앱 아이콘이 없는 경우를 위해 간단한 플레이스홀더
function getAppIcon(app) {
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
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({ id: app.id, animateLayoutChanges });

  // x/y translate만 사용 → scaleX/scaleY 왜곡 방지
  // transition 제거 → 드롭 후 슬라이드 애니메이션 차단
  const style = {
    transform: transform
      ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
      : undefined,
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
  const { setNodeRef, attributes, transform } = useSortable({ id, animateLayoutChanges });
  const style = {
    transform: transform
      ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
      : undefined,
    height: "100px",
    width: "100%",
  };
  return <div ref={setNodeRef} style={style} {...attributes} className={styles.emptySlot} />;
}
