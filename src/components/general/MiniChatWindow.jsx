import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ResizableBox } from "react-resizable";
import { X, Send, Paperclip, Smile, Check, CheckCheck, Maximize2, Minus } from "lucide-react";
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

  if (
    location.pathname.includes("/feedback") ||
    location.pathname.includes("/operator/feedback") ||
    location.pathname.includes("/submit-feedback")
  ) {
    return null;
  }
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [file, setFile] = useState(null);
  const [recipientId, setRecipientId] = useState(0);
  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  
  const messagesEndRef = useRef(null);
  const token = localStorage.getItem("access_token");
  
  const getUserIdFromToken = () => {
    try {
      if (!token) return 0;
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return Number(payload.user_id || 0);
    } catch { return 0; }
  };
  const currentUserId = getUserIdFromToken();

  useEffect(() => {
    if (!isMiniChatOpen) return;
    
    axios.get(`${API_URL}/users/id-by-username?username=mbarotov`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      if (res.data && res.data.id) setRecipientId(res.data.id);
    })
    .catch(err => console.error("Could not fetch mbarotov ID:", err));
  }, [isMiniChatOpen, token]);

  const fetchMessages = async () => {
    if (recipientId === 0 || !isMiniChatOpen) return;
    try {
      const url = `${API_URL}/api/feedback?chatWith=${recipientId}`;
      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      setMessages(res.data || []);
      
      // Auto-read in mini chat when open
      if (res.data && res.data.length > 0) {
        await axios.post(`${API_URL}/api/feedback/mark-read`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Error fetching mini messages:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isMiniChatOpen) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [recipientId, isMiniChatOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isMiniChatOpen]);

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

      await axios.post(`${API_URL}/api/feedback`, { 
        message: newMessage.trim(),
        attachment_url: attachmentUrl,
        recipient_id: recipientId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNewMessage("");
      setFile(null);
      setShowEmojiPicker(false);
      fetchMessages();
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    // Could add a toast here
  };

  return (
    <>
      <ImageModal 
        isOpen={!!selectedImage} 
        imageUrl={selectedImage} 
        onClose={() => setSelectedImage(null)} 
      />
      <AnimatePresence>
      {isMiniChatOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          style={{
            position: "fixed",
            bottom: "80px",
            right: "20px",
            zIndex: 9999,
          }}
          drag
          dragMomentum={false}
          dragConstraints={{ left: -1000, right: 0, top: -800, bottom: 0 }}
        >
          <ResizableBox
            width={380}
            height={500}
            minConstraints={[300, 400]}
            maxConstraints={[600, 800]}
            resizeHandles={['nw', 'sw', 'ne', 'se', 'n', 'e', 's', 'w']}
          >
            <div style={{
              width: "100%",
              height: "100%",
              background: "var(--bg-surface, #ffffff)",
              borderRadius: "16px",
              boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              border: "1px solid var(--border-color, #e2e8f0)",
              backdropFilter: "blur(10px)" // Glassmorphism touch
            }}>
              {/* Header (Drag Handle) */}
              <div 
                className="mini-chat-header"
                style={{
                  padding: "12px 16px",
                  background: "var(--bg-sidebar, #f8fafc)",
                  borderBottom: "1px solid var(--border-color, #e2e8f0)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "grab",
                  userSelect: "none"
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "15px", color: "var(--text-color)" }}>Актив чат</div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={closeMiniChat} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                    <Minus size={16} />
                  </button>
                  <button onClick={closeMiniChat} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Messages Area */}
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
                    const isOut = msg.user_id === currentUserId && !msg.is_operator;
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
                          background: isOut ? "#eb2525" : "#ffffff",
                          color: isOut ? "#ffffff" : "#1e293b",
                          padding: "10px 14px",
                          borderRadius: "14px",
                          borderBottomRightRadius: isOut ? "4px" : "14px",
                          borderBottomLeftRadius: !isOut ? "4px" : "14px",
                          boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
                          fontSize: "14px",
                          position: "relative"
                        }}
                      >
                        {hoveredMsgId === msg.id && msg.message && (
                          <div 
                            onClick={() => handleCopy(msg.message)}
                            style={{
                              position: "absolute",
                              top: "-15px",
                              right: isOut ? "auto" : "-10px",
                              left: isOut ? "-10px" : "auto",
                              background: "rgba(0,0,0,0.6)",
                              color: "white",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              fontSize: "10px",
                              cursor: "pointer",
                              zIndex: 10
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
                        <div style={{ fontSize: "10px", textAlign: "right", marginTop: "4px", opacity: 0.7 }}>
                          {formatTime(msg.created_at)}
                          {isOut && <span style={{ marginLeft: "4px" }}>{msg.is_read ? <CheckCheck size={12}/> : <Check size={12}/>}</span>}
                        </div>
                      </motion.div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div style={{
                padding: "12px",
                background: "var(--bg-sidebar, #ffffff)",
                borderTop: "1px solid var(--border-color, #e2e8f0)",
                position: "relative"
              }}>
                {showEmojiPicker && (
                  <div style={{ position: "absolute", bottom: "60px", right: "10px", zIndex: 10 }}>
                    <EmojiPicker onEmojiClick={(e) => setNewMessage(p => p + e.emoji)} theme={theme} width={280} height={300} />
                  </div>
                )}
                <form onSubmit={handleSendMessage} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} style={{ background: "none", border: "none", cursor: "pointer", color: "gray" }}>
                    <Smile size={20} />
                  </button>
                  <label style={{ cursor: "pointer", color: "gray", display: "flex", alignItems: "center" }}>
                    <Paperclip size={20} />
                    <input type="file" style={{ display: "none" }} onChange={(e) => setFile(e.target.files[0])} />
                  </label>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={file ? `Файл: ${file.name}` : "Сообщение..."}
                    style={{
                      flex: 1,
                      padding: "8px 14px",
                      borderRadius: "20px",
                      border: "1px solid #e2e8f0",
                      background: "var(--bg-color)",
                      color: "var(--text-color)",
                      outline: "none",
                      fontSize: "14px"
                    }}
                  />
                  <button 
                    type="submit" 
                    disabled={sending || (!newMessage.trim() && !file)}
                    style={{
                      background: "#eb2525",
                      color: "white",
                      border: "none",
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      opacity: (sending || (!newMessage.trim() && !file)) ? 0.5 : 1
                    }}
                  >
                    <Send size={16} />
                  </button>
                </form>
              </div>
            </div>
          </ResizableBox>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
};

export default MiniChatWindow;
