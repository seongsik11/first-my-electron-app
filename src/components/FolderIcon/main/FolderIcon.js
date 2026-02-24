import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import styles from "./FolderIcon.module.css";

// 앱 아이콘이 없는 경우를 위해 간단한 플레이스홀더
function getAppIcon(app) {
  if (app.icon && typeof app.icon === "string" && app.icon.length > 0) {
    return app.icon;
  }
  return "/default-app-icon.png";
}

/** 드래그 오버레이용 (useSortable 미사용) */
export function FolderIconOverlay({ folder, folderType }) {
  return (
    <div className={styles.folder} style={{ cursor: "grabbing" }}>
      <div className={folderType === "app" ? styles.thumbGridForApp : styles.thumbGridForFolder}>
        {folder.items.slice(0, 4).map((app) => (
          <img key={app.id || app.name} src={getAppIcon(app)} alt={app.name} />
        ))}
      </div>
      <span className={styles.label}>{folder.name}</span>
    </div>
  );
}

export default function FolderIcon({ folder, openFolder, folderType }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: folder.id });

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
      onDoubleClick={openFolder}
      className={styles.folder}
    >
      <div className={folderType === "app" ? styles.thumbGridForApp : styles.thumbGridForFolder}>
        {folder.items.slice(0, 4).map((app) => (
          <img key={app.id || app.name} src={getAppIcon(app)} alt={app.name} />
        ))}
      </div>
      <span className={styles.label}>{folder.name}</span>
    </div>
  );
}

export function EmptySlot({ id }) {
  const { setNodeRef, attributes, listeners, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    height: "100px",
    width: "100%",
  };
  return <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={styles.emptySlot} />;
}
