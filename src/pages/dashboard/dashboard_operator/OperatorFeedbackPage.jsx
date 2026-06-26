import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import axios from "axios";
import { 
  Send, MessageSquare, Search, User, Clock, ArrowLeft, Shield, Info, 
  Paperclip, Smile, UserPlus, X, Check, CheckCheck,
  Mic, Trash2, CornerUpLeft, Edit3, Pin, Bell, BellOff, ArrowUp, ArrowDown, PlusCircle,
  CheckSquare, CheckCircle2, CornerUpRight, Copy, AlertCircle, CheckCircle
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

const parseForwardedMessage = (text) => {
  if (!text) return { isForwarded: false, cleanText: "" };
  const matchNew = text.match(/^<!--fwd:(\d+):(.+?)-->/);
  if (matchNew) {
    const fwdId = Number(matchNew[1]);
    const fwdName = matchNew[2];
    const cleanText = text.replace(/^<!--fwd:\d+:.+?-->Переслано от [^:\n]+(:\n?)?/, "");
    return { isForwarded: true, fwdId, fwdName, cleanText };
  }
  const matchOld = text.match(/^Переслано от ([^:\n]+)(:\n?)?/);
  if (matchOld) {
    const fwdName = matchOld[1];
    const cleanText = text.replace(/^Переслано от [^:\n]+(:\n?)?/, "");
    return { isForwarded: true, fwdId: 0, fwdName, cleanText };
  }
  return { isForwarded: false, cleanText: text };
};

const formatMessageText = (text) => {
  if (!text) return "";
  
  let prefix = "";
  const fwdMatch = text.match(/^<!--fwd:\d+:(.+?)-->/);
  if (fwdMatch) {
    prefix = `↪️ Переслано от ${fwdMatch[1]}: `;
    text = text.replace(/^<!--fwd:\d+:.+?-->Переслано от [^:\n]+(:\n?)?/, "");
  } else {
    const oldMatch = text.match(/^Переслано от ([^:\n]+)(:\n?)?/);
    if (oldMatch) {
      prefix = `↪️ Переслано от ${oldMatch[1]}: `;
      text = text.replace(/^Переслано от [^:\n]+(:\n?)?/, "");
    }
  }

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

  return prefix + escaped;
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
  const contextMenuRef = useRef(null);
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
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [currentPinIndex, setCurrentPinIndex] = useState(0);
  const [pinnedBarVisible, setPinnedBarVisible] = useState(true);
  const [allPinsModalOpen, setAllPinsModalOpen] = useState(false);

  // Advanced Features: Message Selection & Forwarding
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [isMessageSelectionMode, setIsMessageSelectionMode] = useState(false);
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [forwardSearchQuery, setForwardSearchQuery] = useState("");
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [notification, setNotification] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [selectedForwardThreads, setSelectedForwardThreads] = useState([]);
  const [focusedForwardIndex, setFocusedForwardIndex] = useState(-1);
  const [focusedUserIndex, setFocusedUserIndex] = useState(-1);

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

  const showToast = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    setFocusedForwardIndex(-1);
  }, [forwardSearchQuery, forwardModalOpen]);

  useEffect(() => {
    if (focusedForwardIndex >= 0) {
      const el = document.getElementById(`fwd-thread-${focusedForwardIndex}`);
      if (el) el.scrollIntoView({ block: "nearest" });
    }
  }, [focusedForwardIndex]);

  useEffect(() => {
    setFocusedUserIndex(-1);
  }, [userSearchQuery, showNewChatModal]);

  useEffect(() => {
    if (focusedUserIndex >= 0) {
      const el = document.getElementById(`new-chat-user-${focusedUserIndex}`);
      if (el) el.scrollIntoView({ block: "nearest" });
    }
  }, [focusedUserIndex]);

  // Notification auto-dismiss timer
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Reset userSearchQuery and focusedUserIndex on new chat modal close
  useEffect(() => {
    if (!showNewChatModal) {
      setUserSearchQuery("");
      setFocusedUserIndex(-1);
    }
  }, [showNewChatModal]);

  const handleToggleForwardThread = (thread) => {
    setSelectedForwardThreads(prev => {
      const exists = prev.some(t => t.id === thread.id && t.chatType === thread.chatType);
      if (exists) {
        return prev.filter(t => !(t.id === thread.id && t.chatType === thread.chatType));
      } else {
        return [...prev, thread];
      }
    });
  };

  const handleForwardInputKeyDown = (e) => {
    if (filteredForwardThreads.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedForwardIndex(prev => (prev + 1) % filteredForwardThreads.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedForwardIndex(prev => (prev - 1 + filteredForwardThreads.length) % filteredForwardThreads.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (focusedForwardIndex >= 0 && focusedForwardIndex < filteredForwardThreads.length) {
        handleToggleForwardThread(filteredForwardThreads[focusedForwardIndex]);
      }
    }
  };

  const handleNewChatInputKeyDown = (e) => {
    if (filteredUsers.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedUserIndex(prev => (prev + 1) % filteredUsers.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedUserIndex(prev => (prev - 1 + filteredUsers.length) % filteredUsers.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (focusedUserIndex >= 0 && focusedUserIndex < filteredUsers.length) {
        handleStartDirectChat(filteredUsers[focusedUserIndex]);
      }
    }
  };

  const handleConfirmForward = async () => {
    if (selectedForwardThreads.length === 0) return;
    const axiosConfig = { headers: { Authorization: `Bearer ${token}` } };
    const sortedIds = [...selectedMessageIds].sort((a, b) => a - b);
    setSending(true);
    try {
      for (const targetThread of selectedForwardThreads) {
        for (const msgId of sortedIds) {
          const msg = messages.find(m => m.id === msgId);
          if (!msg) continue;
          
          let textToSend = "";
          if (msg.message) {
            const isAlreadyForwarded = msg.message.startsWith("<!--fwd:") || msg.message.startsWith("Переслано от ");
            if (isAlreadyForwarded) {
              textToSend = msg.message;
            } else {
              let senderName = msg.username || (msg.is_operator ? "Оператор" : "Пользователь");
              let fwdComment = `<!--fwd:${msg.user_id || 0}:${senderName}-->`;
              let forwardPrefix = `${fwdComment}Переслано от ${senderName}:\n`;
              textToSend = `${forwardPrefix}${msg.message}`;
            }
          } else {
            let senderName = msg.username || (msg.is_operator ? "Оператор" : "Пользователь");
            let fwdComment = `<!--fwd:${msg.user_id || 0}:${senderName}-->`;
            textToSend = `${fwdComment}Переслано от ${senderName}`;
          }
          
          const payload = {
            message: textToSend,
            attachment_url: msg.attachment_url || "",
            recipient_id: targetThread.chatType === "direct" ? targetThread.id : 0,
            reply_to_id: null
          };
          await axios.post(`${API_URL}/api/feedback`, payload, axiosConfig);
        }
      }
      setIsMessageSelectionMode(false);
      setSelectedMessageIds([]);
      setForwardModalOpen(false);
      setSelectedForwardThreads([]);
      if (selectedForwardThreads.length === 1 && selectedForwardThreads[0].chatType === "direct") {
        handleNavigateToDirectChat(selectedForwardThreads[0].id, selectedForwardThreads[0].name);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
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

  const filteredForwardThreads = useMemo(() => {
    return forwardThreadsList.filter(t => t.name.toLowerCase().includes(forwardSearchQuery.toLowerCase()));
  }, [forwardThreadsList, forwardSearchQuery]);

  const handleForwardMessages = async (targetThread) => {
    const axiosConfig = { headers: { Authorization: `Bearer ${token}` } };
    const sortedIds = [...selectedMessageIds].sort((a, b) => a - b);
    setSending(true);
    try {
      for (const msgId of sortedIds) {
        const msg = messages.find(m => m.id === msgId);
        if (!msg) continue;
        
        let textToSend = "";
        if (msg.message) {
          const isAlreadyForwarded = msg.message.startsWith("<!--fwd:") || msg.message.startsWith("Переслано от ");
          if (isAlreadyForwarded) {
            textToSend = msg.message;
          } else {
            let senderName = msg.username || (msg.is_operator ? "Оператор" : "Пользователь");
            let fwdComment = `<!--fwd:${msg.user_id || 0}:${senderName}-->`;
            let forwardPrefix = `${fwdComment}Переслано от ${senderName}:\n`;
            textToSend = `${forwardPrefix}${msg.message}`;
          }
        } else {
          let senderName = msg.username || (msg.is_operator ? "Оператор" : "Пользователь");
          let fwdComment = `<!--fwd:${msg.user_id || 0}:${senderName}-->`;
          textToSend = `${fwdComment}Переслано от ${senderName}`;
        }
        
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
    setConfirmModal({
      message: `Вы уверены, что хотите удалить ${selectedMessageIds.length} сообщений?`,
      onConfirm: async () => {
        setConfirmModal(null);
        const axiosConfig = { headers: { Authorization: `Bearer ${token}` } };
        setSending(true);
        let deletedCount = 0;
        let forbiddenCount = 0;
        try {
          for (const msgId of selectedMessageIds) {
            try {
              await axios.delete(`${API_URL}/api/feedback/${msgId}`, axiosConfig);
              deletedCount++;
            } catch (err) {
              if (err.response && err.response.status === 403) {
                forbiddenCount++;
              }
            }
          }
          setIsMessageSelectionMode(false);
          setSelectedMessageIds([]);
          fetchMessages(activeChatType, activeThreadId);
          if (activeChatType === "support") fetchSupportThreads();
          else if (activeChatType === "direct") fetchDirectThreads();
          if (forbiddenCount > 0) {
            showToast(`Удалено ${deletedCount} сообщений. ${forbiddenCount} сообщений других пользователей нельзя удалить.`, "error");
          } else {
            showToast("Сообщения успешно удалены");
          }
        } catch (err) {
          console.error("Error bulk deleting messages:", err);
          showToast("Ошибка при удалении сообщений", "error");
        } finally {
          setSending(false);
        }
      }
    });
  };

  const handleBulkCopyMessages = () => {
    const selectedMsgs = messages
      .filter(m => selectedMessageIds.includes(m.id))
      .sort((a, b) => a.id - b.id);
    const textToCopy = selectedMsgs.map(m => m.message || "").filter(Boolean).join("\n");
    navigator.clipboard.writeText(textToCopy);
    handleExitMessageSelection();
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
    const closeMenu = (e) => {
      if (contextMenuRef.current && contextMenuRef.current.contains(e.target)) return;
      setContextMenu(prev => {
        if (!prev.visible) return prev;
        return { visible: false, x: 0, y: 0, target: null, type: "" };
      });
      setShowReactionPicker(false);
    };
    window.addEventListener("mousedown", closeMenu);
    return () => window.removeEventListener("mousedown", closeMenu);
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

  const fetchPinnedMessages = useCallback(async (type, threadId) => {
    if (!threadId || !token) return;
    try {
      const url = type === "support"
        ? `${API_URL}/api/feedback/pins?userId=${threadId}`
        : `${API_URL}/api/feedback/pins?chatWith=${threadId}`;
      const res = await axios.get(url, axiosConfig);
      setPinnedMessages(res.data || []);
    } catch (err) {
      console.error("Error fetching pinned messages:", err);
    }
  }, [token]);

  const handlePinMessage = async (msgId) => {
    try {
      await axios.post(`${API_URL}/api/feedback/${msgId}/pin`, {}, axiosConfig);
      fetchMessages(activeChatType, activeThreadId);
      fetchPinnedMessages(activeChatType, activeThreadId);
      setCurrentPinIndex(0);
      setPinnedBarVisible(true);
    } catch (err) {
      const errMsg = err.response?.data?.error || "Не удалось закрепить сообщение";
      showToast(errMsg, "error");
    }
  };

  const handleUnpinMessage = async (msgId) => {
    try {
      await axios.post(`${API_URL}/api/feedback/${msgId}/unpin`, {}, axiosConfig);
      fetchMessages(activeChatType, activeThreadId);
      fetchPinnedMessages(activeChatType, activeThreadId);
    } catch (err) {
      const errMsg = err.response?.data?.error || "Не удалось открепить сообщение";
      showToast(errMsg, "error");
    }
  };

  const confirmPinMessage = (msgId) => {
    setConfirmModal({
      message: "Закрепить это сообщение?",
      onConfirm: () => {
        setConfirmModal(null);
        handlePinMessage(msgId);
      }
    });
  };

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

  const scrollToBottom = (behavior = "smooth") => {
    if (!localSearchActive) {
      messagesEndRef.current?.scrollIntoView({ behavior });
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
        fetchPinnedMessages(activeChatType, activeThreadId);
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

  // Scroll to bottom instantly on chat switch and clear selections
  useEffect(() => {
    if (activeChatType && activeThreadId) {
      scrollToBottom("auto");
      fetchPinnedMessages(activeChatType, activeThreadId);
    }
    handleExitMessageSelection();
    handleExitChatSelection();
  }, [activeChatType, activeThreadId, mobileShowChat]);

  // Scroll to bottom smoothly on new messages
  useEffect(() => {
    if (activeChatType && activeThreadId) {
      markAsRead(activeChatType, activeThreadId);
      setTimeout(() => scrollToBottom("smooth"), 50);
    }
  }, [messages.length, markAsRead]);

  const handleMessagesScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    setShowScrollBottomBtn(scrollHeight - scrollTop - clientHeight > 300);
  };

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
    if (isChatSelectionMode) {
      handleSelectChat(thread.id);
    } else {
      setActiveChatType(thread.chatType);
      setActiveThreadId(thread.id);
      setActiveThreadName(thread.name);
      setReplyingTo(null);
      setEditingMessage(null);
      setLocalSearchActive(false);
      setLocalSearchQuery("");
      fetchMessages(thread.chatType, thread.id, true);
      setMobileShowChat(true);
    }
  }, [isChatSelectionMode, handleSelectChat, fetchMessages]);

  const handleNavigateToDirectChat = (userId, userName) => {
    if (userId === 0) return;
    setActiveTab("direct");
    setActiveChatType("direct");
    setActiveThreadId(userId);
    setActiveThreadName(userName);
    setReplyingTo(null);
    setEditingMessage(null);
    setLocalSearchActive(false);
    setLocalSearchQuery("");
    fetchMessages("direct", userId, true);
    setMobileShowChat(true);
    
    const threadExists = directThreads.some(t => t.user_id === userId);
    if (!threadExists) {
      setDirectThreads(prev => [
        {
          id: userId,
          user_id: userId,
          username: userName,
          name: userName,
          message: "",
          last_message_at: new Date().toISOString(),
          unread_count: 0,
          chatType: "direct"
        },
        ...prev
      ]);
    }
  };

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
    e.stopPropagation();
    const menuWidth = 240;
    const menuHeight = type === "message" ? 320 : 150;
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
        
        bubble.style.transition = "background 0.2s, border-color 0.2s";
        bubble.style.background = "#FFF9C4";
        bubble.style.color = "#1e293b";
        bubble.style.border = "1.5px solid #FFA726";
        
        setTimeout(() => {
          bubble.style.transition = "background 2s, border-color 2s";
          bubble.style.background = origBg;
          bubble.style.color = "";
          bubble.style.border = origBorder;
        }, 200);
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

  // --- Presence & Typing ---
  const [partnerPresence, setPartnerPresence] = useState({ isOnline: false, lastSeen: null });
  const [isSelfTyping, setIsSelfTyping] = useState(false);
  const selfTypingTimerRef = useRef(null);

  useEffect(() => {
    if (!activeThreadId || !token) return;
    const fetchPresence = async () => {
      try {
        const res = await axios.get(`${API_URL}/users/${activeThreadId}/presence`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPartnerPresence({ isOnline: res.data.is_online, lastSeen: res.data.last_seen ? new Date(res.data.last_seen) : null });
      } catch (_) {}
    };
    fetchPresence();
    const interval = setInterval(fetchPresence, 30000);
    return () => clearInterval(interval);
  }, [activeThreadId, token]);

  const formatPresence = ({ isOnline, lastSeen }) => {
    if (isOnline) return { label: 'В сети', color: '#22c55e' };
    if (!lastSeen) return { label: '', color: 'transparent' };
    const diff = Math.floor((Date.now() - new Date(lastSeen).getTime()) / 1000);
    if (diff < 60) return { label: 'Был(а) недавно', color: '#94a3b8' };
    if (diff < 3600) return { label: `Был(а) ${Math.floor(diff / 60)} мин. назад`, color: '#94a3b8' };
    if (diff < 86400) return { label: `Был(а) ${Math.floor(diff / 3600)} ч. назад`, color: '#94a3b8' };
    return { label: `Был(а) ${new Date(lastSeen).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`, color: '#94a3b8' };
  };

  const handleTypingChange = (e) => {
    setNewMessage(e.target.value);
    setIsSelfTyping(true);
    if (selfTypingTimerRef.current) clearTimeout(selfTypingTimerRef.current);
    selfTypingTimerRef.current = setTimeout(() => setIsSelfTyping(false), 2000);
  };

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
      
      {/* FORWARD CHAT MODAL */}
      <AnimatePresence>
        {/* Notification Toast */}
        {notification && (
          <motion.div
            key="notification-toast"
            initial={{ opacity: 0, y: -20, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
            style={{
              position: "fixed",
              top: "24px",
              right: "24px",
              zIndex: 999999,
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 18px",
              borderRadius: "12px",
              background: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: notification.type === "error" ? "1px solid rgba(239, 68, 68, 0.2)" : (notification.type === "warning" ? "1px solid rgba(245, 158, 11, 0.2)" : "1px solid rgba(16, 185, 129, 0.2)"),
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05), 0 20px 25px -5px rgba(0, 0, 0, 0.1)",
              color: "var(--text-color, #1e293b)",
              minWidth: "280px",
              maxWidth: "400px",
              fontFamily: EMOJI_FONT_STACK
            }}
          >
            <div style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: notification.type === "error" ? "rgba(239, 68, 68, 0.1)" : (notification.type === "warning" ? "rgba(245, 158, 11, 0.1)" : "rgba(16, 185, 129, 0.1)"),
              color: notification.type === "error" ? "#ef4444" : (notification.type === "warning" ? "#f59e0b" : "#10b981"),
              flexShrink: 0
            }}>
              {notification.type === "error" ? (
                <AlertCircle size={16} />
              ) : notification.type === "warning" ? (
                <Info size={16} />
              ) : (
                <CheckCircle size={16} />
              )}
            </div>
            <div style={{ flex: 1, fontSize: "13px", fontWeight: 600, lineHeight: 1.4 }}>
              {notification.message}
            </div>
            <button
              onClick={() => setNotification(null)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "2px",
                color: "var(--text-secondary, #94a3b8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "color 0.2s"
              }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--text-color, #1e293b)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary, #94a3b8)"}
            >
              <X size={16} />
            </button>
          </motion.div>
        )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 36000,
          backdropFilter: "blur(3px)"
        }} onClick={() => setConfirmModal(null)}>
          <div style={{
            background: "var(--bg-surface, #ffffff)",
            borderRadius: "16px",
            padding: "20px",
            width: "320px",
            boxShadow: "0 16px 48px rgba(0,0,0,0.2)",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            fontFamily: EMOJI_FONT_STACK
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: "16px", color: "var(--text-color)" }}>Подтверждение</div>
            <div style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.5 }}>{confirmModal.message}</div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "4px" }}>
              <button onClick={() => setConfirmModal(null)} style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid var(--border-color, #e2e8f0)",
                background: "transparent",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--text-secondary)"
              }}>Отмена</button>
              <button onClick={confirmModal.onConfirm} style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                background: "#eb2525",
                color: "white",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 600
              }}>Подтвердить</button>
            </div>
          </div>
        </div>
      )}

      {forwardModalOpen && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.3)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100009
          }}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{
                width: "100%",
                maxWidth: "400px",
                height: "450px",
                minHeight: "400px",
                background: "var(--bg-surface, white)",
                borderRadius: "16px",
                boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -10px rgba(0,0,0,0.1)",
                border: "1px solid var(--border-color, #e2e8f0)",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "16px"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--text-color, #1e293b)" }}>Переслать сообщения</h3>
                <button onClick={() => setForwardModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary, #64748b)" }}>
                  <X size={20} />
                </button>
              </div>

              <input 
                type="text"
                placeholder="Поиск чата..."
                value={forwardSearchQuery}
                onChange={(e) => setForwardSearchQuery(e.target.value)}
                onKeyDown={handleForwardInputKeyDown}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1px solid var(--border-color, #e2e8f0)",
                  fontSize: "14px",
                  background: "var(--bg-color, #f8fafc)",
                  color: "var(--text-color, #1e293b)",
                  outline: "none"
                }}
              />

              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                {forwardThreadsList
                  .filter(t => t.name.toLowerCase().includes(forwardSearchQuery.toLowerCase()))
                  .map((thread, index) => {
                    const isSelectedInFwd = selectedForwardThreads.some(t => t.id === thread.id && t.chatType === thread.chatType);
                    const isFocused = index === focusedForwardIndex;
                    return (
                      <button
                        key={`${thread.chatType}-${thread.id}`}
                        id={`fwd-thread-${index}`}
                        onClick={() => handleToggleForwardThread(thread)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          width: "100%",
                          padding: "10px 12px",
                          border: isFocused ? "1.5px solid #3b82f6" : "1.5px solid transparent",
                          borderRadius: "10px",
                          background: isFocused ? "rgba(59, 130, 246, 0.08)" : (isSelectedInFwd ? "rgba(59, 130, 246, 0.03)" : "transparent"),
                          cursor: "pointer",
                          textAlign: "left",
                          color: "var(--text-color, #1e293b)",
                          transition: "background 0.15s"
                        }}
                      >
                        <div style={{ flexShrink: 0, marginRight: "4px" }}>
                          {isSelectedInFwd ? (
                            <CheckCircle2 size={16} style={{ color: "#3b82f6", fill: "#3b82f6", stroke: "white" }} />
                          ) : (
                            <div style={{ width: "16px", height: "16px", borderRadius: "50%", border: "2px solid #cbd5e1" }} />
                          )}
                        </div>
                        <div style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          background: thread.chatType === "support" ? "#eb2525" : "#3b82f6",
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                          fontWeight: 600
                        }}>
                          {thread.chatType === "support" ? <Shield size={14} /> : thread.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontSize: "14px", fontWeight: 550, flex: 1 }}>{thread.name}</span>
                      </button>
                    );
                  })}
                {forwardThreadsList.filter(t => t.name.toLowerCase().includes(forwardSearchQuery.toLowerCase())).length === 0 && (
                  <div style={{ textAlign: "center", color: "var(--text-secondary, #64748b)", fontSize: "13px", padding: "10px 0" }}>
                    Чаты не найдены
                  </div>
                )}
              </div>

              <div style={{ borderTop: "1px solid var(--border-color, #e2e8f0)", paddingTop: "12px" }}>
                <button
                  onClick={handleConfirmForward}
                  disabled={selectedForwardThreads.length === 0}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "10px",
                    background: "#eb2525",
                    color: "white",
                    fontWeight: 600,
                    fontSize: "14px",
                    border: "none",
                    cursor: "pointer",
                    opacity: selectedForwardThreads.length === 0 ? 0.6 : 1,
                    transition: "opacity 0.2s"
                  }}
                >
                  Переслать ({selectedForwardThreads.length})
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* FLOAT CONTEXT MENU */}
      <AnimatePresence>
        {contextMenu.visible && (
          <motion.div 
            ref={contextMenuRef}
            onMouseDown={(e) => e.stopPropagation()}
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
                        onClick={() => { handleReact(contextMenu.target.id, emoji); setContextMenu({ ...contextMenu, visible: false }); }}
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
                        const msg = contextMenu.target;
                        setContextMenu({ ...contextMenu, visible: false });
                        if (msg.is_pinned) {
                          handleUnpinMessage(msg.id);
                        } else {
                          confirmPinMessage(msg.id);
                        }
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
                      📌 {contextMenu.target.is_pinned ? "Открепить" : "Закрепить"}
                    </button>
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
          position: relative;
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
          padding: 8px 16px 16px 16px;
          background: transparent;
          position: relative;
        }
        .chat-input-form {
          display: flex;
          gap: 8px;
          align-items: flex-end;
          background: var(--bg-sidebar, #ffffff);
          border: 1px solid var(--border-color, rgba(0,0,0,0.08));
          border-radius: 26px;
          padding: 6px 10px 6px 14px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.08);
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .chat-input-form:focus-within {
          border-color: var(--primary-color, #eb2525);
          box-shadow: 0 4px 20px rgba(235,37,37,0.12);
        }
        .chat-input-form input, .chat-input-form textarea {
          flex: 1;
          background: transparent !important;
          border: none !important;
          padding: 6px 0 !important;
          color: var(--text-color);
          font-size: 15px;
          outline: none !important;
          font-family: inherit !important;
          resize: none;
          max-height: 120px;
          line-height: 1.4;
          overflowY: auto;
          box-shadow: none !important;
        }
        .chat-input-form input:focus, .chat-input-form textarea:focus {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
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
          height: 34px;
          width: 34px;
          flex-shrink: 0;
          margin-bottom: 2px;
        }
        .icon-btn:hover {
          color: var(--primary-color);
        }
        .chat-send-btn {
          background: #eb2525;
          color: white;
          border: none;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
          margin-bottom: 2px;
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
          height: 500px;
          min-height: 400px;
          max-height: 90vh;
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
        @keyframes typingDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
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
                  <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                    <span><Shield size={12} /> {activeChatType === "support" ? "Обращение об ошибке" : "Личное сообщение"}</span>
                    {(() => { const p = formatPresence(partnerPresence); return p.label ? (
                      <span style={{ fontSize: "11px", color: p.color, display: "flex", alignItems: "center", gap: "4px" }}>
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: p.color, display: "inline-block" }} />
                        {p.label}
                      </span>
                    ) : null; })()}
                  </div>
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

            {/* PINNED MESSAGES BAR */}
            {pinnedMessages.length > 0 && pinnedBarVisible && (
              <div 
                style={{
                  background: theme === "dark" ? "#3E2C1A" : "#FFF8E1",
                  borderBottom: "1px solid var(--border-color)",
                  padding: "8px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  zIndex: 9,
                  position: "relative",
                  fontFamily: EMOJI_FONT_STACK
                }}
              >
                <div 
                  onClick={() => {
                    const currentPin = pinnedMessages[currentPinIndex];
                    if (currentPin) scrollToMessage(currentPin.id);
                  }}
                  style={{
                    flex: 1,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                    overflow: "hidden"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 700, color: "#FFA726" }}>
                    <span>📌 Закреплённое сообщение ({pinnedMessages.length})</span>
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        setAllPinsModalOpen(true);
                      }}
                      style={{
                        color: "#eb2525",
                        cursor: "pointer",
                        textDecoration: "underline",
                        marginLeft: "8px",
                        fontWeight: 600
                      }}
                    >
                      Показать все
                    </span>
                  </div>
                  {(() => {
                    const currentPin = pinnedMessages[currentPinIndex];
                    if (!currentPin) return null;
                    const cleanText = parseForwardedMessage(currentPin.message).cleanText || (currentPin.attachment_url ? "Вложение" : "");
                    const truncatedText = cleanText.length > 60 ? cleanText.substring(0, 60) + "..." : cleanText;
                    return (
                      <div style={{ fontSize: "12px", color: theme === "dark" ? "#e2e8f0" : "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        <strong>{currentPin.username || (currentPin.is_operator ? "Оператор" : "Пользователь")}:</strong> {truncatedText}
                      </div>
                    );
                  })()}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                  <span style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 550 }}>
                    {currentPinIndex + 1}/{pinnedMessages.length}
                  </span>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <button
                      onClick={() => {
                        setCurrentPinIndex(prev => (prev - 1 + pinnedMessages.length) % pinnedMessages.length);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-secondary)",
                        padding: "2px 6px",
                        fontSize: "14px",
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = "#eb2525"}
                      onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}
                    >
                      ❮
                    </button>
                    <button
                      onClick={() => {
                        setCurrentPinIndex(prev => (prev + 1) % pinnedMessages.length);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-secondary)",
                        padding: "2px 6px",
                        fontSize: "14px",
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = "#eb2525"}
                      onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}
                    >
                      ❯
                    </button>
                  </div>

                  <button
                    onClick={() => setPinnedBarVisible(false)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-secondary)",
                      padding: "4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                    onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* MESSAGES VIEW */}
            {loadingChat ? (
              <LoadingSkeleton />
            ) : (
              <div
                className="chat-messages"
                onScroll={handleMessagesScroll}
                onContextMenu={(e) => {
                  const clickedOnBackground = e.target === e.currentTarget ||
                    e.target.closest('[data-msg-bubble]') === null;
                  if (clickedOnBackground) {
                    e.preventDefault();
                    e.stopPropagation();
                    triggerContextMenu(e, null, "chatArea");
                  }
                }}
              >
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
                        
                        if (isImg && !hasText && !msg.reply_to_id && !msg.is_system) {
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
                                {group.messages.map(msg => {
                                  const isSelected = selectedMessageIds.includes(msg.id);
                                  const imgReactionGroups = getReactionGroups(msg.reactions, currentUserId);
                                  return (
                                    <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isOutgoing ? "flex-end" : "flex-start" }}>
                                      <div id={`msg-bubble-${msg.id}`} data-msg-bubble="true" onContextMenu={(e) => { e.stopPropagation(); triggerContextMenu(e, msg, "message"); }} style={{ position: "relative" }}>
                                        <img 
                                          src={`${API_URL}${msg.attachment_url}`} 
                                          style={{ 
                                            width: group.messages.length > 1 ? "140px" : "200px", 
                                            height: group.messages.length > 1 ? "140px" : "auto", 
                                            objectFit: "cover", 
                                            borderRadius: "12px", 
                                            cursor: "pointer", 
                                            border: isSelected ? "2px solid #3b82f6" : (isOutgoing ? "none" : "1px solid var(--border-color, #e2e8f0)"), 
                                            boxShadow: "0 2px 5px rgba(0,0,0,0.04)",
                                            display: "block"
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
                                        {isMessageSelectionMode && (
                                          <div onClick={() => handleSelectMessage(msg.id)} style={{ position: "absolute", top: "6px", left: "6px", zIndex: 10, cursor: "pointer" }}>
                                            {isSelected ? (
                                              <CheckCircle2 size={18} style={{ color: "#3b82f6", fill: "#3b82f6", stroke: "white" }} />
                                            ) : (
                                              <div style={{ width: "18px", height: "18px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.8)", background: "rgba(0,0,0,0.2)" }} />
                                            )}
                                          </div>
                                        )}
                                        <div style={{ position: "absolute", bottom: "6px", right: "6px", background: "rgba(0,0,0,0.4)", borderRadius: "12px", padding: "2px 6px", display: "flex", alignItems: "center", gap: "4px" }}>
                                          <span style={{ fontSize: "9px", color: "white" }}>{formatTime(msg.created_at)}</span>
                                          {isOutgoing && <span>{msg.is_read ? <CheckCheck size={10} color="white" /> : <Check size={10} color="white" />}</span>}
                                        </div>
                                      </div>
                                      {/* Reactions strip for album image */}
                                      {imgReactionGroups.length > 0 && (
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px", justifyContent: isOutgoing ? "flex-end" : "flex-start" }}>
                                          {imgReactionGroups.map(({ emoji, count, hasMyReaction }) => (
                                            <button
                                              key={emoji}
                                              onClick={(e) => { e.stopPropagation(); handleReact(msg.id, emoji); }}
                                              style={{
                                                background: isOutgoing
                                                  ? (hasMyReaction ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.12)")
                                                  : (hasMyReaction ? "rgba(235,37,37,0.08)" : "rgba(0,0,0,0.04)"),
                                                border: hasMyReaction
                                                  ? (isOutgoing ? "1px solid rgba(255,255,255,0.4)" : "1px solid rgba(235,37,37,0.3)")
                                                  : "1px solid transparent",
                                                borderRadius: "12px",
                                                padding: "2px 7px",
                                                fontSize: "11px",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "3px",
                                                cursor: "pointer",
                                                color: isOutgoing ? "#ffffff" : (hasMyReaction ? "#eb2525" : "inherit"),
                                                fontWeight: 600,
                                              }}
                                            >
                                              <img
                                                src={`https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.0.1/img/apple/64/${Array.from(emoji).map(c => c.codePointAt(0).toString(16).padStart(4, "0")).join("-")}.png`}
                                                alt={emoji}
                                                style={{ width: "14px", height: "14px", verticalAlign: "middle" }}
                                                onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.outerHTML = emoji; }}
                                              />
                                              {count > 1 && <span>{count}</span>}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </motion.div>
                          );
                        }

                        const msg = group;
                        if (msg.is_system) {
                          return (
                            <div 
                              key={msg.id}
                              style={{
                                display: "flex",
                                justifyContent: "center",
                                margin: "8px 0",
                                width: "100%"
                              }}
                            >
                              <div 
                                style={{
                                  background: theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
                                  color: theme === "dark" ? "#cbd5e1" : "#64748b",
                                  padding: "6px 14px",
                                  borderRadius: "12px",
                                  fontSize: "12px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                                }}
                              >
                                <span>
                                  {msg.system_type === "pin" ? "📌 " : "📎 "}
                                  <strong>{msg.username}</strong> {msg.message}
                                </span>
                                {msg.system_type === "pin" && msg.target_msg_id && (
                                  <button
                                    onClick={() => scrollToMessage(msg.target_msg_id)}
                                    style={{
                                      background: "transparent",
                                      border: "none",
                                      color: "#eb2525",
                                      cursor: "pointer",
                                      fontSize: "12px",
                                      fontWeight: 600,
                                      padding: "0 4px",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "2px"
                                    }}
                                  >
                                    Перейти ➜
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        }
                        const fwdInfo = parseForwardedMessage(msg.message);
                        const isOutgoing = activeChatType === "support" ? msg.is_operator : msg.user_id === currentUserId;
                        const isVoice = msg.attachment_url && msg.attachment_url.match(/\.(webm|wav|ogg|mp3|m4a|caf)$/i);

                        const isSelected = selectedMessageIds.includes(msg.id);

                        return (
                          <motion.div
  layout
  initial={{ opacity: 0, y: 15, scale: 0.96 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  exit={{ opacity: 0, scale: 0.9, height: 0, overflow: "hidden", margin: 0, padding: 0 }}
  transition={{ duration: 0.22, ease: "easeOut" }} 
                            key={msg.id}
                            onClick={isMessageSelectionMode ? () => handleSelectMessage(msg.id) : undefined}
                            style={{ 
                              display: "flex", 
                              alignItems: "center", 
                              gap: "10px", 
                              width: "100%", 
                              background: isMessageSelectionMode && isSelected ? "rgba(235, 37, 37, 0.08)" : "transparent",
                              padding: isMessageSelectionMode ? "6px 12px" : "0",
                              borderRadius: isMessageSelectionMode ? "8px" : "0",
                              transition: "background 0.2s",
                              cursor: isMessageSelectionMode ? "pointer" : "default"
                            }}
                          >
                            {isMessageSelectionMode && (
                              <div 
                                key="selection-checkbox"
                                style={{ cursor: "pointer", flexShrink: 0, paddingRight: "4px" }}
                              >
                                {isSelected ? (
                                  <CheckCircle2 size={20} style={{ color: "#eb2525", fill: "#eb2525", stroke: "white" }} />
                                ) : (
                                  <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: "2px solid #cbd5e1" }} />
                                )}
                              </div>
                            )}
                            <div 
                              key="bubble-container"
                              style={{
                                flex: 1,
                                display: "flex",
                                justifyContent: isOutgoing ? "flex-end" : "flex-start"
                              }}>
                              <div 





                                id={`msg-bubble-${msg.id}`}
                                className={`msg-bubble-wrapper ${isOutgoing ? "outgoing" : "incoming"} ${activeChatType === "direct" ? "direct-msg" : ""}`}
                                onContextMenu={(e) => triggerContextMenu(e, msg, "message")}
                                style={{
                                  cursor: isMessageSelectionMode ? "pointer" : "default",
                                  alignSelf: "auto"
                                }}
                              >
                            {!isOutgoing && activeChatType === "support" && (
                              <span className="msg-sender">{msg.username}</span>
                            )}

                             <div className="msg-bubble" style={{ position: "relative", paddingRight: msg.is_pinned ? "30px" : "16px" }}>
                               {msg.is_pinned && (
                                 <span 
                                   title="Закреплено" 
                                   style={{
                                     position: "absolute",
                                     top: "10px",
                                     right: "10px",
                                     fontSize: "10px",
                                     zIndex: 5
                                   }}
                                 >
                                   📌
                                 </span>
                               )}
                               {/* Forwarded Header Block */}
                              {fwdInfo.isForwarded && (
                                <div 
                                  onClick={fwdInfo.fwdId ? (e) => { e.stopPropagation(); handleNavigateToDirectChat(fwdInfo.fwdId, fwdInfo.fwdName); } : undefined}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    background: isOutgoing ? "rgba(255,255,255,0.15)" : "rgba(235,37,37,0.08)",
                                    borderLeft: isOutgoing ? "3px solid white" : "3px solid #eb2525",
                                    padding: "6px 10px",
                                    borderRadius: "6px",
                                    marginBottom: "6px",
                                    cursor: fwdInfo.fwdId ? "pointer" : "default",
                                    fontSize: "11px",
                                    fontWeight: 600,
                                    color: isOutgoing ? "white" : "var(--text-color, #1e293b)",
                                    transition: "opacity 0.2s"
                                  }}
                                  onMouseEnter={fwdInfo.fwdId ? e => e.currentTarget.style.opacity = 0.8 : undefined}
                                  onMouseLeave={fwdInfo.fwdId ? e => e.currentTarget.style.opacity = 1 : undefined}
                                >
                                  <CornerUpRight size={12} />
                                  <span>Переслано от {fwdInfo.fwdName}</span>
                                </div>
                              )}
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

                              {fwdInfo.cleanText && !isVoice && (
                                <motion.div 
                                  key={fwdInfo.cleanText}
                                  initial={{ scale: 0.97, opacity: 0.9 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ duration: 0.15 }}
                                  style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                                  dangerouslySetInnerHTML={{ __html: formatMessageText(fwdInfo.cleanText) }}
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
                          </div>
                        </div>
                      </motion.div>
                    );
                      });
                    })()}
                  </AnimatePresence>
                )}
                <div ref={messagesEndRef} />
                
                <AnimatePresence>
                  {showScrollBottomBtn && (
                    <motion.button
                      type="button"
                      initial={{ opacity: 0, scale: 0.8, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: 10 }}
                      onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
                      style={{
                        position: "absolute",
                        bottom: isMessageSelectionMode ? "130px" : "76px",
                        right: "20px",
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        background: "rgba(255, 255, 255, 0.9)",
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                        border: "1px solid var(--border-color)",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "#eb2525",
                        zIndex: 99,
                        transition: "background 0.2s, transform 0.1s"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#ffffff";
                        e.currentTarget.style.transform = "scale(1.05)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.9)";
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    >
                      <ArrowDown size={20} />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* INPUT PANEL */}
            <div className="chat-input-bar">
              {isMessageSelectionMode ? (
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center", 
                  width: "100%",
                  padding: "6px 8px"
                }}>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-color)" }}>
                    Выбрано: {selectedMessageIds.length}
                  </span>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button 
                      type="button" 
                      onClick={handleBulkCopyMessages} 
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "#10b981",
                        color: "white",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: "20px",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: 600,
                        transition: "opacity 0.2s"
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = 0.9}
                      onMouseLeave={e => e.currentTarget.style.opacity = 1}
                    >
                      <Copy size={14} /> Копировать
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setForwardModalOpen(true)} 
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "#3b82f6",
                        color: "white",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: "20px",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: 600,
                        transition: "opacity 0.2s"
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = 0.9}
                      onMouseLeave={e => e.currentTarget.style.opacity = 1}
                    >
                      <CornerUpRight size={14} /> Переслать
                    </button>
                    <button 
                      type="button" 
                      onClick={handleBulkDeleteMessages} 
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "#ef4444",
                        color: "white",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: "20px",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: 600,
                        transition: "opacity 0.2s"
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = 0.9}
                      onMouseLeave={e => e.currentTarget.style.opacity = 1}
                    >
                      <Trash2 size={14} /> Удалить
                    </button>
                    <button 
                      type="button" 
                      onClick={handleExitMessageSelection} 
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "rgba(0,0,0,0.05)",
                        color: "var(--text-color)",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: "20px",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: 600,
                        transition: "background 0.2s"
                      }}
                    >
                      <X size={14} /> Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <>
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
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <span style={{ fontWeight: 600 }}>Ответ на: </span>
                        <span dangerouslySetInnerHTML={{ __html: formatMessageText(replyingTo.message) || "Вложение" }} />
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
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <span style={{ fontWeight: 600 }}>Редактирование: </span>
                        <span dangerouslySetInnerHTML={{ __html: formatMessageText(editingMessage.message) || "" }} />
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
                    <>
                      {isSelfTyping && (
                        <div style={{ padding: "0 4px 6px", display: "flex", alignItems: "center", gap: "6px" }}>
                          <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
                            {[0, 0.18, 0.36].map((delay, i) => (
                              <span key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#94a3b8", display: "inline-block", animation: "typingDot 1.2s ease-in-out infinite", animationDelay: `${delay}s` }} />
                            ))}
                          </div>
                          <span style={{ fontSize: "11px", color: "#94a3b8", fontStyle: "italic" }}>печатаете...</span>
                        </div>
                      )}
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
                          onChange={handleTypingChange}
                          onKeyDown={handleKeyDown}
                          onPaste={handlePaste}
                          disabled={sending}
                          style={{
                            flex: 1,
                            background: "transparent",
                            border: "none",
                            color: "var(--text-color)",
                            fontSize: "15px",
                            outline: "none",
                            fontFamily: EMOJI_FONT_STACK,
                            resize: "none",
                            height: "36px",
                            minHeight: "36px",
                            maxHeight: "120px",
                            lineHeight: "1.4",
                            overflowY: "auto",
                            padding: "6px 4px 6px 0",
                            boxShadow: "none"
                          }}
                        />

                        <AnimatePresence mode="wait">
                          {!isSendActive ? (
                            <motion.button
                              key="mic-btn"
                              type="button"
                              className="icon-btn"
                              onClick={startRecording}
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.8, opacity: 0 }}
                              transition={{ duration: 0.15 }}
                            >
                              <Mic size={22} />
                            </motion.button>
                          ) : (
                            <motion.button
                              key="send-btn"
                              type="submit"
                              className="chat-send-btn"
                              disabled={sending}
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.8, opacity: 0 }}
                              transition={{ duration: 0.15 }}
                            >
                              <ArrowUp size={18} strokeWidth={2.5} />
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </form>
                    </>
                  )}
                </>
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
                  onKeyDown={handleNewChatInputKeyDown}
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
                filteredUsers.map((u, index) => {
                  const initials = u.full_name 
                    ? u.full_name.substring(0, 2).toUpperCase() 
                    : u.username ? u.username.substring(0, 2).toUpperCase() : "?";
                  
                  const details = [
                    u.email,
                    u.first_name || u.last_name ? `${u.first_name || ""} ${u.last_name || ""}`.trim() : null
                  ].filter(Boolean).join(" • ") || `@${u.username}`;

                  const isFocused = index === focusedUserIndex;
                  return (
                    <button 
                      key={u.id} 
                      id={`new-chat-user-${index}`}
                      className={`modal-user-item ${isFocused ? "focused" : ""}`} 
                      onClick={() => handleStartDirectChat(u)}
                      style={isFocused ? { background: "rgba(59, 130, 246, 0.08)", border: "1.5px solid #3b82f6" } : {}}
                    >
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

      {/* ALL PINNED MESSAGES MODAL */}
      {allPinsModalOpen && (
        <div 
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.45)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100010
          }}
          onClick={() => setAllPinsModalOpen(false)}
        >
          <div 
            style={{
              background: "var(--bg-surface, white)",
              borderRadius: "16px",
              border: "1px solid var(--border-color)",
              padding: "20px",
              width: "100%",
              maxWidth: "500px",
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)",
              fontFamily: EMOJI_FONT_STACK
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--text-color)" }}>
                📌 Закреплённые сообщения ({pinnedMessages.length})
              </h3>
              <button 
                onClick={() => setAllPinsModalOpen(false)} 
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", paddingRight: "4px" }}>
              {pinnedMessages.map((msg) => {
                const cleanText = parseForwardedMessage(msg.message).cleanText || (msg.attachment_url ? "Вложение" : "");
                return (
                  <div 
                    key={msg.id}
                    style={{
                      border: "1px solid var(--border-color)",
                      borderRadius: "12px",
                      padding: "12px",
                      background: "var(--bg-color, #f1f5f9)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "var(--text-secondary)" }}>
                      <span style={{ fontWeight: 650, color: "var(--text-color)" }}>
                        {msg.username || (msg.is_operator ? "Оператор" : "Пользователь")}
                      </span>
                      <span>{new Date(msg.created_at).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    
                    <div 
                      style={{ fontSize: "13px", color: "var(--text-color)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                      dangerouslySetInnerHTML={{ __html: formatMessageText(cleanText) }}
                    />
                    
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
                      <button
                        onClick={() => handleUnpinMessage(msg.id)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#ef4444",
                          fontSize: "12px",
                          cursor: "pointer",
                          fontWeight: 550
                        }}
                      >
                        Открепить
                      </button>
                      <button
                        onClick={() => {
                          setAllPinsModalOpen(false);
                          scrollToMessage(msg.id);
                        }}
                        style={{
                          background: "#eb2525",
                          border: "none",
                          color: "white",
                          borderRadius: "6px",
                          padding: "4px 10px",
                          fontSize: "12px",
                          cursor: "pointer",
                          fontWeight: 600,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        Перейти ➜
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
