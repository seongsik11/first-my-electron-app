import React from "react";
import { useDroppable } from "@dnd-kit/core";

export default function PageDropZone({ id, side }) {
  const { isOver, setNodeRef } = useDroppable({ id });

  // side에 따른 그라데이션 방향 및 색상 설정
  const gradientDirection = side === "right" ? "to left" : "to right";

  // 강조하고 싶은 색상(흰색 15% 농도)에서 투명으로 변하는 그라데이션
  const activeGradient = `linear-gradient(${gradientDirection},
    rgba(255, 255, 255, 0.28) 0%,    /* 가장자리: 가장 선명 */
    rgba(255, 255, 255, 0.12) 25%,   /* 25% 지점: 급격히 흐려짐 */
    rgba(255, 255, 255, 0.05) 55%,   /* 55% 지점: 아주 은은하게 잔상 */
    rgba(255, 255, 255, 0.01) 85%,   /* 85% 지점: 거의 안 보임 */
    transparent 100%                 /* 100% 지점: 완전 소멸 */
  )`;

  const style = {
    position: "absolute",
    [side]: 0, // left: 0 또는 right: 0
    top: 0,
    height: "100%",
    width: "40px", // Desktop.js EDGE_ZONE_WIDTH 와 동일하게
    zIndex: 50, // 아이콘들보다 위에 위치해서 드랍이 잘 인식되도록
    pointerEvents: "auto",
    // isOver 상태일 때만 그라데이션 적용
    background: isOver ? activeGradient : "transparent",
    // 부드럽게 나타나고 사라지도록 트랜지션 추가
    transition: "background 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)",
  };

  return <div ref={setNodeRef} style={style} />;
}
