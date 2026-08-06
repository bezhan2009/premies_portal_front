import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, AlertTriangle, Info, CheckCircle } from 'lucide-react';

const mockNotifications = [
  { id: 1, type: 'info', title: 'Обновление системы', message: 'Система была успешно обновлена до версии 2.4.1', time: '10 мин назад' },
  { id: 2, type: 'warning', title: 'Внимание', message: 'Замечена подозрительная активность в вашем аккаунте', time: '1 час назад' },
  { id: 3, type: 'success', title: 'Успешно', message: 'Отчет за прошлый месяц успешно сгенерирован', time: 'Вчера' }
];

const NotificationsDropdown = ({ isOpen, onClose }) => {
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    };
    
    if (isOpen) {
      // Small timeout to prevent immediate close if the click was on the trigger button
      setTimeout(() => window.addEventListener('click', handleClickOutside), 10);
    }
    
    return () => {
      window.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const getIcon = (type) => {
    switch(type) {
      case 'warning': return <AlertTriangle size={18} color="#ff9800" />;
      case 'success': return <CheckCircle size={18} color="#4caf50" />;
      default: return <Info size={18} color="#2196f3" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'absolute',
            top: '50px',
            right: '-10px',
            width: '320px',
            background: 'var(--bg-primary, #ffffff)',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            border: '1px solid var(--border-color, #eaeaea)',
            zIndex: 1000,
            overflow: 'hidden'
          }}
        >
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color, #eaeaea)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary, #333)' }}>Уведомления</h3>
            <span style={{ fontSize: '12px', color: 'var(--primary-color, #1890ff)', cursor: 'pointer' }}>Прочитать все</span>
          </div>
          
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {mockNotifications.map(notif => (
              <div key={notif.id} style={{ display: 'flex', padding: '12px 16px', borderBottom: '1px solid var(--border-color, #eaeaea)', gap: '12px', cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover-bg, #f5f5f5)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                <div style={{ marginTop: '2px' }}>
                  {getIcon(notif.type)}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary, #333)', marginBottom: '4px' }}>{notif.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary, #666)', marginBottom: '4px' }}>{notif.message}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary, #999)' }}>{notif.time}</div>
                </div>
              </div>
            ))}
          </div>
          
          <div style={{ padding: '10px', textAlign: 'center', borderTop: '1px solid var(--border-color, #eaeaea)' }}>
            <button style={{ background: 'transparent', border: 'none', color: 'var(--primary-color, #1890ff)', fontSize: '13px', cursor: 'pointer' }}>Посмотреть все</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationsDropdown;
