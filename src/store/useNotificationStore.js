import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useNotificationStore = create(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      wsInstance: null,
      reconnectTimer: null,
      shouldReconnect: false,

      addNotification: (notification) => set((state) => {
        const item = {
          id: notification.id || `${notification.kind || notification.type || 'notice'}-${Date.now()}-${Math.random()}`,
          type: notification.type || 'info',
          title: notification.title || 'Новое уведомление',
          message: notification.message || '',
          createdAt: notification.createdAt || new Date().toISOString(),
          read: false,
          action: notification.action || null,
          data: notification.data || null,
        };
        if (state.notifications.some((entry) => entry.id === item.id)) return state;
        return {
          notifications: [item, ...state.notifications].slice(0, 100),
          unreadCount: state.unreadCount + 1,
        };
      }),

      connect: () => {
        const current = get().wsInstance;
        if (current && (current.readyState === WebSocket.OPEN || current.readyState === WebSocket.CONNECTING)) return;
        set({ shouldReconnect: true });
        const envUrl = import.meta.env.VITE_BACKEND_APPLICATION_URL_WS;
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')
          ? `${envUrl}/applications/portal`
          : `${protocol}//${window.location.hostname}:7676/applications/portal`;

        try {
          const ws = new WebSocket(wsUrl);
          ws.onmessage = (event) => {
            try {
              const application = JSON.parse(event.data);
              get().addNotification({
                id: `application-${application.ID || Date.now()}`,
                type: 'application',
                title: `Новая заявка #${application.ID || '—'}`,
                message: `От ${application.request_creator || application.request_сreator || 'мобильного банка'}`,
                data: application,
                action: { kind: 'application', href: '/agent/applications-list' },
              });
            } catch (error) {
              console.error('Не удалось обработать уведомление о заявке:', error);
            }
          };
          ws.onclose = () => {
            set({ wsInstance: null });
            if (!get().shouldReconnect) return;
            const previousTimer = get().reconnectTimer;
            if (previousTimer) window.clearTimeout(previousTimer);
            const timer = window.setTimeout(() => get().connect(), 5000);
            set({ reconnectTimer: timer });
          };
          ws.onerror = () => ws.close();
          set({ wsInstance: ws });
        } catch (error) {
          console.error('WebSocket уведомлений недоступен:', error);
        }
      },

      markAsRead: (id) => set((state) => ({
        notifications: state.notifications.map((item) => item.id === id ? { ...item, read: true } : item),
        unreadCount: Math.max(0, state.unreadCount - (state.notifications.some((item) => item.id === id && !item.read) ? 1 : 0)),
      })),
      markAllAsRead: () => set((state) => ({ notifications: state.notifications.map((item) => ({ ...item, read: true })), unreadCount: 0 })),
      clearAll: () => set({ notifications: [], unreadCount: 0 }),
      disconnect: () => {
        const { wsInstance, reconnectTimer } = get();
        set({ shouldReconnect: false, wsInstance: null, reconnectTimer: null });
        if (reconnectTimer) window.clearTimeout(reconnectTimer);
        if (wsInstance) wsInstance.close();
      },
    }),
    {
      name: 'activ-daily-notifications',
      partialize: (state) => ({ notifications: state.notifications, unreadCount: state.unreadCount }),
    },
  ),
);

export default useNotificationStore;
