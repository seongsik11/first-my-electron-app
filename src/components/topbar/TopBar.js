import React from "react";
import styles from "./TopBar.module.css";

// preload.js에서 노출한 API(window.electronAPI.*)를 그대로 사용
export default function TopBar() {
  const handleMinimize = () => {
    try {
      window.electronAPI?.windowMinimize?.();
    } catch (e) {
      console.warn("windowMinimize 호출 실패:", e);
    }
  };

  const handleMaximize = () => {
    try {
      window.electronAPI?.windowMaximize?.();
    } catch (e) {
      console.warn("windowMaximize 호출 실패:", e);
    }
  };

  const handleClose = () => {
    try {
      window.electronAPI?.windowClose?.();
    } catch (e) {
      console.warn("windowClose 호출 실패:", e);
    }
  };

  return (
    <div className={styles.topbar}>
      <div className={styles.dragRegion}>
        <span className={styles.appTitle}>My AppSpace</span>
      </div>
      <div className={styles.windowControls}>
        <button
          className={styles.controlBtn}
          onClick={handleMinimize}
          aria-label="Minimize"
        >
          ─
        </button>
        <button
          className={styles.controlBtn}
          onClick={handleMaximize}
          aria-label="Maximize"
        >
          ☐
        </button>
        <button
          className={styles.controlBtn}
          onClick={handleClose}
          aria-label="Close"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

