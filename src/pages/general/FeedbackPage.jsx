import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { 
  Send, AlertCircle, Paperclip, Smile, Check, CheckCheck,
  Search, Shield, Mic, Trash2, CornerUpLeft, Edit3, Pin, Bell, BellOff, ArrowUp, ArrowDown, PlusCircle,
  CheckSquare, X, CheckCircle2, CornerUpRight, Copy, CheckCircle, Info
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { Helmet } from "react-helmet";
import { motion, AnimatePresence } from "framer-motion";
import useThemeStore from "../../store/useThemeStore";
import ImageModal from "../../components/modal/ImageModal";
import PasteFileModal from "../../components/modal/PasteFileModal";
import filePng from "../../assets/file.png";

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
    const cleanText = text.replace(/^<!--fwd:\d+:.+?-->Переслано от .+?:\n?/, "");
    return { isForwarded: true, fwdId, fwdName, cleanText };
  }
  const matchOld = text.match(/^Переслано от (.+?):\n?/);
  if (matchOld) {
    const fwdName = matchOld[1];
    const cleanText = text.replace(/^Переслано от .+?:\n?/, "");
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
    text = text.replace(/^<!--fwd:\d+:.+?-->Переслано от .+?:\n?/, "");
  } else {
    const oldMatch = text.match(/^Переслано от (.+?):\n?/);
    if (oldMatch) {
      prefix = `↪️ Переслано от ${oldMatch[1]}: `;
      text = text.replace(/^Переслано от .+?:\n?/, "");
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
    </div>
  );
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

export default function FeedbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("access_token");
  const { theme } = useThemeStore();
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [file, setFile] = useState(null);
  const [recipientId, setRecipientId] = useState(0);
  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pastedFile, setPastedFile] = useState(null);
  const [partnerPresence, setPartnerPresence] = useState({ isOnline: false, lastSeen: null });
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [isSelfTyping, setIsSelfTyping] = useState(false);
  const selfTypingTimerRef = useRef(null);

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

  // Advanced Features: Context Menu
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, target: null, type: "" });
  const contextMenuRef = useRef(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  // Advanced Features: Replies & Editing
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);

  // Advanced Features: Selection & Forwarding
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [isMessageSelectionMode, setIsMessageSelectionMode] = useState(false);
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [forwardThreads, setForwardThreads] = useState([]);
  const [forwardSearchQuery, setForwardSearchQuery] = useState("");
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [notification, setNotification] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [selectedForwardThreads, setSelectedForwardThreads] = useState([]);
  const [focusedForwardIndex, setFocusedForwardIndex] = useState(-1);

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

  const fetchForwardThreads = async () => {
    const list = [{ id: 0, name: "Служба поддержки", chatType: "support" }];
    const token = localStorage.getItem("access_token");
    if (!token) {
      setForwardThreads(list);
      return;
    }
    try {
      const res = await axios.get(`${API_URL}/api/feedback/direct-threads`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const directList = (res.data || []).map(t => ({
        id: t.user_id,
        name: t.username,
        chatType: "direct"
      }));
      setForwardThreads([...list, ...directList]);
    } catch {
      setForwardThreads(list);
    }
  };

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

  const handleConfirmForward = async () => {
    if (selectedForwardThreads.length === 0) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
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
          await axios.post(`${API_URL}/api/feedback`, payload, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }
      }
      setIsMessageSelectionMode(false);
      setSelectedMessageIds([]);
      setForwardModalOpen(false);
      setSelectedForwardThreads([]);
      fetchMessages();
    } catch (err) {
      console.error("Error forwarding messages:", err);
      setErrorMsg("Не удалось переслать сообщения.");
    } finally {
      setSending(false);
    }
  };

  const handleForwardInputKeyDown = (e) => {
    const filtered = forwardThreads.filter(t => t.name.toLowerCase().includes(forwardSearchQuery.toLowerCase()));
    if (filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedForwardIndex(prev => (prev + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedForwardIndex(prev => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (focusedForwardIndex >= 0 && focusedForwardIndex < filtered.length) {
        handleToggleForwardThread(filtered[focusedForwardIndex]);
      }
    }
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

  const handleBulkDeleteMessages = async () => {
    if (!window.confirm(`Вы уверены, что хотите удалить ${selectedMessageIds.length} сообщений?`)) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    setSending(true);
    try {
      for (const msgId of selectedMessageIds) {
        const msg = messages.find(m => m.id === msgId);
        if (msg && !msg.is_operator && msg.user_id === currentUserId) {
          await axios.delete(`${API_URL}/api/feedback/${msgId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }
      }
      setIsMessageSelectionMode(false);
      setSelectedMessageIds([]);
      fetchMessages();
    } catch (err) {
      console.error("Error bulk deleting messages:", err);
      setErrorMsg("Ошибка при удалении сообщений.");
    } finally {
      setSending(false);
    }
  };

  const handleBulkCopyMessages = () => {
    const selectedMsgs = messages
      .filter(m => selectedMessageIds.includes(m.id))
      .sort((a, b) => a.id - b.id);
    const textToCopy = selectedMsgs.map(m => m.message || "").filter(Boolean).join("\n");
    navigator.clipboard.writeText(textToCopy);
    handleExitMessageSelection();
  };

  // Advanced Features: Voice Audio Messages
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);

  // Advanced Features: Header Toggles (Mute & Pin state)
  const [pinnedChats, setPinnedChats] = useState([]);
  const [mutedChats, setMutedChats] = useState([]);
  const [localSearchActive, setLocalSearchActive] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState("");

  const messagesEndRef = useRef(null);

  const getRoles = () => {
    try { return JSON.parse(localStorage.getItem("role_ids") || "[]"); } 
    catch { return []; }
  };
  const isOperator = getRoles().includes(3);
  
  const getUserIdFromToken = () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return 0;
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return Number(payload.user_id || 0);
    } catch { return 0; }
  };
  const currentUserId = getUserIdFromToken();

  useEffect(() => {
    if (isOperator) navigate("/operator/feedback");
  }, [isOperator, navigate]);

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

  // Load default recipient (mbarotov) and handle URL params for errors
  useEffect(() => {
    axios.get(`${API_URL}/users/id-by-username?username=mbarotov`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      if (res.data && res.data.id) {
        setRecipientId(res.data.id);
      }
    })
    .catch(err => console.error("Could not fetch mbarotov ID:", err));

    const searchParams = new URLSearchParams(location.search);
    const errParam = searchParams.get("errorMsg");
    const pageParam = searchParams.get("page");
    
    if (errParam) {
      setNewMessage(`Ошибка: ${errParam}\nСтраница: ${pageParam || "Неизвестно"}\n\n`);
    }
  }, [location, token]);

  const fetchMessages = async () => {
    if (recipientId === 0 || !token) return;
    try {
      const url = `${API_URL}/api/feedback?chatWith=${recipientId}`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Check for new messages to show notification
      if (messages.length > 0 && res.data && res.data.length > messages.length) {
        const newMsg = res.data[res.data.length - 1];
        const isMuted = mutedChats.includes(recipientId);

        if (newMsg.user_id !== currentUserId && "Notification" in window && !isMuted) {
           if (Notification.permission === "granted") {
              const notif = new Notification("Новое сообщение от поддержки", { body: newMsg.message || "Вложение" });
              notif.onclick = () => window.focus();
           } else if (Notification.permission !== "denied") {
              Notification.requestPermission();
           }
        }
      }
      
      setMessages(res.data || []);
      setErrorMsg("");
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    if (!token) return;
    try {
      await axios.post(`${API_URL}/api/feedback/mark-read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error("Error marking as read:", err);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [recipientId]);

  // Presence polling
  useEffect(() => {
    if (!recipientId || recipientId === 0 || !token) return;
    const fetchPresence = async () => {
      try {
        const res = await axios.get(`${API_URL}/users/${recipientId}/presence`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPartnerPresence({ isOnline: res.data.is_online, lastSeen: res.data.last_seen ? new Date(res.data.last_seen) : null });
      } catch (_) {}
    };
    fetchPresence();
    const presenceInterval = setInterval(fetchPresence, 30000);
    return () => clearInterval(presenceInterval);
  }, [recipientId, token]);

  const formatPresence = ({ isOnline, lastSeen }) => {
    if (isOnline) return { label: 'В сети', color: '#22c55e' };
    if (!lastSeen) return { label: '', color: 'transparent' };
    const diff = Math.floor((Date.now() - new Date(lastSeen).getTime()) / 1000);
    if (diff < 60) return { label: 'Был(а) недавно', color: '#94a3b8' };
    if (diff < 3600) return { label: `Был(а) ${Math.floor(diff/60)} мин. назад`, color: '#94a3b8' };
    if (diff < 86400) return { label: `Был(а) ${Math.floor(diff/3600)} ч. назад`, color: '#94a3b8' };
    return { label: `Был(а) ${new Date(lastSeen).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`, color: '#94a3b8' };
  };

  const handleTypingChange = (e) => {
    setNewMessage(e.target.value);
    setIsSelfTyping(true);
    if (selfTypingTimerRef.current) clearTimeout(selfTypingTimerRef.current);
    selfTypingTimerRef.current = setTimeout(() => setIsSelfTyping(false), 2000);
  };

  // Scroll to bottom instantly on chat switch and clear selections
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    handleExitMessageSelection();
  }, [recipientId]);

  // Notification auto-dismiss timer
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Scroll to bottom smoothly on new messages
  useEffect(() => {
    if (messages.length > 0) {
      markAsRead();
    }
    if (!localSearchActive) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, localSearchActive]);

  const handleMessagesScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    setShowScrollBottomBtn(scrollHeight - scrollTop - clientHeight > 300);
  };

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
        setErrorMsg("Не удалось отредактировать сообщение.");
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

      await axios.post(`${API_URL}/api/feedback`, { 
        message: newMessage.trim(),
        attachment_url: attachmentUrl,
        recipient_id: recipientId,
        reply_to_id: replyingTo ? replyingTo.id : null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNewMessage("");
      setFile(null);
      setReplyingTo(null);
      setShowEmojiPicker(false);
      fetchMessages();
    } catch (err) {
      setErrorMsg("Не удалось отправить сообщение. Попробуйте еще раз.");
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

      const payload = {
        message: fileMessage.trim(),
        attachment_url: attachmentUrl,
        recipient_id: recipientId,
        reply_to_id: replyingTo ? replyingTo.id : null
      };

      await axios.post(`${API_URL}/api/feedback`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setReplyingTo(null);
      fetchMessages();
    } catch (err) {
      console.error("Error sending pasted file:", err);
      setErrorMsg("Не удалось отправить файл. Попробуйте еще раз.");
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
    } catch (err) {
      setErrorMsg("Не удалось удалить сообщение.");
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

  const handleDeleteChat = async () => {
    if (!window.confirm("Вы уверены, что хотите очистить всю историю сообщений?")) return;
    try {
      await axios.delete(`${API_URL}/api/feedback/chat`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages([]);
      fetchMessages();
    } catch (err) {
      setErrorMsg("Не удалось очистить историю сообщений.");
    }
  };

  const onEmojiClick = (emojiObject) => {
    setNewMessage(prev => prev + emojiObject.emoji);
  };

  const formatTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

  // context menus triggers
  const triggerContextMenu = (e, item, type) => {
    e.preventDefault();
    e.stopPropagation();
    const menuWidth = 240;
    const menuHeight = type === "message" ? 320 : 120;
    let x = e.clientX;
    let y = e.clientY;
    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10;
    if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 10;
    setContextMenu({ visible: true, x, y, target: item, type });
  };

  const handleTogglePin = (id) => {
    setPinnedChats(prev => {
      const updated = prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id];
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

          await axios.post(`${API_URL}/api/feedback`, {
            message: "[Голосовое сообщение]",
            attachment_url: attachmentUrl,
            recipient_id: recipientId,
            reply_to_id: replyingTo ? replyingTo.id : null
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });

          setReplyingTo(null);
          fetchMessages();
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

  // Filter messages based on local query search
  const filteredMessages = useMemo(() => {
    if (!localSearchActive || !localSearchQuery.trim()) return messages;
    const query = localSearchQuery.toLowerCase().trim();
    return messages.filter(m => m.message?.toLowerCase().includes(query));
  }, [messages, localSearchActive, localSearchQuery]);

  const isSendActive = newMessage.trim() !== "" || file !== null;

  return (
    <div className="feedback-chat-container" onMouseDown={handleGlobalRipple} style={{ fontFamily: EMOJI_FONT_STACK }}>
      <Helmet><title>Обратная связь</title></Helmet>
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
                height: "480px",
                minHeight: "400px",
                background: "var(--bg-surface, white)",
                borderRadius: "16px",
                boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -10px rgba(0,0,0,0.1)",
                border: "1px solid var(--border-color)",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "16px"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--text-color)" }}>Переслать сообщения</h3>
                <button onClick={() => setForwardModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
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
                  border: "1px solid var(--border-color)",
                  fontSize: "14px",
                  background: "var(--bg-color)",
                  color: "var(--text-color)",
                  outline: "none"
                }}
              />

              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                {forwardThreads
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
                          color: "var(--text-color)",
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
                {forwardThreads.filter(t => t.name.toLowerCase().includes(forwardSearchQuery.toLowerCase())).length === 0 && (
                  <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "13px", padding: "10px 0" }}>
                    Чаты не найдены
                  </div>
                )}
              </div>

              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
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
            )}
            
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
                {contextMenu.type === "message" && (
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
                        fetchForwardThreads();
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
                    {((!contextMenu.target.is_operator && contextMenu.target.user_id === currentUserId)) && (
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
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .feedback-chat-container {
          display: flex;
          justify-content: center;
          align-items: center;
          height: calc(100vh - 64px);
          background: var(--bg-color);
          padding: 24px;
        }
        .chat-card {
          position: relative;
          width: 100%;
          max-width: 600px;
          height: 100%;
          max-height: 800px;
          background: var(--bg-surface, var(--bg-sidebar));
          border: 1px solid var(--border-color);
          border-radius: 18px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 10px rgba(15, 23, 42, 0.06);
          overflow: hidden;
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
        .chat-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: var(--text-color);
        }
        .chat-messages {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: var(--bg-color);
        }
        @keyframes messageAppear {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .message-bubble {
          max-width: 75%;
          padding: 12px 16px;
          border-radius: 16px;
          font-size: 14.5px;
          line-height: 1.4;
          position: relative;
          word-break: break-word;
          transition: background 0.5s, border-color 0.5s;
        }
        .message-outgoing {
          align-self: flex-end;
          background: #eb2525 !important;
          color: #ffffff !important;
          border-bottom-right-radius: 4px;
        }
        .message-incoming {
          align-self: flex-start;
          background: var(--bg-surface, #ffffff) !important;
          color: var(--text-color, #1e293b) !important;
          border: 1px solid var(--border-color, #e2e8f0) !important;
          border-bottom-left-radius: 4px;
        }
        .message-attachment img {
          max-width: 100%;
          border-radius: 8px;
          margin-top: 8px;
        }
        .message-time {
          font-size: 10px;
          opacity: 0.7;
          margin-top: 4px;
          text-align: right;
        }
        .chat-input-area {
          padding: 8px 16px 16px 16px;
          background: transparent;
          position: relative;
        }
        .chat-form {
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
        .chat-form:focus-within {
          border-color: var(--primary-color, #eb2525);
          box-shadow: 0 4px 20px rgba(235,37,37,0.12);
        }
        .chat-input {
          flex: 1;
          background: transparent;
          border: none;
          padding: 6px 0;
          color: var(--text-color);
          font-size: 15px;
          outline: none;
          font-family: inherit;
          resize: none;
          max-height: 120px;
          line-height: 1.4;
          overflowY: auto;
        }
        .chat-input:focus {
          border: none;
          outline: none;
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
        .chat-submit-btn {
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
        .chat-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .error-banner {
          background: rgba(235,37,37,0.1);
          color: #eb2525;
          padding: 12px;
          margin: 16px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
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

      <div className="chat-card">
        {/* HEADER */}
        <div className="chat-header">
          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
            <h2 style={{ margin: 0 }}>Служба поддержки</h2>
            {(() => { const p = formatPresence(partnerPresence); return p.label ? (
              <span style={{ fontSize: "11px", color: p.color, display: "flex", alignItems: "center", gap: "4px", lineHeight: 1 }}>
                <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: p.color, display: "inline-block", flexShrink: 0 }} />
                {p.label}
              </span>
            ) : null; })()}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Search in chat toggle */}
            <button 
              onClick={() => setLocalSearchActive(!localSearchActive)}
              style={{ background: "none", border: "none", cursor: "pointer", color: localSearchActive ? "#eb2525" : "var(--text-secondary)" }}
            >
              <Search size={18} />
            </button>
            {/* Mute toggle */}
            <button 
              onClick={() => handleToggleMute(recipientId)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
            >
              {mutedChats.includes(recipientId) ? <BellOff size={18} style={{ color: "#f59e0b" }} /> : <Bell size={18} />}
            </button>
            {/* Pin toggle */}
            <button 
              onClick={() => handleTogglePin(recipientId)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
            >
              <Pin size={18} style={{ transform: pinnedChats.includes(recipientId) ? "rotate(45deg)" : "none", color: pinnedChats.includes(recipientId) ? "#3b82f6" : "inherit" }} />
            </button>
            {/* Delete Chat toggle */}
            <button 
              onClick={handleDeleteChat}
              title="Очистить историю сообщений"
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="error-banner">
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

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

        {/* MESSAGES LIST */}
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
          {loading ? (
            <LoadingSkeleton />
          ) : filteredMessages.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-secondary)", marginTop: "40px" }}>
              Нет сообщений.
            </div>
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
                    const isOutgoing = group.user_id === currentUserId && !group.is_operator;
                    return (
                      <motion.div
                        key={group.id}
                        layout
                        initial={{ opacity: 0, y: 15, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, height: 0, overflow: "hidden", margin: 0, padding: 0 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        style={{
                          alignSelf: isOutgoing ? "flex-end" : "flex-start",
                          maxWidth: "80%",
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "4px",
                          justifyContent: isOutgoing ? "flex-end" : "flex-start",
                          marginBottom: "8px"
                        }}
                      >
                        {group.messages.map(msg => {
                          const isSelected = selectedMessageIds.includes(msg.id);
                          const imgReactionGroups = getReactionGroups(msg.reactions, currentUserId);
                          return (
                            <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isOutgoing ? "flex-end" : "flex-start" }}>
                              <div id={`msg-bubble-${msg.id}`} data-msg-bubble="true" onContextMenu={(e) => triggerContextMenu(e, msg, "message")} style={{ position: "relative" }}>
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
                      </motion.div>
                    );
                  }

                  const msg = group;
                  const fwdInfo = parseForwardedMessage(msg.message);
                  const isOutgoing = msg.user_id === currentUserId && !msg.is_operator;
                  const isVoice = msg.attachment_url && msg.attachment_url.match(/\.(webm|wav|ogg|mp3|m4a|caf)$/i);
                  const isSelected = selectedMessageIds.includes(msg.id);

                  return (
                    <motion.div 
                      key={msg.id}
                      layout
                      initial={{ opacity: 0, y: 15, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9, height: 0, overflow: "hidden", margin: 0, padding: 0 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
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
                          className={`message-bubble ${isOutgoing ? "message-outgoing" : "message-incoming"}`}
                          onContextMenu={(e) => triggerContextMenu(e, msg, "message")}
                          style={{
                            cursor: isMessageSelectionMode ? "pointer" : "default",
                          }}
                        >
                        {/* Forwarded Header Block */}
                        {fwdInfo.isForwarded && (
                          <div 
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              background: isOutgoing ? "rgba(255,255,255,0.15)" : "rgba(235,37,37,0.08)",
                              borderLeft: isOutgoing ? "3px solid white" : "3px solid #eb2525",
                              padding: "6px 10px",
                              borderRadius: "6px",
                              marginBottom: "6px",
                              fontSize: "11px",
                              fontWeight: 600,
                              color: isOutgoing ? "white" : "var(--text-color, #1e293b)"
                            }}
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

                        {/* Voice Audio */}
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
                                onClick={() => {
                                  if (isMessageSelectionMode) {
                                    handleSelectMessage(msg.id);
                                  } else {
                                    setSelectedImage(`${API_URL}${msg.attachment_url}`);
                                  }
                                }}
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

                        {/* Main text content */}
                        {fwdInfo.cleanText && !isVoice && (
                          <motion.div 
                            key={fwdInfo.cleanText}
                            initial={{ scale: 0.97, opacity: 0.9 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.15 }}
                            className="message-text"
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

                        <div className="message-time">
                          {formatTime(msg.created_at)}
                          {isOutgoing && (
                            <span style={{ marginLeft: 4, display: 'inline-flex', verticalAlign: 'middle' }}>
                              {msg.is_read ? <CheckCheck size={14} color="#4ade80" /> : <Check size={14} opacity={0.7} />}
                            </span>
                          )}
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
        </div>

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

        {/* INPUT FOOTER */}
        {isMessageSelectionMode ? (
          <div className="chat-input-area" style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            padding: "16px 20px", 
            background: "var(--bg-sidebar)",
            borderTop: "1px solid var(--border-color)",
            boxShadow: "0 -4px 12px rgba(0,0,0,0.03)"
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
                onClick={() => {
                  fetchForwardThreads();
                  setForwardModalOpen(true);
                }} 
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
                  fontWeight: 600
                }}
              >
                <X size={14} /> Отмена
              </button>
            </div>
          </div>
        ) : (
          <div className="chat-input-area">
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
                <EmojiPicker onEmojiClick={onEmojiClick} theme={theme} emojiStyle="apple" />
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
              <>
                {isSelfTyping && (
                  <div style={{ padding: "0 16px 6px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
                      {[0, 0.18, 0.36].map((delay, i) => (
                        <span key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#94a3b8", display: "inline-block", animation: "typingDot 1.2s ease-in-out infinite", animationDelay: `${delay}s` }} />
                      ))}
                    </div>
                    <span style={{ fontSize: "11px", color: "#94a3b8", fontStyle: "italic" }}>печатаете...</span>
                  </div>
                )}
                <form className="chat-form" onSubmit={handleSendMessage}>
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
                    className="chat-input"
                    placeholder="Напишите сообщение..."
                    value={newMessage}
                    onChange={handleTypingChange}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    disabled={sending}
                    style={{
                      resize: "none",
                      height: "36px",
                      minHeight: "36px",
                      maxHeight: "120px",
                      lineHeight: "1.4",
                      overflowY: "auto",
                      padding: "6px 4px 6px 0",
                      border: "none",
                      background: "transparent",
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
                        className="chat-submit-btn"
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
          </div>
        )}
      </div>
    </div>
  );
}
