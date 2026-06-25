import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import axios from "axios";
import { 
  Send, MessageSquare, Search, User, Clock, ArrowLeft, Shield, Info, 
  Paperclip, Smile, UserPlus, X, Check, CheckCheck,
  Mic, Trash2, CornerUpLeft, Edit3, Pin, Bell, BellOff, ArrowUp, ArrowDown, PlusCircle,
  CheckSquare, CheckCircle2, CornerUpRight
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import Spinner from "../../../components/Spinner.jsx";
import { Helmet } from "react-helmet";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import useThemeStore from "../../../store/useThemeStore";
import ImageModal from "../../../components/modal/ImageModal";
import PasteFileModal from "../../../components/modal/PasteFileModal";
import filePng from "../../../assets/file.png";

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:7575";

const POPULAR_EMOJIS = ["👍", "❤️", "🔥", "😂", "😮", "😢", "🙏", "🎉", "👏"];

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

// Shimmering Skeleton Loader component for active chat loading
const LoadingSkeleton = () => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", width: "100%", padding: "16px", height: "100%" }}>
      <div style={{ 
        alignSelf: "flex-start", 
        width: "65%", 
        height: "42px", 
        background: "linear-gradient(90deg, rgba(226,232,240,0.8) 25%, rgba(241,245,249,0.8) 50%, rgba(226,232,240,0.8) 75%)", 
        backgroundSize: "200% 100%", 
        animation: "shimmer 1.5s infinite linear", 
        borderRadius: "14px 14px 14px 4px",
        border: "1px solid rgba(226,232,240,0.5)"
      }} />
      <div style={{ 
        alignSelf: "flex-end", 
        width: "50%", 
        height: "36px", 
        background: "linear-gradient(90deg, rgba(254,226,226,0.8) 25%, rgba(254,242,242,0.8) 50%, rgba(254,226,226,0.8) 75%)", 
        backgroundSize: "200% 100%", 
        animation: "shimmer 1.5s infinite linear", 
        borderRadius: "14px 14px 4px 14px"
      }} />
      <div style={{ 
        alignSelf: "flex-start", 
        width: "75%", 
        height: "48px", 
        background: "linear-gradient(90deg, rgba(226,232,240,0.8) 25%, rgba(241,245,249,0.8) 50%, rgba(226,232,240,0.8) 75%)", 
        backgroundSize: "200% 100%", 
        animation: "shimmer 1.5s infinite linear", 
        borderRadius: "14px 14px 14px 4px",
        border: "1px solid rgba(226,232,240,0.5)"
      }} />
      <div style={{ 
        alignSelf: "flex-end", 
        width: "60%", 
        height: "40px", 
        background: "linear-gradient(90deg, rgba(254,226,226,0.8) 25%, rgba(254,242,242,0.8) 50%, rgba(254,226,226,0.8) 75%)", 
        backgroundSize: "200% 100%", 
        animation: "shimmer 1.5s infinite linear", 
        borderRadius: "14px 14px 4px 14px"
      }} />
    </div>
  );
};

export default function OperatorFeedbackPage() {
  const token = localStorage.getItem("access_token");
  
  const getUserIdFromToken = () => {
    try {
      const tokenString = localStorage.getItem("access_token");
      if (!tokenString) return 0;
      const payload = JSON.parse(atob(tokenString.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return Number(payload.user_id || 0);
    } catch { return 0; }
  };
  const currentUserId = getUserIdFromToken();
  const { theme } = useThemeStore();

  const [totalUnread, setTotalUnread] = useState(0);
  const [messages, setMessages] = useState([]);
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pastedFile, setPastedFile] = useState(null);
  
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
  const [activeTab, setActiveTab] = useState("support"); // "support" | "direct"

  // Direct messages user list / search
  const [usersList, setUsersList] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  
  // Loading states
  const [loadingChat, setLoadingChat] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [sending, setSending] = useState(false);
  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  
  // Mobile navigation
  const [mobileShowChat, setMobileShowChat] = useState(false);

  // Advanced Features: Context Menu
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, target: null, type: "" }); // type: "message" | "thread"
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  // Advanced Features: Replies & Editing
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);

  // Advanced Features: Voice Audio Messages
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);

  // Advanced Features: Pinned & Muted Chats
  const [pinnedChats, setPinnedChats] = useState([]);
  const [mutedChats, setMutedChats] = useState([]);

  // Advanced Features: Message Selection & Forwarding
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [isMessageSelectionMode, setIsMessageSelectionMode] = useState(false);
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [forwardSearchQuery, setForwardSearchQuery] = useState("");

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

  // Advanced Features: Chat Selection
  const [selectedChatIds, setSelectedChatIds] = useState([]);
  const [isChatSelectionMode, setIsChatSelectionMode] = useState(false);

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
    supportThreads.forEach(t => {
      list.push({ id: t.user_id, name: t.username || "Служба поддержки", chatType: "support" });
    });
    directThreads.forEach(t => {
      list.push({ id: t.user_id, name: t.username || "Пользователь", chatType: "direct" });
    });
    return list;
  }, [supportThreads, directThreads]);

  const handleForwardMessages = async (targetThread) => {
    const axiosConfig = { headers: { Authorization: `Bearer ${token}` } };
    const sortedIds = [...selectedMessageIds].sort((a, b) => a - b);
    setSending(true);
    try {
      for (const msgId of sortedIds) {
        const msg = messages.find(m => m.id === msgId);
        if (!msg) continue;
        
        let senderName = msg.username || (msg.is_operator ? "Оператор" : "Пользователь");
        let forwardPrefix = `Переслано от ${senderName}:\n`;
        let textToSend = msg.message ? `${forwardPrefix}${msg.message}` : `${forwardPrefix.trim()}`;
        
        const payload = {
          message: textToSend,
          attachment_url: msg.attachment_url || "",
          recipient_id: targetThread.chatType === "direct" ? targetThread.id : 0,
          reply_to_id: null
        };
        
        await axios.post(`${API_URL}/api/feedback`, payload, axiosConfig);
      }
      setIsMessageSelectionMode(false);
      setSelectedMessageIds([]);
      setForwardModalOpen(false);
      
      // Navigate to the target chat!
      setActiveChatType(targetThread.chatType);
      setActiveThreadId(targetThread.id);
      setActiveThreadName(targetThread.name);
      fetchMessages(targetThread.chatType, targetThread.id, true);
    } catch (err) {
      console.error("Error forwarding messages:", err);
    } finally {
      setSending(false);
    }
  };

  const handleBulkDeleteMessages = async () => {
    if (!window.confirm(`Вы уверены, что хотите удалить ${selectedMessageIds.length} сообщений?`)) return;
    const axiosConfig = { headers: { Authorization: `Bearer ${token}` } };
    setSending(true);
    try {
      for (const msgId of selectedMessageIds) {
        await axios.delete(`${API_URL}/api/feedback/${msgId}`, axiosConfig);
      }
      setIsMessageSelectionMode(false);
      setSelectedMessageIds([]);
      fetchMessages(activeChatType, activeThreadId);
      if (activeChatType === "support") fetchSupportThreads();
      else if (activeChatType === "direct") fetchDirectThreads();
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
    const axiosConfig = { headers: { Authorization: `Bearer ${token}` } };
    setSending(true);
    try {
      for (const threadId of selectedChatIds) {
        let url = `${API_URL}/api/feedback/chat`;
        if (activeTab === "direct") {
          url += `?chatWith=${threadId}`;
        } else {
          url += `?userId=${threadId}`;
        }
        await axios.delete(url, axiosConfig);
        
        if (activeThreadId === threadId) {
          setActiveThreadId(null);
          setActiveChatType(null);
          setMessages([]);
        }
      }
      setIsChatSelectionMode(false);
      setSelectedChatIds([]);
      fetchSupportThreads();
      fetchDirectThreads();
      fetchTotalUnread();
    } catch (err) {
      console.error("Error bulk deleting chats:", err);
    } finally {
      setSending(false);
    }
  };

  // Advanced Features: Chat Message Search
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

  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}` }
  };

  // Close context menu on window click
  useEffect(() => {
    const closeMenu = () => {
      setContextMenu({ visible: false, x: 0, y: 0, target: null, type: "" });
      setShowReactionPicker(false);
    };
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  // Load pinned and muted lists
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
            const isMuted = mutedChats.includes(threadId);

            if (!isMuted && ((type === "support" && !newMsg.is_operator) || (type === "direct" && newMsg.user_id !== currentUserId))) {
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
  }, [mutedChats, currentUserId]);

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
    if (!localSearchActive) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchSupportThreads(true);
    fetchDirectThreads(false);
    fetchTotalUnread();

    // Fetch mbarotov and ensure he is in supportThreads
    axios.get(`${API_URL}/users/id-by-username?username=mbarotov`, axiosConfig)
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

    // Edit message route
    if (editingMessage) {
      try {
        await axios.put(`${API_URL}/api/feedback/${editingMessage.id}`, {
          message: newMessage.trim()
        }, axiosConfig);
        setEditingMessage(null);
        setNewMessage("");
        fetchMessages(activeChatType, activeThreadId);
      } catch (err) {
        console.error("Error editing message:", err);
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
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data"
          }
        });
        attachmentUrl = uploadRes.data.url;
      }

      let payload = activeChatType === "direct" 
        ? { message: newMessage.trim(), attachment_url: attachmentUrl, recipient_id: activeThreadId, reply_to_id: replyingTo ? replyingTo.id : null }
        : { message: newMessage.trim(), attachment_url: attachmentUrl, user_id: activeThreadId, reply_to_id: replyingTo ? replyingTo.id : null };

      const res = await axios.post(`${API_URL}/api/feedback`, payload, axiosConfig);
      setMessages((prev) => [...prev, res.data]);
      setNewMessage("");
      setFile(null);
      setReplyingTo(null);
      setShowEmojiPicker(false);
      setTimeout(scrollToBottom, 50);
      
      if (activeChatType === "support") fetchSupportThreads();
      else if (activeChatType === "direct") fetchDirectThreads();
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

      let payload = activeChatType === "direct" 
        ? { message: fileMessage.trim(), attachment_url: attachmentUrl, recipient_id: activeThreadId, reply_to_id: replyingTo ? replyingTo.id : null }
        : { message: fileMessage.trim(), attachment_url: attachmentUrl, user_id: activeThreadId, reply_to_id: replyingTo ? replyingTo.id : null };

      const res = await axios.post(`${API_URL}/api/feedback`, payload, axiosConfig);
      setMessages((prev) => [...prev, res.data]);
      
      setReplyingTo(null);
      setTimeout(scrollToBottom, 50);
      
      if (activeChatType === "support") fetchSupportThreads();
      else if (activeChatType === "direct") fetchDirectThreads();
    } catch (err) {
      console.error("Error sending pasted file:", err);
    } finally {
      setSending(false);
      setPastedFile(null);
    }
  };

  const handleDeleteMessage = async (msgId) => {
    try {
      await axios.delete(`${API_URL}/api/feedback/${msgId}`, axiosConfig);
      fetchMessages(activeChatType, activeThreadId);
      if (activeChatType === "support") fetchSupportThreads();
      else if (activeChatType === "direct") fetchDirectThreads();
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

      const res = await axios.post(`${API_URL}/api/feedback/${msgId}/react`, { emoji: newEmoji }, axiosConfig);

      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reactions: res.data.reactions } : m));
    } catch (err) {
      console.error("Error setting reaction:", err);
    }
  };

  const handleDeleteChat = async (threadId) => {
    if (!window.confirm("Вы уверены, что хотите удалить весь чат?")) return;
    try {
      let url = `${API_URL}/api/feedback/chat`;
      if (activeTab === "direct") {
        url += `?chatWith=${threadId}`;
      } else {
        url += `?userId=${threadId}`;
      }
      await axios.delete(url, axiosConfig);
      
      if (activeThreadId === threadId) {
        setActiveThreadId(null);
        setActiveChatType(null);
        setMessages([]);
      }
      fetchSupportThreads();
      fetchDirectThreads();
      fetchTotalUnread();
    } catch (err) {
      console.error("Error deleting chat:", err);
    }
  };

  const handleSelectThread = useCallback((thread) => {
    setActiveChatType(thread.chatType);
    setActiveThreadId(thread.id);
    setActiveThreadName(thread.name);
    setReplyingTo(null);
    setEditingMessage(null);
    setLocalSearchActive(false);
    setLocalSearchQuery("");
    fetchMessages(thread.chatType, thread.id, true);
    setMobileShowChat(true);
  }, [fetchMessages]);

  const handleStartDirectChat = (user) => {
    setActiveTab("direct");
    setActiveChatType("direct");
    setActiveThreadId(user.id);
    setActiveThreadName(user.full_name || user.username);
    setReplyingTo(null);
    setEditingMessage(null);
    setLocalSearchActive(false);
    setLocalSearchQuery("");
    fetchMessages("direct", user.id, true);
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

  // context menus triggers
  const triggerContextMenu = (e, item, type) => {
    e.preventDefault();
    const menuWidth = 240;
    const menuHeight = type === "message" ? 190 : 150;
    let x = e.clientX;
    let y = e.clientY;
    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10;
    if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 10;
    setContextMenu({ visible: true, x, y, target: item, type });
  };

  const handleTogglePin = (id) => {
    setPinnedChats(prev => {
      const updated = prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id];
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

  const handleToggleMute = (id) => {
    setMutedChats(prev => {
      const updated = prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id];
      localStorage.setItem("muted_chats", JSON.stringify(updated));
      return updated;
    });
  };

  const scrollToMessage = (id) => {
    const el = document.getElementById(`msg-bubble-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const bubble = el.querySelector(".msg-bubble");
      if (bubble) {
        const origBg = bubble.style.background;
        const origBorder = bubble.style.border;
        bubble.style.background = "rgba(235, 37, 37, 0.25)";
        bubble.style.border = "1.5px solid #eb2525";
        setTimeout(() => {
          bubble.style.background = origBg;
          bubble.style.border = origBorder;
        }, 1000);
      }
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

          let payload = activeChatType === "direct" 
            ? { message: "[Голосовое сообщение]", attachment_url: attachmentUrl, recipient_id: activeThreadId, reply_to_id: replyingTo ? replyingTo.id : null }
            : { message: "[Голосовое сообщение]", attachment_url: attachmentUrl, user_id: activeThreadId, reply_to_id: replyingTo ? replyingTo.id : null };

          const res = await axios.post(`${API_URL}/api/feedback`, payload, axiosConfig);
          setMessages((prev) => [...prev, res.data]);
          setReplyingTo(null);
          
          if (activeChatType === "support") fetchSupportThreads();
          else if (activeChatType === "direct") fetchDirectThreads();
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

  // Filter threads and sort pinned to top with strict type safety and deduplication
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
    
    const filtered = mapped.filter((t) => t.name?.toLowerCase().includes(threadSearch.toLowerCase()));
    
    // Strict Deduplicate by id (which is user_id)
    const seenIds = new Set();
    const unique = [];
    for (const t of filtered) {
      const uId = Number(t.id);
      if (!seenIds.has(uId)) {
        seenIds.add(uId);
        unique.push(t);
      }
    }
    
    // Sort: Pinned first, then by date desc
    return unique.sort((a, b) => {
      const isPinnedA = pinnedChats.map(Number).includes(Number(a.id));
      const isPinnedB = pinnedChats.map(Number).includes(Number(b.id));
      if (isPinnedA && isPinnedB) {
        // Sort by index in pinnedChats array
        const idxA = pinnedChats.map(Number).indexOf(Number(a.id));
        const idxB = pinnedChats.map(Number).indexOf(Number(b.id));
        return idxA - idxB;
      }
      if (isPinnedA && !isPinnedB) return -1;
      if (!isPinnedA && isPinnedB) return 1;
      
      const timeA = new Date(a.last_message_at || 0).getTime();
      const timeB = new Date(b.last_message_at || 0).getTime();
      return timeB - timeA;
    });
  }, [activeTab, supportThreads, directThreads, threadSearch, pinnedChats]);

  const pinnedThreads = useMemo(() => {
    return displayThreads.filter(t => pinnedChats.map(Number).includes(Number(t.id)));
  }, [displayThreads, pinnedChats]);

  const unpinnedThreads = useMemo(() => {
    return displayThreads.filter(t => !pinnedChats.map(Number).includes(Number(t.id)));
  }, [displayThreads, pinnedChats]);

  const handleReorderPinned = (newOrder) => {
    const newPinnedIds = newOrder.map(t => Number(t.id));
    setPinnedChats(newPinnedIds);
    localStorage.setItem("pinned_chats", JSON.stringify(newPinnedIds));
  };

  // Filter messages based on local query search
  const filteredMessages = useMemo(() => {
    if (!localSearchActive || !localSearchQuery.trim()) return messages;
    const query = localSearchQuery.toLowerCase().trim();
    return messages.filter(m => m.message?.toLowerCase().includes(query));
  }, [messages, localSearchActive, localSearchQuery]);

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    try {
      const d = new Date(timeStr);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
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

  const isSendActive = newMessage.trim() !== "" || file !== null;

  return (
    <div className="feedback-container" onMouseDown={handleGlobalRipple} style={{ fontFamily: EMOJI_FONT_STACK }}>
      <Helmet><title>Панель обратной связи</title></Helmet>
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
      <AnimatePresence>
        {contextMenu.visible && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
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
                        onClick={() => handleReact(contextMenu.target.id, emoji)}
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
                  {/* Plus button to show all emotions */}
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
                    {((activeChatType === "direct" && contextMenu.target.user_id === currentUserId) ||
                      (activeChatType === "support" && contextMenu.target.is_operator)) && (
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
                    setSelectedChatIds([contextMenu.target.id]);
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
                    handleTogglePin(contextMenu.target.id);
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
                  <Pin size={14} /> {pinnedChats.map(Number).includes(Number(contextMenu.target.id)) ? "Открепить" : "Закрепить"}
                </button>
                {pinnedChats.map(Number).includes(Number(contextMenu.target.id)) && (
                  <>
                    <button 
                      onClick={() => { movePinnedChat(contextMenu.target.id, "up"); setContextMenu({ ...contextMenu, visible: false }); }}
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
                      onClick={() => { movePinnedChat(contextMenu.target.id, "down"); setContextMenu({ ...contextMenu, visible: false }); }}
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
                    handleToggleMute(contextMenu.target.id);
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
                  {mutedChats.map(Number).includes(Number(contextMenu.target.id)) ? <Bell size={14} /> : <BellOff size={14} />} 
                  {mutedChats.map(Number).includes(Number(contextMenu.target.id)) ? "Включить звук" : "Без звука"}
                </button>
                <button 
                  onClick={() => {
                    handleDeleteChat(contextMenu.target.id);
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
          </motion.div>
        )}
      </AnimatePresence>
      
      <style>{`
        .feedback-container {
          display: flex;
          height: calc(100vh - 64px);
          background: var(--bg-color);
          color: var(--text-color);
          overflow: hidden;
          padding: 24px;
          gap: 20px;
        }

        /* Sidebar */
        .feedback-sidebar {
          width: 340px;
          background: var(--bg-surface, var(--bg-sidebar));
          border: 1px solid var(--border-color);
          border-radius: 18px;
          box-shadow: 0 4px 10px rgba(15, 23, 42, 0.06);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          transition: all 0.3s;
          overflow: hidden;
          height: 100%;
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
        .search-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          margin-bottom: 12px;
        }
        .search-wrapper svg {
          position: absolute;
          left: 12px;
          color: var(--text-secondary);
        }
        .search-wrapper input {
          width: 100%;
          padding: 8px 12px 8px 36px;
          background: var(--bg-color);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          color: var(--text-color);
          font-size: 13.5px;
          outline: none;
          font-family: ${EMOJI_FONT_STACK};
        }
        .search-wrapper input:focus {
          border-color: var(--primary-color);
        }
        .tabs-container {
          display: flex;
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 8px;
        }
        .tab-btn {
          flex: 1;
          background: none;
          border: none;
          padding: 8px 4px;
          font-size: 13px;
          color: var(--text-secondary);
          cursor: pointer;
          border-bottom: 2px solid transparent;
          font-weight: 500;
        }
        .tab-btn.active {
          color: var(--primary-color);
          border-bottom-color: var(--primary-color);
          font-weight: 600;
        }

        /* Threads List */
        .threads-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .thread-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid transparent;
        }
        .thread-item:hover {
          background: var(--bg-secondary);
        }
        .thread-item.active {
          background: rgba(235, 37, 37, 0.08);
          border-color: rgba(235, 37, 37, 0.15);
        }
        .thread-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(var(--primary-rgb), 0.1);
          color: var(--primary-color);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
          flex-shrink: 0;
        }
        .thread-info {
          flex: 1;
          min-width: 0;
        }
        .thread-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }
        .thread-name {
          font-weight: 600;
          font-size: 14px;
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
          background: #ef4444;
          color: white;
          font-size: 10px;
          font-weight: 700;
          border-radius: 10px;
          padding: 2px 6px;
          min-width: 18px;
          text-align: center;
        }

        /* Chat Pane */
        .feedback-chat {
          flex: 1;
          background: var(--bg-surface, var(--bg-sidebar));
          border: 1px solid var(--border-color);
          border-radius: 18px;
          box-shadow: 0 4px 10px rgba(15, 23, 42, 0.06);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          height: 100%;
        }
        .chat-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--bg-sidebar);
          z-index: 10;
        }
        .chat-title-info h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          color: var(--text-color);
        }
        .chat-title-info span {
          font-size: 11px;
          color: var(--text-secondary);
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
          padding: 4px;
        }
        
        .chat-instructions-banner {
          background: rgba(59, 130, 246, 0.08);
          border-bottom: 1px solid rgba(59, 130, 246, 0.15);
          padding: 8px 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #2563eb;
          font-size: 12px;
        }

        .chat-messages {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          background: var(--bg-color);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .msg-bubble-wrapper {
          display: flex;
          flex-direction: column;
          max-width: 75%;
        }
        .msg-bubble-wrapper.outgoing {
          align-self: flex-end;
        }
        .msg-bubble-wrapper.incoming {
          align-self: flex-start;
        }
        .msg-sender {
          font-size: 11px;
          color: var(--text-secondary);
          margin-bottom: 4px;
          margin-left: 12px;
        }
        .msg-bubble {
          padding: 10px 14px;
          border-radius: 16px;
          font-size: 14.5px;
          line-height: 1.4;
          word-break: break-word;
          position: relative;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          transition: background 0.5s, border-color 0.5s;
        }
        .outgoing .msg-bubble {
          background: #eb2525 !important;
          color: #ffffff !important;
          border-bottom-right-radius: 4px;
        }
        .incoming .msg-bubble {
          background: var(--bg-surface, #ffffff) !important;
          color: var(--text-color, #1e293b) !important;
          border: 1px solid var(--border-color, #e2e8f0) !important;
          border-bottom-left-radius: 4px;
        }
        .msg-attachment img {
          max-width: 100%;
          border-radius: 8px;
          margin-top: 8px;
        }
        .msg-meta {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 4px;
          font-size: 9px;
          opacity: 0.7;
          margin-top: 4px;
        }

        .chat-input-bar {
          padding: 16px;
          background: var(--bg-sidebar);
          border-top: 1px solid var(--border-color);
          position: relative;
        }
        .chat-input-form {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .chat-input-form input, .chat-input-form textarea {
          flex: 1;
          background: var(--bg-color);
          border: 1px solid var(--border-input);
          border-radius: 24px;
          padding: 10px 18px;
          color: var(--text-color);
          font-size: 14.5px;
          outline: none;
          font-family: ${EMOJI_FONT_STACK} !important;
        }
        .chat-input-form input:focus, .chat-input-form textarea:focus {
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
          background: var(--text-color, #0f172a);
          color: white;
          border: none;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .chat-empty-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          padding: 30px;
          text-align: center;
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
        @keyframes pulse {
          0% { opacity: 0.4; }
          50% { opacity: 1; }
          100% { opacity: 0.4; }
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
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
            <>
              {pinnedThreads.length > 0 && (
                <Reorder.Group axis="y" values={pinnedThreads} onReorder={handleReorderPinned} style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {pinnedThreads.map((thread) => {
                    const isActive = activeChatType === thread.chatType && activeThreadId === thread.id;
                    const initials = thread.name ? thread.name.substring(0, 2).toUpperCase() : "?";
                    const isMuted = mutedChats.map(Number).includes(Number(thread.id));

                    return (
                      <Reorder.Item
                        key={`${thread.chatType}-${thread.id}`}
                        value={thread}
                        as="div"
                        style={{ listStyle: "none", padding: 0, margin: 0 }}
                      >
                        <div
                          className={`thread-item ${isActive ? "active" : ""}`}
                          onClick={() => handleSelectThread(thread)}
                          onContextMenu={(e) => triggerContextMenu(e, thread, "thread")}
                          style={{
                            border: "1.5px solid #3b82f6",
                            position: "relative",
                            background: "var(--bg-secondary, rgba(59, 130, 246, 0.04))",
                            cursor: "grab"
                          }}
                        >
                          <div className="thread-avatar">
                            {thread.isSupportTicket ? <Shield size={18} /> : initials}
                          </div>
                          <div className="thread-info">
                            <div className="thread-meta">
                              <span className="thread-name" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                {thread.name}
                                <Pin size={10} style={{ transform: "rotate(45deg)", color: "#3b82f6" }} />
                                {isMuted && <BellOff size={10} style={{ color: "#f59e0b" }} />}
                              </span>
                              <span className="thread-time">{formatTime(thread.last_message_at)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span className="thread-msg" dangerouslySetInnerHTML={{ __html: formatMessageText(thread.message) || "Вложение/Диалог начат" }} />
                              {thread.unread_count > 0 && <span className="unread-badge">{thread.unread_count}</span>}
                            </div>
                          </div>
                        </div>
                      </Reorder.Item>
                    );
                  })}
                </Reorder.Group>
              )}
              {unpinnedThreads.map((thread) => {
                const isActive = activeChatType === thread.chatType && activeThreadId === thread.id;
                const initials = thread.name ? thread.name.substring(0, 2).toUpperCase() : "?";
                const isMuted = mutedChats.map(Number).includes(Number(thread.id));

                return (
                  <div
                    key={`${thread.chatType}-${thread.id}`}
                    className={`thread-item ${isActive ? "active" : ""}`}
                    onClick={() => handleSelectThread(thread)}
                    onContextMenu={(e) => triggerContextMenu(e, thread, "thread")}
                    style={{
                      border: "1.5px solid transparent",
                      position: "relative",
                      cursor: "pointer"
                    }}
                  >
                    <div className="thread-avatar">
                      {thread.isSupportTicket ? <Shield size={18} /> : initials}
                    </div>
                    <div className="thread-info">
                      <div className="thread-meta">
                        <span className="thread-name" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          {thread.name}
                          {isMuted && <BellOff size={10} style={{ color: "#f59e0b" }} />}
                        </span>
                        <span className="thread-time">{formatTime(thread.last_message_at)}</span>
                      </div>
                       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span className="thread-msg" dangerouslySetInnerHTML={{ __html: formatMessageText(thread.message) || "Вложение/Диалог начат" }} />
                        {thread.unread_count > 0 && <span className="unread-badge">{thread.unread_count}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* New Chat Button */}
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
            {/* CHAT HEADER */}
            <div className="chat-header">
              <div style={{display: "flex", alignItems: "center", gap: "8px"}}>
                <button className="btn-back-list" onClick={() => setMobileShowChat(false)}><ArrowLeft size={20} /></button>
                <div className="chat-title-info">
                  <h3>{activeThreadName}</h3>
                  <span><Shield size={12} /> {activeChatType === "support" ? "Обращение об ошибке" : "Личное сообщение"}</span>
                </div>
              </div>

              {/* Chat Actions Toggles */}
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                {/* Search toggle */}
                <button 
                  onClick={() => setLocalSearchActive(!localSearchActive)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: localSearchActive ? "#eb2525" : "var(--text-secondary)" }}
                >
                  <Search size={18} />
                </button>
                {/* Mute toggle */}
                <button 
                  onClick={() => handleToggleMute(activeThreadId)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
                >
                  {mutedChats.map(Number).includes(Number(activeThreadId)) ? <BellOff size={18} style={{ color: "#f59e0b" }} /> : <Bell size={18} />}
                </button>
                {/* Pin toggle */}
                <button 
                  onClick={() => handleTogglePin(activeThreadId)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
                >
                  <Pin size={18} style={{ transform: pinnedChats.map(Number).includes(Number(activeThreadId)) ? "rotate(45deg)" : "none", color: pinnedChats.map(Number).includes(Number(activeThreadId)) ? "#3b82f6" : "inherit" }} />
                </button>
                {/* Delete Chat toggle */}
                <button 
                  onClick={() => handleDeleteChat(activeThreadId)}
                  title="Очистить историю сообщений"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
                >
                  <Trash2 size={18} />
                </button>
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

            {/* Local Search input */}
            {localSearchActive && (
              <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--border-color)", background: "var(--bg-sidebar)" }}>
                <input 
                  type="text"
                  placeholder="Поиск по сообщениям..."
                  value={localSearchQuery}
                  onChange={(e) => setLocalSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 14px",
                    borderRadius: "10px",
                    border: "1px solid var(--border-color)",
                    fontSize: "13px",
                    background: "var(--bg-color)",
                    color: "var(--text-color)",
                    outline: "none"
                  }}
                />
              </div>
            )}

            {/* MESSAGES VIEW */}
            {loadingChat ? (
              <LoadingSkeleton />
            ) : (
              <div className="chat-messages">
                {filteredMessages.length === 0 ? (
                  <div className="chat-empty-state"><MessageSquare size={48} /><h3>Обращение пусто</h3></div>
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
                          const isOutgoing = activeChatType === "support" ? group.is_operator : group.user_id === currentUserId;
                          return (
                            <motion.div
                              key={group.id}
                              layout
                              initial={{ opacity: 0, y: 15, scale: 0.96 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9, height: 0, overflow: "hidden", margin: 0, padding: 0 }}
                              transition={{ duration: 0.22, ease: "easeOut" }}
                              className={`msg-bubble-wrapper ${isOutgoing ? "outgoing" : "incoming"} ${activeChatType === "direct" ? "direct-msg" : ""}`}
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: isOutgoing ? "flex-end" : "flex-start",
                                marginBottom: "8px"
                              }}
                            >
                              {!isOutgoing && activeChatType === "support" && (
                                <span className="msg-sender" style={{ alignSelf: "flex-start", marginBottom: "4px" }}>{group.messages[0].username}</span>
                              )}
                              <div style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "4px",
                                justifyContent: isOutgoing ? "flex-end" : "flex-start",
                                maxWidth: "80%"
                              }}>
                                {group.messages.map(msg => (
                                  <div key={msg.id} id={`msg-bubble-${msg.id}`} onContextMenu={(e) => triggerContextMenu(e, msg, "message")} style={{ position: "relative" }}>
                                    <img src={`${API_URL}${msg.attachment_url}`} style={{ width: group.messages.length > 1 ? "140px" : "200px", height: group.messages.length > 1 ? "140px" : "auto", objectFit: "cover", borderRadius: "12px", cursor: "pointer", border: isOutgoing ? "none" : "1px solid var(--border-color, #e2e8f0)", boxShadow: "0 2px 5px rgba(0,0,0,0.04)" }} alt="img" onClick={() => setSelectedImage(`${API_URL}${msg.attachment_url}`)} />
                                    <div style={{ position: "absolute", bottom: "6px", right: "6px", background: "rgba(0,0,0,0.4)", borderRadius: "12px", padding: "2px 6px", display: "flex", alignItems: "center", gap: "4px" }}>
                                      <span style={{ fontSize: "9px", color: "white" }}>{formatTime(msg.created_at)}</span>
                                      {isOutgoing && <span>{msg.is_read ? <CheckCheck size={10} color="white" /> : <Check size={10} color="white" />}</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          );
                        }

                        const msg = group;
                        const isOutgoing = activeChatType === "support" ? msg.is_operator : msg.user_id === currentUserId;
                        const isVoice = msg.attachment_url && msg.attachment_url.match(/\.(webm|wav|ogg|mp3|m4a|caf)$/i);

                        return (
                          <motion.div 
                            key={msg.id} 
                            layout
                            initial={{ opacity: 0, y: 15, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9, height: 0, overflow: "hidden", margin: 0, padding: 0 }}
                            transition={{ duration: 0.22, ease: "easeOut" }}
                            id={`msg-bubble-${msg.id}`}
                            className={`msg-bubble-wrapper ${isOutgoing ? "outgoing" : "incoming"} ${activeChatType === "direct" ? "direct-msg" : ""}`}
                            onContextMenu={(e) => triggerContextMenu(e, msg, "message")}
                          >
                            {!isOutgoing && activeChatType === "support" && (
                              <span className="msg-sender">{msg.username}</span>
                            )}

                            <div className="msg-bubble">
                              {/* Reply snippet inside bubble */}
                              {msg.reply_to_id && (
                                <div 
                                  onClick={() => scrollToMessage(msg.reply_to_id)}
                                  style={{
                                    padding: "6px 8px",
                                    background: isOutgoing ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.05)",
                                    borderLeft: isOutgoing ? "3px solid white" : "3px solid #eb2525",
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

                              {isVoice && (
                                <AudioPlayer src={`${API_URL}${msg.attachment_url}`} isOut={isOutgoing} />
                              )}

                              {/* Attachment file before message */}
                              {msg.attachment_url && !isVoice && (
                                <div style={{ marginBottom: msg.message ? "8px" : "0", marginTop: msg.reply_to_id ? "8px" : "0" }}>
                                  {msg.attachment_url.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                                    <img 
                                      src={`${API_URL}${msg.attachment_url}`} 
                                      style={{ maxWidth: "100%", borderRadius: "8px", cursor: "pointer" }} 
                                      alt="img"
                                      onClick={() => setSelectedImage(`${API_URL}${msg.attachment_url}`)}
                                    />
                                  ) : (
                                    <a href={`${API_URL}${msg.attachment_url}`} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: "inherit", background: isOutgoing ? "rgba(255,255,255,0.15)" : "var(--bg-color, #f1f5f9)", padding: "8px 12px", borderRadius: "10px", border: isOutgoing ? "none" : "1px solid var(--border-color, #e2e8f0)", transition: "opacity 0.2s" }} onMouseEnter={e => e.currentTarget.style.opacity=0.8} onMouseLeave={e => e.currentTarget.style.opacity=1}>
                                      <div style={{ width: "36px", height: "36px", flexShrink: 0, background: isOutgoing ? "rgba(255,255,255,0.2)" : "white", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <img src={filePng} alt="file" style={{ width: "24px", height: "24px", objectFit: "contain" }} />
                                      </div>
                                      <div style={{ overflow: "hidden", flex: 1 }}>
                                        <div style={{ fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: isOutgoing ? "white" : "var(--text-color, #1e293b)" }}>
                                          {msg.attachment_url.split('/').pop() || "Документ"}
                                        </div>
                                        <div style={{ fontSize: "11px", color: isOutgoing ? "rgba(255,255,255,0.8)" : "var(--text-secondary, #64748b)", marginTop: "2px" }}>
                                          Файл
                                        </div>
                                      </div>
                                    </a>
                                  )}
                                </div>
                              )}

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
                                        background: isOutgoing 
                                          ? (hasMyReaction ? "rgba(255, 255, 255, 0.25)" : "rgba(255, 255, 255, 0.12)")
                                          : (hasMyReaction ? "rgba(235, 37, 37, 0.08)" : "rgba(0, 0, 0, 0.04)"),
                                        border: "none",
                                        borderRadius: "12px",
                                        padding: "2px 6px",
                                        fontSize: "11px",
                                        color: isOutgoing ? "#ffffff" : (hasMyReaction ? "#eb2525" : "inherit"),
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

                              <div className="msg-meta">
                                <span>{formatTime(msg.created_at)}</span>
                                {isOutgoing && (
                                  <span style={{ marginLeft: 4 }}>
                                    {msg.is_read ? <CheckCheck size={14} color="#4ade80" /> : <Check size={14} opacity={0.7} />}
                                  </span>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      });
                    })()}
                  </AnimatePresence>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}

            {/* INPUT PANEL */}
            <div className="chat-input-bar">
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

              {file && (
                <div className="file-preview">
                  <Paperclip size={14} /> Выбран файл: {file.name}
                  <button onClick={() => setFile(null)} style={{background:"none", border:"none", color:"red", cursor:"pointer"}}>x</button>
                </div>
              )}
              {showEmojiPicker && !isRecording && (
                <div className="emoji-picker-container">
                  <EmojiPicker onEmojiClick={(e) => setNewMessage(prev => prev + e.emoji)} theme={theme} emojiStyle="apple" />
                </div>
              )}

              {/* Voice Recording Panel */}
              {isRecording ? (
                <div style={{ display: "flex", gap: "10px", alignItems: "center", justifyContent: "space-between", padding: "6px 8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "red", fontSize: "14px", fontWeight: 600 }}>
                    <span style={{ width: "8px", height: "8px", background: "red", borderRadius: "50%", display: "inline-block", animation: "pulse 1s infinite" }} />
                    Запись: {recordingTime} сек.
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button type="button" onClick={cancelRecording} style={{ background: "rgba(0,0,0,0.05)", border: "none", padding: "8px 16px", borderRadius: "20px", cursor: "pointer", fontSize: "13px", color: "#64748b" }}>
                      Отмена
                    </button>
                    <button type="button" onClick={stopRecording} style={{ background: "#eb2525", border: "none", padding: "8px 16px", borderRadius: "20px", cursor: "pointer", fontSize: "13px", color: "white", fontWeight: 650 }}>
                      Отправить
                    </button>
                  </div>
                </div>
              ) : (
                /* Standard input bar */
                <form onSubmit={handleSendMessage} className="chat-input-form">
                  <button type="button" className="icon-btn" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                    <Smile size={22} />
                  </button>
                  <label className="icon-btn">
                    <Paperclip size={22} />
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
                    placeholder="Напишите ответ..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    disabled={sending}
                    style={{
                      flex: 1,
                      background: "var(--bg-color)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "18px",
                      padding: "8px 16px",
                      color: "var(--text-color)",
                      fontSize: "14.5px",
                      outline: "none",
                      fontFamily: EMOJI_FONT_STACK,
                      resize: "none",
                      height: "36px",
                      minHeight: "36px",
                      maxHeight: "120px",
                      lineHeight: "1.4",
                      overflowY: "auto"
                    }}
                  />

                  {/* Voice mic or ChatGPT Send Button */}
                  {!isSendActive ? (
                    <button type="button" className="icon-btn" onClick={startRecording}>
                      <Mic size={22} />
                    </button>
                  ) : (
                    <button type="submit" className="chat-send-btn" disabled={sending}>
                      <ArrowUp size={18} strokeWidth={2.5} />
                    </button>
                  )}
                </form>
              )}
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
