import { useEffect } from 'react';
import useNotificationStore from '../../../store/useNotificationStore';
import { listChangeApprovals } from '../../../api/frontovikWorkflow';

export default function useClientChangeNotifications() {
  const addNotification = useNotificationStore(state => state.addNotification);
  useEffect(() => {
    let roles = []; try { roles = JSON.parse(localStorage.getItem('role_ids') || '[]'); } catch { /* no session */ }
    if (!roles.includes(17)) return;
    let active = true;
    const actor = Number(localStorage.getItem('user_id'));
    const key = `frontovik-change-notifications:${actor}`;
    const poll = async () => {
      try {
        const rows = await listChangeApprovals(); if (!active) return;
        let previous = {}; try { previous = JSON.parse(localStorage.getItem(key) || '{}'); } catch { /* fresh snapshot */ }
        const next = {};
        for (const r of rows) {
          const state = r.execution?.status || r.status; next[r.request_id] = state;
          if (previous[r.request_id] !== state && (r.actor_id === actor && ['approved', 'rejected', 'completed', 'failed'].includes(state) || roles.includes(49) && r.actor_id !== actor && state === 'awaiting_approval')) {
            addNotification({ id: `client-change-${r.request_id}-${state}`, type: 'application-status', title: 'Изменение данных клиента', message: r.execution?.message || r.message,
              action: { kind: 'compliance-request', href: `/frontovik/change-approvals?requestId=${encodeURIComponent(r.request_id)}` } });
          }
        }
        localStorage.setItem(key, JSON.stringify(next));
      } catch { /* Retry after network recovery. */ }
    };
    void poll(); const timer = setInterval(poll, 15000);
    return () => { active = false; clearInterval(timer); };
  }, [addNotification]);
}
