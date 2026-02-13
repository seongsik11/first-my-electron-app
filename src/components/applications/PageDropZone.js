import React from "react";
import { useDroppable } from "@dnd-kit/core";

export default function PageDropZone({ id, side }) {
  const { isOver, setNodeRef } = useDroppable({ id });

  const style = {
    position: "absolute",
    [side]: 0, // left: 0 또는 right: 0
    top: 0,
    height: "100%",
    width: "40px", // Desktop.js EDGE_ZONE_WIDTH 와 동일하게
    zIndex: 50, // 아이콘들보다 위에 위치해서 드랍이 잘 인식되도록
    pointerEvents: "auto",
    backgroundColor: isOver ? "rgba(255, 255, 255, 0.08)" : "transparent",
  };

  return <div ref={setNodeRef} style={style} />;
}