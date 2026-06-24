import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { Send, MessageSquare, Search, User, Clock, ArrowLeft, Shield, Info } from "lucide-react";
import Spinner from "../../components/Spinner.jsx";

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:7575";

export default function FeedbackPage() {
  const [activeTab, setActiveTab] = useState("support"); // "support" | "direct"
  const [messages, setMessages] = useState([]);
  
  // Support threads (operator only)
  const [supportThreads, setSupportThreads] = useState([]);
  
  // Direct chat threads (all users)
  const [directThreads, setDirectThreads] = useState([]);
  
  // Active chat state
  const [activeChatType, setActiveChatType] = useState(null); // "support" | "direct"
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [activeThreadName, setActiveThreadName] = useState("");
  
  const [newMessage, setNewMessage] = useState("");
  
  // Search threads
  const [threadSearch, setThreadSearch] = useState("");
  
  // Direct messages user list / search
  const [usersList, setUsersList] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [showUsersDropdown, setShowUsersDropdown] = useState(false);
  
  // Loading states
  const [loadingChat, setLoadingChat] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [sending, setSending] = useState(false);
  
  // Mobile navigation
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const messagesEndRef = useRef(null);
  const token = localStorage.getItem("access_token");
  const currentUserId = Number(localStorage.getItem("user_id") || 0);

  // Check roles
  const getRoles = () => {
    try {
      return JSON.parse(localStorage.getItem("role_ids") || "[]");
    } catch {
      return [];
    }
  };
  const isOperator = getRoles().includes(3);

  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}` }
  };

  // Fetch users for direct messages
  const fetchUsers = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/users/emails`, axiosConfig);
      setUsersList(res.data.users || []);
    } catch (err) {
      console.error("Error fetching users list:", err);
    }
  }, []);

  // Fetch support threads (Operators only)
  const fetchSupportThreads = useCallback(async (showLoading = false) => {
    if (!isOperator) return;
    if (showLoading) setLoadingThreads(true);
    try {
      const res = await axios.get(`${API_URL}/api/feedback/threads`, axiosConfig);
      setSupportThreads(res.data || []);
    } catch (err) {
      console.error("Error fetching support threads:", err);
    } finally {
      if (showLoading) setLoadingThreads(false);
    }
  }, [isOperator]);

  // Fetch direct message threads
  const fetchDirectThreads = useCallback(async (showLoading = false) => {
    if (showLoading) setLoadingThreads(true);
    try {
      const res = await axios.get(`${API_URL}/api/feedback/direct-threads`, axiosConfig);
      setDirectThreads(res.data || []);
    } catch (err) {
      console.error("Error fetching direct threads:", err);
    } finally {
      if (showLoading) setLoadingThreads(false);
    }
  }, []);

  // Fetch messages
  const fetchMessages = useCallback(async (type, threadId, showLoading = false) => {
    if (!threadId) return;
    if (showLoading) setLoadingChat(true);
    try {
      let url = "";
      if (type === "support") {
        url = isOperator 
          ? `${API_URL}/api/feedback?userId=${threadId}`
          : `${API_URL}/api/feedback`;
      } else {
        url = `${API_URL}/api/feedback?chatWith=${threadId}`;
      }
      const res = await axios.get(url, axiosConfig);
      setMessages(res.data || []);
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      if (showLoading) setLoadingChat(false);
    }
  }, [isOperator]);

  // Mark read
  const markAsRead = useCallback(async (type, threadId) => {
    if (!threadId) return;
    try {
      const payload = type === "direct" 
        ? { chat_with: threadId } 
        : { user_id: threadId };
      await axios.post(`${API_URL}/api/feedback/mark-read`, payload, axiosConfig);
      
      // Refresh lists
      if (type === "support" && isOperator) {
        fetchSupportThreads();
      } else if (type === "direct") {
        fetchDirectThreads();
      }
    } catch (err) {
      console.error("Error marking messages as read:", err);
    }
  }, [isOperator, fetchSupportThreads, fetchDirectThreads]);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Initial load
  useEffect(() => {
    fetchUsers();
    if (isOperator) {
      fetchSupportThreads(true);
      fetchDirectThreads(false);
    } else {
      // Regular user support chat starts automatically
      setActiveChatType("support");
      setActiveThreadId(currentUserId);
      setActiveThreadName("Поддержка Activ Daily");
      fetchMessages("support", currentUserId, true);
      markAsRead("support", currentUserId);
      fetchDirectThreads(false);
    }
  }, [isOperator, currentUserId, fetchSupportThreads, fetchDirectThreads, fetchMessages, markAsRead, fetchUsers]);

  // Polling
  useEffect(() => {
    const chatInterval = setInterval(() => {
      if (activeChatType && activeThreadId) {
        fetchMessages(activeChatType, activeThreadId);
      }
    }, 4000);

    const listsInterval = setInterval(() => {
      if (isOperator) {
        fetchSupportThreads();
      }
      fetchDirectThreads();
    }, 8000);

    return () => {
      clearInterval(chatInterval);
      clearInterval(listsInterval);
    };
  }, [activeChatType, activeThreadId, isOperator, fetchMessages, fetchSupportThreads, fetchDirectThreads]);

  // Mark read when messages length or active thread changes
  useEffect(() => {
    if (activeChatType && activeThreadId) {
      markAsRead(activeChatType, activeThreadId);
      setTimeout(scrollToBottom, 50);
    }
  }, [activeChatType, activeThreadId, messages.length, markAsRead]);

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeThreadId || !activeChatType) return;

    setSending(true);
    try {
      let payload = {};
      if (activeChatType === "direct") {
        payload = {
          message: newMessage.trim(),
          recipient_id: activeThreadId
        };
      } else {
        payload = {
          message: newMessage.trim(),
          user_id: activeThreadId
        };
      }

      const res = await axios.post(`${API_URL}/api/feedback`, payload, axiosConfig);
      setMessages((prev) => [...prev, res.data]);
      setNewMessage("");
      setTimeout(scrollToBottom, 50);
      
      if (activeChatType === "support" && isOperator) {
        fetchSupportThreads();
      } else if (activeChatType === "direct") {
        fetchDirectThreads();
      }
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSending(false);
    }
  };

  // Select support thread (Operator)
  const handleSelectSupportThread = (thread) => {
    setActiveChatType("support");
    setActiveThreadId(thread.user_id);
    setActiveThreadName(thread.username);
    fetchMessages("support", thread.user_id, true);
    setMobileShowChat(true);
  };

  // Select direct thread
  const handleSelectDirectThread = (thread) => {
    setActiveChatType("direct");
    setActiveThreadId(thread.user_id);
    setActiveThreadName(thread.username);
    fetchMessages("direct", thread.user_id, true);
    setMobileShowChat(true);
  };

  // Select standard support (User)
  const handleSelectUserSupport = () => {
    setActiveChatType("support");
    setActiveThreadId(currentUserId);
    setActiveThreadName("Поддержка Activ Daily");
    fetchMessages("support", currentUserId, true);
    setMobileShowChat(true);
  };

  // Start chat with selected user from search
  const handleStartDirectChat = (user) => {
    setActiveChatType("direct");
    setActiveThreadId(user.id);
    setActiveThreadName(user.full_name || user.username);
    fetchMessages("direct", user.id, true);
    setShowUsersDropdown(false);
    setUserSearchQuery("");
    setMobileShowChat(true);
    
    // Add to direct threads instantly for UI responsiveness
    const threadExists = directThreads.some(t => t.user_id === user.id);
    if (!threadExists) {
      setDirectThreads(prev => [
        {
          user_id: user.id,
          username: user.full_name || user.username,
          message: "",
          unread_count: 0,
          last_message_at: new Date().toISOString()
        },
        ...prev
      ]);
    }
  };

  // Filter users from list
  const filteredUsers = usersList.filter((u) => {
    if (u.id === currentUserId) return false;
    const query = userSearchQuery.toLowerCase().trim();
    if (!query) return false;
    return (
      u.full_name?.toLowerCase().includes(query) ||
      u.username?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query)
    );
  });

  // Filter threads
  const filteredSupportThreads = supportThreads.filter((t) =>
    t.username?.toLowerCase().includes(threadSearch.toLowerCase())
  );

  const filteredDirectThreads = directThreads.filter((t) =>
    t.username?.toLowerCase().includes(threadSearch.toLowerCase())
  );

  const showSupportInDirect = !isOperator && (!threadSearch || "техподдержка activ daily".includes(threadSearch.toLowerCase()));

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    try {
      const d = new Date(timeStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return "";
    }
  };

  return (
    <div className="feedback-container">
      <style>{`
        .feedback-container {
          display: flex;
          height: 100vh;
          background: var(--bg-color);
          color: var(--text-color);
          font-family: 'Inter', sans-serif;
          overflow: hidden;
        }

        /* Sidebar */
        .feedback-sidebar {
          width: 320px;
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          background: var(--bg-sidebar);
          flex-shrink: 0;
          transition: all 0.3s;
        }
        
        .sidebar-header {
          padding: 16px 20px 10px 20px;
        }
        .sidebar-header h2 {
          font-size: 18px;
          font-weight: 700;
          margin: 0 0 12px 0;
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-color);
        }
        
        /* Sidebar Tab Toggle */
        .sidebar-tabs {
          display: flex;
          border-bottom: 1px solid var(--border-color);
          background: var(--bg-sidebar);
        }
        .sidebar-tab {
          flex: 1;
          padding: 12px 6px;
          text-align: center;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
          background: none;
          border-top: none;
          border-left: none;
          border-right: none;
          outline: none;
        }
        .sidebar-tab:hover {
          color: var(--text-color);
          background: rgba(var(--primary-rgb), 0.02);
        }
        .sidebar-tab.active {
          color: var(--primary-color);
          border-bottom-color: var(--primary-color);
          background: rgba(var(--primary-rgb), 0.05);
        }
        
        /* Direct messages search drop */
        .user-search-container {
          padding: 10px 16px;
          border-bottom: 1px solid var(--border-color);
          position: relative;
          background: var(--bg-sidebar);
        }
        .search-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .search-wrapper svg {
          position: absolute;
          left: 10px;
          color: var(--text-secondary);
        }
        .search-wrapper input {
          width: 100%;
          background: var(--bg-color);
          border: 1px solid var(--border-input);
          border-radius: 8px;
          padding: 8px 12px 8px 32px;
          color: var(--text-color);
          font-size: 13px;
          outline: none;
          transition: border-color 0.2s;
        }
        .search-wrapper input:focus {
          border-color: var(--primary-color);
        }
        
        .users-dropdown-list {
          position: absolute;
          top: 100%;
          left: 16px;
          right: 16px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          max-height: 200px;
          overflow-y: auto;
          z-index: 100;
          box-shadow: var(--shadow-lg);
          display: flex;
          flex-direction: column;
          padding: 6px 0;
        }
        .user-dropdown-item {
          padding: 8px 12px;
          font-size: 13px;
          cursor: pointer;
          color: var(--text-color);
          transition: background 0.2s;
          text-align: left;
          background: none;
          border: none;
          width: 100%;
          outline: none;
        }
        .user-dropdown-item:hover {
          background: var(--bg-color);
        }
        .user-dropdown-fullname {
          font-weight: 600;
          display: block;
        }
        .user-dropdown-username {
          font-size: 11px;
          color: var(--text-secondary);
        }

        .threads-list {
          flex: 1;
          overflow-y: auto;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .thread-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid transparent;
        }
        .thread-item:hover {
          background: var(--bg-secondary);
          border-color: var(--border-color);
        }
        .thread-item.active {
          background: rgba(var(--primary-rgb), 0.1);
          border-color: rgba(var(--primary-rgb), 0.2);
        }
        .thread-avatar {
          width: 40px;
          height: 40px;
          border-radius: 20px;
          background: rgba(var(--primary-rgb), 0.15);
          border: 1px solid rgba(var(--primary-rgb), 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary-color);
          font-weight: 700;
          flex-shrink: 0;
        }
        .thread-info {
          flex: 1;
          min-width: 0;
        }
        .thread-meta {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 4px;
        }
        .thread-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-color);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .thread-time {
          font-size: 11px;
          color: var(--text-secondary);
        }
        .thread-msg {
          font-size: 12px;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        /* Chat Area */
        .feedback-chat {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: var(--bg-color);
        }
        
        .chat-header {
          padding: 16px 24px;
          border-bottom: 1px solid var(--border-color);
          background: var(--bg-sidebar);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .chat-title-info {
          display: flex;
          flex-direction: column;
        }
        .chat-title-info h3 {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-color);
          margin: 0;
        }
        .chat-title-info span {
          font-size: 11px;
          color: var(--primary-color);
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 2px;
        }
        
        .chat-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .btn-back-list {
          display: none;
          background: none;
          border: none;
          color: var(--text-color);
          cursor: pointer;
          padding: 6px;
          margin-right: 8px;
          border-radius: 4px;
        }
        .btn-back-list:hover {
          background: rgba(var(--primary-rgb), 0.05);
        }
        
        /* Instructions Banner */
        .chat-instructions-banner {
          background: rgba(var(--primary-rgb), 0.05);
          border-bottom: 1px solid var(--border-color);
          padding: 12px 24px;
          font-size: 13px;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .chat-instructions-banner svg {
          color: var(--primary-color);
          flex-shrink: 0;
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Message Bubbles */
        .msg-bubble-wrapper {
          display: flex;
          flex-direction: column;
          max-width: 70%;
        }
        .msg-bubble-wrapper.outgoing {
          align-self: flex-end;
          align-items: flex-end;
        }
        .msg-bubble-wrapper.incoming {
          align-self: flex-start;
          align-items: flex-start;
        }
        
        .msg-sender {
          font-size: 11px;
          font-weight: 700;
          color: var(--primary-color);
          margin-bottom: 4px;
          margin-left: 6px;
        }
        .msg-bubble {
          padding: 12px 16px;
          border-radius: 16px;
          font-size: 14px;
          line-height: 1.5;
          word-break: break-word;
          position: relative;
        }
        .outgoing .msg-bubble {
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%);
          color: #ffffff;
          border-bottom-right-radius: 4px;
          box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.15);
        }
        .incoming .msg-bubble {
          background: var(--bg-secondary);
          color: var(--text-color);
          border-bottom-left-radius: 4px;
          border: 1px solid var(--border-color);
        }
        .msg-meta {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 4px;
          margin-top: 6px;
          font-size: 9px;
        }
        .outgoing .msg-meta {
          color: rgba(255, 255, 255, 0.8);
        }
        .incoming .msg-meta {
          color: var(--text-secondary);
        }

        /* Input Bar */
        .chat-input-bar {
          padding: 16px 24px;
          border-top: 1px solid var(--border-color);
          background: var(--bg-sidebar);
        }
        .chat-input-form {
          display: flex;
          gap: 12px;
        }
        .chat-input-form input {
          flex: 1;
          background: var(--bg-color);
          border: 1px solid var(--border-input);
          border-radius: 10px;
          padding: 12px 16px;
          color: var(--text-color);
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }
        .chat-input-form input:focus {
          border-color: var(--primary-color);
        }
        .chat-send-btn {
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%);
          color: #ffffff;
          border: none;
          border-radius: 10px;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.15);
          flex-shrink: 0;
        }
        .chat-send-btn:hover:not(:disabled) {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }
        .chat-send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .chat-empty-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          text-align: center;
          padding: 40px;
        }
        .chat-empty-state svg {
          margin-bottom: 16px;
          color: var(--primary-color);
          opacity: 0.8;
        }
        .chat-empty-state h3 {
          color: var(--text-color);
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        /* Custom Scrollbars */
        .threads-list::-webkit-scrollbar,
        .chat-messages::-webkit-scrollbar,
        .users-dropdown-list::-webkit-scrollbar {
          width: 6px;
        }
        .threads-list::-webkit-scrollbar-track,
        .chat-messages::-webkit-scrollbar-track,
        .users-dropdown-list::-webkit-scrollbar-track {
          background: transparent;
        }
        .threads-list::-webkit-scrollbar-thumb,
        .chat-messages::-webkit-scrollbar-thumb,
        .users-dropdown-list::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 3px;
        }

        /* Responsive Layout styles */
        @media (max-width: 768px) {
          .btn-back-list {
            display: block;
          }
          
          .feedback-sidebar {
            width: 100%;
            display: ${mobileShowChat ? "none" : "flex"};
          }
          
          .feedback-chat {
            display: ${mobileShowChat ? "flex" : "none"};
          }
        }
      `}</style>

      {/* Left Sidebar */}
      <div className="feedback-sidebar">
        <div className="sidebar-header">
          <h2>
            <MessageSquare size={20} />
            <span>Обратная связь</span>
          </h2>
          <div className="search-wrapper">
            <Search size={16} />
            <input
              type="text"
              placeholder="Поиск диалога..."
              value={threadSearch}
              onChange={(e) => setThreadSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Tabs for Support vs Direct messages */}
        <div className="sidebar-tabs">
          <button 
            className={`sidebar-tab ${activeTab === "support" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("support");
              if (!isOperator) {
                handleSelectUserSupport();
              }
            }}
          >
            {isOperator ? "Обращения клиентов" : "Техподдержка"}
          </button>
          <button 
            className={`sidebar-tab ${activeTab === "direct" ? "active" : ""}`}
            onClick={() => setActiveTab("direct")}
          >
            Личные чаты
          </button>
        </div>

        {/* Direct messaging user lookup */}
        {activeTab === "direct" && (
          <div className="user-search-container">
            <div className="search-wrapper">
              <Search size={14} />
              <input
                type="text"
                placeholder="Кому написать..."
                value={userSearchQuery}
                onChange={(e) => {
                  setUserSearchQuery(e.target.value);
                  setShowUsersDropdown(true);
                }}
                onFocus={() => setShowUsersDropdown(true)}
              />
            </div>
            {showUsersDropdown && filteredUsers.length > 0 && (
              <div className="users-dropdown-list">
                {filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    className="user-dropdown-item"
                    onClick={() => handleStartDirectChat(u)}
                  >
                    <span className="user-dropdown-fullname">{u.full_name || u.username}</span>
                    <span className="user-dropdown-username">{u.email || `@${u.username}`}</span>
                  </button>
                ))}
              </div>
            )}
            {showUsersDropdown && userSearchQuery.trim() !== "" && filteredUsers.length === 0 && (
              <div className="users-dropdown-list" style={{ padding: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Пользователь не найден
              </div>
            )}
          </div>
        )}

        {/* Threads list */}
        <div className="threads-list">
          {loadingThreads ? (
            <div style={{ padding: "40px 0" }}>
              <Spinner size="medium" label="Загрузка чатов..." />
            </div>
          ) : activeTab === "support" ? (
            /* SUPPORT THREADS TAB */
            isOperator ? (
              filteredSupportThreads.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: "20px", fontSize: "13px" }}>
                  Нет открытых обращений
                </div>
              ) : (
                filteredSupportThreads.map((thread) => {
                  const isActive = activeChatType === "support" && activeThreadId === thread.user_id;
                  const initials = thread.username ? thread.username.substring(0, 2).toUpperCase() : "?";
                  return (
                    <div
                      key={thread.user_id}
                      className={`thread-item ${isActive ? "active" : ""}`}
                      onClick={() => handleSelectSupportThread(thread)}
                    >
                      <div className="thread-avatar">{initials}</div>
                      <div className="thread-info">
                        <div className="thread-meta">
                          <span className="thread-name">{thread.username}</span>
                          <span className="thread-time">{formatTime(thread.last_message_at)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span className="thread-msg">{thread.message || "Обращение"}</span>
                          {thread.unread_count > 0 && (
                            <span className="unread-badge">{thread.unread_count}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              /* Regular user support single item */
              <div
                className={`thread-item ${activeChatType === "support" ? "active" : ""}`}
                onClick={handleSelectUserSupport}
              >
                <div className="thread-avatar" style={{ background: 'rgba(var(--primary-rgb), 0.2)', color: 'var(--primary-color)' }}>
                  <Shield size={18} />
                </div>
                <div className="thread-info">
                  <div className="thread-meta">
                    <span className="thread-name">Техподдержка Activ Daily</span>
                  </div>
                  <span className="thread-msg">Служба поддержки пользователей</span>
                </div>
              </div>
            )
          ) : (
            /* DIRECT MESSAGES THREADS TAB */
            (!showSupportInDirect && filteredDirectThreads.length === 0) ? (
              <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: "20px", fontSize: "13px" }}>
                Нет личных чатов.<br />Воспользуйтесь поиском выше, чтобы начать диалог.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {showSupportInDirect && (
                  <div
                    className={`thread-item ${activeChatType === "support" ? "active" : ""}`}
                    onClick={handleSelectUserSupport}
                    style={{ borderBottom: '1px solid var(--border-color)', marginBottom: '4px', paddingBottom: '10px' }}
                  >
                    <div className="thread-avatar" style={{ background: 'rgba(var(--primary-rgb), 0.2)', color: 'var(--primary-color)' }}>
                      <Shield size={18} />
                    </div>
                    <div className="thread-info">
                      <div className="thread-meta">
                        <span className="thread-name" style={{ fontWeight: '700' }}>Техподдержка Activ Daily</span>
                      </div>
                      <span className="thread-msg">Служба поддержки пользователей</span>
                    </div>
                  </div>
                )}
                {filteredDirectThreads.map((thread) => {
                  const isActive = activeChatType === "direct" && activeThreadId === thread.user_id;
                  const initials = thread.username ? thread.username.substring(0, 2).toUpperCase() : "?";
                  return (
                    <div
                      key={thread.user_id}
                      className={`thread-item ${isActive ? "active" : ""}`}
                      onClick={() => handleSelectDirectThread(thread)}
                    >
                      <div className="thread-avatar">{initials}</div>
                      <div className="thread-info">
                        <div className="thread-meta">
                          <span className="thread-name">{thread.username}</span>
                          <span className="thread-time">{formatTime(thread.last_message_at)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span className="thread-msg">{thread.message || "Диалог начат"}</span>
                          {thread.unread_count > 0 && (
                            <span className="unread-badge">{thread.unread_count}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>

      {/* Right Chat Pane */}
      <div className="feedback-chat">
        {activeThreadId ? (
          <>
            <div className="chat-header">
              <div className="chat-header-actions">
                <button 
                  className="btn-back-list" 
                  onClick={() => setMobileShowChat(false)}
                  title="Назад к списку"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="chat-title-info">
                  <h3>{activeThreadName}</h3>
                  <span>
                    <Shield size={12} />
                    {activeChatType === "support" ? "Канал поддержки" : "Личное сообщение"}
                  </span>
                </div>
              </div>
            </div>

            {/* Instruction banner explaining how to start / use */}
            <div className="chat-instructions-banner">
              <Info size={16} />
              <span>
                {activeChatType === "support" 
                  ? "Это ваш канал связи с техподдержкой. Опишите вашу проблему, и первый свободный оператор ответит вам."
                  : `Личная беседа. Все сообщения между вами и ${activeThreadName} конфиденциальны.`
                }
              </span>
            </div>

            {loadingChat ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Spinner size="large" label="Загрузка диалога..." />
              </div>
            ) : (
              <div className="chat-messages">
                {messages.length === 0 ? (
                  <div className="chat-empty-state">
                    <MessageSquare size={48} />
                    <h3>Диалог пуст</h3>
                    <p>Напишите первое сообщение, чтобы начать диалог.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    // Outgoing message determination
                    let isOutgoing = false;
                    if (activeChatType === "support") {
                      isOutgoing = isOperator ? msg.is_operator : !msg.is_operator;
                    } else {
                      // In direct chat: outgoing if sender is current user
                      isOutgoing = msg.user_id === currentUserId;
                    }

                    return (
                      <div key={msg.id} className={`msg-bubble-wrapper ${isOutgoing ? "outgoing" : "incoming"}`}>
                        {!isOutgoing && activeChatType === "support" && isOperator && (
                          <span className="msg-sender">{msg.username}</span>
                        )}
                        <div className="msg-bubble">
                          {msg.message}
                          <div className="msg-meta">
                            <Clock size={10} style={{ marginRight: 2 }} />
                            <span>{formatTime(msg.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            )}

            <div className="chat-input-bar">
              <form onSubmit={handleSendMessage} className="chat-input-form">
                <input
                  type="text"
                  placeholder="Напишите сообщение..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={sending}
                  required
                />
                <button type="submit" className="chat-send-btn" disabled={sending || !newMessage.trim()}>
                  <Send size={18} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="chat-empty-state">
            <MessageSquare size={64} />
            <h3>Обратная связь и чаты</h3>
            <p>Выберите диалог из списка слева или воспользуйтесь поиском, чтобы начать переписку.</p>
          </div>
        )}
      </div>
    </div>
  );
}
