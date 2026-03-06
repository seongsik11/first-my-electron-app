import React from "react";
import { useDraggable } from "@dnd-kit/core";
import useDesktopStore from "../../Desktop/store/state";
import { getAppIcon } from "../../FolderIcon/main/FolderIcon";
import styles from "./FolderModal.module.css";

/**
 * 폴더 모달 내 앱 아이템 — useDraggable 적용
 * id 패턴: folder-app-{app.id} — Desktop.js onDragStart에서 감지
 * 드래그 시작 시 모달이 즉시 닫히고 DragOverlay가 앱 아이콘을 이어받음
 */
function FolderAppItem({ app }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `folder-app-${app.id}`,
    data: { app },  // onDragStart에서 active.data.current.app으로 접근
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={styles.appItem}
      style={{ opacity: isDragging ? 0 : 1 }}
      onDoubleClick={() => window.electronAPI?.runApp?.(app.path)}
    >
      <div className={styles.iconWrapper}>
        <img src={getAppIcon(app)} alt={app.name} />
      </div>
      <span className={styles.label}>{app.name}</span>
    </div>
  );
}

/**
 * 폴더 열기 모달
 * - openedFolderId가 있으면 해당 폴더를 pages에서 탐색하여 표시
 * - 배경 클릭 시 닫힘 (e.stopPropagation으로 모달 내부 클릭은 닫힘 방지)
 * - 앱 홀딩 드래그 시 모달 닫히고 DnD로 앱 꺼내기 가능
 */
export default function FolderModal() {
  const openedFolderId = useDesktopStore((state) => state.openedFolderId);
  const setOpenedFolderId = useDesktopStore((state) => state.setOpenedFolderId);
  const pages = useDesktopStore((state) => state.pages);

  if (!openedFolderId) return null;

  // 모든 페이지에서 해당 폴더 탐색
  let folder = null;
  for (const page of pages) {
    const found = page.find((it) => it.id === openedFolderId && it.type === "folder");
    if (found) {
      folder = found;
      break;
    }
  }

  if (!folder) return null;

  return (
    <div className={styles.backdrop} onClick={() => setOpenedFolderId(null)}>
      <div className={styles.modal} data-folder-modal onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>{folder.name}</h2>
        <div className={styles.grid}>
          {(folder.items || []).map((app) => (
            <FolderAppItem key={app.id} app={app} />
          ))}
        </div>
      </div>
    </div>
  );
}
