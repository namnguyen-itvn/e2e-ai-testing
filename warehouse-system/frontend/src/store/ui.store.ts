/**
 * FILE: src/store/ui.store.ts
 * PURPOSE: Zustand store quản lý UI state (sidebar, theme, v.v.)
 *
 * GIẢI THÍCH VỀ ZUSTAND:
 * - Zustand là thư viện state management nhẹ cho React.
 * - Không cần Provider bọc app như Redux.
 * - Dùng cho CLIENT state: sidebar open/close, dark mode, modal state.
 * - Khác với React Query (dùng cho SERVER state: data từ API).
 *
 * PHÂN BIỆT CLIENT STATE vs SERVER STATE:
 * - Client state: sidebar collapsed, modal open, selected tab → Zustand
 * - Server state: danh sách sản phẩm, chi tiết order → React Query
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  // Sidebar
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Theme
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Sidebar state
      isSidebarCollapsed: false,
      toggleSidebar: () =>
        set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),

      // Dark mode state
      isDarkMode: false,
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
    }),
    {
      name: 'wms-ui-store', // key trong localStorage
      partialize: (state) => ({
        isSidebarCollapsed: state.isSidebarCollapsed,
        isDarkMode: state.isDarkMode,
      }),
    }
  )
);
