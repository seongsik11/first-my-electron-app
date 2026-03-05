import { create } from 'zustand';

const useDesktopStore = create((set) => ({
  pages: [[]],
  currentPage: 0,
  touchStartX: null,
  activeId: null,

  setPages: (pages) => set({ pages }),
  setCurrentPage: (index) => set({ currentPage: index }),
  setTouchStartX: (x) => set({ touchStartX: x }),
  setActiveId: (id) => set({ activeId: id }),
}));

export default useDesktopStore;
