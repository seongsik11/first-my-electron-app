import { create } from 'zustand';

const useDesktopStore = create((set) => ({
  pages: [[]],
  currentPage: 0,
  touchStartX: null,
  activeId: null,
  openedFolderId: null,           // 현재 열린 폴더 id (null = 닫힘)
  folderCandidateTargetId: null,  // 면적 80% 이상 감지된 타겟 id (시각 피드백용)
  draggingFromFolderApp: null,    // { app: AppItem, folderId: string } | null — 폴더 모달에서 DnD로 꺼내는 중

  setPages: (pages) => set({ pages }),
  setCurrentPage: (index) => set({ currentPage: index }),
  setTouchStartX: (x) => set({ touchStartX: x }),
  setActiveId: (id) => set({ activeId: id }),
  setOpenedFolderId: (id) => set({ openedFolderId: id }),
  setFolderCandidateTargetId: (id) => set({ folderCandidateTargetId: id }),
  setDraggingFromFolderApp: (val) => set({ draggingFromFolderApp: val }),
}));

export default useDesktopStore;
