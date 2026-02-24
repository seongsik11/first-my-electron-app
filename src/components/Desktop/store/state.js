import { create } from 'zustand';

const useDesktopStore = create((set) => ({
  pages: [[]],
  currentPage: 0,
  openedFolder: null,
  touchStartX: null,
  activeId: null,

  setPages: (pages) => set({ pages }),
  setCurrentPage: (index) => set({ currentPage: index }),
  openFolder: (folder) => set({ openedFolder: folder }),
  closeFolder: () => set({ openedFolder: null }),
  setTouchStartX: (x) => set({ touchStartX: x }),
  setActiveId: (id) => set({ activeId: id }),
}));

export default useDesktopStore;
