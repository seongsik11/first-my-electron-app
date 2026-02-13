import React, { useEffect, useRef, useState } from "react";
import { DndContext, DragOverlay, PointerSensor, rectIntersection, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove } from "@dnd-kit/sortable";
import FolderIcon, { FolderIconOverlay } from "./FolderIcon";
import FolderModal from "./FolderModal";
import PageDropZone from "./PageDropZone";
import styles from "./Desktop.module.css";

const EDGE_ZONE_WIDTH = 40;

/** 포인터가 좌/우 끝 영역에 있으면 page-left / page-right 를 최우선으로 반환 (드래그 시 페이지 이동 인식) */
function createEdgePriorityCollision(containerRef) {
  return (args) => {
    const { pointerCoordinates, droppableRects } = args;
    const el = containerRef.current;
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
const PAGE_SIZE = 20;

// 앱/폴더 공통 타입
// type: "app" | "folder"
// id: 고유 ID (path 또는 name 기반)
// items: folder 인 경우에만 존재

function chunkIntoPages(items) {
  const pages = [];
  for (let i = 0; i < items.length; i += PAGE_SIZE) {
    pages.push(items.slice(i, i + PAGE_SIZE));
  }
  return pages.length ? pages : [[]];
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
        distance: 5, // 5픽셀 이동 전까지는 이벤트를 가로채지 않음
      },
    })
  );

  const wrapperRef = useRef(null);
  const mouseSwipeStartRef = useRef(null);
  const currentPageRef = useRef(0);
  const pagesLengthRef = useRef(1);

  const [pages, setPages] = useState([[]]); // [[items...], [items...], ...]
  const [currentPage, setCurrentPage] = useState(0);
  const [openedFolder, setOpenedFolder] = useState(null);
  const [touchStartX, setTouchStartX] = useState(null);
  const [activeId, setActiveId] = useState(null);

  currentPageRef.current = currentPage;
  pagesLengthRef.current = pages.length;

  // Electron preload 를 통해 실제 OS 애플리케이션 목록을 가져와서
  // 아이폰/안드로이드 홈화면처럼 "앱 그리드 + 페이지"로 구성
  useEffect(() => {
    async function loadApplications() {
      const api = window.electronAPI;
      if (!api || typeof api.getApplications !== "function") {
        // 브라우저에서 열었거나, Electron API 가 없는 경우
        return;
      }

      try {
        const apps = await api.getApplications();
        if (Array.isArray(apps) && apps.length > 0) {
          const flatItems = apps.map((app) => ({
            type: "app",
            id: app.path || app.name, // path 우선
            ...app,
          }));
          setPages(chunkIntoPages(flatItems));
          setCurrentPage(0);
        }
      } catch (e) {
        console.error("getApplications 호출 실패:", e);
      }
    }

    loadApplications();
  }, []);

  // 마우스 클릭 유지 후 드래그로 페이지 스와이프 (빈 공간에서만)
  useEffect(() => {
    const onMouseMove = (e) => {
      if (mouseSwipeStartRef.current == null || e.buttons !== 1) return;
      const dx = e.clientX - mouseSwipeStartRef.current;
      const threshold = 50;
      if (Math.abs(dx) >= threshold) {
        const cur = currentPageRef.current;
        const maxPage = Math.max(0, pagesLengthRef.current - 1);
        if (dx > 0 && cur > 0) {
          setCurrentPage((p) => Math.max(p - 1, 0));
        }
        // [수정됨] dx < 0 (왼쪽으로 당김) -> 다음 페이지로 이동
        else if (dx < 0 && cur < maxPage) {
          setCurrentPage((p) => Math.min(p + 1, maxPage));
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

  const openFolder = (folder) => {
    setOpenedFolder(folder);
  };

  const closeFolder = () => {
    setOpenedFolder(null);
  };

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
        setCurrentPage((p) => Math.min(p + 1, pages.length - 1));
      } else if (dx > 0 && currentPage > 0) {
        // 오른쪽으로 스와이프 → 이전 페이지
        setCurrentPage((p) => Math.max(p - 1, 0));
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
      setCurrentPage((p) => Math.min(p + 1, pages.length - 1));
    } else if (deltaX < 0 && currentPage > 0) {
      // 왼쪽으로 스크롤 → 이전 페이지
      setCurrentPage((p) => Math.max(p - 1, 0));
    }
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // 페이지 가장자리로 드래그해서 페이지 이동
    if (overId === "page-right" || overId === "page-left") {
      setPages((prevPages) => {
        const pos = findItemPosition(prevPages, activeId);
        if (!pos) return prevPages;

        const { pageIndex, itemIndex, item } = pos;
        const nextPages = prevPages.map((p) => [...p]);
        const fromPage = [...nextPages[pageIndex]];
        fromPage.splice(itemIndex, 1);
        nextPages[pageIndex] = fromPage;

        let targetPage =
          overId === "page-right" ? pageIndex + 1 : pageIndex - 1;

        if (targetPage < 0) targetPage = 0;
        if (targetPage >= nextPages.length) {
          nextPages.push([]);
        }

        nextPages[targetPage] = [...(nextPages[targetPage] || []), item];
        setCurrentPage(targetPage);
        return nextPages;
      });
      return;
    }

    if (activeId === overId) return;

    setPages((prevPages) => {
      const fromPos = findItemPosition(prevPages, activeId);
      const toPos = findItemPosition(prevPages, overId);
      if (!fromPos || !toPos) return prevPages;

      const { pageIndex: fromPage, itemIndex: fromIndex, item: fromItem } =
        fromPos;
      const {
        pageIndex: toPage,
        itemIndex: toIndex,
        item: toItem,
      } = toPos;

      const nextPages = prevPages.map((p) => [...p]);

      const fromPageItems = nextPages[fromPage];
      const toPageItems = nextPages[toPage];

      // 1) 앱 -> 폴더 위로 드랍: 해당 폴더에 앱 추가
      if (fromItem.type === "app" && toItem.type === "folder") {
        // 원래 위치에서 제거
        fromPageItems.splice(fromIndex, 1);
        const folder = toPageItems[toIndex];
        if (folder && folder.type === "folder") {
          const exists =
            folder.items &&
            folder.items.some(
              (app) => app.path === fromItem.path || app.id === fromItem.id
            );
          if (!exists) {
            folder.items = [...(folder.items || []), fromItem];
          }
        }
        return nextPages;
      }

      // 2) 앱 -> 앱 위로 드랍 (같은 페이지): 새 폴더 생성
      if (
        fromItem.type === "app" &&
        toItem.type === "app" &&
        fromPage === toPage
      ) {
        const pageItems = fromPageItems;
        // 항상 같은 페이지 배열을 기준으로 동작
        const appA = fromItem;
        const appB = toItem;

        const newFolder = {
          type: "folder",
          id: `folder-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
          name: "새 폴더",
          items: [appB, appA],
        };

        const aIndex = pageItems.findIndex((it) => it.id === appA.id);
        const bIndex = pageItems.findIndex((it) => it.id === appB.id);
        if (aIndex === -1 || bIndex === -1) return nextPages;

        const firstIndex = Math.min(aIndex, bIndex);
        // 인덱스 큰 것부터 제거
        const removeIdx = [aIndex, bIndex].sort((a, b) => b - a);
        removeIdx.forEach((idx) => {
          pageItems.splice(idx, 1);
        });

        pageItems.splice(firstIndex, 0, newFolder);
        return nextPages;
      }

      // 3) 기본: 위치 이동 (정렬)
      if (fromPage === toPage) {
        const pageItems = [...fromPageItems];
        const reordered = arrayMove(pageItems, fromIndex, toIndex);
        nextPages[fromPage] = reordered;
        return nextPages;
      }

      // 4) 다른 페이지로의 이동 (drop 지점 기준)
      fromPageItems.splice(fromIndex, 1);
      toPageItems.splice(toIndex, 0, fromItem);
      return nextPages;
    });
  };

  const currentItems = pages[currentPage] || [];
  const sortableIds = currentItems.map((it) => it.id);

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
          if (
            e.target.closest("[data-desktop-wrapper]") &&
            !e.target.closest("[data-sortable=\"true\"]")
          ) {
            mouseSwipeStartRef.current = e.clientX;
          }
        }}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={createEdgePriorityCollision(wrapperRef)}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            key={`page-${currentPage}`}
            items={sortableIds}
          >
            <div className={styles.desktop}>
              {currentItems.map((item) => {
                const asFolderShape =
                  item.type === "folder"
                    ? item
                    : { id: item.id, name: item.name, items: [item] };

                const onOpen =
                  item.type === "folder"
                    ? () => openFolder(item)
                    : () => runAppSafe(item);

                return (
                  <FolderIcon
                    key={item.id}
                    folder={asFolderShape}
                    openFolder={onOpen}
                    folderType={item.type}
                  />
                );
              })}
            </div>
          </SortableContext>

          {activeId && (
            <>
              <PageDropZone id="page-left" side="left" />
              <PageDropZone id="page-right" side="right" />
            </>
          )}

          <DragOverlay dropAnimation={null}>
            {activeItem ? (
              <FolderIconOverlay
                folder={
                  activeItem.type === "folder"
                    ? activeItem
                    : {
                      id: activeItem.id,
                      name: activeItem.name,
                      items: [activeItem],
                    }
                }
                folderType={activeItem.type}
              />
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

      {openedFolder && (
        <FolderModal folder={openedFolder} close={closeFolder} />
      )}
    </>
  );
}

