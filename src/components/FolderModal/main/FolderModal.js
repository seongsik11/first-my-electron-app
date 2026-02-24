import styles from "./FolderModal.module.css";

function runAppSafe(appPath) {
  try {
    window.electronAPI?.runApp?.(appPath);
  } catch (e) {
    console.warn("runApp 호출 실패:", e);
  }
}

export default function FolderModal({ folder, close }) {
  const handleOpenApp = (app) => {
    if (!app || !app.path) return;
    runAppSafe(app.path);
  };

  return (
    <div className={styles.modalOverlay} onClick={close}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3>{folder.name}</h3>
        <div className={styles.items}>
          {folder.items.map((app) => (
            <div
              key={app.name}
              className={styles.app}
              onDoubleClick={() => handleOpenApp(app)}
            >
              <img src={app.icon} alt={app.name} />
              <span>{app.name}</span>
            </div>
          ))}
        </div>
        <button onClick={close}>닫기</button>
      </div>
    </div>
  );
}
