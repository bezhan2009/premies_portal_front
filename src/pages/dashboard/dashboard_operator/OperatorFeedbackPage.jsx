import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import axios from "axios";
import { Send, MessageSquare, Search, User, Clock, ArrowLeft, Shield, Info, CheckCircle, Paperclip, Smile, UserPlus, X, Check, CheckCheck } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import Spinner from "../../../components/Spinner.jsx";
import { Helmet } from "react-helmet";
import useThemeStore from "../../../store/useThemeStore";

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:7575";

export default function OperatorFeedbackPage() {
  const token = localStorage.getItem("access_token");
  const currentUserId = Number(localStorage.getItem("user_id") || 0);
  const { theme } = useThemeStore();

  const [totalUnread, setTotalUnread] = useState(0);
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [file, setFile] = useState(null);
  
  // Search threads
  const [threadSearch, setThreadSearch] = useState("");
  
  // Tabs
  const [activeTab, setActiveTab] = useState("direct"); // "support" | "direct"

  // Direct messages user list / search
  const [usersList, setUsersList] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [showUsersDropdown, setShowUsersDropdown] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  
  // Loading states
  const [loadingChat, setLoadingChat] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [sending, setSending] = useState(false);
  
  // Mobile navigation
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const messagesEndRef = useRef(null);

  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}` }
  };

  const fetchUsers = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/users/emails`, axiosConfig);
      setUsersList(res.data.users || []);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  }, []);

  const fetchTotalUnread = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/feedback/unread-count`, axiosConfig);
      setTotalUnread(res.data.unread_count || 0);
    } catch (err) {
      console.error("Error fetching total unread:", err);
    }
  }, []);

  const fetchSupportThreads = useCallback(async (showLoading = false) => {
    if (showLoading) setLoadingThreads(true);
    try {
      const res = await axios.get(`${API_URL}/api/feedback/threads`, axiosConfig);
      setSupportThreads(res.data || []);
    } catch (err) {
      console.error("Error fetching support threads:", err);
    } finally {
      if (showLoading) setLoadingThreads(false);
    }
  }, []);

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

  const fetchMessages = useCallback(async (type, threadId, showLoading = false) => {
    if (!threadId) return;
    if (showLoading) setLoadingChat(true);
    try {
      let url = type === "support" 
        ? `${API_URL}/api/feedback?userId=${threadId}`
        : `${API_URL}/api/feedback?chatWith=${threadId}`;
      const res = await axios.get(url, axiosConfig);
      
      setMessages(prevMessages => {
         // Check for new incoming messages to show notification
         if (prevMessages.length > 0 && res.data && res.data.length > prevMessages.length) {
            const newMsg = res.data[res.data.length - 1];
            if ((type === "support" && !newMsg.is_operator) || (type === "direct" && newMsg.user_id !== currentUserId)) {
               if ("Notification" in window) {
                  if (Notification.permission === "granted") {
                     const notif = new Notification(`Новое сообщение от ${newMsg.username || "Пользователя"}`, { body: newMsg.message || "Вложение" });
                     notif.onclick = () => window.focus();
                  } else if (Notification.permission !== "denied") {
                     Notification.requestPermission();
                  }
               }
            }
         }
         return res.data || [];
      });
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      if (showLoading) setLoadingChat(false);
    }
  }, []);

  const markAsRead = useCallback(async (type, threadId) => {
    if (!threadId) return;
    try {
      const payload = type === "direct" 
        ? { chat_with: threadId } 
        : { user_id: threadId };
      await axios.post(`${API_URL}/api/feedback/mark-read`, payload, axiosConfig);
      
      if (type === "support") fetchSupportThreads();
      else if (type === "direct") fetchDirectThreads();
      fetchTotalUnread();
    } catch (err) {
      console.error("Error marking read:", err);
    }
  }, [fetchSupportThreads, fetchDirectThreads, fetchTotalUnread]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    fetchUsers();
    fetchSupportThreads(true);
    fetchDirectThreads(false);
    fetchTotalUnread();

    // Fetch mbarotov and ensure he is in supportThreads
    axios.get(`${API_URL}/api/users/id-by-username?username=mbarotov`, axiosConfig)
      .then(res => {
        if (res.data && res.data.id) {
          const mbarotovId = res.data.id;
          const mbarotovName = res.data.full_name || res.data.username || "mbarotov";
          
          setSupportThreads(prev => {
            if (!prev.some(t => t.user_id === mbarotovId)) {
              return [
                ...prev,
                {
                  user_id: mbarotovId,
                  username: mbarotovName,
                  message: "Чат с тех. поддержкой",
                  unread_count: 0,
                  last_message_at: new Date().toISOString()
                }
              ];
            }
            return prev;
          });
        }
      })
      .catch(err => console.error("Could not fetch mbarotov ID:", err));

  }, [fetchSupportThreads, fetchDirectThreads, fetchUsers, fetchTotalUnread]);

  useEffect(() => {
    const chatInterval = setInterval(() => {
      if (activeChatType && activeThreadId) {
        fetchMessages(activeChatType, activeThreadId);
      }
    }, 4000);

    const listsInterval = setInterval(() => {
      fetchSupportThreads();
      fetchDirectThreads();
      fetchTotalUnread();
    }, 8000);

    return () => {
      clearInterval(chatInterval);
      clearInterval(listsInterval);
    };
  }, [activeChatType, activeThreadId, fetchMessages, fetchSupportThreads, fetchDirectThreads, fetchTotalUnread]);

  useEffect(() => {
    if (activeChatType && activeThreadId) {
      markAsRead(activeChatType, activeThreadId);
      setTimeout(scrollToBottom, 50);
    }
  }, [activeChatType, activeThreadId, messages.length, markAsRead]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !file) return;
    if (!activeThreadId || !activeChatType) return;

    setSending(true);
    let attachmentUrl = "";

    try {
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await axios.post(`${API_URL}/api/feedback/upload`, formData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data"
          }
        });
        attachmentUrl = uploadRes.data.url;
      }

      let payload = activeChatType === "direct" 
        ? { message: newMessage.trim(), attachment_url: attachmentUrl, recipient_id: activeThreadId }
        : { message: newMessage.trim(), attachment_url: attachmentUrl, user_id: activeThreadId };

      const res = await axios.post(`${API_URL}/api/feedback`, payload, axiosConfig);
      setMessages((prev) => [...prev, res.data]);
      setNewMessage("");
      setFile(null);
      setShowEmojiPicker(false);
      setTimeout(scrollToBottom, 50);
      
      if (activeChatType === "support") fetchSupportThreads();
      else if (activeChatType === "direct") fetchDirectThreads();
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSending(false);
    }
  };

  const handleSelectThread = useCallback((thread) => {
    setActiveChatType(thread.chatType);
    setActiveThreadId(thread.id);
    setActiveThreadName(thread.name);
    fetchMessages(thread.chatType, thread.id, true);
    setMobileShowChat(true);
  }, [fetchMessages]);

  const handleStartDirectChat = (user) => {
    setActiveTab("direct");
    setActiveChatType("direct");
    setActiveThreadId(user.id);
    setActiveThreadName(user.full_name || user.username);
    fetchMessages("direct", user.id, true);
    setShowUsersDropdown(false);
    setUserSearchQuery("");
    setShowNewChatModal(false);
    setMobileShowChat(true);
    
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

  const filteredUsers = usersList.filter((u) => {
    if (u.id === currentUserId) return false;
    const query = userSearchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      u.full_name?.toLowerCase().includes(query) ||
      u.username?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.first_name?.toLowerCase().includes(query) ||
      u.last_name?.toLowerCase().includes(query)
    );
  });

  const displayThreads = useMemo(() => {
    let source = activeTab === "support" ? supportThreads : directThreads;
    let mapped = source.map(t => ({
      chatType: activeTab,
      id: t.user_id,
      name: t.username,
      message: t.message,
      unread_count: t.unread_count,
      last_message_at: t.last_message_at,
      isSupportTicket: activeTab === "support"
    }));
    
    mapped.sort((a, b) => {
      const timeA = new Date(a.last_message_at || 0).getTime();
      const timeB = new Date(b.last_message_at || 0).getTime();
      return timeB - timeA;
    });

    return mapped.filter((t) => t.name?.toLowerCase().includes(threadSearch.toLowerCase()));
  }, [activeTab, supportThreads, directThreads, threadSearch]);

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    try {
      const d = new Date(timeStr);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
  };

  return (
    <div className="feedback-container">
      <Helmet><title>Панель обратной связи</title></Helmet>
      
      <style>{`
        .feedback-container {
          display: flex;
          height: calc(100vh - 64px);
          background: var(--bg-color);
          color: var(--text-color);
          font-family: 'Inter', sans-serif;
          overflow: hidden;
        }

        /* Sidebar */
        .feedback-sidebar {
          width: 340px;
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          background: var(--bg-sidebar);
          flex-shrink: 0;
          transition: all 0.3s;
        }
        
        .sidebar-header {
          padding: 16px 20px 0 20px;
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
        
        .tabs-container {
          display: flex;
          border-bottom: 1px solid var(--border-color);
          margin-top: 12px;
        }
        .tab-btn {
          flex: 1;
          background: none;
          border: none;
          padding: 10px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
        }
        .tab-btn.active {
          color: var(--primary-color);
          border-bottom: 2px solid var(--primary-color);
        }

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
          text-align: left;
          background: none;
          border: none;
          width: 100%;
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
        .unread-badge {
          background: var(--danger-color, #eb2525);
          color: white;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 10px;
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
        
        .btn-back-list {
          display: none;
          background: none;
          border: none;
          color: var(--text-color);
          cursor: pointer;
          padding: 6px;
          margin-right: 8px;
        }

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
        .msg-attachment img {
          max-width: 100%;
          border-radius: 8px;
          margin-top: 8px;
        }

        /* Input Bar */
        .chat-input-bar {
          padding: 16px 24px;
          border-top: 1px solid var(--border-color);
          background: var(--bg-sidebar);
          position: relative;
        }
        .chat-input-form {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .chat-input-form input[type="text"] {
          flex: 1;
          background: var(--bg-color);
          border: 1px solid var(--border-input);
          border-radius: 10px;
          padding: 12px 16px;
          color: var(--text-color);
          font-size: 14px;
          outline: none;
        }
        .chat-input-form input[type="text"]:focus {
          border-color: var(--primary-color);
        }
        .icon-btn {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
        }
        .icon-btn:hover {
          color: var(--primary-color);
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
        }
        .chat-send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .emoji-picker-container {
          position: absolute;
          bottom: 70px;
          left: 16px;
          z-index: 100;
        }
        .file-preview {
          font-size: 12px;
          color: var(--text-secondary);
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
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

        /* Scrollbars */
        .threads-list::-webkit-scrollbar,
        .chat-messages::-webkit-scrollbar {
          width: 6px;
        }
        .threads-list::-webkit-scrollbar-thumb,
        .chat-messages::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 3px;
        }

        @media (max-width: 768px) {
          .btn-back-list { display: block; }
          .feedback-sidebar { width: 100%; display: ${mobileShowChat ? "none" : "flex"}; }
          .feedback-chat { display: ${mobileShowChat ? "flex" : "none"}; }
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease-out;
        }
        .new-chat-modal {
          background: var(--bg-sidebar);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          width: 100%;
          max-width: 460px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-2xl);
          animation: slideUp 0.2s ease-out;
          overflow: hidden;
        }
        .modal-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .modal-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          color: var(--text-color);
        }
        .modal-close-btn {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }
        .modal-close-btn:hover {
          background: var(--bg-secondary);
          color: var(--text-color);
        }
        .modal-search-area {
          padding: 16px;
          border-bottom: 1px solid var(--border-color);
          background: var(--bg-sidebar);
        }
        .modal-users-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .modal-user-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          background: none;
          border: none;
          width: 100%;
          text-align: left;
        }
        .modal-user-item:hover {
          background: var(--bg-secondary);
        }
        .modal-user-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(var(--primary-rgb), 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary-color);
          font-weight: 700;
          font-size: 13px;
        }
        .modal-user-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }
        .modal-user-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-color);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .modal-user-details {
          font-size: 11px;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .new-chat-trigger-container {
          padding: 12px 16px;
          border-top: 1px solid var(--border-color);
          background: var(--bg-sidebar);
        }
        .new-chat-trigger-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%);
          color: #ffffff;
          border: none;
          border-radius: 10px;
          padding: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .new-chat-trigger-btn:hover {
          opacity: 0.9;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* Left Sidebar */}
      <div className="feedback-sidebar">
        <div className="sidebar-header">
          <h2>
            <MessageSquare size={20} />
            <span>Панель обращений</span>
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
          
          <div className="tabs-container">
             <button className={`tab-btn ${activeTab === "support" ? "active" : ""}`} onClick={() => setActiveTab("support")}>
               Обращения
             </button>
             <button className={`tab-btn ${activeTab === "direct" ? "active" : ""}`} onClick={() => setActiveTab("direct")}>
               Личные сообщения
             </button>
          </div>
        </div>

        {/* Threads list */}
        <div className="threads-list">
          {loadingThreads ? (
            <div style={{ padding: "40px 0" }}><Spinner size="medium" label="Загрузка чатов..." /></div>
          ) : displayThreads.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: "20px", fontSize: "13px" }}>
              Нет активных диалогов.
            </div>
          ) : (
            displayThreads.map((thread) => {
              const isActive = activeChatType === thread.chatType && activeThreadId === thread.id;
              const initials = thread.name ? thread.name.substring(0, 2).toUpperCase() : "?";

              return (
                <div
                  key={`${thread.chatType}-${thread.id}`}
                  className={`thread-item ${isActive ? "active" : ""}`}
                  onClick={() => handleSelectThread(thread)}
                >
                  <div className="thread-avatar">
                    {thread.isSupportTicket ? <Shield size={18} /> : initials}
                  </div>
                  <div className="thread-info">
                    <div className="thread-meta">
                      <span className="thread-name">{thread.name}</span>
                      <span className="thread-time">{formatTime(thread.last_message_at)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="thread-msg">{thread.message || "Вложение/Диалог начат"}</span>
                      {thread.unread_count > 0 && <span className="unread-badge">{thread.unread_count}</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* New Chat Button at the bottom of the sidebar */}
        <div className="new-chat-trigger-container">
          <button className="new-chat-trigger-btn" onClick={() => {
            setUserSearchQuery("");
            setShowNewChatModal(true);
          }}>
            <UserPlus size={18} />
            <span>Начать новый чат</span>
          </button>
        </div>
      </div>

      {/* Right Chat Pane */}
      <div className="feedback-chat">
        {activeThreadId ? (
          <>
            <div className="chat-header">
              <div style={{display: "flex", alignItems: "center", gap: "8px"}}>
                <button className="btn-back-list" onClick={() => setMobileShowChat(false)}><ArrowLeft size={20} /></button>
                <div className="chat-title-info">
                  <h3>{activeThreadName}</h3>
                  <span><Shield size={12} /> {activeChatType === "support" ? "Обращение об ошибке" : "Личное сообщение"}</span>
                </div>
              </div>
            </div>

            <div className="chat-instructions-banner">
              <Info size={16} />
              <span>
                {activeChatType === "support" 
                  ? "Это обращение от пользователя об ошибке в системе. Вы можете прочитать детали и отправить ответ."
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
                  <div className="chat-empty-state"><MessageSquare size={48} /><h3>Обращение пусто</h3></div>
                ) : (
                  messages.map((msg) => {
                    // Operator outgoing is msg.is_operator for support, but for direct it's current user
                    const isOutgoing = activeChatType === "support" ? msg.is_operator : msg.user_id === currentUserId;

                    return (
                      <div key={msg.id} className={`msg-bubble-wrapper ${isOutgoing ? "outgoing" : "incoming"}`}>
                        {!isOutgoing && activeChatType === "support" && (
                          <span className="msg-sender">{msg.username}</span>
                        )}
                        <div className="msg-bubble">
                          {msg.message && <div style={{ whiteSpace: "pre-wrap" }}>{msg.message}</div>}
                          {msg.attachment_url && (
                            <div className="msg-attachment">
                              {msg.attachment_url.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                                <img src={`${API_URL}${msg.attachment_url}`} alt="attachment" />
                              ) : (
                                <a href={`${API_URL}${msg.attachment_url}`} target="_blank" rel="noreferrer" style={{color: "inherit", textDecoration: "underline"}}>Скачать файл</a>
                              )}
                            </div>
                          )}
                          <div className="msg-meta">
                            <Clock size={10} style={{ marginRight: 2 }} />
                            <span>{formatTime(msg.created_at)}</span>
                            {isOutgoing && (
                              <span style={{ marginLeft: 4 }}>
                                {msg.is_read ? <CheckCheck size={14} color="#4ade80" /> : <Check size={14} opacity={0.7} />}
                              </span>
                            )}
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
              {file && (
                <div className="file-preview">
                  <Paperclip size={14} /> Выбран файл: {file.name}
                  <button onClick={() => setFile(null)} style={{background:"none", border:"none", color:"red", cursor:"pointer"}}>x</button>
                </div>
              )}
              {showEmojiPicker && (
                <div className="emoji-picker-container">
                  <EmojiPicker onEmojiClick={(e) => setNewMessage(prev => prev + e.emoji)} theme={theme} />
                </div>
              )}
              <form onSubmit={handleSendMessage} className="chat-input-form">
                <button type="button" className="icon-btn" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                  <Smile size={22} />
                </button>
                <label className="icon-btn">
                  <Paperclip size={22} />
                  <input type="file" style={{ display: "none" }} onChange={(e) => setFile(e.target.files[0])} />
                </label>
                <input
                  type="text"
                  placeholder="Напишите ответ..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={sending}
                />
                <button type="submit" className="chat-send-btn" disabled={sending || (!newMessage.trim() && !file)}>
                  <Send size={18} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="chat-empty-state">
            <MessageSquare size={64} />
            <h3>Панель оператора обратной связи</h3>
            <p>Выберите обращение из списка слева, чтобы прочитать детали и ответить пользователю.</p>
          </div>
        )}
      </div>

      {showNewChatModal && (
        <div className="modal-overlay" onClick={() => setShowNewChatModal(false)}>
          <div className="new-chat-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Начать новый чат</h3>
              <button className="modal-close-btn" onClick={() => setShowNewChatModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-search-area">
              <div className="search-wrapper">
                <Search size={14} />
                <input
                  type="text"
                  placeholder="Поиск по email, имени, фамилии..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-users-list">
              {filteredUsers.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: "20px", fontSize: "13px" }}>
                  Пользователи не найдены.
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const initials = u.full_name 
                    ? u.full_name.substring(0, 2).toUpperCase() 
                    : u.username ? u.username.substring(0, 2).toUpperCase() : "?";
                  
                  const details = [
                    u.email,
                    u.first_name || u.last_name ? `${u.first_name || ""} ${u.last_name || ""}`.trim() : null
                  ].filter(Boolean).join(" • ") || `@${u.username}`;

                  return (
                    <button key={u.id} className="modal-user-item" onClick={() => handleStartDirectChat(u)}>
                      <div className="modal-user-avatar">{initials}</div>
                      <div className="modal-user-info">
                        <span className="modal-user-name">{u.full_name || u.username}</span>
                        <span className="modal-user-details">{details}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
