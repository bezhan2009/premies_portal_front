import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence, useDragControls, Reorder } from "framer-motion";
import { ResizableBox } from "react-resizable";
import { 
  X, Send, Paperclip, Smile, Check, CheckCheck, 
  Minus, ArrowLeft, Search, User, Shield, PlusCircle,
  Mic, Trash2, CornerUpLeft, Edit3, Pin, Bell, BellOff, ArrowUp, ArrowDown,
  CheckSquare, CheckCircle2, CornerUpRight
} from "lucide-react";
import axios from "axios";
import EmojiPicker from "emoji-picker-react";
import useThemeStore from "../../store/useThemeStore";
import useChatStore from "../../store/useChatStore";
import ImageModal from "../modal/ImageModal";
import PasteFileModal from "../modal/PasteFileModal";
import { useLocation } from "react-router-dom";
import filePng from "../../assets/file.png";
import "react-resizable/css/styles.css";

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:7575";

const POPULAR_EMOJIS = ["👍", "❤️", "🔥", "😂", "😮", "😢", "🙏", "🎉", "👏"];

// Custom font family stack with emoji support
const EMOJI_FONT_STACK = "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'";

const formatMessageText = (text) => {
  if (!text) return "";
  let escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  // 1. Links
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  escaped = escaped.replace(urlRegex, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline; word-break: break-all;">${url}</a>`;
  });

  // 2. Emojis
  const emojiRegex = /\p{Extended_Pictographic}(?:[\u{1F3FB}-\u{1F3FF}\uFE0F]|\u200d\p{Extended_Pictographic})*/gu;
  escaped = escaped.replace(emojiRegex, (emoji) => {
    const codePoints = [];
    for (const char of emoji) {
      codePoints.push(char.codePointAt(0).toString(16).padStart(4, "0"));
    }
    const hex = codePoints.join("-");
    const src = `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.0.1/img/apple/64/${hex}.png`;
    return `<img src="${src}" alt="${emoji}" style="width: 20px; height: 20px; vertical-align: middle; margin: 0 1px; display: inline-block;" onerror="this.style.display='none'; this.after('${emoji}');" />`;
  });

  return escaped;
};

const parseMessageReactions = (reactionsStr) => {
  try {
    if (!reactionsStr) return {};
    return JSON.parse(reactionsStr);
  } catch {
    return {};
  }
};

const getReactionGroups = (reactionsStr, currentUserId) => {
  const reactions = parseMessageReactions(reactionsStr);
  const groups = {};
  Object.entries(reactions).forEach(([userId, emoji]) => {
    if (!groups[emoji]) groups[emoji] = [];
    groups[emoji].push(Number(userId));
  });
  return Object.entries(groups).map(([emoji, userIds]) => ({
    emoji,
    userIds,
    count: userIds.length,
    hasMyReaction: userIds.map(Number).includes(Number(currentUserId))
  }));
};

// Custom Audio Player component for voice messages
const AudioPlayer = ({ src, isOut }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play().catch(err => console.error("Audio play error:", err));
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
    setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100 || 0);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration || 0);
  };

  const formatDuration = (secs) => {
    if (isNaN(secs)) return "00:00";
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = Math.floor(secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: "8px 12px",
      background: isOut ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.05)",
      borderRadius: "12px",
      marginTop: "4px",
      minWidth: "200px",
      color: isOut ? "white" : "var(--text-color, #1e293b)"
    }}>
      <audio 
        ref={audioRef} 
        src={src} 
        onTimeUpdate={handleTimeUpdate} 
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />
      <button 
        type="button"
        onClick={togglePlay}
        style={{
          background: isOut ? "white" : "#eb2525",
          color: isOut ? "#eb2525" : "white",
          border: "none",
          width: "28px",
          height: "28px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer"
        }}
      >
        {isPlaying ? (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="4" height="16"/><rect x="16" y="4" width="4" height="16"/></svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        )}
      </button>
      <div style={{ flex: 1 }}>
        <div 
          style={{
            height: "4px",
            background: isOut ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.1)",
            borderRadius: "2px",
            position: "relative",
            cursor: "pointer",
            marginTop: "6px"
          }} 
          onClick={(e) => {
            if (!audioRef.current || !audioRef.current.duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const pct = clickX / rect.width;
            audioRef.current.currentTime = pct * audioRef.current.duration;
          }}
        >
          <div style={{
            width: `${progress}%`,
            height: "100%",
            background: isOut ? "white" : "#eb2525",
            borderRadius: "2px"
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", marginTop: "4px", opacity: 0.8 }}>
          <span>{formatDuration(currentTime)}</span>
          <span>{formatDuration(duration)}</span>
        </div>
      </div>
    </div>
  );
};

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
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pastedFile, setPastedFile] = useState(null);
  
  // Advanced Features: Context Menu
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, target: null, type: "" }); // type: "message" | "thread"
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  
  // Advanced Features: Replies & Editing
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);

  // Advanced Features: Selection & Forwarding
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [isMessageSelectionMode, setIsMessageSelectionMode] = useState(false);
  const [selectedChatIds, setSelectedChatIds] = useState([]);
  const [isChatSelectionMode, setIsChatSelectionMode] = useState(false);
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [forwardSearchQuery, setForwardSearchQuery] = useState("");

  // Advanced Features: Voice Audio Messages
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);

  // Advanced Features: Pinned & Muted Chats
  const [pinnedChats, setPinnedChats] = useState([]);
  const [mutedChats, setMutedChats] = useState([]);

  // Advanced Features: Active Chat Search
  const [localSearchActive, setLocalSearchActive] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const adjustTextareaHeight = (element) => {
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 120)}px`;
  };

  useEffect(() => {
    if (textareaRef.current) {
      adjustTextareaHeight(textareaRef.current);
    }
  }, [newMessage]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const token = localStorage.getItem("access_token");

  // Load pinned and muted chats
  useEffect(() => {
    try {
      const savedPinned = JSON.parse(localStorage.getItem("pinned_chats") || "[]");
      const savedMuted = JSON.parse(localStorage.getItem("muted_chats") || "[]");
      setPinnedChats(savedPinned);
      setMutedChats(savedMuted);
    } catch (e) {
      console.error(e);
    }
  }, []);

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

  // Set default tab
  useEffect(() => {
    setActiveTab("support");
  }, [isOperator]);

  // Close context menu on window click
  useEffect(() => {
    const closeMenu = (e) => {
      // Only close if the click is NOT inside the context menu itself
      setContextMenu(prev => {
        if (!prev.visible) return prev;
        return { visible: false, x: 0, y: 0, target: null, type: "" };
      });
      setShowReactionPicker(false);
    };
    window.addEventListener("mousedown", closeMenu);
    return () => window.removeEventListener("mousedown", closeMenu);
  }, []);

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
      console.error("Error fetching threads:", err);
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
      console.error("Error fetching messages:", err);
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

  // Scroll to bottom
  useEffect(() => {
    if (currentView === "chat" && !localSearchActive) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, currentView, localSearchActive]);

  // Fetch users list for new chat
  const fetchUsers = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_URL}/users/emails`, { headers: { Authorization: `Bearer ${token}` } });
      setUsersList(res.data.users || []);
    } catch (err) {
      console.error("Error fetching users:", err);
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

    // Edit message route
    if (editingMessage) {
      try {
        await axios.put(`${API_URL}/api/feedback/${editingMessage.id}`, {
          message: newMessage.trim()
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setEditingMessage(null);
        setNewMessage("");
        fetchMessages();
      } catch (err) {
        console.error("Error updating message:", err);
      } finally {
        setSending(false);
        if (textareaRef.current) {
          textareaRef.current.style.height = "36px";
        }
      }
      return;
    }

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
          recipient_id: recipientId,
          reply_to_id: replyingTo ? replyingTo.id : null
        };
      } else {
        if (isOperator) {
          payload = {
            message: newMessage.trim(),
            attachment_url: attachmentUrl,
            user_id: recipientId,
            reply_to_id: replyingTo ? replyingTo.id : null
          };
        } else {
          payload = {
            message: newMessage.trim(),
            attachment_url: attachmentUrl,
            recipient_id: 0,
            reply_to_id: replyingTo ? replyingTo.id : null
          };
        }
      }

      await axios.post(`${API_URL}/api/feedback`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNewMessage("");
      setFile(null);
      setReplyingTo(null);
      setShowEmojiPicker(false);
      fetchMessages();
      fetchThreadsData();
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSending(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = "36px";
      }
    }
  };

  const handlePaste = (e) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      e.preventDefault();
      setPastedFile(e.clipboardData.files[0]);
      setPasteModalOpen(true);
    }
  };

  const handleSendPastedFile = async (readyFile, fileMessage) => {
    setPasteModalOpen(false);
    if (!readyFile) return;
    setSending(true);
    try {
      const formData = new FormData();
      formData.append("file", readyFile);
      const uploadRes = await axios.post(`${API_URL}/api/feedback/upload`, formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
      });
      const attachmentUrl = uploadRes.data.url;

      let payload = {};
      const msgText = fileMessage.trim();
      if (chatType === "direct") {
        payload = { message: msgText, attachment_url: attachmentUrl, recipient_id: recipientId, reply_to_id: replyingTo ? replyingTo.id : null };
      } else {
        if (isOperator) {
          payload = { message: msgText, attachment_url: attachmentUrl, user_id: recipientId, reply_to_id: replyingTo ? replyingTo.id : null };
        } else {
          payload = { message: msgText, attachment_url: attachmentUrl, recipient_id: 0, reply_to_id: replyingTo ? replyingTo.id : null };
        }
      }

      await axios.post(`${API_URL}/api/feedback`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setReplyingTo(null);
      fetchMessages();
      fetchThreadsData();
    } catch (err) {
      console.error("Error sending file:", err);
    } finally {
      setSending(false);
      setPastedFile(null);
    }
  };

  const handleDeleteMessage = async (msgId) => {
    try {
      await axios.delete(`${API_URL}/api/feedback/${msgId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchMessages();
      fetchThreadsData();
    } catch (err) {
      console.error("Error deleting message:", err);
    }
  };

  const handleReact = async (msgId, emoji) => {
    try {
      const msg = messages.find(m => m.id === msgId);
      if (!msg) return;

      const parsed = parseMessageReactions(msg.reactions);
      const currentReaction = parsed[currentUserId];

      let newEmoji = emoji;
      if (currentReaction === emoji) {
        newEmoji = "";
      }

      const res = await axios.post(`${API_URL}/api/feedback/${msgId}/react`, { emoji: newEmoji }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reactions: res.data.reactions } : m));
    } catch (err) {
      console.error("Error setting reaction:", err);
    }
  };

  const handleGlobalRipple = (e) => {
    let target = e.target;
    let button = null;
    while (target && target !== e.currentTarget) {
      if (
        target.tagName === "BUTTON" || 
        target.classList.contains("ripple-btn") || 
        target.classList.contains("thread-item") ||
        target.classList.contains("modal-user-item") ||
        target.classList.contains("mini-chat-thread-card")
      ) {
        button = target;
        break;
      }
      target = target.parentElement;
    }
    if (!button) {
      target = e.target;
      while (target && target !== e.currentTarget) {
        const style = window.getComputedStyle(target);
        if (style.cursor === "pointer" || style.cursor === "grab") {
          button = target;
          break;
        }
        target = target.parentElement;
      }
    }

    if (!button) return;

    if (window.getComputedStyle(button).position === "static") {
      button.style.position = "relative";
    }
    button.style.overflow = "hidden";

    const circle = document.createElement("span");
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;

    circle.style.width = circle.style.height = `${diameter}px`;
    const rect = button.getBoundingClientRect();
    circle.style.left = `${e.clientX - rect.left - radius}px`;
    circle.style.top = `${e.clientY - rect.top - radius}px`;

    const isDarkBg = button.classList.contains("primary") || 
                     button.style.background === "#eb2525" || 
                     button.style.backgroundColor === "rgb(235, 37, 37)" ||
                     button.getAttribute("style")?.includes("#eb2525");
    circle.style.background = isDarkBg ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.15)";
    circle.style.position = "absolute";
    circle.style.borderRadius = "50%";
    circle.style.transform = "scale(0)";
    circle.style.pointerEvents = "none";

    circle.animate(
      [
        { transform: "scale(0)", opacity: 1 },
        { transform: "scale(4)", opacity: 0 }
      ],
      {
        duration: 500,
        easing: "ease-out"
      }
    );

    button.appendChild(circle);
    setTimeout(() => {
      circle.remove();
    }, 500);
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  const handleSelectMessage = (msgId) => {
    setSelectedMessageIds(prev => {
      const isSelected = prev.includes(msgId);
      const updated = isSelected ? prev.filter(id => id !== msgId) : [...prev, msgId];
      if (updated.length === 0) {
        setIsMessageSelectionMode(false);
      }
      return updated;
    });
  };

  const handleExitMessageSelection = () => {
    setIsMessageSelectionMode(false);
    setSelectedMessageIds([]);
  };

  const handleSelectChat = (chatId) => {
    setSelectedChatIds(prev => {
      const isSelected = prev.includes(chatId);
      const updated = isSelected ? prev.filter(id => id !== chatId) : [...prev, chatId];
      if (updated.length === 0) {
        setIsChatSelectionMode(false);
      }
      return updated;
    });
  };

  const handleExitChatSelection = () => {
    setIsChatSelectionMode(false);
    setSelectedChatIds([]);
  };

  const forwardThreadsList = useMemo(() => {
    const list = [];
    if (!isOperator) {
      list.push({ id: 0, name: "Служба поддержки", chatType: "support" });
    } else {
      supportThreads.forEach(t => {
        list.push({ id: t.user_id, name: t.username || "Служба поддержки", chatType: "support" });
      });
    }
    directThreads.forEach(t => {
      list.push({ id: t.user_id, name: t.username || "Пользователь", chatType: "direct" });
    });
    return list;
  }, [supportThreads, directThreads, isOperator]);

  const handleForwardMessages = async (targetThread) => {
    if (!token) return;
    const sortedIds = [...selectedMessageIds].sort((a, b) => a - b);
    setSending(true);
    try {
      for (const msgId of sortedIds) {
        const msg = messages.find(m => m.id === msgId);
        if (!msg) continue;
        
        let senderName = msg.username || (msg.is_operator ? "Оператор" : "Пользователь");
        let forwardPrefix = `Переслано от ${senderName}:\n`;
        let textToSend = msg.message ? `${forwardPrefix}${msg.message}` : `${forwardPrefix.trim()}`;
        
        let payload = {};
        if (targetThread.chatType === "direct") {
          payload = {
            message: textToSend,
            attachment_url: msg.attachment_url || "",
            recipient_id: targetThread.id,
            reply_to_id: null
          };
        } else {
          payload = {
            message: textToSend,
            attachment_url: msg.attachment_url || "",
            recipient_id: 0,
            user_id: isOperator ? targetThread.id : undefined,
            reply_to_id: null
          };
        }
        
        await axios.post(`${API_URL}/api/feedback`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setIsMessageSelectionMode(false);
      setSelectedMessageIds([]);
      setForwardModalOpen(false);
      
      // Navigate to target thread
      setChatType(targetThread.chatType);
      setRecipientId(targetThread.id);
      setActiveThreadName(targetThread.name);
      setCurrentView("chat");
      fetchMessages();
    } catch (err) {
      console.error("Error forwarding messages:", err);
    } finally {
      setSending(false);
    }
  };

  const handleBulkDeleteMessages = async () => {
    if (!window.confirm(`Вы уверены, что хотите удалить ${selectedMessageIds.length} сообщений?`)) return;
    setSending(true);
    try {
      for (const msgId of selectedMessageIds) {
        await axios.delete(`${API_URL}/api/feedback/${msgId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setIsMessageSelectionMode(false);
      setSelectedMessageIds([]);
      fetchMessages();
      fetchThreadsData();
    } catch (err) {
      console.error("Error bulk deleting messages:", err);
    } finally {
      setSending(false);
    }
  };

  const handleBulkMuteChats = () => {
    setMutedChats(prev => {
      const allSelectedMuted = selectedChatIds.every(id => prev.includes(id));
      let updated;
      if (allSelectedMuted) {
        updated = prev.filter(id => !selectedChatIds.includes(id));
      } else {
        const uniqueSelected = selectedChatIds.filter(id => !prev.includes(id));
        updated = [...prev, ...uniqueSelected];
      }
      localStorage.setItem("muted_chats", JSON.stringify(updated));
      return updated;
    });
    setIsChatSelectionMode(false);
    setSelectedChatIds([]);
  };

  const handleBulkDeleteChats = async () => {
    if (!window.confirm(`Вы уверены, что хотите удалить ${selectedChatIds.length} выбранных чатов?`)) return;
    setSending(true);
    try {
      for (const threadId of selectedChatIds) {
        let url = `${API_URL}/api/feedback/chat`;
        if (activeTab === "direct") {
          url += `?chatWith=${threadId}`;
        } else {
          url += `?userId=${threadId}`;
        }
        await axios.delete(url, { headers: { Authorization: `Bearer ${token}` } });
        
        if (recipientId === threadId) {
          setRecipientId(0);
          setMessages([]);
        }
      }
      setIsChatSelectionMode(false);
      setSelectedChatIds([]);
      fetchThreadsData();
    } catch (err) {
      console.error("Error bulk deleting chats:", err);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteChat = async (threadId) => {
    if (!window.confirm("Вы уверены, что хотите удалить весь чат?")) return;
    try {
      let url = `${API_URL}/api/feedback/chat`;
      if (chatType === "direct") {
        url += `?chatWith=${threadId}`;
      } else {
        url += `?userId=${threadId}`;
      }
      await axios.delete(url, { headers: { Authorization: `Bearer ${token}` } });
      
      if (recipientId === threadId) {
        setRecipientId(0);
        setMessages([]);
      }
      fetchThreadsData();
    } catch (err) {
      console.error("Error deleting chat:", err);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // context menus triggers
  const triggerContextMenu = (e, item, type) => {
    e.preventDefault();
    e.stopPropagation();
    const menuWidth = 270;
    const menuHeight = type === "message" ? 320 : 200;
    let x = e.clientX;
    let y = e.clientY;
    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10;
    if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 10;
    setContextMenu({ visible: true, x, y, target: item, type });
  };

  // Pin & Mute managers
  const handleTogglePin = (threadId) => {
    setPinnedChats(prev => {
      const updated = prev.includes(threadId) ? prev.filter(id => id !== threadId) : [...prev, threadId];
      localStorage.setItem("pinned_chats", JSON.stringify(updated));
      return updated;
    });
  };

  const movePinnedChat = (threadId, direction) => {
    const id = Number(threadId);
    setPinnedChats(prev => {
      const idx = prev.findIndex(x => Number(x) === id);
      if (idx === -1) return prev;
      const updated = [...prev];
      if (direction === "up" && idx > 0) {
        [updated[idx], updated[idx - 1]] = [updated[idx - 1], updated[idx]];
      } else if (direction === "down" && idx < updated.length - 1) {
        [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
      }
      localStorage.setItem("pinned_chats", JSON.stringify(updated));
      return updated;
    });
  };

  const handleToggleMute = (threadId) => {
    setMutedChats(prev => {
      const updated = prev.includes(threadId) ? prev.filter(id => id !== threadId) : [...prev, threadId];
      localStorage.setItem("muted_chats", JSON.stringify(updated));
      return updated;
    });
  };

  // Scroll to reply message and flash
  const scrollToMessage = (id) => {
    const el = document.getElementById(`msg-bubble-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const origBg = el.style.background;
      const origBorder = el.style.border;
      el.style.background = "rgba(235, 37, 37, 0.25)";
      el.style.border = "1px solid #eb2525";
      setTimeout(() => {
        el.style.background = origBg;
        el.style.border = origBorder;
      }, 1000);
    }
  };

  // Voice recording routines
  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Запись аудио доступна только в безопасном контексте (HTTPS или localhost).");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: "audio/webm" });
        
        const formData = new FormData();
        formData.append("file", audioFile);
        
        setSending(true);
        try {
          const uploadRes = await axios.post(`${API_URL}/api/feedback/upload`, formData, {
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
          });
          const attachmentUrl = uploadRes.data.url;

          let payload = {};
          if (chatType === "direct") {
            payload = {
              message: "[Голосовое сообщение]",
              attachment_url: attachmentUrl,
              recipient_id: recipientId,
              reply_to_id: replyingTo ? replyingTo.id : null
            };
          } else {
            if (isOperator) {
              payload = {
                message: "[Голосовое сообщение]",
                attachment_url: attachmentUrl,
                user_id: recipientId,
                reply_to_id: replyingTo ? replyingTo.id : null
              };
            } else {
              payload = {
                message: "[Голосовое сообщение]",
                attachment_url: attachmentUrl,
                recipient_id: 0,
                reply_to_id: replyingTo ? replyingTo.id : null
              };
            }
          }

          await axios.post(`${API_URL}/api/feedback`, payload, {
            headers: { Authorization: `Bearer ${token}` }
          });

          setReplyingTo(null);
          fetchMessages();
          fetchThreadsData();
        } catch (err) {
          console.error("Error sending voice message:", err);
        } finally {
          setSending(false);
        }

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Voice media error:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = () => {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
    }
  };

  // Filter threads and sort pinned to top
  const sortedThreads = useMemo(() => {
    const query = threadSearch.toLowerCase().trim();
    let source = [];
    if (activeTab === "support") {
      source = isOperator ? supportThreads : [];
    } else {
      source = directThreads;
    }
    
    const filtered = source.filter(t => t.username?.toLowerCase().includes(query));
    
    // Sort: pinned first, then by date desc
    return [...filtered].sort((a, b) => {
      const keyA = Number(isOperator && activeTab === "support" ? a.user_id : a.user_id);
      const keyB = Number(isOperator && activeTab === "support" ? b.user_id : b.user_id);
      const isPinnedA = pinnedChats.map(Number).includes(keyA);
      const isPinnedB = pinnedChats.map(Number).includes(keyB);
      
      if (isPinnedA && isPinnedB) {
        return pinnedChats.map(Number).indexOf(keyA) - pinnedChats.map(Number).indexOf(keyB);
      }
      if (isPinnedA && !isPinnedB) return -1;
      if (!isPinnedA && isPinnedB) return 1;
      return new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime();
    });
  }, [activeTab, supportThreads, directThreads, threadSearch, isOperator, pinnedChats]);

  const pinnedThreads = useMemo(() => {
    return sortedThreads.filter(t => pinnedChats.map(Number).includes(Number(t.user_id)));
  }, [sortedThreads, pinnedChats]);

  const unpinnedThreads = useMemo(() => {
    return sortedThreads.filter(t => !pinnedChats.map(Number).includes(Number(t.user_id)));
  }, [sortedThreads, pinnedChats]);

  const handleReorderPinned = (newOrder) => {
    const normalized = newOrder.map(Number);
    setPinnedChats(normalized);
    localStorage.setItem("pinned_chats", JSON.stringify(normalized));
  };

  // Filter messages based on local query search
  const filteredMessages = useMemo(() => {
    if (!localSearchActive || !localSearchQuery.trim()) return messages;
    const query = localSearchQuery.toLowerCase().trim();
    return messages.filter(m => m.message?.toLowerCase().includes(query));
  }, [messages, localSearchActive, localSearchQuery]);

  // Filter users list
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

  const isExcludedPath = 
    location.pathname.includes("/feedback") ||
    location.pathname.includes("/operator/feedback") ||
    location.pathname.includes("/submit-feedback");

  if (isExcludedPath || !isMiniChatOpen) {
    return null;
  }

  const isSendActive = newMessage.trim() !== "" || file !== null;

  return (
    <>
      <ImageModal 
        isOpen={!!selectedImage} 
        imageUrl={selectedImage} 
        onClose={() => setSelectedImage(null)} 
      />
      <PasteFileModal
        isOpen={pasteModalOpen}
        file={pastedFile}
        onClose={() => { setPasteModalOpen(false); setPastedFile(null); }}
        onSend={handleSendPastedFile}
      />

      {/* FLOAT CONTEXT MENU */}
      {contextMenu.visible && (
        <div 
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
            zIndex: 100005,
            background: "rgba(255, 255, 255, 0.85)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(226, 232, 240, 0.8)",
            borderRadius: "12px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            padding: "6px",
            minWidth: "260px",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            fontFamily: EMOJI_FONT_STACK
          }}
        >
          {contextMenu.type === "message" && (
            <>
              {/* Popular emojis reactions bar */}
              <div style={{
                display: "flex",
                gap: "6px",
                padding: "6px 8px",
                borderBottom: "1px solid rgba(226, 232, 240, 0.8)",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                background: "rgba(248, 250, 252, 0.5)",
                borderRadius: "8px 8px 0 0"
              }}>
                {POPULAR_EMOJIS.map(emoji => {
                  const parsedReactions = parseMessageReactions(contextMenu.target.reactions);
                  const isSelected = parsedReactions[currentUserId] === emoji;
                  return (
                    <button
                      key={emoji}
                      onClick={() => {
                        handleReact(contextMenu.target.id, emoji);
                        setContextMenu({ ...contextMenu, visible: false });
                      }}
                      style={{
                        background: isSelected ? "rgba(235, 37, 37, 0.15)" : "transparent",
                        border: "none",
                        borderRadius: "6px",
                        padding: "0",
                        width: "24px",
                        height: "24px",
                        flexShrink: 0,
                        cursor: "pointer",
                        transition: "transform 0.1s",
                        outline: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.35)"}
                      onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                    >
                      <img 
                        src={`https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.0.1/img/apple/64/${Array.from(emoji).map(c => c.codePointAt(0).toString(16).padStart(4, "0")).join("-")}.png`} 
                        alt={emoji} 
                        style={{ width: "20px", height: "20px", display: "block" }}
                        onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.outerHTML = emoji; }}
                      />
                    </button>
                  );
                })}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowReactionPicker(!showReactionPicker);
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    borderRadius: "6px",
                    width: "24px",
                    height: "24px",
                    flexShrink: 0,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#64748b"
                  }}
                >
                  <PlusCircle size={18} />
                </button>
              </div>

              {showReactionPicker ? (
                <div style={{ padding: "4px" }}>
                  <EmojiPicker 
                    onEmojiClick={(emojiObj) => {
                      handleReact(contextMenu.target.id, emojiObj.emoji);
                      setContextMenu({ ...contextMenu, visible: false });
                      setShowReactionPicker(false);
                    }} 
                    theme={theme}
                    emojiStyle="apple"
                    width={250}
                    height={280}
                  />
                </div>
              ) : (
                <>
                  <button 
                    onClick={() => {
                      setReplyingTo(contextMenu.target);
                      setEditingMessage(null);
                      setContextMenu({ ...contextMenu, visible: false });
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 10px",
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "#1e293b",
                      background: "transparent",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      textAlign: "left"
                    }}
                  >
                    <CornerUpLeft size={14} /> Ответить
                  </button>
                  <button 
                    onClick={() => {
                      handleCopy(contextMenu.target.message);
                      setContextMenu({ ...contextMenu, visible: false });
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 10px",
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "#1e293b",
                      background: "transparent",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      textAlign: "left"
                    }}
                  >
                    <Check size={14} /> Копировать
                  </button>
                  <button 
                    onClick={() => {
                      setIsMessageSelectionMode(true);
                      setSelectedMessageIds([contextMenu.target.id]);
                      setContextMenu({ ...contextMenu, visible: false });
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 10px",
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "#1e293b",
                      background: "transparent",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      textAlign: "left"
                    }}
                  >
                    <CheckSquare size={14} /> Выбрать
                  </button>
                  <button 
                    onClick={() => {
                      setIsMessageSelectionMode(true);
                      setSelectedMessageIds([contextMenu.target.id]);
                      setForwardModalOpen(true);
                      setContextMenu({ ...contextMenu, visible: false });
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 10px",
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "#3b82f6",
                      background: "transparent",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      textAlign: "left"
                    }}
                  >
                    <CornerUpRight size={14} /> Переслать
                  </button>
                  {((chatType === "direct" && contextMenu.target.user_id === currentUserId) ||
                    (chatType === "support" && (isOperator ? contextMenu.target.is_operator : (!contextMenu.target.is_operator && contextMenu.target.user_id === currentUserId)))) && (
                    <>
                      <button 
                        onClick={() => {
                          setEditingMessage(contextMenu.target);
                          setNewMessage(contextMenu.target.message || "");
                          setReplyingTo(null);
                          setContextMenu({ ...contextMenu, visible: false });
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "8px 10px",
                          fontSize: "13px",
                          fontWeight: 500,
                          color: "#1e293b",
                          background: "transparent",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          textAlign: "left"
                        }}
                      >
                        <Edit3 size={14} /> Редактировать
                      </button>
                      <button 
                        onClick={() => {
                          handleDeleteMessage(contextMenu.target.id);
                          setContextMenu({ ...contextMenu, visible: false });
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "8px 10px",
                          fontSize: "13px",
                          fontWeight: 500,
                          color: "#ef4444",
                          background: "transparent",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          textAlign: "left"
                        }}
                      >
                        <Trash2 size={14} /> Удалить
                      </button>
                    </>
                  )}
                </>
              )}
            </>
          )}
          {contextMenu.type === "chatArea" && (
            <button 
              onClick={() => {
                setIsMessageSelectionMode(true);
                setContextMenu({ ...contextMenu, visible: false });
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 10px",
                fontSize: "13px",
                fontWeight: 500,
                color: "#1e293b",
                background: "transparent",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                textAlign: "left"
              }}
            >
              <CheckSquare size={14} /> Выбрать
            </button>
          )}
          {contextMenu.type === "thread" && (
            <>
              <button 
                onClick={() => {
                  setIsChatSelectionMode(true);
                  setSelectedChatIds([contextMenu.target.user_id]);
                  setContextMenu({ ...contextMenu, visible: false });
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 10px",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#1e293b",
                  background: "transparent",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  textAlign: "left"
                }}
              >
                <CheckSquare size={14} /> Выбрать
              </button>
              <button 
                onClick={() => {
                  handleTogglePin(contextMenu.target.user_id);
                  setContextMenu({ ...contextMenu, visible: false });
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 10px",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#1e293b",
                  background: "transparent",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  textAlign: "left"
                }}
              >
                <Pin size={14} /> {pinnedChats.map(Number).includes(Number(contextMenu.target.user_id)) ? "Открепить" : "Закрепить"}
              </button>
              {pinnedChats.map(Number).includes(Number(contextMenu.target.user_id)) && (
                <>
                  <button 
                    onClick={() => { movePinnedChat(contextMenu.target.user_id, "up"); setContextMenu({ ...contextMenu, visible: false }); }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 10px",
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "#1e293b",
                      background: "transparent",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      textAlign: "left"
                    }}
                  >
                    <ArrowUp size={14} /> Переместить выше
                  </button>
                  <button 
                    onClick={() => { movePinnedChat(contextMenu.target.user_id, "down"); setContextMenu({ ...contextMenu, visible: false }); }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 10px",
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "#1e293b",
                      background: "transparent",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      textAlign: "left"
                    }}
                  >
                    <ArrowDown size={14} /> Переместить ниже
                  </button>
                </>
              )}
              <button 
                onClick={() => {
                  handleToggleMute(contextMenu.target.user_id);
                  setContextMenu({ ...contextMenu, visible: false });
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 10px",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#1e293b",
                  background: "transparent",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  textAlign: "left"
                }}
              >
                {mutedChats.map(Number).includes(Number(contextMenu.target.user_id)) ? <Bell size={14} /> : <BellOff size={14} />} 
                {mutedChats.map(Number).includes(Number(contextMenu.target.user_id)) ? "Включить звук" : "Без звука"}
              </button>
              <button 
                onClick={() => {
                  handleDeleteChat(contextMenu.target.user_id);
                  setContextMenu({ ...contextMenu, visible: false });
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 10px",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#ef4444",
                  background: "transparent",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  textAlign: "left"
                }}
              >
                <Trash2 size={14} /> Удалить чат
              </button>
            </>
          )}
        </div>
      )}

      <AnimatePresence>
        <motion.div
          onMouseDown={handleGlobalRipple}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: "spring", damping: 30, stiffness: 350 }}
          style={{
            position: "fixed",
            bottom: "80px",
            right: "20px",
            zIndex: 9999,
            fontFamily: EMOJI_FONT_STACK
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
              width: `${dimensions.width}px`,
              height: `${dimensions.height}px`,
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
                      onClick={() => {
                        setCurrentView("threads");
                        setLocalSearchActive(false);
                        setLocalSearchQuery("");
                      }}
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
                  {/* Chat Toggles */}
                  {currentView === "chat" && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {/* Search Toggle */}
                      <button 
                        onClick={() => setLocalSearchActive(!localSearchActive)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: localSearchActive ? "#eb2525" : "var(--text-secondary, #64748b)"
                        }}
                      >
                        <Search size={16} />
                      </button>
                      {/* Mute Toggle */}
                      <button 
                        onClick={() => handleToggleMute(recipientId)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--text-secondary, #64748b)"
                        }}
                      >
                        {mutedChats.includes(recipientId) ? <BellOff size={16} style={{ color: "#f59e0b" }} /> : <Bell size={16} />}
                      </button>
                      {/* Pin Toggle */}
                      <button 
                        onClick={() => handleTogglePin(recipientId)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--text-secondary, #64748b)"
                        }}
                      >
                        <Pin size={16} style={{ transform: pinnedChats.includes(recipientId) ? "rotate(45deg)" : "none", color: pinnedChats.includes(recipientId) ? "#3b82f6" : "inherit" }} />
                      </button>
                    </div>
                  )}

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
              <div style={{ flex: 1, display: "flex", flexDirection: "column", width: "100%", height: "100%", minHeight: 0, overflow: "hidden", position: "relative" }}>
                <AnimatePresence mode="wait">
                  {/* VIEW 1: THREAD LIST */}
                  {currentView === "threads" && (
                    <motion.div
                      key="threads"
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 15 }}
                      transition={{ duration: 0.15 }}
                      style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", flex: 1, minHeight: 0, overflow: "hidden" }}
                    >
                      {/* Chat Selection Panel OR Search */}
                      {isChatSelectionMode ? (
                        <div style={{
                          padding: "10px 14px",
                          borderBottom: "1px solid var(--border-color, #e2e8f0)",
                          background: "var(--bg-sidebar, #f8fafc)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "8px"
                        }}>
                          <button
                            onClick={handleExitChatSelection}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary, #64748b)", display: "flex", alignItems: "center", padding: "4px" }}
                          >
                            <X size={18} />
                          </button>
                          <span style={{ flex: 1, fontWeight: 600, fontSize: "13px", color: "var(--text-color)" }}>
                            Выбрано: {selectedChatIds.length}
                          </span>
                          <button
                            onClick={handleBulkMuteChats}
                            title={selectedChatIds.every(id => mutedChats.includes(id)) ? "Включить звук" : "Отключить звук"}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#f59e0b", display: "flex", alignItems: "center", padding: "4px" }}
                          >
                            {selectedChatIds.every(id => mutedChats.includes(id)) ? <Bell size={18} /> : <BellOff size={18} />}
                          </button>
                          <button
                            onClick={handleBulkDeleteChats}
                            title="Удалить чаты"
                            disabled={selectedChatIds.length === 0}
                            style={{ background: "none", border: "none", cursor: selectedChatIds.length === 0 ? "default" : "pointer", color: selectedChatIds.length === 0 ? "#94a3b8" : "#ef4444", display: "flex", alignItems: "center", padding: "4px" }}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ) : !(activeTab === "support" && !isOperator) && (
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
                                outline: "none",
                                fontFamily: EMOJI_FONT_STACK
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
                        ) : sortedThreads.length === 0 ? (
                          <div style={{ textAlign: "center", marginTop: "30px", color: "var(--text-secondary)", fontSize: "13px" }}>Нет активных чатов</div>
                        ) : (
                          <>
                            {pinnedThreads.length > 0 && (
                              <Reorder.Group axis="y" values={pinnedThreads} onReorder={handleReorderPinned} style={{ listStyle: "none", padding: 0, margin: 0 }}>
                                {pinnedThreads.map(thread => {
                                  const threadId = thread.user_id;
                                  const isSelected = recipientId === threadId && chatType === activeTab;
                                  const isMuted = mutedChats.includes(threadId);
                                  return (
                                    <Reorder.Item
                                      key={`${activeTab}-${threadId}`}
                                      value={thread}
                                      as="div"
                                      style={{ listStyle: "none", padding: 0, margin: 0 }}
                                    >
                                      <div
                                        onClick={() => {
                                          if (isChatSelectionMode) {
                                            handleSelectChat(threadId);
                                          } else {
                                            setChatType(activeTab);
                                            setRecipientId(threadId);
                                            setActiveThreadName(thread.username);
                                            setCurrentView("chat");
                                          }
                                        }}
                                        onContextMenu={(e) => triggerContextMenu(e, thread, "thread")}
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "12px",
                                          padding: "10px 12px",
                                          borderRadius: "10px",
                                          background: isChatSelectionMode && selectedChatIds.includes(threadId)
                                            ? "rgba(59, 130, 246, 0.08)"
                                            : isSelected ? "rgba(235, 37, 37, 0.08)" : "var(--bg-surface, #ffffff)",
                                          cursor: isChatSelectionMode ? "pointer" : "grab",
                                          marginBottom: "8px",
                                          border: isChatSelectionMode && selectedChatIds.includes(threadId)
                                            ? "1.5px solid #3b82f6"
                                            : "1.5px solid #3b82f6",
                                          transition: "all 0.2s",
                                          position: "relative"
                                        }}
                                      >
                                        {isChatSelectionMode && (
                                          <div style={{ flexShrink: 0 }}>
                                            {selectedChatIds.includes(threadId) ? (
                                              <CheckCircle2 size={18} style={{ color: "#3b82f6", fill: "#3b82f6", stroke: "white" }} />
                                            ) : (
                                              <div style={{ width: "18px", height: "18px", borderRadius: "50%", border: "2px solid #cbd5e1" }} />
                                            )}
                                          </div>
                                        )}
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
                                            <span style={{ fontWeight: 600, fontSize: "13.5px", color: "var(--text-color)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "4px" }}>
                                              {thread.username}
                                              <Pin size={10} style={{ transform: "rotate(45deg)", color: "#3b82f6" }} />
                                              {isMuted && <BellOff size={10} style={{ color: "#f59e0b" }} />}
                                            </span>
                                            <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>
                                              {formatTime(thread.last_message_at)}
                                            </span>
                                          </div>
                                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <span 
                                              style={{ fontSize: "12px", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: "10px" }}
                                              dangerouslySetInnerHTML={{ __html: formatMessageText(thread.message) || (thread.attachment_url ? "Вложение" : "Нет сообщений") }}
                                            />
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
                                    </Reorder.Item>
                                  );
                                })}
                              </Reorder.Group>
                            )}
                            {unpinnedThreads.map(thread => {
                              const threadId = thread.user_id;
                              const isSelected = recipientId === threadId && chatType === activeTab;
                              const isMuted = mutedChats.includes(threadId);
                              return (
                                <div
                                  key={`${activeTab}-${threadId}`}
                                  onClick={() => {
                                    if (isChatSelectionMode) {
                                      handleSelectChat(threadId);
                                    } else {
                                      setChatType(activeTab);
                                      setRecipientId(threadId);
                                      setActiveThreadName(thread.username);
                                      setCurrentView("chat");
                                    }
                                  }}
                                  onContextMenu={(e) => triggerContextMenu(e, thread, "thread")}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "12px",
                                    padding: "10px 12px",
                                    borderRadius: "10px",
                                    background: isChatSelectionMode && selectedChatIds.includes(threadId)
                                      ? "rgba(59, 130, 246, 0.08)"
                                      : isSelected ? "rgba(235, 37, 37, 0.08)" : "var(--bg-surface, #ffffff)",
                                    cursor: "pointer",
                                    marginBottom: "8px",
                                    border: isChatSelectionMode && selectedChatIds.includes(threadId)
                                      ? "1.5px solid #3b82f6"
                                      : "1px solid var(--border-color, #e2e8f0)",
                                    transition: "all 0.2s",
                                    position: "relative"
                                  }}
                                >
                                  {isChatSelectionMode && (
                                    <div style={{ flexShrink: 0 }}>
                                      {selectedChatIds.includes(threadId) ? (
                                        <CheckCircle2 size={18} style={{ color: "#3b82f6", fill: "#3b82f6", stroke: "white" }} />
                                      ) : (
                                        <div style={{ width: "18px", height: "18px", borderRadius: "50%", border: "2px solid #cbd5e1" }} />
                                      )}
                                    </div>
                                  )}
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
                                      <span style={{ fontWeight: 600, fontSize: "13.5px", color: "var(--text-color)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "4px" }}>
                                        {thread.username}
                                        {isMuted && <BellOff size={10} style={{ color: "#f59e0b" }} />}
                                      </span>
                                      <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>
                                        {formatTime(thread.last_message_at)}
                                      </span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                      <span 
                                        style={{ fontSize: "12px", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: "10px" }}
                                        dangerouslySetInnerHTML={{ __html: formatMessageText(thread.message) || (thread.attachment_url ? "Вложение" : "Нет сообщений") }}
                                      />
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
                            })}
                          </>
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
                      style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", flex: 1, minHeight: 0, overflow: "hidden" }}
                    >
                      {/* Local Search input */}
                      {localSearchActive && (
                        <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border-color, #e2e8f0)", background: "var(--bg-sidebar, #f8fafc)" }}>
                          <input 
                            type="text"
                            placeholder="Поиск по сообщениям..."
                            value={localSearchQuery}
                            onChange={(e) => setLocalSearchQuery(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "6px 12px",
                              borderRadius: "8px",
                              border: "1px solid var(--border-color, #cbd5e1)",
                              fontSize: "12px",
                              background: "var(--bg-color, #ffffff)",
                              color: "var(--text-color, #0f172a)",
                              outline: "none"
                            }}
                          />
                        </div>
                      )}

                      {/* Messages scroll content */}
                      <div 
                        onContextMenu={(e) => {
                          // Only show chatArea menu when right-clicking on the background itself
                          // (not on a message bubble which has its own handler)
                          const clickedOnBackground = e.target === e.currentTarget ||
                            e.target.closest('[data-msg-bubble]') === null;
                          if (clickedOnBackground) {
                            e.preventDefault();
                            e.stopPropagation();
                            triggerContextMenu(e, null, "chatArea");
                          }
                        }}
                        style={{
                          flex: 1,
                          overflowY: "auto",
                          padding: "16px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                          background: "var(--bg-color, #f1f5f9)"
                        }}
                      >
                        {loading ? (
                          <div style={{ textAlign: "center", marginTop: "20px", color: "gray", fontSize: "13px" }}>Загрузка...</div>
                        ) : filteredMessages.length === 0 ? (
                          <div style={{ textAlign: "center", marginTop: "20px", color: "gray", fontSize: "13px" }}>Нет сообщений</div>
                        ) : (
                          <AnimatePresence initial={false}>
                            {(() => {
                              const groups = [];
                              let currentAlbum = null;
                              
                              filteredMessages.forEach((msg) => {
                                const isImg = msg.attachment_url && msg.attachment_url.match(/\.(jpeg|jpg|gif|png)$/i);
                                const hasText = !!msg.message;
                                
                                if (isImg && !hasText && !msg.reply_to_id) {
                                  if (!currentAlbum) {
                                    currentAlbum = { type: 'album', id: `album-${msg.id}`, user_id: msg.user_id, is_operator: msg.is_operator, created_at: msg.created_at, messages: [msg] };
                                  } else {
                                    const diff = new Date(msg.created_at) - new Date(currentAlbum.messages[currentAlbum.messages.length - 1].created_at);
                                    if (msg.user_id === currentAlbum.user_id && msg.is_operator === currentAlbum.is_operator && diff < 60000) {
                                      currentAlbum.messages.push(msg);
                                    } else {
                                      groups.push(currentAlbum);
                                      currentAlbum = { type: 'album', id: `album-${msg.id}`, user_id: msg.user_id, is_operator: msg.is_operator, created_at: msg.created_at, messages: [msg] };
                                    }
                                  }
                                } else {
                                  if (currentAlbum) {
                                    groups.push(currentAlbum);
                                    currentAlbum = null;
                                  }
                                  groups.push({ type: 'single', ...msg });
                                }
                              });
                              if (currentAlbum) groups.push(currentAlbum);

                              return groups.map(group => {
                                if (group.type === 'album') {
                                  let isOut = false;
                                  if (chatType === "direct") {
                                    isOut = group.user_id === currentUserId;
                                  } else {
                                    isOut = isOperator ? group.is_operator : (!group.is_operator && group.user_id === currentUserId);
                                  }
                                  const allSelected = group.messages.every(m => selectedMessageIds.includes(m.id));
                                  return (
                                    <div
                                      key={group.id}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        width: "100%",
                                        alignSelf: isOut ? "flex-end" : "flex-start",
                                        justifyContent: isOut ? "flex-end" : "flex-start",
                                      }}
                                    >
                                      {isMessageSelectionMode && (
                                        <div 
                                          onClick={() => {
                                            group.messages.forEach(m => {
                                              if (allSelected) {
                                                setSelectedMessageIds(prev => prev.filter(id => id !== m.id));
                                              } else {
                                                if (!selectedMessageIds.includes(m.id)) {
                                                  handleSelectMessage(m.id);
                                                }
                                              }
                                            });
                                          }} 
                                          style={{ cursor: "pointer", flexShrink: 0, paddingRight: "4px" }}
                                        >
                                          {allSelected ? (
                                            <CheckCircle2 size={20} style={{ color: "#3b82f6", fill: "#3b82f6", stroke: "white" }} />
                                          ) : (
                                            <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: "2px solid #cbd5e1" }} />
                                          )}
                                        </div>
                                      )}
                                      <motion.div
                                        layout
                                        initial={{ opacity: 0, y: 15, scale: 0.96 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9, height: 0, overflow: "hidden", margin: 0, padding: 0 }}
                                        transition={{ duration: 0.22, ease: "easeOut" }}
                                        style={{
                                          maxWidth: "80%",
                                          display: "flex",
                                          flexWrap: "wrap",
                                          gap: "4px",
                                          justifyContent: isOut ? "flex-end" : "flex-start",
                                          marginBottom: "8px"
                                        }}
                                      >
                                        {group.messages.map(msg => {
                                          const isSelected = selectedMessageIds.includes(msg.id);
                                          return (
                                            <div key={msg.id} id={`msg-bubble-${msg.id}`} data-msg-bubble="true" onContextMenu={(e) => triggerContextMenu(e, msg, "message")} style={{ position: "relative" }}>
                                              <img 
                                                src={`${API_URL}${msg.attachment_url}`} 
                                                style={{ 
                                                  width: group.messages.length > 1 ? "140px" : "200px", 
                                                  height: group.messages.length > 1 ? "140px" : "auto", 
                                                  objectFit: "cover", 
                                                  borderRadius: "12px", 
                                                  cursor: "pointer", 
                                                  border: isSelected ? "2px solid #3b82f6" : (isOut ? "none" : "1px solid var(--border-color, #e2e8f0)"), 
                                                  boxShadow: "0 2px 5px rgba(0,0,0,0.04)" 
                                                }} 
                                                alt="img" 
                                                onClick={() => {
                                                  if (isMessageSelectionMode) {
                                                    handleSelectMessage(msg.id);
                                                  } else {
                                                    setSelectedImage(`${API_URL}${msg.attachment_url}`);
                                                  }
                                                }} 
                                              />
                                              <div style={{ position: "absolute", bottom: "6px", right: "6px", background: "rgba(0,0,0,0.4)", borderRadius: "12px", padding: "2px 6px", display: "flex", alignItems: "center", gap: "4px" }}>
                                                <span style={{ fontSize: "9px", color: "white" }}>{formatTime(msg.created_at)}</span>
                                                {isOut && <span>{msg.is_read ? <CheckCheck size={10} color="white" /> : <Check size={10} color="white" />}</span>}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </motion.div>
                                    </div>
                                  );
                                }

                                const msg = group;
                                let isOut = false;
                                if (chatType === "direct") {
                                  isOut = msg.user_id === currentUserId;
                                } else {
                                  isOut = isOperator ? msg.is_operator : (!msg.is_operator && msg.user_id === currentUserId);
                                }

                                const isVoice = msg.attachment_url && msg.attachment_url.match(/\.(webm|wav|ogg|mp3|m4a|caf)$/i);
                                const isSelected = selectedMessageIds.includes(msg.id);

                                return (
                                  <div 
                                    key={msg.id}
                                    style={{ 
                                      display: "flex", 
                                      alignItems: "center", 
                                      gap: "10px", 
                                      width: "100%", 
                                      alignSelf: isOut ? "flex-end" : "flex-start",
                                      justifyContent: isOut ? "flex-end" : "flex-start",
                                    }}
                                  >
                                    {isMessageSelectionMode && (
                                      <div 
                                        onClick={() => handleSelectMessage(msg.id)} 
                                        style={{ cursor: "pointer", flexShrink: 0, paddingRight: "4px" }}
                                      >
                                        {isSelected ? (
                                          <CheckCircle2 size={20} style={{ color: "#3b82f6", fill: "#3b82f6", stroke: "white" }} />
                                        ) : (
                                          <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: "2px solid #cbd5e1" }} />
                                        )}
                                      </div>
                                    )}
                                    <motion.div 
                                      layout
                                      initial={{ opacity: 0, y: 15, scale: 0.96 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      exit={{ opacity: 0, scale: 0.9, height: 0, overflow: "hidden", margin: 0, padding: 0 }}
                                      transition={{ duration: 0.22, ease: "easeOut" }}
                                      id={`msg-bubble-${msg.id}`}
                                      data-msg-bubble="true"
                                      onContextMenu={(e) => triggerContextMenu(e, msg, "message")}
                                      onClick={isMessageSelectionMode ? () => handleSelectMessage(msg.id) : undefined}
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
                                        border: isOut ? "none" : "1px solid var(--border-color, #e2e8f0)",
                                        transition: "background 0.5s, border-color 0.5s",
                                        cursor: isMessageSelectionMode ? "pointer" : "default",
                                        boxShadow: isSelected ? "0 0 0 2px #3b82f6" : "none",
                                        filter: isSelected ? "brightness(0.95)" : "none"
                                      }}
                                    >
                                      {/* Reply Snippet */}
                                      {msg.reply_to_id && (
                                        <div 
                                          onClick={() => scrollToMessage(msg.reply_to_id)}
                                          style={{
                                            padding: "6px 8px",
                                            background: isOut ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.05)",
                                            borderLeft: isOut ? "3px solid white" : "3px solid #eb2525",
                                            fontSize: "11px",
                                            borderRadius: "4px",
                                            marginBottom: "6px",
                                            cursor: "pointer",
                                            opacity: 0.95
                                          }}
                                        >
                                          <span style={{ fontWeight: 600 }}>
                                            {messages.find(m => m.id === msg.reply_to_id)?.username || "Сообщение"}
                                          </span>
                                          <div 
                                            style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                                            dangerouslySetInnerHTML={{ __html: formatMessageText(messages.find(m => m.id === msg.reply_to_id)?.message || "Вложение") }}
                                          />
                                        </div>
                                      )}

                                      {/* Voice Audio */}
                                      {isVoice && (
                                        <AudioPlayer src={`${API_URL}${msg.attachment_url}`} isOut={isOut} />
                                      )}

                                      {/* Attachment file before message */}
                                      {msg.attachment_url && !isVoice && (
                                        <div style={{ marginBottom: msg.message ? "8px" : "0", marginTop: msg.reply_to_id ? "8px" : "0" }}>
                                          {msg.attachment_url.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                                            <img 
                                              src={`${API_URL}${msg.attachment_url}`} 
                                              style={{ maxWidth: "100%", borderRadius: "8px", cursor: "pointer" }} 
                                              alt="img"
                                              onClick={() => {
                                                if (isMessageSelectionMode) {
                                                  handleSelectMessage(msg.id);
                                                } else {
                                                  setSelectedImage(`${API_URL}${msg.attachment_url}`);
                                                }
                                              }}
                                            />
                                          ) : (
                                            <a href={`${API_URL}${msg.attachment_url}`} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: "inherit", background: isOut ? "rgba(255,255,255,0.15)" : "var(--bg-color, #f1f5f9)", padding: "8px 12px", borderRadius: "10px", border: isOut ? "none" : "1px solid var(--border-color, #e2e8f0)", transition: "opacity 0.2s" }} onMouseEnter={e => e.currentTarget.style.opacity=0.8} onMouseLeave={e => e.currentTarget.style.opacity=1}>
                                              <div style={{ width: "36px", height: "36px", flexShrink: 0, background: isOut ? "rgba(255,255,255,0.2)" : "white", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                <img src={filePng} alt="file" style={{ width: "24px", height: "24px", objectFit: "contain" }} />
                                              </div>
                                              <div style={{ overflow: "hidden", flex: 1 }}>
                                                <div style={{ fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: isOut ? "white" : "var(--text-color, #1e293b)" }}>
                                                  {msg.attachment_url.split('/').pop() || "Документ"}
                                                </div>
                                                <div style={{ fontSize: "11px", color: isOut ? "rgba(255,255,255,0.8)" : "var(--text-secondary, #64748b)", marginTop: "2px" }}>
                                                  Файл
                                                </div>
                                              </div>
                                            </a>
                                          )}
                                        </div>
                                      )}

                                      {/* Main text content */}
                                      {msg.message && !isVoice && (
                                        <motion.div 
                                          key={msg.message}
                                          initial={{ scale: 0.97, opacity: 0.9 }}
                                          animate={{ scale: 1, opacity: 1 }}
                                          transition={{ duration: 0.15 }}
                                          style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                                          dangerouslySetInnerHTML={{ __html: formatMessageText(msg.message) }}
                                        />
                                      )}

                                      {/* Reactions list */}
                                      {msg.reactions && (
                                        <div style={{
                                          display: "flex",
                                          flexWrap: "wrap",
                                          gap: "4px",
                                          marginTop: "6px",
                                          marginBottom: "2px"
                                        }}>
                                          {getReactionGroups(msg.reactions, currentUserId).map(({ emoji, count, hasMyReaction }) => (
                                            <button
                                              key={emoji}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleReact(msg.id, emoji);
                                              }}
                                              style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "4px",
                                                background: isOut 
                                                  ? (hasMyReaction ? "rgba(255, 255, 255, 0.25)" : "rgba(255, 255, 255, 0.12)")
                                                  : (hasMyReaction ? "rgba(235, 37, 37, 0.08)" : "rgba(0, 0, 0, 0.04)"),
                                                border: "none",
                                                borderRadius: "12px",
                                                padding: "2px 6px",
                                                fontSize: "11px",
                                                color: isOut ? "#ffffff" : (hasMyReaction ? "#eb2525" : "inherit"),
                                                cursor: "pointer",
                                                fontWeight: 600,
                                                transition: "all 0.15s"
                                              }}
                                            >
                                            <span style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                                              <img 
                                                src={`https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.0.1/img/apple/64/${Array.from(emoji).map(c => c.codePointAt(0).toString(16).padStart(4, "0")).join("-")}.png`} 
                                                alt={emoji} 
                                                style={{ width: "16px", height: "16px", verticalAlign: "middle" }}
                                                onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.outerHTML = emoji; }}
                                              />
                                            </span>
                                            {count > 1 && <span>{count}</span>}
                                            </button>
                                          ))}
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
                                  </div>
                                );
                              });
                            })()}
                          </AnimatePresence>
                        )}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Message Selection Bar - shown when in selection mode */}
                      {isMessageSelectionMode && (
                        <div style={{
                          padding: "10px 14px",
                          background: "var(--bg-sidebar, #ffffff)",
                          borderTop: "2px solid #3b82f6",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          zIndex: 10
                        }}>
                          <button
                            onClick={handleExitMessageSelection}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary, #64748b)", display: "flex", alignItems: "center", padding: "4px" }}
                          >
                            <X size={18} />
                          </button>
                          <span style={{ flex: 1, fontWeight: 600, fontSize: "13px", color: "var(--text-color)" }}>
                            Выбрано: {selectedMessageIds.length}
                          </span>
                          <button
                            onClick={handleBulkDeleteMessages}
                            title="Удалить выбранные"
                            disabled={selectedMessageIds.length === 0}
                            style={{ background: "none", border: "none", cursor: selectedMessageIds.length === 0 ? "default" : "pointer", color: selectedMessageIds.length === 0 ? "#94a3b8" : "#ef4444", display: "flex", alignItems: "center", padding: "4px" }}
                          >
                            <Trash2 size={18} />
                          </button>
                          <button
                            onClick={() => setForwardModalOpen(true)}
                            title="Переслать выбранные"
                            disabled={selectedMessageIds.length === 0}
                            style={{ background: "none", border: "none", cursor: selectedMessageIds.length === 0 ? "default" : "pointer", color: selectedMessageIds.length === 0 ? "#94a3b8" : "#3b82f6", display: "flex", alignItems: "center", padding: "4px" }}
                          >
                            <CornerUpRight size={18} />
                          </button>
                        </div>
                      )}

                      {/* Input Footer */}
                      {!isMessageSelectionMode && (
                      <div style={{
                        padding: "12px",
                        background: "var(--bg-sidebar, #ffffff)",
                        borderTop: "1px solid var(--border-color, #e2e8f0)",
                        position: "relative"
                      }}>
                        {/* Reply Preview */}
                        {replyingTo && (
                          <div style={{
                            padding: "8px 12px",
                            background: "var(--bg-color, #f1f5f9)",
                            borderLeft: "3px solid #eb2525",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: "12px",
                            borderRadius: "4px",
                            marginBottom: "8px"
                          }}>
                            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              <span style={{ fontWeight: 600 }}>Ответ на: </span>
                              {replyingTo.message || "Вложение"}
                            </div>
                            <button type="button" onClick={() => setReplyingTo(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "red" }}>
                              <X size={14} />
                            </button>
                          </div>
                        )}

                        {/* Edit Preview */}
                        {editingMessage && (
                          <div style={{
                            padding: "8px 12px",
                            background: "var(--bg-color, #f1f5f9)",
                            borderLeft: "3px solid #f59e0b",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: "12px",
                            borderRadius: "4px",
                            marginBottom: "8px"
                          }}>
                            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              <span style={{ fontWeight: 600 }}>Редактирование: </span>
                              {editingMessage.message}
                            </div>
                            <button type="button" onClick={() => { setEditingMessage(null); setNewMessage(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "red" }}>
                              <X size={14} />
                            </button>
                          </div>
                        )}

                        {/* Audio capturing state */}
                        {isRecording ? (
                          <div style={{ display: "flex", gap: "10px", alignItems: "center", justifyContent: "space-between", padding: "6px 8px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "red", fontSize: "13px", fontWeight: 600 }}>
                              <span style={{ width: "8px", height: "8px", background: "red", borderRadius: "50%", display: "inline-block", animation: "pulse 1s infinite" }} />
                              Запись: {recordingTime} сек.
                            </div>
                            <div style={{ display: "flex", gap: "10px" }}>
                              <button type="button" onClick={cancelRecording} style={{ background: "rgba(0,0,0,0.05)", border: "none", padding: "6px 12px", borderRadius: "14px", cursor: "pointer", fontSize: "12px", color: "#64748b" }}>
                                Отмена
                              </button>
                              <button type="button" onClick={stopRecording} style={{ background: "#eb2525", border: "none", padding: "6px 12px", borderRadius: "14px", cursor: "pointer", fontSize: "12px", color: "white", fontWeight: 650 }}>
                                Отправить
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Standard form */
                          <form onSubmit={handleSendMessage} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary, gray)" }}>
                              <Smile size={18} />
                            </button>
                            <label style={{ cursor: "pointer", color: "var(--text-secondary, gray)", display: "flex", alignItems: "center" }}>
                              <Paperclip size={18} />
                              <input type="file" style={{ display: "none" }} onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                  setPastedFile(e.target.files[0]);
                                  setPasteModalOpen(true);
                                  e.target.value = null; // reset input
                                }
                              }} />
                            </label>
                            
                            <textarea
                              ref={textareaRef}
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              onKeyDown={handleKeyDown}
                              onPaste={handlePaste}
                              placeholder="Сообщение..."
                              style={{
                                flex: 1,
                                padding: "8px 12px",
                                borderRadius: "14px",
                                border: "1px solid var(--border-color, #cbd5e1)",
                                background: "var(--bg-color, #f8fafc)",
                                color: "var(--text-color, #0f172a)",
                                outline: "none",
                                fontSize: "13px",
                                fontFamily: EMOJI_FONT_STACK,
                                resize: "none",
                                height: "36px",
                                minHeight: "36px",
                                maxHeight: "120px",
                                lineHeight: "1.4",
                                overflowY: "auto"
                              }}
                            />

                            {/* Voice mic button when input is empty */}
                            {!isSendActive ? (
                              <button type="button" onClick={startRecording} style={{ background: "none", border: "none", color: "var(--text-secondary, gray)", cursor: "pointer" }}>
                                <Mic size={18} />
                              </button>
                            ) : (
                              /* ChatGPT Send Button style */
                              <button 
                                type="submit" 
                                disabled={sending}
                                style={{
                                  background: "var(--text-color, #0f172a)",
                                  color: "white",
                                  border: "none",
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "50%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                  transition: "all 0.2s"
                                }}
                              >
                                <ArrowUp size={16} strokeWidth={2.5} />
                              </button>
                            )}
                          </form>
                        )}
                        {showEmojiPicker && !isRecording && (
                          <div style={{ position: "absolute", bottom: "60px", right: "10px", zIndex: 10 }}>
                            <EmojiPicker onEmojiClick={(e) => setNewMessage(p => p + e.emoji)} theme={theme} emojiStyle="apple" width={260} height={280} />
                          </div>
                        )}
                      </div>
                      )}
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
                      style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", flex: 1, minHeight: 0, overflow: "hidden" }}
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
                              outline: "none",
                              fontFamily: EMOJI_FONT_STACK
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

      {/* Forward Modal */}
      {forwardModalOpen && (
        <div
          onClick={() => setForwardModalOpen(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 20000,
            display: "flex", alignItems: "center", justifyContent: "center"
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bg-surface, #ffffff)",
              borderRadius: "16px",
              width: "320px",
              maxHeight: "480px",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 16px 48px rgba(0,0,0,0.2)",
              overflow: "hidden",
              fontFamily: EMOJI_FONT_STACK
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: "14px 18px",
              borderBottom: "1px solid var(--border-color, #e2e8f0)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <span style={{ fontWeight: 700, fontSize: "15px", color: "var(--text-color)" }}>Переслать в...</span>
              <button onClick={() => setForwardModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                <X size={18} />
              </button>
            </div>

            {/* Search */}
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-color, #e2e8f0)" }}>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <Search size={14} style={{ position: "absolute", left: "10px", color: "var(--text-secondary, #94a3b8)" }} />
                <input
                  type="text"
                  placeholder="Поиск чата..."
                  value={forwardSearchQuery}
                  onChange={(e) => setForwardSearchQuery(e.target.value)}
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "6px 10px 6px 30px",
                    borderRadius: "10px",
                    border: "1px solid var(--border-color, #cbd5e1)",
                    background: "var(--bg-color, #f8fafc)",
                    color: "var(--text-color, #0f172a)",
                    fontSize: "13px",
                    outline: "none",
                    fontFamily: EMOJI_FONT_STACK
                  }}
                />
              </div>
            </div>

            {/* Thread List */}
            <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
              {forwardThreadsList
                .filter(t => t.name.toLowerCase().includes(forwardSearchQuery.toLowerCase()))
                .map(thread => (
                  <div
                    key={`${thread.chatType}-${thread.id}`}
                    onClick={() => handleForwardMessages(thread)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      cursor: "pointer",
                      marginBottom: "4px",
                      transition: "background 0.15s",
                      background: "transparent"
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(59, 130, 246, 0.06)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <div style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: thread.chatType === "support" ? "rgba(235, 37, 37, 0.1)" : "#e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: thread.chatType === "support" ? "#eb2525" : "#64748b",
                      flexShrink: 0
                    }}>
                      {thread.chatType === "support" ? <Shield size={18} /> : <User size={18} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-color)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {thread.name}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                        {thread.chatType === "support" ? "Поддержка" : "Личный чат"}
                      </div>
                    </div>
                    <CornerUpRight size={14} style={{ color: "#3b82f6", flexShrink: 0 }} />
                  </div>
                ))
              }
              {forwardThreadsList.filter(t => t.name.toLowerCase().includes(forwardSearchQuery.toLowerCase())).length === 0 && (
                <div style={{ textAlign: "center", padding: "20px", color: "var(--text-secondary)", fontSize: "13px" }}>Чаты не найдены</div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0% { opacity: 0.4; }
          50% { opacity: 1; }
          100% { opacity: 0.4; }
        }
      `}</style>
    </>
  );
};

export default MiniChatWindow;
