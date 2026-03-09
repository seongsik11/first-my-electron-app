import React from "react";
import { useDroppable } from "@dnd-kit/core";

// isActive: 드래그 중일 때만 true — 항상 마운트 유지로 dnd-kit rect 측정 보장
// (조건부 마운트 시 rect.current=null → over=null → 페이지 전환 실패 버그 방지)
export default function PageDropZone({ id, side, isActive }) {
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
    // 드래그 중이 아닐 때: 완전 투명 + 포인터 이벤트 차단 (일반 클릭 방해 없음)
    // 드래그 중일 때: 포인터 이벤트 활성화 + 시각 피드백
    pointerEvents: isActive ? "auto" : "none",
    opacity: isActive ? 1 : 0,
    // isOver 상태일 때만 그라데이션 적용
    background: isOver ? activeGradient : "transparent",
    // 부드럽게 나타나고 사라지도록 트랜지션 추가
    transition: "background 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)",
  };

  return <div ref={setNodeRef} style={style} />;
}
