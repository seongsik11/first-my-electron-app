import React, { useEffect, useRef } from "react";
import { DndContext, DragOverlay, PointerSensor, rectIntersection, useSensor, useSensors, defaultDropAnimationSideEffects } from "@dnd-kit/core";
import { SortableContext, arrayMove } from "@dnd-kit/sortable";
import AppIcon, { EmptySlot, AppIconOverlay, FolderIcon, FolderIconOverlay } from "../../FolderIcon/main/FolderIcon";
import PageDropZone from "../../PageDropZone/main/PageDropZone";
import FolderModal from "../../FolderModal/main/FolderModal";
import styles from "./Desktop.module.css";
import useDesktopStore from "../store/state";

const EDGE_ZONE_WIDTH = 40;

// 폴더 생성 hover 겹침 비율 임계값
const FOLDER_HOVER_OVERLAP_START = 0.8; // 타이머 시작 최소 비율 (80%)
const FOLDER_HOVER_OVERLAP_MIN   = 0.6; // 폴더 생성 허용 최소 비율 (60%)

/**
 * 드래그 아이템 rect 기준 over 아이템과의 겹침 비율 계산
 * @param {{ left, right, top, bottom, width, height }} dragRect
 * @param {{ left, right, top, bottom, width, height }} targetRect
 * @returns {number} 0~1 (교차 면적 / 드래그 아이템 면적)
 */
function calcOverlapRatio(dragRect, targetRect) {
  const xOverlap = Math.max(
    0,
    Math.min(dragRect.right, targetRect.right) - Math.max(dragRect.left, targetRect.left)
  );
  const yOverlap = Math.max(
    0,
    Math.min(dragRect.bottom, targetRect.bottom) - Math.max(dragRect.top, targetRect.top)
  );
  const dragArea = dragRect.width * dragRect.height;
  if (dragArea === 0) return 0;
  return (xOverlap * yOverlap) / dragArea;
}

/**
 * 간단한 충돌 감지 (엣지 감지 + rectIntersection)
 */
function createEdgeCollision(containerRef) {
  return (args) => {
    const { pointerCoordinates } = args;
    const el = containerRef.current;

    // 엣지 체크 (페이지 전환)
    if (el && pointerCoordinates) {
      const rect = el.getBoundingClientRect();
      const x = pointerCoordinates.x;
      if (x < rect.left + EDGE_ZONE_WIDTH) return [{ id: "page-left" }];
      if (x > rect.right - EDGE_ZONE_WIDTH) return [{ id: "page-right" }];
    }

    return rectIntersection(args);
  };
}

// 한 페이지에 보여줄 앱/폴더 수 (그리드 기준)
const PAGE_SIZE = 105;

function chunkIntoPagesWithEmptySlots(items) {
  const pages = [];
  for (let i = 0; i < items.length; i += PAGE_SIZE) {
    let chunk = items.slice(i, i + PAGE_SIZE);

    const pageIndex = pages.length;
    const remaining = PAGE_SIZE - chunk.length;

    for (let j = 0; j < remaining; j++) {
      chunk.push({
        id: `empty-${pageIndex}-${chunk.length}`,
        type: 'empty'
      });
    }
    pages.push(chunk);
  }

  if (pages.length === 0) {
    const firstPage = Array.from({ length: PAGE_SIZE }, (_, i) => ({
      id: `empty-0-${i}`,
      type: 'empty'
    }));
    return [firstPage];
  }

  return pages;
}

function findItemPosition(pages, id) {
  for (let p = 0; p < pages.length; p++) {
    const idx = pages[p].findIndex((it) => it.id === id);
    if (idx !== -1) return { pageIndex: p, itemIndex: idx, item: pages[p][idx] };
  }
  return null;
}

// 드래그 중인 아이콘(dragRect)과 타겟 아이콘(targetEl DOM) 간 겹침 면적 비율을 계산한다.
// 비율 기준: min(두 아이콘 면적) 대비 교집합 면적.
// @param {DOMRect} dragRect  - DragOverlay 또는 dragging 아이콘의 현재 bounding rect
// @param {Element} targetEl  - 타겟 아이콘의 DOM 요소
// @returns {number} 0.0 ~ 1.0 (겹침 비율)
function calcIntersectionRatio(dragRect, targetEl) {
  const targetRect = targetEl.getBoundingClientRect();

  // 교집합 영역 계산
  const left   = Math.max(dragRect.left,   targetRect.left);
  const right  = Math.min(dragRect.right,  targetRect.right);
  const top    = Math.max(dragRect.top,    targetRect.top);
  const bottom = Math.min(dragRect.bottom, targetRect.bottom);

  if (right <= left || bottom <= top) return 0; // 겹침 없음

  const intersectionArea = (right - left) * (bottom - top);
  const dragArea   = dragRect.width  * dragRect.height;
  const targetArea = targetRect.width * targetRect.height;
  const minArea    = Math.min(dragArea, targetArea);

  if (minArea === 0) return 0;
  return intersectionArea / minArea;
}

// 면적 기반 폴더 생성 겹침 임계값 (60% 이상 겹침 시 FOLDER_CANDIDATE 모드 진입)
const FOLDER_THRESHOLD = 0.6;

function runAppSafe(app) {
  if (!app || !app.path) return;
  try {
    window.electronAPI?.runApp?.(app.path);
  } catch (e) {
    console.warn("runApp 호출 실패:", e);
  }
}

export default function Desktop() {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 80,    // 400ms long press (더블클릭 ~300ms보다 충분히 길어 충돌 없음)
        tolerance: 8,  // 8px 이내 움직임 허용 (손가락/마우스 떨림 방지)
      },
    })
  );

  // 드롭 애니메이션 커스텀 -- 드롭 중 원본 아이콘 숨김 유지 (opacity 충돌 방지)
  const dropAnimationConfig = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0',
        },
      },
    }),
  };

  const wrapperRef = useRef(null);
  const mouseSwipeStartRef = useRef(null);
  const currentPageRef = useRef(0);
  const pagesLengthRef = useRef(1);
  // 초기 로딩 중 debounce 저장 방지 플래그
  const isInitialLoad = useRef(true);
  // 드래그 중 여부 (마우스 스와이프와 충돌 방지용)
  const activeIdRef = useRef(null);
  // 드래그 중 DnD 모드 상태 머신: 'NEUTRAL' | 'REORDER' | 'FOLDER_CANDIDATE'
  const dndModeRef = useRef('NEUTRAL');
  // 폴더 생성 후보 타겟 id (dndModeRef === 'FOLDER_CANDIDATE'일 때 유효)
  const folderCandidateTargetRef = useRef(null);
  // 엣지 자동 슬라이드 타이머 (350ms)
  const edgeSlideTimerRef = useRef(null);
  // 마지막으로 계산된 겹침 비율 — handleDragEnd에서 드롭 시점 조건 판별에 사용
  const lastOverlapRatioRef = useRef(0);

  const pages = useDesktopStore((state) => state.pages);
  const currentPage = useDesktopStore((state) => state.currentPage);
  const touchStartX = useDesktopStore((state) => state.touchStartX);
  const activeId = useDesktopStore((state) => state.activeId);

  const setPages = useDesktopStore((state) => state.setPages);
  const setCurrentPage = useDesktopStore((state) => state.setCurrentPage);
  const setTouchStartX = useDesktopStore((state) => state.setTouchStartX);
  const setActiveId = useDesktopStore((state) => state.setActiveId);
  const setOpenedFolderId = useDesktopStore((state) => state.setOpenedFolderId);
  const setFolderCandidateTargetId = useDesktopStore((state) => state.setFolderCandidateTargetId);
  const openedFolderId = useDesktopStore((state) => state.openedFolderId);
  const draggingFromFolderApp = useDesktopStore((state) => state.draggingFromFolderApp);
  const setDraggingFromFolderApp = useDesktopStore((state) => state.setDraggingFromFolderApp);

  currentPageRef.current = currentPage;
  pagesLengthRef.current = pages.length;
  activeIdRef.current = activeId;

  // 앱 시작 시 저장된 레이아웃 로드 → 없으면 시스템 앱 스캔
  useEffect(() => {
    async function init() {
      const api = window.electronAPI;
      if (!api) return;

      try {
        // 1. 저장된 레이아웃 로드 시도
        const saved = await api.loadLayout?.();
        if (saved && saved.pages && saved.pages.length > 0) {
          setPages(saved.pages);
          setCurrentPage(saved.currentPage || 0);
          // 초기 로드 완료 후 debounce 저장 방지 플래그 해제
          setTimeout(() => { isInitialLoad.current = false; }, 100);
          return;
        }
      } catch (e) {
        console.warn("레이아웃 로드 실패, 시스템 앱 스캔으로 전환:", e);
      }

      // 2. 저장된 레이아웃이 없으면 기존 로직: 시스템 앱 스캔
      try {
        if (typeof api.getApplications === "function") {
          const apps = await api.getApplications();
          if (Array.isArray(apps) && apps.length > 0) {
            const flatItems = apps.map((app) => ({
              type: "app",
              id: app.path || app.name,
              ...app,
            }));
            setPages(chunkIntoPagesWithEmptySlots(flatItems));
            setCurrentPage(0);
          }
        }
      } catch (e) {
        console.error("getApplications 호출 실패:", e);
      }

      setTimeout(() => { isInitialLoad.current = false; }, 100);
    }

    init();
  }, []);

  // pages 또는 currentPage 변경 시 2초 debounce 후 자동 저장
  useEffect(() => {
    // 초기 로딩 중에는 저장하지 않음
    if (isInitialLoad.current) return;

    const timer = setTimeout(() => {
      window.electronAPI?.saveLayout?.({ pages, currentPage });
    }, 2000);

    return () => clearTimeout(timer);
  }, [pages, currentPage]);

  // 마우스 클릭 유지 후 드래그로 페이지 스와이프 (빈 공간에서만)
  useEffect(() => {
    const onMouseMove = (e) => {
      // 드래그 중에는 마우스 스와이프 비활성화 (DnD와 충돌 방지)
      if (activeIdRef.current) return;
      if (mouseSwipeStartRef.current == null || e.buttons !== 1) return;
      const dx = e.clientX - mouseSwipeStartRef.current;
      const threshold = 50;
      if (Math.abs(dx) >= threshold) {
        const cur = currentPageRef.current;
        const maxPage = Math.max(0, pagesLengthRef.current - 1);
        if (dx > 0 && cur > 0) {
          setCurrentPage(Math.max(cur - 1, 0));
        } else if (dx < 0 && cur < maxPage) {
          setCurrentPage(Math.min(cur + 1, maxPage));
        }
        mouseSwipeStartRef.current = null;
      }
    };
    const onMouseUp = () => {
      mouseSwipeStartRef.current = null;
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  // 스와이프(터치)로 페이지 전환
  const handleTouchStart = (e) => {
    if (e.touches && e.touches.length > 0) {
      setTouchStartX(e.touches[0].clientX);
    }
  };

  const handleTouchEnd = (e) => {
    if (touchStartX == null) return;
    if (!e.changedTouches || e.changedTouches.length === 0) return;

    const endX = e.changedTouches[0].clientX;
    const dx = endX - touchStartX;
    const threshold = 50; // 스와이프 감지 기준 픽셀

    if (Math.abs(dx) >= threshold) {
      if (dx < 0 && currentPage < pages.length - 1) {
        // 왼쪽으로 스와이프 → 다음 페이지
        setCurrentPage(currentPage + 1);
      } else if (dx > 0 && currentPage > 0) {
        // 오른쪽으로 스와이프 → 이전 페이지
        setCurrentPage(currentPage - 1);
      }
    }

    setTouchStartX(null);
  };

  // 트랙패드/마우스 휠로 페이지 전환 (수평 스크롤 기준)
  const handleWheel = (e) => {
    const { deltaX, deltaY } = e;
    if (Math.abs(deltaX) < Math.abs(deltaY)) return; // 수평 제스처만 처리
    const threshold = 30;
    if (Math.abs(deltaX) < threshold) return;

    if (deltaX > 0 && currentPage < pages.length - 1) {
      // 오른쪽으로 스크롤 → 다음 페이지
      setCurrentPage(currentPage + 1);
    } else if (deltaX < 0 && currentPage > 0) {
      // 왼쪽으로 스크롤 → 이전 페이지
      setCurrentPage(currentPage - 1);
    }
  };

  // 폴더 후보 상태 초기화 — handleDragEnd/handleDragCancel 최상단에서 호출
  const clearFolderCandidate = () => {
    dndModeRef.current = 'NEUTRAL';
    folderCandidateTargetRef.current = null;
    setFolderCandidateTargetId(null);
  };

  // 엣지 슬라이드 타이머 정리 헬퍼
  const clearEdgeSlide = () => {
    if (edgeSlideTimerRef.current) {
      clearTimeout(edgeSlideTimerRef.current);
      edgeSlideTimerRef.current = null;
    }
  };

  // onDragOver: 엣지 자동 슬라이드만 처리 (폴더 hover 타이머 제거됨)
  // 폴더 생성 후보 감지는 handleDragMove(면적 계산)로 이전됨
  const handleDragOver = (event) => {
    const { over } = event;
    if (!over) {
      clearEdgeSlide();
      return;
    }

    const overId = String(over.id);

    // 엣지 자동 슬라이드 처리
    if (overId === "page-right" || overId === "page-left") {
      // 이미 타이머 진행 중이면 재시작 안 함 (연속 슬라이드는 타이머 완료 후 자동 재시작)
      if (edgeSlideTimerRef.current) return;

      const isRight = overId === "page-right";
      const curPage = currentPageRef.current;
      const pagesLen = pagesLengthRef.current;

      // 경계 조건: 첫 페이지 왼쪽, 마지막 페이지 오른쪽은 타이머 없음
      if (isRight && curPage >= pagesLen - 1) return;
      if (!isRight && curPage <= 0) return;

      edgeSlideTimerRef.current = setTimeout(() => {
        edgeSlideTimerRef.current = null; // null로 만들어 연속 슬라이드 허용
        const nextPage = isRight
          ? currentPageRef.current + 1
          : currentPageRef.current - 1;
        const clampedPage = Math.max(0, Math.min(nextPage, pagesLengthRef.current - 1));
        setCurrentPage(clampedPage);
      }, 350); // 350ms — One UI 참고값

      return;
    }

    // 엣지 아닌 곳 → 슬라이드 타이머 클리어
    clearEdgeSlide();
  };

  const handleDragStart = (event) => {
    const { active } = event;
    setActiveId(active.id);

    // 폴더 모달 앱 드래그 감지 — id 패턴: folder-app-{appId}
    // 모달은 닫지 않음 — onDragMove에서 포인터가 모달 영역 바깥으로 나갈 때 닫힘
    if (String(active.id).startsWith("folder-app-")) {
      const app = active.data.current?.app;
      if (app && openedFolderId) {
        setDraggingFromFolderApp({ app, folderId: openedFolderId });
      }
    }
  };

  // onDragMove: 두 경로로 분기
  const handleDragMove = (event) => {
    // ── 경로 A: 폴더 모달 앱 꺼내기 ── (기존 로직 변경 없음)
    const currentDraggingFromFolderApp = useDesktopStore.getState().draggingFromFolderApp;
    const currentOpenedFolderId = useDesktopStore.getState().openedFolderId;
    if (currentDraggingFromFolderApp && currentOpenedFolderId) {
      const { activatorEvent, delta } = event;
      const pointerX = activatorEvent.clientX + delta.x;
      const pointerY = activatorEvent.clientY + delta.y;

      const modalEl = document.querySelector("[data-folder-modal]");
      if (!modalEl) return;

      const rect = modalEl.getBoundingClientRect();
      if (
        pointerX < rect.left ||
        pointerX > rect.right ||
        pointerY < rect.top ||
        pointerY > rect.bottom
      ) {
        setOpenedFolderId(null);
      }
      return; // 경로 A 이후 면적 계산 실행 안 함
    }

    // ── 경로 B: 일반 드래그 — 면적 기반 폴더 후보 상태 머신 ──
    const { active, over } = event;
    if (!active || !over) {
      // over가 없으면 NEUTRAL 복귀
      if (dndModeRef.current !== 'NEUTRAL') {
        dndModeRef.current = 'NEUTRAL';
        folderCandidateTargetRef.current = null;
        setFolderCandidateTargetId(null);
      }
      return;
    }

    const overId = String(over.id);

    // 엣지 드롭존 위에서는 NEUTRAL 유지 (폴더 생성 불가)
    if (overId === "page-left" || overId === "page-right") {
      if (dndModeRef.current !== 'NEUTRAL') {
        dndModeRef.current = 'NEUTRAL';
        folderCandidateTargetRef.current = null;
        setFolderCandidateTargetId(null);
      }
      return;
    }

    // 자기 자신 위로 드래그 — REORDER
    if (String(active.id) === overId) {
      if (dndModeRef.current !== 'REORDER') {
        dndModeRef.current = 'REORDER';
        folderCandidateTargetRef.current = null;
        setFolderCandidateTargetId(null);
      }
      return;
    }

    // 타겟 아이템 조회
    const currentPages = useDesktopStore.getState().pages;
    const overPos = findItemPosition(currentPages, overId);

    // 빈 슬롯 위 — REORDER
    if (!overPos || overPos.item.type === 'empty') {
      if (dndModeRef.current !== 'REORDER') {
        dndModeRef.current = 'REORDER';
        folderCandidateTargetRef.current = null;
        setFolderCandidateTargetId(null);
      }
      return;
    }

    // 타겟이 앱 또는 폴더 — 면적 계산
    // dnd-kit이 제공하는 active.rect.current.translated가 드래그 중 현재 위치
    const dragRect = active.rect?.current?.translated;
    if (!dragRect) return;

    // 타겟 DOM 요소 조회 (data-id 속성 사용)
    // data-id 속성이 없으면 over.rect fallback 사용
    const targetEl = document.querySelector(`[data-id="${overId}"]`);
    let ratio = 0;
    if (targetEl) {
      ratio = calcIntersectionRatio(dragRect, targetEl);
    } else if (over.rect) {
      // fallback: over.rect (dnd-kit 제공 타겟 rect)
      const left   = Math.max(dragRect.left,   over.rect.left);
      const right  = Math.min(dragRect.right,  over.rect.left + over.rect.width);
      const top    = Math.max(dragRect.top,    over.rect.top);
      const bottom = Math.min(dragRect.bottom, over.rect.top + over.rect.height);
      if (right > left && bottom > top) {
        const intersectionArea = (right - left) * (bottom - top);
        const dragArea   = dragRect.width  * dragRect.height;
        const targetArea = over.rect.width * over.rect.height;
        const minArea    = Math.min(dragArea, targetArea);
        ratio = minArea > 0 ? intersectionArea / minArea : 0;
      }
    }

    // 상태 머신 전이
    const nextMode = ratio >= FOLDER_THRESHOLD ? 'FOLDER_CANDIDATE' : 'REORDER';

    if (nextMode === 'FOLDER_CANDIDATE') {
      // 같은 타겟으로 이미 FOLDER_CANDIDATE면 재설정 불필요
      if (dndModeRef.current === 'FOLDER_CANDIDATE' && folderCandidateTargetRef.current === overId) return;

      dndModeRef.current = 'FOLDER_CANDIDATE';
      folderCandidateTargetRef.current = overId;  // ref 갱신
      setFolderCandidateTargetId(overId);         // 시각 피드백 (FolderIcon의 folderHoverTarget 클래스)
    } else {
      // REORDER — 이전에 FOLDER_CANDIDATE였다면 초기화
      if (dndModeRef.current !== 'REORDER') {
        dndModeRef.current = 'REORDER';
        folderCandidateTargetRef.current = null;  // ref 초기화
        setFolderCandidateTargetId(null);
      }
    }
  };

  // 드래그 취소(Escape 등) 시 상태 정리 — draggingFromFolderApp이 남으면 이후 모든 드래그가 잘못된 경로로 진입
  const handleDragCancel = () => {
    clearFolderCandidate(); // clearFolderHover() 대신 (내부에서 dndModeRef, folderCandidateTargetRef 모두 초기화)
    clearEdgeSlide(); // 취소 시 엣지 슬라이드 타이머 정리
    setActiveId(null);
    setDraggingFromFolderApp(null);
  };

  const handleDragEnd = (event) => {
    clearEdgeSlide(); // 드래그 종료 시 엣지 슬라이드 타이머 정리
    const { active, over } = event;

    // 폴더 생성 후보 상태를 먼저 저장 (clearFolderCandidate 호출 전)
    const folderCandidateTarget = folderCandidateTargetRef.current; // ref에서 직접 읽기

    // 폴더 모달에서 DnD로 앱 꺼내기 처리
    if (draggingFromFolderApp) {
      clearFolderCandidate(); // clearFolderHover() 대신
      setDraggingFromFolderApp(null);
      setActiveId(null);

      if (over) {
        const overId = String(over.id);
        const { app, folderId } = draggingFromFolderApp;
        const latestPages = useDesktopStore.getState().pages;
        const nextPages = latestPages.map((p) => [...p]);

        // 폴더에서 앱 제거
        for (let pi = 0; pi < nextPages.length; pi++) {
          const folderIdx = nextPages[pi].findIndex(
            (it) => it.id === folderId && it.type === "folder"
          );
          if (folderIdx === -1) continue;

          const folder = nextPages[pi][folderIdx];
          const newItems = folder.items.filter((it) => it.id !== app.id);

          if (newItems.length === 0) {
            // 앱 0개 — 빈 슬롯으로 교체
            nextPages[pi][folderIdx] = {
              id: `empty-${pi}-${folderIdx}-${Date.now()}`,
              type: "empty",
            };
          } else if (newItems.length === 1) {
            // 앱 1개 — 폴더 해제, 남은 앱을 폴더 자리에
            nextPages[pi][folderIdx] = newItems[0];
          } else {
            nextPages[pi][folderIdx] = { ...folder, items: newItems };
          }
          break;
        }

        // 드롭 위치에 앱 배치
        const dropPos = findItemPosition(nextPages, overId);
        if (dropPos && dropPos.item.type === "empty") {
          // 빈 슬롯에 직접 배치 (기존 동작 유지)
          nextPages[dropPos.pageIndex][dropPos.itemIndex] = app;
        } else if (dropPos) {
          // 앱/폴더 위에 드롭 — 타겟 페이지 빈 슬롯에 임시 배치 후 arrayMove로 커서 위치 삽입
          const { pageIndex: targetPage, itemIndex: targetIndex } = dropPos;
          const emptyIdx = nextPages[targetPage].findIndex((it) => it.type === "empty");
          if (emptyIdx !== -1) {
            nextPages[targetPage][emptyIdx] = app;
            nextPages[targetPage] = arrayMove(nextPages[targetPage], emptyIdx, targetIndex);
          } else {
            // 타겟 페이지 빈 슬롯 없음 → 현재 페이지 첫 빈 슬롯 fallback
            const curPage = useDesktopStore.getState().currentPage;
            const curEmptyIdx = nextPages[curPage].findIndex((it) => it.type === "empty");
            if (curEmptyIdx !== -1) nextPages[curPage][curEmptyIdx] = app;
          }
        }

        setPages(nextPages);
      }
      return;
    }

    clearFolderCandidate(); // clearFolderHover() 대신
    setActiveId(null);
    if (!over) return;

    const activeItemId = active.id;
    const overId = String(over.id);

    // 현재 pages 최신 상태 기준으로 최종 배치 계산
    const latestPages = useDesktopStore.getState().pages;
    const fromPos = findItemPosition(latestPages, activeItemId);
    if (!fromPos || fromPos.item.type === 'empty') return;

    // 1) 페이지 가장자리 드롭 — 페이지 이동은 handleDragOver 타이머에서 이미 완료됨
    // fallback: 엣지 위에서 드롭된 경우, 현재 페이지(슬라이드 완료 후) 첫 빈 슬롯에 배치
    if (overId === "page-right" || overId === "page-left") {
      const { pageIndex, itemIndex, item } = fromPos;
      const curPage = useDesktopStore.getState().currentPage;
      const nextPages = latestPages.map(p => [...p]);
      const emptyIdx = nextPages[curPage].findIndex(it => it.type === 'empty');
      if (emptyIdx !== -1) {
        // 원래 위치를 빈 슬롯으로 교체
        nextPages[pageIndex][itemIndex] = {
          id: `empty-${pageIndex}-${itemIndex}`,
          type: 'empty'
        };
        // 현재 페이지 첫 빈 슬롯에 배치
        nextPages[curPage][emptyIdx] = item;
        setPages(nextPages);
      }
      return;
    }

    if (activeItemId === overId) return;

    // 2) 일반 드래그 로직 — latestPages 기준으로 최종 위치 확정
    const toPos = findItemPosition(latestPages, overId);
    if (!toPos) return;

    const { pageIndex: fromPage, itemIndex: fromIndex } = fromPos;
    const { pageIndex: toPage, itemIndex: toIndex, item: toItem } = toPos;

    const nextPages = latestPages.map((p) => [...p]);

    // A. 앱 → 빈 슬롯 위로 드롭 — swap으로 배치
    if (toItem.type === 'empty') {
      const temp = nextPages[fromPage][fromIndex];
      nextPages[fromPage][fromIndex] = nextPages[toPage][toIndex];
      nextPages[toPage][toIndex] = temp;
      setPages(nextPages);
      return;
    }

    // B. 앱 → 폴더 위로 드롭 (면적 60% 이상 겹침 시에만 폴더에 앱 추가)
    if (toItem.type === 'folder') {
      // 면적 기반: FOLDER_CANDIDATE 상태이고 같은 타겟이면 폴더에 앱 추가
      if (!folderCandidateTarget || folderCandidateTarget !== overId) return;
      // active 아이템을 folder.items 맨 뒤에 추가
      nextPages[toPage][toIndex] = {
        ...toItem,
        items: [...toItem.items, fromPos.item],
      };
      // active 원래 위치를 빈 슬롯으로 교체
      nextPages[fromPage][fromIndex] = {
        id: `empty-${fromPage}-${fromIndex}-${Date.now()}`,
        type: 'empty',
      };
      setPages(nextPages);
      return;
    }

    // C. 앱 → 앱 위로 드롭
    // - folderCandidateTarget === overId: 면적 60% 이상 겹침 후 DROP → 폴더 생성
    // - 그 외: arrayMove 삽입 정렬 또는 페이지 간 교환
    if (folderCandidateTarget && folderCandidateTarget === overId) {
      // 폴더 생성 — DROP 시에만 실행
      const newFolderId = `folder-${crypto.randomUUID().split("-")[0]}`;
      const newFolder = {
        id: newFolderId,
        type: "folder",
        name: "새 폴더",
        items: [fromPos.item, toItem],
      };
      // over 위치에 새 폴더 배치
      nextPages[toPage][toIndex] = newFolder;
      // active 원래 위치를 빈 슬롯으로 교체
      nextPages[fromPage][fromIndex] = {
        id: `empty-${fromPage}-${fromIndex}-${Date.now()}`,
        type: "empty",
      };
    } else if (fromPage === toPage) {
      // 같은 페이지 내 — arrayMove로 삽입 정렬
      nextPages[fromPage] = arrayMove(nextPages[fromPage], fromIndex, toIndex);
    } else {
      const temp = nextPages[fromPage][fromIndex];
      nextPages[fromPage][fromIndex] = nextPages[toPage][toIndex];
      nextPages[toPage][toIndex] = temp;
    }
    setPages(nextPages);
  };

  const activeItem = activeId
    ? (() => {
      for (let p = 0; p < pages.length; p++) {
        const idx = pages[p].findIndex((it) => it.id === activeId);
        if (idx !== -1) return pages[p][idx];
      }
      return null;
    })()
    : null;

  const goToPage = (index) => {
    const next = Math.max(0, Math.min(index, pages.length - 1));
    setCurrentPage(next);
  };

  return (
    <>
      <div
        ref={wrapperRef}
        className={styles.desktopWrapper}
        data-desktop-wrapper="true"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        onMouseDown={(e) => {
          // 아이콘(data-sortable) 위에서는 스와이프 시작 안 함 → DnD 전용
          // 빈 슬롯/패딩 영역에서만 스와이프 시작
          if (
            e.target.closest("[data-desktop-wrapper]") &&
            !e.target.closest("[data-sortable='true']")
          ) {
            mouseSwipeStartRef.current = e.clientX;
          }
        }}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={createEdgeCollision(wrapperRef)}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className={styles.desktopViewport}>
            <div
              className={styles.pagesContainer}
              style={{
                transform: `translateX(-${currentPage * 100}%)`,
                transition: 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)'
              }}
            >
              {pages.map((pageItems, pageIdx) => (
                <div key={`page-wrapper-${pageIdx}`} className={styles.pageWrapper}>
                  <SortableContext
                    items={pageItems.map((it) => it.id)}
                  >
                    <div className={styles.desktop}>
                      {pageItems.map((item) => {
                        if (item.type === 'empty') {
                          return <EmptySlot key={item.id} id={item.id} />;
                        }

                        if (item.type === 'folder') {
                          return (
                            <FolderIcon
                              key={item.id}
                              folder={item}
                              openFolder={() => setOpenedFolderId(item.id)}
                            />
                          );
                        }

                        return (
                          <AppIcon
                            key={item.id}
                            app={item}
                            openApp={() => runAppSafe(item)}
                          />
                        );
                      })}
                    </div>
                  </SortableContext>
                </div>
              ))}
            </div>
          </div>

          {/* PageDropZone은 항상 마운트 유지 — 조건부 마운트 시 rect.current=null로 over=null이 되어
              페이지 전환 드래그가 항상 실패하는 버그 발생. isActive prop으로 가시성/포인터 이벤트 제어 */}
          {currentPage !== 0 && (
            <PageDropZone id="page-left" side="left" isActive={!!activeId} />
          )}
          <PageDropZone id="page-right" side="right" isActive={!!activeId} />

          <DragOverlay dropAnimation={dropAnimationConfig}>
            {draggingFromFolderApp ? (
              // 폴더 모달 앱 꺼내기 — 모달이 닫히고 DragOverlay가 앱을 이어받음
              <div style={{
                transform: 'scale(1.15)',
                filter: 'drop-shadow(0 8px 20px rgba(0, 0, 0, 0.5))',
              }}>
                <AppIconOverlay app={draggingFromFolderApp.app} />
              </div>
            ) : activeItem && activeItem.type !== 'empty' ? (
              <div style={{
                transform: 'scale(1.15)',
                filter: 'drop-shadow(0 8px 20px rgba(0, 0, 0, 0.5))',
              }}>
                {activeItem.type === 'folder' ? (
                  <FolderIconOverlay folder={activeItem} />
                ) : (
                  <AppIconOverlay app={activeItem} />
                )}
              </div>
            ) : null}
          </DragOverlay>

          {/* 폴더 열기 모달 — DndContext 안에서 렌더링 (useDraggable DnD 핸드오프를 위해) */}
          <FolderModal />
        </DndContext>
      </div>

      <div className={styles.pageIndicator}>
        <button
          type="button"
          className={styles.pageNav}
          aria-label="이전 페이지"
          disabled={currentPage <= 0}
          onClick={() => goToPage(currentPage - 1)}
        >
          ‹
        </button>
        {pages.map((_, idx) => (
          <button
            key={idx}
            type="button"
            className={
              idx === currentPage
                ? `${styles.dot} ${styles.dotActive}`
                : styles.dot
            }
            aria-label={`페이지 ${idx + 1}`}
            onClick={() => goToPage(idx)}
          />
        ))}
        <button
          type="button"
          className={styles.pageNav}
          aria-label="다음 페이지"
          disabled={currentPage >= pages.length - 1}
          onClick={() => goToPage(currentPage + 1)}
        >
          ›
        </button>
      </div>
    </>
  );
}
