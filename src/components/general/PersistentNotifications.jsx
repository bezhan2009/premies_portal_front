import React from "react";
import { FileText, MessageCircle, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import useChatStore from "../../store/useChatStore";
import useNotificationStore from "../../store/useNotificationStore";
import "./PersistentNotifications.css";

const MotionArticle = motion.article;

const formatTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(date);
};

export default function PersistentNotifications() {
  const navigate = useNavigate();
  const openConversation = useChatStore((state) => state.openConversation);
  const notifications = useNotificationStore((state) => state.notifications);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const visible = notifications.filter((item) => !item.read).slice(0, 4);

  const openNotification = (notification) => {
    const action = notification.action;
    markAsRead(notification.id);
    if (action?.kind === "chat") openConversation(action);
    else if (action?.href) navigate(action.href);
    else if (notification.type === "application") navigate("/agent/applications-list");
  };

  return (
    <aside className="persistent-notifications" aria-live="polite" aria-label="Новые уведомления">
      <AnimatePresence initial={false}>
        {visible.map((notification) => {
          const isChat = notification.action?.kind === "chat" || notification.type === "chat";
          return (
            <MotionArticle
              key={notification.id}
              className={`persistent-notification ${isChat ? "persistent-notification--chat" : ""}`}
              initial={{ opacity: 0, x: 24, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.98 }}
              transition={{ duration: 0.18 }}
            >
              <span className="persistent-notification__icon">
                {isChat ? <MessageCircle size={20} /> : <FileText size={20} />}
              </span>
              <div className="persistent-notification__content">
                <div className="persistent-notification__heading">
                  <strong>{notification.title}</strong>
                  <time>{formatTime(notification.createdAt)}</time>
                </div>
                <p>{notification.message}</p>
                <button type="button" onClick={() => openNotification(notification)}>
                  {notification.action?.kind?.includes("application") || notification.action?.kind === "compliance-request" ? "Открыть заявку" : "Открыть"}
                </button>
              </div>
              <button
                type="button"
                className="persistent-notification__close"
                onClick={() => markAsRead(notification.id)}
                aria-label="Закрыть уведомление"
              >
                <X size={17} />
              </button>
            </MotionArticle>
          );
        })}
      </AnimatePresence>
    </aside>
  );
}
