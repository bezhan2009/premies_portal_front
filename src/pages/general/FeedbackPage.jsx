import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { 
  Send, AlertCircle, Paperclip, Smile, Check, CheckCheck,
  ArrowLeft, Search, User, Shield, Mic, Trash2, 
  CornerUpLeft, Edit3, Pin, Bell, BellOff, ArrowUp
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { Helmet } from "react-helmet";
import useThemeStore from "../../store/useThemeStore";
import ImageModal from "../../components/modal/ImageModal";

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:7575";

// Custom font family stack with emoji support
const EMOJI_FONT_STACK = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'";

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

  // Advanced Features: Context Menu
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, target: null, type: "" });

  // Advanced Features: Replies & Editing
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);

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
    const closeMenu = () => setContextMenu({ visible: false, x: 0, y: 0, target: null, type: "" });
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
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

  useEffect(() => {
    if (messages.length > 0) {
      markAsRead();
    }
    if (!localSearchActive) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, localSearchActive]);

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

  const onEmojiClick = (emojiObject) => {
    setNewMessage(prev => prev + emojiObject.emoji);
  };

  const formatTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  // context menus triggers
  const triggerContextMenu = (e, item, type) => {
    e.preventDefault();
    const menuWidth = 160;
    const menuHeight = 140;
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
    <div className="feedback-chat-container" style={{ fontFamily: EMOJI_FONT_STACK }}>
      <Helmet><title>Обратная связь</title></Helmet>
      <ImageModal 
        isOpen={!!selectedImage} 
        imageUrl={selectedImage} 
        onClose={() => setSelectedImage(null)} 
      />

      {/* FLOAT CONTEXT MENU */}
      {contextMenu.visible && (
        <div 
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
            minWidth: "160px",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            fontFamily: EMOJI_FONT_STACK
          }}
        >
          <button 
            onClick={() => handleCopy(contextMenu.target.message)}
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
              setReplyingTo(contextMenu.target);
              setEditingMessage(null);
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
          {((!contextMenu.target.is_operator && contextMenu.target.user_id === currentUserId)) && (
            <>
              <button 
                onClick={() => {
                  setEditingMessage(contextMenu.target);
                  setNewMessage(contextMenu.target.message || "");
                  setReplyingTo(null);
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
                onClick={() => handleDeleteMessage(contextMenu.target.id)}
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
        </div>
      )}

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
          animation: messageAppear 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
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
          padding: 16px;
          background: var(--bg-sidebar);
          border-top: 1px solid var(--border-color);
          position: relative;
        }
        .chat-form {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .chat-input {
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
        .chat-input:focus {
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
        .chat-submit-btn {
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
      `}</style>

      <div className="chat-card">
        {/* HEADER */}
        <div className="chat-header">
          <h2>Служба поддержки</h2>
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
        <div className="chat-messages">
          {loading ? (
            <div style={{ textAlign: "center", color: "var(--text-secondary)", marginTop: "20px" }}>
              Загрузка...
            </div>
          ) : filteredMessages.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-secondary)", marginTop: "40px" }}>
              Нет сообщений.
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isOutgoing = msg.user_id === currentUserId && !msg.is_operator;
              const isVoice = msg.attachment_url && msg.attachment_url.match(/\.(webm|wav|ogg|mp3|m4a|caf)$/i);

              return (
                <div
                  key={msg.id}
                  id={`msg-bubble-${msg.id}`}
                  className={`message-bubble ${isOutgoing ? "message-outgoing" : "message-incoming"}`}
                  onContextMenu={(e) => triggerContextMenu(e, msg, "message")}
                >
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
                      <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {messages.find(m => m.id === msg.reply_to_id)?.message || "Вложение"}
                      </div>
                    </div>
                  )}

                  {msg.message && !isVoice && <div className="message-text" style={{ whiteSpace: "pre-wrap" }}>{msg.message}</div>}
                  
                  {isVoice && (
                    <AudioPlayer src={`${API_URL}${msg.attachment_url}`} isOut={isOutgoing} />
                  )}

                  {msg.attachment_url && !isVoice && (
                    <div className="message-attachment">
                      {msg.attachment_url.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                        <img 
                          src={`${API_URL}${msg.attachment_url}`} 
                          alt="attachment" 
                          style={{ cursor: "pointer" }}
                          onClick={() => setSelectedImage(`${API_URL}${msg.attachment_url}`)}
                        />
                      ) : (
                        <a href={`${API_URL}${msg.attachment_url}`} target="_blank" rel="noreferrer" style={{color: "inherit", textDecoration: "underline"}}>
                          Скачать файл
                        </a>
                      )}
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
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT FOOTER */}
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
              <EmojiPicker onEmojiClick={onEmojiClick} theme={theme} />
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
            <form className="chat-form" onSubmit={handleSendMessage}>
              <button type="button" className="icon-btn" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                <Smile size={22} />
              </button>
              <label className="icon-btn">
                <Paperclip size={22} />
                <input type="file" style={{ display: "none" }} onChange={(e) => setFile(e.target.files[0])} />
              </label>
              
              <input
                type="text"
                className="chat-input"
                placeholder="Напишите сообщение..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={sending}
              />

              {/* Voice mic or ChatGPT Send Button */}
              {!isSendActive ? (
                <button type="button" className="icon-btn" onClick={startRecording}>
                  <Mic size={22} />
                </button>
              ) : (
                <button
                  type="submit"
                  className="chat-submit-btn"
                  disabled={sending}
                >
                  <ArrowUp size={18} strokeWidth={2.5} />
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
