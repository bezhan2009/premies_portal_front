"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface UiState {
  sidebarCollapsed: boolean;
  mobileNavigationOpen: boolean;
  commandOpen: boolean;
  setMobileNavigationOpen: (open: boolean) => void;
  setCommandOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      mobileNavigationOpen: false,
      commandOpen: false,
      setMobileNavigationOpen: (mobileNavigationOpen) => set({ mobileNavigationOpen }),
      setCommandOpen: (commandOpen) => set({ commandOpen }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    {
      name: "activ-daily-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    },
  ),
);
