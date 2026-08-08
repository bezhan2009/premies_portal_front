import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CheckCheck, FileText, MessageCircle, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useNotificationStore from '../../store/useNotificationStore';
import useChatStore from '../../store/useChatStore';
import './NotificationsDropdown.css';

const formatNotificationTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
};

export default function NotificationsDropdown({ isOpen, onClose }) {
  const ref = useRef(null);
  const navigate = useNavigate();
  const { notifications, markAsRead, markAllAsRead, clearAll } = useNotificationStore();
  const openConversation = useChatStore((state) => state.openConversation);

  useEffect(() => {
    if (!isOpen) return undefined;
    const close = (event) => { if (ref.current && !ref.current.contains(event.target)) onClose(); };
    const timer = window.setTimeout(() => window.addEventListener('pointerdown', close), 0);
    return () => { window.clearTimeout(timer); window.removeEventListener('pointerdown', close); };
  }, [isOpen, onClose]);

  const runAction = (notification) => {
    markAsRead(notification.id);
    const action = notification.action;
    if (action?.kind === 'chat') openConversation(action);
    else if (action?.href) navigate(action.href);
    else if (notification.type === 'application') navigate('/agent/applications-list');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.section ref={ref} className="notifications-panel" initial={{ opacity: 0, y: -8, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: .98 }} transition={{ duration: .14 }}>
          <header><div><Bell size={18} /><h3>Уведомления</h3></div><button type="button" onClick={markAllAsRead} disabled={!notifications.length}><CheckCheck size={16} /> Прочитать все</button></header>
          <div className="notifications-panel__list">
            {!notifications.length ? <div className="notifications-panel__empty"><Bell size={24} /><span>Новых уведомлений нет</span></div> : notifications.map((item) => (
              <button type="button" key={item.id} className={`notification-item ${item.read ? '' : 'unread'}`} onClick={() => runAction(item)}>
                <span className="notification-item__icon">{item.action?.kind === 'chat' || item.type === 'chat' ? <MessageCircle size={18} /> : <FileText size={18} />}</span>
                <span className="notification-item__copy"><strong>{item.title}</strong><small>{item.message}</small><time>{formatNotificationTime(item.createdAt)}</time></span>
                {!item.read && <i />}
              </button>
            ))}
          </div>
          {!!notifications.length && <footer><button type="button" onClick={clearAll}><Trash2 size={15} /> Очистить историю</button></footer>}
        </motion.section>
      )}
    </AnimatePresence>
  );
}
