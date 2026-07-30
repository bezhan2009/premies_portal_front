import React from "react";
import useChatStore from "../../store/useChatStore.js";
import { MessageSquareText, Sparkles } from "lucide-react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

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
        whileHover={{ scale: 1.08, y: -3, rotate: -1, transition: { type: "spring", stiffness: 420, damping: 22 } }}
        whileTap={{ scale: 0.96 }}
        animate={{
          background: isMiniChatOpen
            ? "linear-gradient(135deg, rgba(235, 37, 37, 0.85) 0%, rgba(200, 20, 20, 0.95) 100%)"
            : "linear-gradient(135deg, rgba(235, 37, 37, 0.75) 0%, rgba(200, 20, 20, 0.85) 100%)",
          boxShadow: isMiniChatOpen
            ? "0 8px 24px rgba(235, 37, 37, 0.45)"
            : "0 8px 24px rgba(200, 20, 20, 0.30)",
        }}
        transition={{ duration: 0.3 }}
        style={{
          width: "56px",
          minWidth: "56px",
          height: "56px",
          minHeight: "56px",
          borderRadius: "18px",
          color: "white",
          border: "1px solid rgba(255, 255, 255, 0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          position: "relative",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          overflow: "visible", // Ensure badge is never clipped
          outline: "none",
          isolation: "isolate"
        }}
      >
        <motion.span
          aria-hidden="true"
          animate={{ rotate: isMiniChatOpen ? 0 : [0, -6, 6, 0] }}
          transition={{ duration: 2.4, repeat: isMiniChatOpen ? 0 : Infinity, repeatDelay: 2.6 }}
          style={{
            position: "absolute",
            inset: "8px",
            borderRadius: "15px",
            background: "rgba(255,255,255,0.12)",
            zIndex: -1,
          }}
        />
        <MessageSquareText size={25} style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.15))" }} />
        <Sparkles
          size={13}
          style={{
            position: "absolute",
            top: "11px",
            right: "11px",
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.18))",
          }}
        />

        {/* Animated unread badge */}
        <AnimatePresence>
          {unreadCount > 0 && !isMiniChatOpen && (
            <motion.span
              key="badge"
              className="chat-widget-badge"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, transition: { type: "spring", stiffness: 500, damping: 28 } }}
              exit={{ scale: 0, opacity: 0, transition: { duration: 0.12 } }}
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
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
};

export default ChatWidgetOverlay;
