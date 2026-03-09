import React, { useEffect, useRef } from "react";
import { DndContext, DragOverlay, PointerSensor, rectIntersection, useSensor, useSensors, defaultDropAnimationSideEffects } from "@dnd-kit/core";
import { SortableContext, arrayMove } from "@dnd-kit/sortable";
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
  // 폴더 생성 hover 타이머 (500ms)
  const folderHoverTimerRef = useRef(null);
  // 현재 hover 중인 타겟 id — 타이머 재시작 방지용
  const folderHoverTargetRef = useRef(null);
  // 엣지 자동 슬라이드 타이머 (350ms)
  const edgeSlideTimerRef = useRef(null);

  const pages = useDesktopStore((state) => state.pages);
  const currentPage = useDesktopStore((state) => state.currentPage);
  const touchStartX = useDesktopStore((state) => state.touchStartX);
  const activeId = useDesktopStore((state) => state.activeId);

  const setPages = useDesktopStore((state) => state.setPages);
  const setCurrentPage = useDesktopStore((state) => state.setCurrentPage);
  const setTouchStartX = useDesktopStore((state) => state.setTouchStartX);
  const setActiveId = useDesktopStore((state) => state.setActiveId);
  const setOpenedFolderId = useDesktopStore((state) => state.setOpenedFolderId);
  const setHoverTargetId = useDesktopStore((state) => state.setHoverTargetId);
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

  // 폴더 hover 타이머 정리 — 단일 지점 (handleDragEnd 최상단에서만 호출)
  const clearFolderHover = () => {
    if (folderHoverTimerRef.current) {
      clearTimeout(folderHoverTimerRef.current);
      folderHoverTimerRef.current = null;
    }
    folderHoverTargetRef.current = null;
    setHoverTargetId(null);
  };

  // 엣지 슬라이드 타이머 정리 헬퍼
  const clearEdgeSlide = () => {
    if (edgeSlideTimerRef.current) {
      clearTimeout(edgeSlideTimerRef.current);
      edgeSlideTimerRef.current = null;
    }
  };

  // onDragOver: 엣지 자동 슬라이드 (350ms) + 앱→앱 500ms hover 시 폴더 자동 생성 (One UI 패턴)
  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) {
      clearFolderHover();
      clearEdgeSlide(); // 엣지 벗어나면 타이머 클리어
      return;
    }

    const overId = String(over.id);

    // 엣지 자동 슬라이드 처리
    if (overId === "page-right" || overId === "page-left") {
      clearFolderHover();

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

    // over 아이템 조회 (최신 pages 사용)
    const currentPages = useDesktopStore.getState().pages;
    const overPos = findItemPosition(currentPages, overId);

    // over가 빈 슬롯이면 hover 취소
    if (!overPos || overPos.item.type === "empty") {
      clearFolderHover();
      return;
    }

    // over가 folder 타입인 경우 — 앱→앱과 동일한 500ms 타이머 패턴
    // 단순 통과와 "폴더에 추가하려는 의도"를 구분하기 위해
    if (overPos.item.type === "folder") {
      if (folderHoverTargetRef.current === overId) return;
      clearFolderHover();
      folderHoverTargetRef.current = overId;
      setHoverTargetId(overPos.item.id);
      folderHoverTimerRef.current = setTimeout(() => {
        folderHoverTimerRef.current = null;
        // folderHoverTargetRef.current 유지 — DROP 시 completedHoverTarget 판별용
        // hoverTargetId 시각 피드백 유지
      }, 500);
      return;
    }

    // active와 over가 동일하면 무시
    if (String(active.id) === overId) {
      clearFolderHover();
      return;
    }

    // 이미 같은 타겟으로 타이머 진행 중이면 재시작 안 함 (타이머 안정성)
    if (folderHoverTargetRef.current === overId) return;

    // 새 타겟 — 이전 타이머 정리 후 새 타이머 시작
    clearFolderHover();
    folderHoverTargetRef.current = overId;
    setHoverTargetId(overPos.item.id);

    folderHoverTimerRef.current = setTimeout(() => {
      // 타이머 완료 마킹 — ref는 유지(의도 완료 상태), 타이머 ref만 null
      // 실제 폴더 생성은 handleDragEnd에서 DROP 시에만 수행
      folderHoverTimerRef.current = null;
      // folderHoverTargetRef.current 유지 — handleDragEnd에서 completedHoverTarget 판별에 사용
      // hoverTargetId 시각 피드백 유지 — "여기 드롭하면 폴더 생성" 표시
    }, 500);
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

  // onDragMove: 폴더 모달 앱 드래그 중 포인터가 모달 영역 바깥으로 나가면 모달 닫기
  const handleDragMove = (event) => {
    // draggingFromFolderApp 상태이고 모달이 아직 열려있는 경우에만 처리
    const currentOpenedFolderId = useDesktopStore.getState().openedFolderId;
    const currentDraggingFromFolderApp = useDesktopStore.getState().draggingFromFolderApp;
    if (!currentDraggingFromFolderApp || !currentOpenedFolderId) return;

    // activatorEvent(최초 포인터 위치) + delta(이동량)으로 현재 포인터 좌표 계산
    const { activatorEvent, delta } = event;
    const pointerX = activatorEvent.clientX + delta.x;
    const pointerY = activatorEvent.clientY + delta.y;

    // data-folder-modal 속성으로 모달 요소 찾기
    const modalEl = document.querySelector("[data-folder-modal]");
    if (!modalEl) return;

    const rect = modalEl.getBoundingClientRect();
    // 포인터가 모달 영역 바깥이면 모달 닫기
    if (
      pointerX < rect.left ||
      pointerX > rect.right ||
      pointerY < rect.top ||
      pointerY > rect.bottom
    ) {
      setOpenedFolderId(null);
    }
  };

  // 드래그 취소(Escape 등) 시 상태 정리 — draggingFromFolderApp이 남으면 이후 모든 드래그가 잘못된 경로로 진입
  const handleDragCancel = () => {
    clearFolderHover();
    clearEdgeSlide(); // 취소 시 엣지 슬라이드 타이머 정리
    setActiveId(null);
    setDraggingFromFolderApp(null);
  };

  const handleDragEnd = (event) => {
    clearEdgeSlide(); // 드래그 종료 시 엣지 슬라이드 타이머 정리
    const { active, over } = event;

    // 폴더 모달에서 DnD로 앱 꺼내기 처리
    if (draggingFromFolderApp) {
      setDraggingFromFolderApp(null);
      setActiveId(null);
      clearFolderHover();

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

    // clearFolderHover 전에 의도 완료 상태 저장
    // 조건: 타이머 null(500ms 완료됨) + ref에 타겟 있음 = "드롭하면 폴더 생성" 의도 확정
    const completedHoverTarget =
      folderHoverTimerRef.current === null && folderHoverTargetRef.current
        ? folderHoverTargetRef.current
        : null;
    // 폴더 hover 타이머 정리 — 단일 지점
    clearFolderHover();
    setActiveId(null);
    if (!over) return;

    const activeItemId = active.id;
    const overId = String(over.id);

    // 빈 슬롯은 드래그 시작 자체가 안되지만, 혹시 모를 예외 처리
    // draggingFromFolderApp 경로와 동일한 패턴으로 최신 pages 획득 (stale closure 방지)
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

    // 2) 일반 드래그 로직
    const toPos = findItemPosition(latestPages, overId);
    if (!toPos) return;

    const { pageIndex: fromPage, itemIndex: fromIndex } = fromPos;
    const { pageIndex: toPage, itemIndex: toIndex, item: toItem } = toPos;

    const nextPages = latestPages.map((p) => [...p]);

    // A. 앱 → 빈 슬롯 위로 드롭 (위치 교체)
    if (toItem.type === 'empty') {
      const temp = nextPages[fromPage][fromIndex];
      nextPages[fromPage][fromIndex] = nextPages[toPage][toIndex];
      nextPages[toPage][toIndex] = temp;
      setPages(nextPages);
      return;
    }

    // B. 앱 → 폴더 위로 드롭 (500ms hover 완료 시에만 폴더에 앱 추가)
    if (toItem.type === 'folder') {
      // 500ms 미충족 — 단순 통과 드롭 → 무시 (앱 원위치)
      if (!completedHoverTarget || completedHoverTarget !== overId) return;
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
    // - completedHoverTarget === overId: 500ms hover 완료 후 DROP → 폴더 생성
    // - 그 외: arrayMove 삽입 정렬 또는 페이지 간 교환
    if (completedHoverTarget && completedHoverTarget === overId) {
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
