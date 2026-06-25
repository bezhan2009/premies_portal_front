import React from "react";
import useChatStore from "../../store/useChatStore.js";
import { MessageSquare } from "lucide-react";
import { useLocation } from "react-router-dom";

const ChatWidgetOverlay = () => {
  const { unreadCount, toggleMiniChat, isMiniChatOpen } = useChatStore();
  const location = useLocation();

  if (
    location.pathname.includes("/feedback") ||
    location.pathname.includes("/operator/feedback") ||
    location.pathname.includes("/submit-feedback")
  ) {
    return null;
  }

  return (
    <div className="chat-widget-overlay" style={{
      position: "fixed",
      bottom: "20px",
      right: "80px", // Just to the left of the currency widget
      zIndex: 1000
    }}>
      <button 
        className="chat-widget-btn"
        onClick={toggleMiniChat}
        title={isMiniChatOpen ? "Закрыть чат" : "Открыть Актив чат"}
        style={{
          width: "50px",
          height: "50px",
          borderRadius: "50%",
          backgroundColor: isMiniChatOpen ? "#dc2626" : "#2563eb",
          color: "white",
          border: "none",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          position: "relative",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
        }}
      >
        <MessageSquare size={24} />
        {unreadCount > 0 && !isMiniChatOpen && (
          <span className="chat-widget-badge" style={{
            position: "absolute",
            top: "-5px",
            right: "-5px",
            backgroundColor: "#ef4444",
            color: "white",
            fontSize: "12px",
            fontWeight: "bold",
            padding: "2px 6px",
            borderRadius: "10px",
            border: "2px solid white",
            minWidth: "20px",
            textAlign: "center"
          }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default ChatWidgetOverlay;
