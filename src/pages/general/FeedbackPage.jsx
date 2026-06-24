import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Send, AlertCircle, Paperclip, Smile } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { Helmet } from "react-helmet";
import useThemeStore from "../../store/useThemeStore";

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:7575";

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

  const messagesEndRef = useRef(null);

  const getRoles = () => {
    try { return JSON.parse(localStorage.getItem("role_ids") || "[]"); } 
    catch { return []; }
  };
  const isOperator = getRoles().includes(3);
  const currentUserId = Number(localStorage.getItem("user_id") || 0);

  useEffect(() => {
    if (isOperator) navigate("/operator/feedback");
  }, [isOperator, navigate]);

  // Handle URL params for errors
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const errParam = searchParams.get("errorMsg");
    const pageParam = searchParams.get("page");
    
    if (errParam) {
      setNewMessage(`Ошибка: ${errParam}\nСтраница: ${pageParam || "Неизвестно"}\n\n`);
      
      // Fetch mbarotov ID
      axios.get(`${API_URL}/api/users/id-by-username?username=mbarotov`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        if (res.data && res.data.id) {
          setRecipientId(res.data.id);
        }
      })
      .catch(err => console.error("Could not fetch mbarotov ID:", err));
    }
  }, [location, token]);

  const fetchMessages = async () => {
    try {
      // If we are talking to mbarotov, fetch direct messages with him
      const url = recipientId > 0 
        ? `${API_URL}/api/feedback?chatWith=${recipientId}` 
        : `${API_URL}/api/feedback`;
        
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Check for new messages to show notification
      if (messages.length > 0 && res.data && res.data.length > messages.length) {
        const newMsg = res.data[res.data.length - 1];
        if (newMsg.user_id !== currentUserId && "Notification" in window) {
           if (Notification.permission === "granted") {
              new Notification("Новое сообщение", { body: newMsg.message || "Вложение" });
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

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [recipientId]); // Re-fetch when recipientId changes

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        recipient_id: recipientId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNewMessage("");
      setFile(null);
      setShowEmojiPicker(false);
      fetchMessages();
    } catch (err) {
      setErrorMsg("Не удалось отправить сообщение. Попробуйте еще раз.");
    } finally {
      setSending(false);
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

  return (
    <div className="feedback-chat-container">
      <Helmet><title>Обратная связь</title></Helmet>
      <style>{`
        .feedback-chat-container {
          display: flex;
          justify-content: center;
          align-items: center;
          height: calc(100vh - 64px);
          background: var(--bg-color);
          padding: 24px;
          font-family: "Inter", sans-serif;
        }
        .chat-card {
          width: 100%;
          max-width: 600px;
          height: 100%;
          max-height: 800px;
          background: var(--bg-sidebar);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-lg);
          overflow: hidden;
        }
        .chat-header {
          padding: 20px;
          border-bottom: 1px solid var(--border-color);
          text-align: center;
          background: var(--bg-sidebar);
          z-index: 10;
        }
        .chat-header h2 {
          margin: 0;
          font-size: 20px;
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
        .message-bubble {
          max-width: 75%;
          padding: 12px 16px;
          border-radius: 16px;
          font-size: 15px;
          line-height: 1.4;
          position: relative;
          word-break: break-word;
        }
        .message-outgoing {
          align-self: flex-end;
          background: var(--primary-color);
          color: white;
          border-bottom-right-radius: 4px;
        }
        .message-incoming {
          align-self: flex-start;
          background: var(--bg-sidebar);
          color: var(--text-color);
          border: 1px solid var(--border-color);
          border-bottom-left-radius: 4px;
        }
        .message-attachment img {
          max-width: 100%;
          border-radius: 8px;
          margin-top: 8px;
        }
        .message-time {
          font-size: 11px;
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
          padding: 12px 20px;
          color: var(--text-color);
          font-size: 15px;
          outline: none;
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
          background: var(--primary-color);
          color: white;
          border: none;
          width: 44px;
          height: 44px;
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
      `}</style>

      <div className="chat-card">
        <div className="chat-header">
          <h2>{recipientId > 0 ? "Служба поддержки" : "Обратная связь"}</h2>
        </div>

        {errorMsg && (
          <div className="error-banner">
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="chat-messages">
          {loading ? (
            <div style={{ textAlign: "center", color: "var(--text-secondary)", marginTop: "20px" }}>
              Загрузка...
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-secondary)", marginTop: "40px" }}>
              Опишите вашу проблему, и мы вам поможем.
            </div>
          ) : (
            messages.map((msg) => {
              const isOutgoing = msg.user_id === currentUserId && !msg.is_operator;
              return (
                <div
                  key={msg.id}
                  className={`message-bubble ${isOutgoing ? "message-outgoing" : "message-incoming"}`}
                >
                  {msg.message && <div className="message-text" style={{ whiteSpace: "pre-wrap" }}>{msg.message}</div>}
                  {msg.attachment_url && (
                    <div className="message-attachment">
                      {msg.attachment_url.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                        <img src={`${API_URL}${msg.attachment_url}`} alt="attachment" />
                      ) : (
                        <a href={`${API_URL}${msg.attachment_url}`} target="_blank" rel="noreferrer" style={{color: "inherit", textDecoration: "underline"}}>
                          Скачать файл
                        </a>
                      )}
                    </div>
                  )}
                  <div className="message-time">{formatTime(msg.created_at)}</div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          {file && (
            <div className="file-preview">
              <Paperclip size={14} /> Выбран файл: {file.name}
              <button onClick={() => setFile(null)} style={{background:"none", border:"none", color:"red", cursor:"pointer"}}>x</button>
            </div>
          )}
          {showEmojiPicker && (
            <div className="emoji-picker-container">
              <EmojiPicker onEmojiClick={onEmojiClick} theme={theme} />
            </div>
          )}
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
            <button
              type="submit"
              className="chat-submit-btn"
              disabled={sending || (!newMessage.trim() && !file)}
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
