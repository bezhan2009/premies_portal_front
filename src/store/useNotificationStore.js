import { create } from 'zustand';

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  wsInstance: null,
  
  connect: () => {
    if (get().wsInstance) return;

    const envUrl = import.meta.env.VITE_BACKEND_APPLICATION_URL_WS;
    let wsUrl = '';
    
    if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
        wsUrl = envUrl + "/applications/portal";
    } else {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        wsUrl = `${protocol}//${window.location.hostname}:7676/applications/portal`;
    }

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Global WebSocket connected for Notifications');
      };

      ws.onmessage = (event) => {
        try {
          const newApplication = JSON.parse(event.data);
          
          const newNotification = {
            id: Date.now() + Math.random(),
            type: 'info',
            title: `Новая заявка #${newApplication.ID || 'Неизвестно'}`,
            message: `Заявка от ${newApplication.request_creator || 'Неизвестный создатель'}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: false,
            data: newApplication
          };

          set((state) => ({
            notifications: [newNotification, ...state.notifications].slice(0, 50), // keep last 50
            unreadCount: state.unreadCount + 1
          }));
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('Global WebSocket disconnected, reconnecting in 5s...');
        set({ wsInstance: null });
        setTimeout(() => get().connect(), 5000);
      };

      ws.onerror = (error) => {
        console.error('Global WebSocket error:', error);
      };

      set({ wsInstance: ws });
    } catch (error) {
      console.error('WebSocket connection failed:', error);
    }
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0
    }));
  },
  
  clearAll: () => {
    set({ notifications: [], unreadCount: 0 });
  },

  disconnect: () => {
    const ws = get().wsInstance;
    if (ws) {
      ws.close();
      set({ wsInstance: null });
    }
  }
}));

export default useNotificationStore;
