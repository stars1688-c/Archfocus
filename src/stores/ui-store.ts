// src/stores/ui-store.ts
import { create } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  modals: {
    accountModal: boolean
    syncModal: boolean
    noteDetailModal: boolean
    scheduleModal: boolean
  }
  toggleSidebar: () => void
  closeSidebar: () => void
  openModal: (modal: keyof UIState['modals']) => void
  closeModal: (modal: keyof UIState['modals']) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  modals: {
    accountModal: false,
    syncModal: false,
    noteDetailModal: false,
    scheduleModal: false,
  },

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  closeSidebar: () => set({ sidebarOpen: false }),

  openModal: (modal) => set((state) => ({
    modals: { ...state.modals, [modal]: true },
  })),

  closeModal: (modal) => set((state) => ({
    modals: { ...state.modals, [modal]: false },
  })),
}))
