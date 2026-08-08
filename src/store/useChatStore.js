import { create } from "zustand";

const useChatStore = create((set) => ({
  unreadCount: 0,
  groupsUnreadCount: 0,
  isMiniChatOpen: false,
  pendingConversation: null,
  muteUntil: null,
  
  setUnreadCount: (count) => set({ unreadCount: count }),
  setGroupsUnreadCount: (count) => set({ groupsUnreadCount: count }),
  toggleMiniChat: () => set((state) => ({ isMiniChatOpen: !state.isMiniChatOpen })),
  closeMiniChat: () => set({ isMiniChatOpen: false }),
  openMiniChat: () => set({ isMiniChatOpen: true }),
  openConversation: (conversation) => set({ isMiniChatOpen: true, pendingConversation: conversation }),
  consumePendingConversation: () => set({ pendingConversation: null }),
  
  muteNotifications: (minutes) => {
    const muteTime = new Date(new Date().getTime() + minutes * 60000);
    set({ muteUntil: muteTime });
  },
  
  unmuteNotifications: () => set({ muteUntil: null })
}));

export default useChatStore;
