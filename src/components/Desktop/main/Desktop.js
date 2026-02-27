import React, { useEffect, useRef } from "react";
import { DndContext, DragOverlay, PointerSensor, rectIntersection, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove } from "@dnd-kit/sortable";
import AppIcon, { EmptySlot, AppIconOverlay } from "../../FolderIcon/main/FolderIcon";
import PageDropZone from "../../PageDropZone/main/PageDropZone";
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
        distance: 5, // 5픽셀 이동 후 드래그 시작 (즉각 반응)
      },
    })
  );

  const wrapperRef = useRef(null);
  const mouseSwipeStartRef = useRef(null);
  const currentPageRef = useRef(0);
  const pagesLengthRef = useRef(1);
  // 초기 로딩 중 debounce 저장 방지 플래그
  const isInitialLoad = useRef(true);
  // 드래그 중 여부 (마우스 스와이프와 충돌 방지용)
  const activeIdRef = useRef(null);

  const pages = useDesktopStore((state) => state.pages);
  const currentPage = useDesktopStore((state) => state.currentPage);
  const touchStartX = useDesktopStore((state) => state.touchStartX);
  const activeId = useDesktopStore((state) => state.activeId);

  const setPages = useDesktopStore((state) => state.setPages);
  const setCurrentPage = useDesktopStore((state) => state.setCurrentPage);
  const setTouchStartX = useDesktopStore((state) => state.setTouchStartX);
  const setActiveId = useDesktopStore((state) => state.setActiveId);

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

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };


  const handleDragEnd = (event) => {
    const { active, over } = event;
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

    // B. 앱 → 앱 위로 드롭 (arrayMove 삽입 정렬 또는 페이지 간 교환)
    if (fromPage === toPage) {
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

          <DragOverlay dropAnimation={null}>
            {activeItem && activeItem.type !== 'empty' ? (
              <AppIconOverlay app={activeItem} />
            ) : null}
          </DragOverlay>
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
