import React, { useCallback, useEffect, useRef } from "react";
import { DndContext, DragOverlay, PointerSensor, rectIntersection, useSensor, useSensors, defaultDropAnimationSideEffects } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import AppIcon, { EmptySlot, AppIconOverlay, FolderIcon, FolderIconOverlay } from "../../FolderIcon/main/FolderIcon";
import PageDropZone from "../../PageDropZone/main/PageDropZone";
import FolderModal from "../../FolderModal/main/FolderModal";
import styles from "./Desktop.module.css";
import useDesktopStore from "../store/state";

const EDGE_ZONE_WIDTH = 40;

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

/**
 * 드래그 중 아이템(active)과 타겟 아이템의 Bounding Rect 교차 면적 비율 계산
 * min(activeArea, targetArea) 기준 — drag-logic.md 요구사항
 * @param {object} activeRect - active.rect.current.translated (DnD kit 제공)
 * @param {string} targetId   - 타겟 아이템의 data-id 속성값
 * @returns {number} 0~1 사이 교차 비율
 */
function calcIntersectionRatio(activeRect, targetId) {
  if (!activeRect) return 0;
  // data-id 속성으로 타겟 DOM 요소 찾기
  const targetEl = document.querySelector(`[data-id="${targetId}"]`);
  if (!targetEl) return 0;

  const t = targetEl.getBoundingClientRect();

  // 교차 영역 계산
  const overlapLeft   = Math.max(activeRect.left,   t.left);
  const overlapTop    = Math.max(activeRect.top,    t.top);
  const overlapRight  = Math.min(activeRect.right,  t.right);
  const overlapBottom = Math.min(activeRect.bottom, t.bottom);

  const overlapW = Math.max(0, overlapRight  - overlapLeft);
  const overlapH = Math.max(0, overlapBottom - overlapTop);
  const overlapArea = overlapW * overlapH;
  if (overlapArea === 0) return 0;

  const activeArea = (activeRect.right - activeRect.left) * (activeRect.bottom - activeRect.top);
  const targetArea = t.width * t.height;
  const minArea = Math.min(activeArea, targetArea);
  if (minArea <= 0) return 0;

  return overlapArea / minArea;
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
  // 면적 기반 DnD 모드 ('REORDER' | 'FOLDER_CANDIDATE')
  // Zustand 대신 ref 사용 — 60fps drag move 이벤트에서 105개 아이콘 re-render 방지
  const dndModeRef = useRef('REORDER');
  // FOLDER_CANDIDATE 상태의 타겟 id — DROP 시 판정에 사용 (Zustand의 folderCandidateTargetId와 동기)
  const folderCandidateTargetRef = useRef(null);

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

  // dndMode ref + Zustand 시각 피드백을 동시에 업데이트하는 헬퍼
  // Zustand folderCandidateTargetId는 CSS 시각 피드백 전용 — 실제 DROP 판정은 ref 기준
  const _setDndMode = useCallback((mode, targetId) => {
    dndModeRef.current = mode;
    folderCandidateTargetRef.current = targetId;
    setFolderCandidateTargetId(targetId);
  }, [setFolderCandidateTargetId]);

  // onDragOver: 엣지 존 또는 over=null 시 FOLDER_CANDIDATE 상태 해제
  // 면적 기반 실제 감지는 onDragMove에서 처리
  const handleDragOver = (event) => {
    const { over } = event;
    if (!over) {
      if (dndModeRef.current === 'FOLDER_CANDIDATE') {
        _setDndMode('REORDER', null);
      }
      return;
    }
    const overId = String(over.id);
    if (overId === "page-left" || overId === "page-right") {
      if (dndModeRef.current === 'FOLDER_CANDIDATE') {
        _setDndMode('REORDER', null);
      }
    }
  };

  const handleDragStart = (event) => {
    const { active } = event;
    setActiveId(active.id);
    // 면적 기반 상태 머신 초기화
    // REORDER로 시작: 드래그 직후는 50~80% Hysteresis 구간일 가능성이 높음
    dndModeRef.current = 'REORDER';
    folderCandidateTargetRef.current = null;

    // 폴더 모달 앱 드래그 감지 — id 패턴: folder-app-{appId}
    // 모달은 닫지 않음 — onDragMove에서 포인터가 모달 영역 바깥으로 나갈 때 닫힘
    if (String(active.id).startsWith("folder-app-")) {
      const app = active.data.current?.app;
      if (app && openedFolderId) {
        setDraggingFromFolderApp({ app, folderId: openedFolderId });
      }
    }
  };

  // onDragMove: 면적 기반 폴더 후보 감지 Hysteresis 상태 머신 (60fps)
  // drag-logic.md: 면적 ≥80% → FOLDER_CANDIDATE, <50% → REORDER, 50~80% → 유지
  const handleDragMove = (event) => {
    // 폴더 모달 앱 드래그 중 포인터가 모달 바깥으로 나가면 모달 닫기 (기존 로직 유지)
    const currentOpenedFolderId = useDesktopStore.getState().openedFolderId;
    const currentDraggingFromFolderApp = useDesktopStore.getState().draggingFromFolderApp;
    if (currentDraggingFromFolderApp && currentOpenedFolderId) {
      const { activatorEvent, delta } = event;
      const pointerX = activatorEvent.clientX + delta.x;
      const pointerY = activatorEvent.clientY + delta.y;
      const modalEl = document.querySelector("[data-folder-modal]");
      if (modalEl) {
        const rect = modalEl.getBoundingClientRect();
        if (
          pointerX < rect.left ||
          pointerX > rect.right ||
          pointerY < rect.top ||
          pointerY > rect.bottom
        ) {
          setOpenedFolderId(null);
        }
      }
      return;
    }

    // 면적 기반 폴더 후보 감지
    const { active } = event;
    const activeRect = active?.rect?.current?.translated;
    if (!activeRect) return;

    // 현재 페이지 아이템만 검사 (성능 — 페이지당 최대 105개)
    const currentPages = useDesktopStore.getState().pages;
    const curPage = useDesktopStore.getState().currentPage;
    const pageItems = currentPages[curPage] || [];

    let bestRatio = 0;
    let bestId = null;

    for (const item of pageItems) {
      // 드래그 중인 아이템 자신 제외, 빈 슬롯 제외
      if (item.id === String(active.id)) continue;
      if (item.type === 'empty') continue;

      const ratio = calcIntersectionRatio(activeRect, item.id);
      if (ratio > bestRatio) {
        bestRatio = ratio;
        bestId = item.id;
      }
    }

    // Hysteresis 상태 머신 적용
    if (bestRatio >= 0.8) {
      // ≥ 80%: FOLDER_CANDIDATE 전환 (타겟이 바뀌어도 즉시 갱신)
      if (dndModeRef.current !== 'FOLDER_CANDIDATE' || folderCandidateTargetRef.current !== bestId) {
        _setDndMode('FOLDER_CANDIDATE', bestId);
      }
    } else if (bestRatio < 0.5) {
      // < 50%: REORDER 전환
      if (dndModeRef.current !== 'REORDER') {
        _setDndMode('REORDER', null);
      }
    }
    // 50~80% Hysteresis 구간: 현재 상태 유지 (떨림 방지)
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    // 폴더 모달에서 DnD로 앱 꺼내기 처리
    if (draggingFromFolderApp) {
      setDraggingFromFolderApp(null);
      setActiveId(null);
      _setDndMode('REORDER', null);

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
          nextPages[dropPos.pageIndex][dropPos.itemIndex] = app;
        } else {
          // 빈 슬롯이 아닌 곳에 드롭 → 현재 페이지 첫 번째 빈 슬롯에 배치
          const curPage = useDesktopStore.getState().currentPage;
          const emptyIdx = nextPages[curPage].findIndex((it) => it.type === "empty");
          if (emptyIdx !== -1) nextPages[curPage][emptyIdx] = app;
        }

        setPages(nextPages);
      }
      return;
    }

    // DROP 판정용 상태 저장 (정리 전에 캡처)
    // dndModeRef: 'FOLDER_CANDIDATE' → 폴더 생성/추가 의도 확정
    const isFolderCandidate = dndModeRef.current === 'FOLDER_CANDIDATE';
    const folderCandidateTarget = folderCandidateTargetRef.current;

    // 상태 정리 — 드래그 종료 후 항상 REORDER로 리셋
    _setDndMode('REORDER', null);
    setActiveId(null);
    if (!over) return;

    const activeItemId = active.id;
    const overId = String(over.id);

    // 빈 슬롯은 드래그 시작 자체가 안되지만, 혹시 모를 예외 처리
    const fromPos = findItemPosition(pages, activeItemId);
    if (!fromPos || fromPos.item.type === 'empty') return;

    // 1) 페이지 가장자리 드롭 (페이지 이동)
    if (overId === "page-right" || overId === "page-left") {
      const { pageIndex, itemIndex, item } = fromPos;
      let targetPageIdx = overId === "page-right" ? pageIndex + 1 : pageIndex - 1;

      if (targetPageIdx < 0) return;

      const nextPages = pages.map(p => [...p]);

      // 대상 페이지가 없으면 새로 생성 (PAGE_SIZE 개 빈 슬롯)
      if (targetPageIdx >= nextPages.length) {
        nextPages.push(Array.from({ length: PAGE_SIZE }, () => ({
          id: `empty-${pageIndex}-${itemIndex}-${crypto.randomUUID().split('-')[0]}`,
          type: 'empty'
        })));
      }

      const targetPage = nextPages[targetPageIdx];
      const firstEmptyIdx = targetPage.findIndex(it => it.type === 'empty');

      if (firstEmptyIdx !== -1) {
        // 원래 위치는 빈 슬롯으로 교체
        nextPages[pageIndex][itemIndex] = {
          id: `empty-${pageIndex}-${itemIndex}-${Date.now()}`,
          type: 'empty'
        };
        // 타겟 페이지의 빈 슬롯 자리에 앱 배치
        targetPage[firstEmptyIdx] = item;
        setPages(nextPages);
        setCurrentPage(targetPageIdx);
      }
      return;
    }

    if (activeItemId === overId) return;

    // 2) 일반 드래그 로직
    const toPos = findItemPosition(pages, overId);
    if (!toPos) return;

    const { pageIndex: fromPage, itemIndex: fromIndex } = fromPos;
    const { pageIndex: toPage, itemIndex: toIndex, item: toItem } = toPos;

    const nextPages = pages.map((p) => [...p]);

    // A. 앱 → 빈 슬롯 위로 드롭 (위치 교체)
    if (toItem.type === 'empty') {
      const temp = nextPages[fromPage][fromIndex];
      nextPages[fromPage][fromIndex] = nextPages[toPage][toIndex];
      nextPages[toPage][toIndex] = temp;
      setPages(nextPages);
      return;
    }

    // B. 앱 → 폴더 위로 드롭 (80% 면적 충족 시에만 폴더에 앱 추가)
    if (toItem.type === 'folder') {
      // 80% 면적 미충족 — 단순 통과 드롭 → 무시 (앱 원위치)
      if (!isFolderCandidate || folderCandidateTarget !== overId) return;
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
    // - isFolderCandidate && folderCandidateTarget === overId: 80% 면적 충족 → 폴더 생성
    // - 그 외: arrayMove 삽입 정렬 또는 페이지 간 교환
    if (isFolderCandidate && folderCandidateTarget === overId) {
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
    } else {
      // arrayMove → swap: 홈 스크린은 insert-shift가 아닌 swap 시맨틱
      // arrayMove는 소스~목적지 사이 모든 슬롯(빈 슬롯 포함)을 이동시켜
      // 105-슬롯 희소 배열에서 반복 드래그 시 앱 위치가 누적으로 흐트러짐
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

          {activeId && (
            <>
              {currentPage !== 0 && (
                <PageDropZone id="page-left" side="left" />
              )}
              <PageDropZone id="page-right" side="right" />
            </>
          )}

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
