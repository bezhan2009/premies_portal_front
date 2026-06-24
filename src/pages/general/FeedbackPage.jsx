import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { Send, MessageSquare, Search, User, Clock, ArrowLeft, Shield } from "lucide-react";
import Spinner from "../../components/Spinner.jsx";

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:7575";

export default function FeedbackPage() {
  const [messages, setMessages] = useState([]);
  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [activeThreadName, setActiveThreadName] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [threadSearch, setThreadSearch] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);
  const token = localStorage.getItem("access_token");

  // Determine user role and identity
  const getRoles = () => {
    try {
      return JSON.parse(localStorage.getItem("role_ids") || "[]");
    } catch {
      return [];
    }
  };
  const isOperator = getRoles().includes(3);
  const currentUserId = Number(localStorage.getItem("user_id") || 0);

  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}` }
  };

  // Fetch all threads (Operators only)
  const fetchThreads = useCallback(async (showLoading = false) => {
    if (!isOperator) return;
    if (showLoading) setLoadingThreads(true);
    try {
      const res = await axios.get(`${API_URL}/api/feedback/threads`, axiosConfig);
      setThreads(res.data || []);
    } catch (err) {
      console.error("Error fetching feedback threads:", err);
    } finally {
      if (showLoading) setLoadingThreads(false);
    }
  }, [isOperator]);

  // Fetch messages for a specific thread
  const fetchMessages = useCallback(async (userId, showLoading = false) => {
    if (!userId) return;
    if (showLoading) setLoadingChat(true);
    try {
      const url = isOperator 
        ? `${API_URL}/api/feedback?userId=${userId}`
        : `${API_URL}/api/feedback`;
      const res = await axios.get(url, axiosConfig);
      setMessages(res.data || []);
    } catch (err) {
      console.error("Error fetching feedback messages:", err);
    } finally {
      if (showLoading) setLoadingChat(false);
    }
  }, [isOperator]);

  // Mark messages in the current thread as read
  const markAsRead = useCallback(async (userId) => {
    if (!userId) return;
    try {
      await axios.post(`${API_URL}/api/feedback/mark-read`, { user_id: userId }, axiosConfig);
      // Refresh threads to update unread badge counts
      if (isOperator) {
        fetchThreads();
      }
    } catch (err) {
      console.error("Error marking messages as read:", err);
    }
  }, [isOperator, fetchThreads]);

  // Scroll chat window to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Initial load
  useEffect(() => {
    if (isOperator) {
      fetchThreads(true);
    } else {
      setActiveThreadId(currentUserId);
      setActiveThreadName("Поддержка Activ Daily");
      fetchMessages(currentUserId, true);
      markAsRead(currentUserId);
    }
  }, [isOperator, currentUserId, fetchThreads, fetchMessages, markAsRead]);

  // Periodic polling
  useEffect(() => {
    const chatInterval = setInterval(() => {
      if (activeThreadId) {
        fetchMessages(activeThreadId);
      }
    }, 5000);

    const threadsInterval = setInterval(() => {
      if (isOperator) {
        fetchThreads();
      }
    }, 10000);

    return () => {
      clearInterval(chatInterval);
      clearInterval(threadsInterval);
    };
  }, [activeThreadId, isOperator, fetchMessages, fetchThreads]);

  // Mark read when activeThreadId changes or new messages arrive
  useEffect(() => {
    if (activeThreadId) {
      markAsRead(activeThreadId);
      // Scroll to bottom on open
      setTimeout(scrollToBottom, 100);
    }
  }, [activeThreadId, messages.length, markAsRead]);

  // Send message handler
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeThreadId) return;

    setSending(true);
    try {
      const payload = {
        message: newMessage.trim(),
        user_id: activeThreadId
      };
      const res = await axios.post(`${API_URL}/api/feedback`, payload, axiosConfig);
      setMessages((prev) => [...prev, res.data]);
      setNewMessage("");
      setTimeout(scrollToBottom, 50);
      if (isOperator) {
        fetchThreads();
      }
    } catch (err) {
      console.error("Error sending feedback message:", err);
    } finally {
      setSending(false);
    }
  };

  // Select thread for Operator view
  const handleSelectThread = (thread) => {
    setActiveThreadId(thread.user_id);
    setActiveThreadName(thread.username);
    fetchMessages(thread.user_id, true);
  };

  // Filtered threads list
  const filteredThreads = threads.filter((t) =>
    t.username?.toLowerCase().includes(threadSearch.toLowerCase())
  );

  const formatTime = (timeStr) => {
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
          height: calc(100vh - 80px);
          background: #09090b;
          color: #f4f4f5;
          font-family: 'Inter', sans-serif;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid #27272a;
        }

        /* Sidebar (operator only) */
        .feedback-sidebar {
          width: 320px;
          border-right: 1px solid #27272a;
          display: flex;
          flex-direction: column;
          background: #18181b;
        }
        .sidebar-header {
          padding: 20px;
          border-bottom: 1px solid #27272a;
        }
        .sidebar-header h2 {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #fafafa;
        }
        .search-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .search-wrapper svg {
          position: absolute;
          left: 12px;
          color: #a1a1aa;
        }
        .search-wrapper input {
          width: 100%;
          background: #09090b;
          border: 1px solid #27272a;
          border-radius: 8px;
          padding: 10px 12px 10px 38px;
          color: #f4f4f5;
          font-size: 13px;
          outline: none;
          transition: border-color 0.2s;
        }
        .search-wrapper input:focus {
          border-color: #ef4444;
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
          background: #27272a;
        }
        .thread-item.active {
          background: #ef444415;
          border-color: #ef444440;
        }
        .thread-avatar {
          width: 40px;
          height: 40px;
          border-radius: 20px;
          background: #ef444420;
          border: 1px solid #ef444440;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ef4444;
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
          color: #fafafa;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .thread-time {
          font-size: 11px;
          color: #a1a1aa;
        }
        .thread-msg {
          font-size: 12px;
          color: #a1a1aa;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .unread-badge {
          background: #ef4444;
          color: #ffffff;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 10px;
          min-width: 18px;
          text-align: center;
        }

        /* Chat Area */
        .feedback-chat {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #09090b;
        }
        .chat-header {
          padding: 16px 24px;
          border-bottom: 1px solid #27272a;
          background: #18181b;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .chat-title-info h3 {
          font-size: 16px;
          font-weight: 700;
          color: #fafafa;
          margin: 0;
        }
        .chat-title-info span {
          font-size: 12px;
          color: #ef4444;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 2px;
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
          color: #ef4444;
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
          background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
          color: #ffffff;
          border-bottom-right-radius: 4px;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
        }
        .incoming .msg-bubble {
          background: #27272a;
          color: #f4f4f5;
          border-bottom-left-radius: 4px;
          border: 1px solid #3f3f46;
        }
        .msg-meta {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 4px;
          margin-top: 6px;
          font-size: 10px;
        }
        .outgoing .msg-meta {
          color: #fca5a5;
        }
        .incoming .msg-meta {
          color: #a1a1aa;
        }

        /* Chat Input */
        .chat-input-bar {
          padding: 20px 24px;
          border-top: 1px solid #27272a;
          background: #18181b;
        }
        .chat-input-form {
          display: flex;
          gap: 12px;
        }
        .chat-input-form input {
          flex: 1;
          background: #09090b;
          border: 1px solid #27272a;
          border-radius: 10px;
          padding: 14px 16px;
          color: #f4f4f5;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }
        .chat-input-form input:focus {
          border-color: #ef4444;
        }
        .chat-send-btn {
          background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
          color: #ffffff;
          border: none;
          border-radius: 10px;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
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

        /* Empty state */
        .chat-empty-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #a1a1aa;
          text-align: center;
          padding: 40px;
        }
        .chat-empty-state svg {
          margin-bottom: 16px;
          color: #ef4444;
          opacity: 0.8;
        }
        .chat-empty-state h3 {
          color: #fafafa;
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        /* Scrollbars */
        .threads-list::-webkit-scrollbar,
        .chat-messages::-webkit-scrollbar {
          width: 6px;
        }
        .threads-list::-webkit-scrollbar-track,
        .chat-messages::-webkit-scrollbar-track {
          background: transparent;
        }
        .threads-list::-webkit-scrollbar-thumb,
        .chat-messages::-webkit-scrollbar-thumb {
          background: #27272a;
          border-radius: 3px;
        }
      `}</style>

      {/* Sidebar for Operator Mode */}
      {isOperator && (
        <div className="feedback-sidebar">
          <div className="sidebar-header">
            <h2>
              <MessageSquare size={20} />
              <span>Чаты поддержки</span>
            </h2>
            <div className="search-wrapper">
              <Search size={16} />
              <input
                type="text"
                placeholder="Поиск оператора или пользователя..."
                value={threadSearch}
                onChange={(e) => setThreadSearch(e.target.value)}
              />
            </div>
          </div>

          {loadingThreads ? (
            <div style={{ padding: "40px 0" }}>
              <Spinner size="medium" label="Загрузка чатов..." />
            </div>
          ) : (
            <div className="threads-list">
              {filteredThreads.length === 0 ? (
                <div style={{ textAlign: "center", color: "#a1a1aa", padding: "20px", fontSize: "13px" }}>
                  Чаты не найдены
                </div>
              ) : (
                filteredThreads.map((thread) => {
                  const isActive = activeThreadId === thread.user_id;
                  const initials = thread.username ? thread.username.substring(0, 2).toUpperCase() : "?";
                  return (
                    <div
                      key={thread.user_id}
                      className={`thread-item ${isActive ? "active" : ""}`}
                      onClick={() => handleSelectThread(thread)}
                    >
                      <div className="thread-avatar">{initials}</div>
                      <div className="thread-info">
                        <div className="thread-meta">
                          <span className="thread-name">{thread.username}</span>
                          <span className="thread-time">{formatTime(thread.last_message_at)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span className="thread-msg">{thread.message}</span>
                          {thread.unread_count > 0 && (
                            <span className="unread-badge">{thread.unread_count}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* Chat Area */}
      <div className="feedback-chat">
        {activeThreadId ? (
          <>
            <div className="chat-header">
              <div className="chat-title-info">
                <h3>{activeThreadName}</h3>
                <span>
                  <Shield size={14} />
                  {isOperator ? "Обращение от пользователя" : "Связь с поддержкой"}
                </span>
              </div>
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
                    // Outgoing check:
                    // If operator: outgoing if is_operator = true.
                    // If regular user: outgoing if is_operator = false.
                    const isOutgoing = isOperator ? msg.is_operator : !msg.is_operator;
                    return (
                      <div key={msg.id} className={`msg-bubble-wrapper ${isOutgoing ? "outgoing" : "incoming"}`}>
                        {!isOutgoing && isOperator && (
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
                  placeholder="Опишите вашу проблему или задайте вопрос..."
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
            <h3>Обратная связь</h3>
            <p>Выберите диалог из списка слева, чтобы начать переписку с пользователем.</p>
          </div>
        )}
      </div>
    </div>
  );
}
