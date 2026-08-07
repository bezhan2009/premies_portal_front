import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const MAX_TABS = 10;

const useTabsStore = create(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null, // We'll use the 'href' (path) as the unique ID for the tab
      splitTabHref: null, // Store the href for the parallel split view

      // Add a new tab or just set it as active if it already exists
      addTab: (tab) => {
        set((state) => {
          const existingTabIndex = state.tabs.findIndex((t) => t.href === tab.href);
          
          if (existingTabIndex !== -1) {
             // Tab exists, just make it active
             return { activeTabId: tab.href };
          }
          
          // New tab
          let newTabs = [...state.tabs, tab];
          
          // If we exceed MAX_TABS, remove the oldest (first) tab
          if (newTabs.length > MAX_TABS) {
            newTabs = newTabs.slice(newTabs.length - MAX_TABS);
          }
          
          return { tabs: newTabs, activeTabId: tab.href };
        });
      },

      // Remove a tab
      removeTab: (tabHref) => {
        set((state) => {
          const newTabs = state.tabs.filter((t) => t.href !== tabHref);
          
          // If we closed the active tab, we need to pick a new active tab
          let newActiveTabId = state.activeTabId;
          if (state.activeTabId === tabHref) {
            if (newTabs.length > 0) {
              // Fallback to the last tab in the array
              newActiveTabId = newTabs[newTabs.length - 1].href;
            } else {
              newActiveTabId = null;
            }
          }
          
          return { tabs: newTabs, activeTabId: newActiveTabId };
        });
      },

      // Set the active tab
      setActiveTab: (tabHref) => {
        set({ activeTabId: tabHref });
      },

      setSplitTab: (tabHref) => {
        set({ splitTabHref: tabHref });
      },

      clearSplitTab: () => {
        set({ splitTabHref: null });
      },

      togglePinTab: (tabHref) => {
        set((state) => ({
          tabs: state.tabs.map(t => 
            t.href === tabHref ? { ...t, pinned: !t.pinned } : t
          )
        }));
      },

      // Clear all tabs (e.g. on logout)
      clearTabs: () => {
        set({ tabs: [], activeTabId: null, splitTabHref: null });
      }
    }),
    {
      name: 'app-tabs-storage', // key in localStorage
    }
  )
);

export default useTabsStore;
