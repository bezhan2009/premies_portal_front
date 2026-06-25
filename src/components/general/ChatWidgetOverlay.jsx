import React from "react";
import useChatStore from "../../store/useChatStore.js";
import { MessageCircle } from "lucide-react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";

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
    <div 
      className="chat-widget-overlay" 
      style={{
        position: "fixed",
        bottom: "20px",
        right: "80px", // Just to the left of the currency rates widget
        zIndex: 1000,
        overflow: "visible" // Ensure badge is never clipped
      }}
    >
      <motion.button 
        className="chat-widget-btn"
        onClick={toggleMiniChat}
        title={isMiniChatOpen ? "Закрыть чат" : "Открыть Актив чат"}
        whileHover={{ scale: 1.1, y: -2 }}
        whileTap={{ scale: 0.95 }}
        style={{
          width: "50px",
          height: "50px",
          borderRadius: "50%",
          background: isMiniChatOpen 
            ? "linear-gradient(135deg, rgba(239, 68, 68, 0.75) 0%, rgba(220, 38, 38, 0.85) 100%)"
            : "linear-gradient(135deg, rgba(59, 130, 246, 0.55) 0%, rgba(37, 99, 235, 0.75) 100%)",
          color: "white",
          border: "1px solid rgba(255, 255, 255, 0.25)",
          boxShadow: isMiniChatOpen 
            ? "0 8px 24px rgba(220, 38, 38, 0.35)" 
            : "0 8px 24px rgba(37, 99, 235, 0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          position: "relative",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          transition: "background 0.3s, border-color 0.3s, box-shadow 0.3s",
          overflow: "visible", // Ensure badge is never clipped
          outline: "none"
        }}
      >
        <MessageCircle size={24} style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))" }} />
        {unreadCount > 0 && !isMiniChatOpen && (
          <span 
            className="chat-widget-badge" 
            style={{
              position: "absolute",
              top: "-5px",
              right: "-5px",
              backgroundColor: "#ef4444",
              color: "white",
              fontSize: "11px",
              fontWeight: "bold",
              padding: "2px 6px",
              borderRadius: "10px",
              border: "2px solid white",
              minWidth: "20px",
              textAlign: "center",
              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)",
              pointerEvents: "none"
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </motion.button>
    </div>
  );
};

export default ChatWidgetOverlay;
