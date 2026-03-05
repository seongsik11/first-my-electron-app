import { create } from 'zustand';

const useDesktopStore = create((set) => ({
  pages: [[]],
  currentPage: 0,
  touchStartX: null,
  activeId: null,
  // editMode: 드래그 모드 (jiggle, 아이콘 재배치 가능 상태)
  editMode: false,

  setPages: (pages) => set({ pages }),
  setCurrentPage: (index) => set({ currentPage: index }),
  setTouchStartX: (x) => set({ touchStartX: x }),
  setActiveId: (id) => set({ activeId: id }),
  setEditMode: (mode) => set({ editMode: mode }),
}));

export default useDesktopStore;
