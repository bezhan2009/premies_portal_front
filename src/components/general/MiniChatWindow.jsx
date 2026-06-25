import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { ResizableBox } from "react-resizable";
import { 
  X, Send, Paperclip, Smile, Check, CheckCheck, 
  Minus, ArrowLeft, Search, User, Shield, PlusCircle
} from "lucide-react";
import axios from "axios";
import EmojiPicker from "emoji-picker-react";
import useThemeStore from "../../store/useThemeStore";
import useChatStore from "../../store/useChatStore";
import ImageModal from "../modal/ImageModal";
import { useLocation } from "react-router-dom";
import "react-resizable/css/styles.css";

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:7575";

const MiniChatWindow = () => {
  const { isMiniChatOpen, closeMiniChat, setUnreadCount } = useChatStore();
  const { theme } = useThemeStore();
  const location = useLocation();
  const dragControls = useDragControls();
  
  // State for layout & size
  const [dimensions, setDimensions] = useState({ width: 380, height: 500 });
  
  // Navigation & Views: "threads" | "chat" | "new_chat"
  const [currentView, setCurrentView] = useState("threads");
  const [activeTab, setActiveTab] = useState("direct"); // "support" | "direct"

  // Chat Data
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [file, setFile] = useState(null);
  
  // Active Thread State
  const [recipientId, setRecipientId] = useState(0);
  const [chatType, setChatType] = useState("direct"); // "support" | "direct"
  const [activeThreadName, setActiveThreadName] = useState("");

  // Search & Threads List
  const [threadSearch, setThreadSearch] = useState("");
  const [supportThreads, setSupportThreads] = useState([]);
  const [directThreads, setDirectThreads] = useState([]);
  
  // New Chat User Selection
  const [usersList, setUsersList] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [loadingThreads, setLoadingThreads] = useState(false);
  
  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  
  const messagesEndRef = useRef(null);
  const token = localStorage.getItem("access_token");

  // Get user ID
  const getUserIdFromToken = () => {
    try {
      if (!token) return 0;
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return Number(payload.user_id || 0);
    } catch { return 0; }
  };
  const currentUserId = getUserIdFromToken();

  const getRoles = () => {
    try { return JSON.parse(localStorage.getItem("role_ids") || "[]"); } 
    catch { return []; }
  };
  const isOperator = getRoles().includes(3);

  // Set default tab for operators to support tickets
  useEffect(() => {
    if (isOperator) {
      setActiveTab("support");
    } else {
      setActiveTab("support"); // Support tickets/Technical Support is also default for users
    }
  }, [isOperator]);

  // Fetch threads data
  const fetchThreadsData = useCallback(async () => {
    if (!isMiniChatOpen || !token) return;
    setLoadingThreads(true);
    try {
      if (isOperator) {
        const [supportRes, directRes] = await Promise.all([
          axios.get(`${API_URL}/api/feedback/threads`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_URL}/api/feedback/direct-threads`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setSupportThreads(supportRes.data || []);
        setDirectThreads(directRes.data || []);
      } else {
        const res = await axios.get(`${API_URL}/api/feedback/direct-threads`, { headers: { Authorization: `Bearer ${token}` } });
        setDirectThreads(res.data || []);
      }
    } catch (err) {
      console.error("Error fetching threads in mini-chat:", err);
    } finally {
      setLoadingThreads(false);
    }
  }, [isMiniChatOpen, isOperator, token]);

  // Poll threads
  useEffect(() => {
    if (isMiniChatOpen) {
      fetchThreadsData();
      const interval = setInterval(fetchThreadsData, 10000);
      return () => clearInterval(interval);
    }
  }, [isMiniChatOpen, fetchThreadsData]);

  // Fetch messages for active thread
  const fetchMessages = useCallback(async () => {
    if (!isMiniChatOpen || currentView !== "chat" || !token) return;
    try {
      let url = "";
      if (chatType === "support") {
        url = isOperator 
          ? `${API_URL}/api/feedback?userId=${recipientId}`
          : `${API_URL}/api/feedback`;
      } else {
        url = `${API_URL}/api/feedback?chatWith=${recipientId}`;
      }

      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      setMessages(res.data || []);
      
      // Mark read
      const payload = chatType === "direct" 
        ? { chat_with: recipientId }
        : (isOperator ? { user_id: recipientId } : {});
      await axios.post(`${API_URL}/api/feedback/mark-read`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update global unread count
      const countRes = await axios.get(`${API_URL}/api/feedback/unread-count`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadCount(countRes.data.unread_count || 0);
    } catch (err) {
      console.error("Error fetching messages in mini-chat:", err);
    } finally {
      setLoading(false);
    }
  }, [isMiniChatOpen, currentView, chatType, recipientId, isOperator, token, setUnreadCount]);

  // Poll messages when active
  useEffect(() => {
    if (isMiniChatOpen && currentView === "chat") {
      setLoading(true);
      fetchMessages();
      const interval = setInterval(fetchMessages, 4000);
      return () => clearInterval(interval);
    }
  }, [isMiniChatOpen, currentView, recipientId, chatType, fetchMessages]);

  // Scroll to bottom on message list update
  useEffect(() => {
    if (currentView === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, currentView]);

  // Fetch users list for new chat
  const fetchUsers = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_URL}/users/emails`, { headers: { Authorization: `Bearer ${token}` } });
      setUsersList(res.data.users || []);
    } catch (err) {
      console.error("Error fetching users list:", err);
    }
  };

  useEffect(() => {
    if (isMiniChatOpen && currentView === "new_chat") {
      fetchUsers();
    }
  }, [isMiniChatOpen, currentView]);

  // Handlers
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !file) return;

    setSending(true);
    let attachmentUrl = "";

    try {
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await axios.post(`${API_URL}/api/feedback/upload`, formData, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
        });
        attachmentUrl = uploadRes.data.url;
      }

      let payload = {};
      if (chatType === "direct") {
        payload = {
          message: newMessage.trim(),
          attachment_url: attachmentUrl,
          recipient_id: recipientId
        };
      } else {
        if (isOperator) {
          payload = {
            message: newMessage.trim(),
            attachment_url: attachmentUrl,
            user_id: recipientId
          };
        } else {
          payload = {
            message: newMessage.trim(),
            attachment_url: attachmentUrl,
            recipient_id: 0
          };
        }
      }

      await axios.post(`${API_URL}/api/feedback`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNewMessage("");
      setFile(null);
      setShowEmojiPicker(false);
      fetchMessages();

      // Refresh corresponding list
      fetchThreadsData();
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSending(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  const formatTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Filter threads based on search query
  const filteredThreads = useMemo(() => {
    const query = threadSearch.toLowerCase().trim();
    if (activeTab === "support") {
      if (isOperator) {
        return supportThreads.filter(t => t.username?.toLowerCase().includes(query));
      } else {
        // Users see Tech Support widget, no filter required
        return [];
      }
    } else {
      return directThreads.filter(t => t.username?.toLowerCase().includes(query));
    }
  }, [activeTab, supportThreads, directThreads, threadSearch, isOperator]);

  // Filter users list for starting new chats
  const filteredUsers = useMemo(() => {
    const query = userSearchQuery.toLowerCase().trim();
    if (!query) return usersList.filter(u => u.id !== currentUserId);
    return usersList.filter(u => 
      u.id !== currentUserId &&
      (u.full_name?.toLowerCase().includes(query) ||
       u.username?.toLowerCase().includes(query) ||
       u.email?.toLowerCase().includes(query))
    );
  }, [usersList, userSearchQuery, currentUserId]);

  // Excluded page logic (Error 300 fix: place here, after all hooks)
  const isExcludedPath = 
    location.pathname.includes("/feedback") ||
    location.pathname.includes("/operator/feedback") ||
    location.pathname.includes("/submit-feedback");

  if (isExcludedPath || !isMiniChatOpen) {
    return null;
  }

  return (
    <>
      <ImageModal 
        isOpen={!!selectedImage} 
        imageUrl={selectedImage} 
        onClose={() => setSelectedImage(null)} 
      />

      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: "spring", damping: 30, stiffness: 350 }}
          style={{
            position: "fixed",
            bottom: "80px",
            right: "20px",
            zIndex: 9999,
          }}
          drag
          dragControls={dragControls}
          dragListener={false}
          dragMomentum={false}
        >
          <ResizableBox
            width={dimensions.width}
            height={dimensions.height}
            minConstraints={[320, 420]}
            maxConstraints={[600, 800]}
            resizeHandles={['se']}
            onResize={(e, { size }) => setDimensions({ width: size.width, height: size.height })}
          >
            <div style={{
              width: "100%",
              height: "100%",
              background: "var(--bg-surface, rgba(255, 255, 255, 0.85))",
              borderRadius: "16px",
              boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              border: "1px solid var(--border-color, rgba(226, 232, 240, 0.8))",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
            }}>
              {/* HEADER (Drag Handle) */}
              <div 
                className="mini-chat-header"
                onPointerDown={(e) => dragControls.start(e)}
                style={{
                  padding: "14px 18px",
                  background: "var(--bg-sidebar, rgba(248, 250, 252, 0.9))",
                  borderBottom: "1px solid var(--border-color, rgba(226, 232, 240, 0.5))",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "grab",
                  userSelect: "none"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {currentView !== "threads" && (
                    <button 
                      onClick={() => setCurrentView("threads")}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-color, #1e293b)",
                        display: "flex",
                        alignItems: "center",
                        padding: "4px"
                      }}
                    >
                      <ArrowLeft size={16} />
                    </button>
                  )}
                  <span style={{ fontWeight: 650, fontSize: "15px", color: "var(--text-color, #1e293b)" }}>
                    {currentView === "chat" ? activeThreadName : currentView === "new_chat" ? "Новый чат" : "Актив чат"}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {currentView === "threads" && (
                    <button 
                      title="Начать новый чат"
                      onClick={() => setCurrentView("new_chat")}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-secondary, #64748b)",
                        display: "flex",
                        alignItems: "center",
                        padding: "2px"
                      }}
                    >
                      <PlusCircle size={18} />
                    </button>
                  )}
                  <button onClick={closeMiniChat} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                    <Minus size={16} />
                  </button>
                  <button onClick={closeMiniChat} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* VIEW SWITCHER ANIMATION */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
                <AnimatePresence mode="wait">
                  {/* VIEW 1: THREAD LIST */}
                  {currentView === "threads" && (
                    <motion.div
                      key="threads"
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 15 }}
                      transition={{ duration: 0.15 }}
                      style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}
                    >
                      {/* Search */}
                      {!(activeTab === "support" && !isOperator) && (
                        <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-color, #e2e8f0)" }}>
                          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                            <Search size={14} style={{ position: "absolute", left: "10px", color: "var(--text-secondary, #94a3b8)" }} />
                            <input
                              type="text"
                              placeholder="Поиск..."
                              value={threadSearch}
                              onChange={(e) => setThreadSearch(e.target.value)}
                              style={{
                                width: "100%",
                                padding: "6px 10px 6px 30px",
                                borderRadius: "10px",
                                border: "1px solid var(--border-color, #cbd5e1)",
                                background: "var(--bg-color, #f8fafc)",
                                color: "var(--text-color, #0f172a)",
                                fontSize: "13px",
                                outline: "none"
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Tabs */}
                      <div style={{
                        display: "flex",
                        borderBottom: "1px solid var(--border-color, #e2e8f0)",
                        background: "var(--bg-sidebar, #f8fafc)"
                      }}>
                        <button
                          onClick={() => setActiveTab("support")}
                          style={{
                            flex: 1,
                            padding: "10px",
                            background: "transparent",
                            border: "none",
                            borderBottom: activeTab === "support" ? "2px solid #eb2525" : "none",
                            color: activeTab === "support" ? "#eb2525" : "var(--text-secondary)",
                            fontWeight: activeTab === "support" ? 600 : 400,
                            fontSize: "13px",
                            cursor: "pointer"
                          }}
                        >
                          {isOperator ? "Обращения" : "Поддержка"}
                        </button>
                        <button
                          onClick={() => setActiveTab("direct")}
                          style={{
                            flex: 1,
                            padding: "10px",
                            background: "transparent",
                            border: "none",
                            borderBottom: activeTab === "direct" ? "2px solid #eb2525" : "none",
                            color: activeTab === "direct" ? "#eb2525" : "var(--text-secondary)",
                            fontWeight: activeTab === "direct" ? 600 : 400,
                            fontSize: "13px",
                            cursor: "pointer"
                          }}
                        >
                          Личные
                        </button>
                      </div>

                      {/* Threads Container */}
                      <div style={{ flex: 1, overflowY: "auto", padding: "10px", background: "var(--bg-color, #f1f5f9)" }}>
                        {loadingThreads ? (
                          <div style={{ textAlign: "center", marginTop: "30px", color: "var(--text-secondary)", fontSize: "13px" }}>Загрузка...</div>
                        ) : activeTab === "support" && !isOperator ? (
                          /* Technical Support Card for Clients */
                          <div 
                            onClick={() => {
                              setChatType("support");
                              setRecipientId(0);
                              setActiveThreadName("Служба поддержки");
                              setCurrentView("chat");
                            }}
                            style={{
                              background: "var(--bg-surface, #ffffff)",
                              borderRadius: "12px",
                              padding: "20px 16px",
                              border: "1px solid var(--border-color, #e2e8f0)",
                              textAlign: "center",
                              cursor: "pointer",
                              transition: "all 0.2s",
                              boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                              marginTop: "10px"
                            }}
                            className="mini-chat-thread-card"
                          >
                            <div style={{
                              width: "48px",
                              height: "48px",
                              borderRadius: "50%",
                              background: "rgba(235, 37, 37, 0.1)",
                              color: "#eb2525",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              margin: "0 auto 12px"
                            }}>
                              <Shield size={24} />
                            </div>
                            <h4 style={{ margin: "0 0 6px 0", fontSize: "14px", fontWeight: 650, color: "var(--text-color)" }}>Служба поддержки</h4>
                            <p style={{ margin: "0 0 16px 0", fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                              Задайте вопрос или отправьте сообщение техническому специалисту портала.
                            </p>
                            <button style={{
                              background: "#eb2525",
                              color: "white",
                              border: "none",
                              padding: "8px 16px",
                              borderRadius: "20px",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer"
                            }}>
                              Написать сообщение
                            </button>
                          </div>
                        ) : filteredThreads.length === 0 ? (
                          <div style={{ textAlign: "center", marginTop: "30px", color: "var(--text-secondary)", fontSize: "13px" }}>Нет активных чатов</div>
                        ) : (
                          filteredThreads.map(thread => {
                            const threadId = isOperator && activeTab === "support" ? thread.user_id : thread.user_id;
                            const isSelected = recipientId === threadId && chatType === activeTab;
                            return (
                              <div
                                key={`${activeTab}-${threadId}`}
                                onClick={() => {
                                  setChatType(activeTab);
                                  setRecipientId(threadId);
                                  setActiveThreadName(thread.username);
                                  setCurrentView("chat");
                                }}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "12px",
                                  padding: "10px 12px",
                                  borderRadius: "10px",
                                  background: isSelected ? "rgba(235, 37, 37, 0.08)" : "var(--bg-surface, #ffffff)",
                                  cursor: "pointer",
                                  marginBottom: "8px",
                                  border: "1px solid var(--border-color, #e2e8f0)",
                                  transition: "all 0.2s"
                                }}
                              >
                                <div style={{
                                  width: "36px",
                                  height: "36px",
                                  borderRadius: "50%",
                                  background: "#e2e8f0",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "#64748b",
                                  flexShrink: 0
                                }}>
                                  <User size={18} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                    <span style={{ fontWeight: 600, fontSize: "13.5px", color: "var(--text-color)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {thread.username}
                                    </span>
                                    <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>
                                      {formatTime(thread.last_message_at)}
                                    </span>
                                  </div>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: "12px", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: "10px" }}>
                                      {thread.message || (thread.attachment_url ? "Вложение" : "Нет сообщений")}
                                    </span>
                                    {thread.unread_count > 0 && (
                                      <span style={{
                                        background: "#ef4444",
                                        color: "white",
                                        fontSize: "10px",
                                        fontWeight: "bold",
                                        borderRadius: "10px",
                                        padding: "1px 6px",
                                        minWidth: "16px",
                                        textAlign: "center"
                                      }}>
                                        {thread.unread_count}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* VIEW 2: CHAT MESSAGES PANEL */}
                  {currentView === "chat" && (
                    <motion.div
                      key="chat"
                      initial={{ opacity: 0, x: 15 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -15 }}
                      transition={{ duration: 0.15 }}
                      style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}
                    >
                      {/* Messages scroll content */}
                      <div style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: "16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                        background: "var(--bg-color, #f1f5f9)"
                      }}>
                        {loading ? (
                          <div style={{ textAlign: "center", marginTop: "20px", color: "gray", fontSize: "13px" }}>Загрузка...</div>
                        ) : messages.length === 0 ? (
                          <div style={{ textAlign: "center", marginTop: "20px", color: "gray", fontSize: "13px" }}>Нет сообщений</div>
                        ) : (
                          messages.map(msg => {
                            let isOut = false;
                            if (chatType === "direct") {
                              isOut = msg.user_id === currentUserId;
                            } else {
                              isOut = isOperator ? msg.is_operator : (!msg.is_operator && msg.user_id === currentUserId);
                            }

                            return (
                              <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={msg.id}
                                onMouseEnter={() => setHoveredMsgId(msg.id)}
                                onMouseLeave={() => setHoveredMsgId(null)}
                                style={{
                                  alignSelf: isOut ? "flex-end" : "flex-start",
                                  maxWidth: "80%",
                                  background: isOut ? "#eb2525" : "var(--bg-surface, #ffffff)",
                                  color: isOut ? "#ffffff" : "var(--text-color, #1e293b)",
                                  padding: "10px 14px",
                                  borderRadius: "14px",
                                  borderBottomRightRadius: isOut ? "4px" : "14px",
                                  borderBottomLeftRadius: !isOut ? "4px" : "14px",
                                  boxShadow: "0 2px 5px rgba(0,0,0,0.04)",
                                  fontSize: "13.5px",
                                  position: "relative",
                                  border: isOut ? "none" : "1px solid var(--border-color, #e2e8f0)"
                                }}
                              >
                                {hoveredMsgId === msg.id && msg.message && (
                                  <div 
                                    onClick={() => handleCopy(msg.message)}
                                    style={{
                                      position: "absolute",
                                      top: "-18px",
                                      right: isOut ? "auto" : "-10px",
                                      left: isOut ? "-10px" : "auto",
                                      background: "rgba(0,0,0,0.75)",
                                      color: "white",
                                      padding: "2px 6px",
                                      borderRadius: "4px",
                                      fontSize: "9px",
                                      cursor: "pointer",
                                      zIndex: 10,
                                      whiteSpace: "nowrap"
                                    }}
                                  >
                                    Копировать
                                  </div>
                                )}
                                <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.message}</div>
                                {msg.attachment_url && (
                                  <div style={{ marginTop: "6px" }}>
                                    {msg.attachment_url.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                                      <img 
                                        src={`${API_URL}${msg.attachment_url}`} 
                                        style={{ maxWidth: "100%", borderRadius: "8px", cursor: "pointer" }} 
                                        alt="img"
                                        onClick={() => setSelectedImage(`${API_URL}${msg.attachment_url}`)}
                                      />
                                    ) : (
                                      <a href={`${API_URL}${msg.attachment_url}`} target="_blank" rel="noreferrer" style={{ color: isOut ? "white" : "blue", textDecoration: "underline" }}>Вложение</a>
                                    )}
                                  </div>
                                )}
                                <div style={{ fontSize: "9px", textAlign: "right", marginTop: "4px", opacity: 0.7, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "2px" }}>
                                  {formatTime(msg.created_at)}
                                  {isOut && (
                                    <span>
                                      {msg.is_read ? <CheckCheck size={11} style={{ color: isOut ? "white" : "#10b981" }} /> : <Check size={11} />}
                                    </span>
                                  )}
                                </div>
                              </motion.div>
                            )
                          })
                        )}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Input Footer */}
                      <div style={{
                        padding: "12px",
                        background: "var(--bg-sidebar, #ffffff)",
                        borderTop: "1px solid var(--border-color, #e2e8f0)",
                        position: "relative"
                      }}>
                        {showEmojiPicker && (
                          <div style={{ position: "absolute", bottom: "60px", right: "10px", zIndex: 10 }}>
                            <EmojiPicker onEmojiClick={(e) => setNewMessage(p => p + e.emoji)} theme={theme} width={260} height={280} />
                          </div>
                        )}
                        <form onSubmit={handleSendMessage} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary, gray)" }}>
                            <Smile size={18} />
                          </button>
                          <label style={{ cursor: "pointer", color: "var(--text-secondary, gray)", display: "flex", alignItems: "center" }}>
                            <Paperclip size={18} />
                            <input type="file" style={{ display: "none" }} onChange={(e) => setFile(e.target.files[0])} />
                          </label>
                          <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={file ? `Файл: ${file.name}` : "Сообщение..."}
                            style={{
                              flex: 1,
                              padding: "6px 12px",
                              borderRadius: "18px",
                              border: "1px solid var(--border-color, #cbd5e1)",
                              background: "var(--bg-color, #f8fafc)",
                              color: "var(--text-color, #0f172a)",
                              outline: "none",
                              fontSize: "13px"
                            }}
                          />
                          <button 
                            type="submit" 
                            disabled={sending || (!newMessage.trim() && !file)}
                            style={{
                              background: "#eb2525",
                              color: "white",
                              border: "none",
                              width: "32px",
                              height: "32px",
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              opacity: (sending || (!newMessage.trim() && !file)) ? 0.5 : 1
                            }}
                          >
                            <Send size={14} />
                          </button>
                        </form>
                      </div>
                    </motion.div>
                  )}

                  {/* VIEW 3: NEW DIRECT CHAT START */}
                  {currentView === "new_chat" && (
                    <motion.div
                      key="new_chat"
                      initial={{ opacity: 0, x: 15 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -15 }}
                      transition={{ duration: 0.15 }}
                      style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}
                    >
                      {/* Search Users */}
                      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-color, #cbd5e1)" }}>
                        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                          <Search size={14} style={{ position: "absolute", left: "10px", color: "var(--text-secondary)" }} />
                          <input
                            type="text"
                            placeholder="Поиск по имени или email..."
                            value={userSearchQuery}
                            onChange={(e) => setUserSearchQuery(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "6px 10px 6px 30px",
                              borderRadius: "10px",
                              border: "1px solid var(--border-color, #cbd5e1)",
                              background: "var(--bg-color, #f8fafc)",
                              color: "var(--text-color)",
                              fontSize: "13px",
                              outline: "none"
                            }}
                          />
                        </div>
                      </div>

                      {/* User selection list */}
                      <div style={{ flex: 1, overflowY: "auto", padding: "10px", background: "var(--bg-color, #f1f5f9)" }}>
                        {filteredUsers.length === 0 ? (
                          <div style={{ textAlign: "center", marginTop: "30px", color: "var(--text-secondary)", fontSize: "13px" }}>Пользователи не найдены</div>
                        ) : (
                          filteredUsers.map(user => {
                            const name = user.full_name || user.username || user.email;
                            return (
                              <div
                                key={user.id}
                                onClick={() => {
                                  setChatType("direct");
                                  setRecipientId(user.id);
                                  setActiveThreadName(name);
                                  setCurrentView("chat");
                                  
                                  // Instantly append to direct list if not present
                                  setDirectThreads(prev => {
                                    if (!prev.some(t => t.user_id === user.id)) {
                                      return [{
                                        user_id: user.id,
                                        username: name,
                                        message: "",
                                        unread_count: 0,
                                        last_message_at: new Date().toISOString()
                                      }, ...prev];
                                    }
                                    return prev;
                                  });
                                }}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "12px",
                                  padding: "10px 12px",
                                  borderRadius: "10px",
                                  background: "var(--bg-surface, #ffffff)",
                                  cursor: "pointer",
                                  marginBottom: "8px",
                                  border: "1px solid var(--border-color, #cbd5e1)",
                                  transition: "all 0.15s"
                                }}
                              >
                                <div style={{
                                  width: "36px",
                                  height: "36px",
                                  borderRadius: "50%",
                                  background: "rgba(235, 37, 37, 0.08)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "#eb2525",
                                  flexShrink: 0
                                }}>
                                  <User size={18} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-color)" }}>{name}</div>
                                  <div style={{ fontSize: "11px", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {user.email}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </ResizableBox>
        </motion.div>
      </AnimatePresence>
    </>
  );
};

export default MiniChatWindow;
