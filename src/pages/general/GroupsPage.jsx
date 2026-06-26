import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  Send, Paperclip, Smile, Search, Users, PlusCircle, X, 
  ChevronLeft, Info, Pin, Reply, Trash2, Shield, AlertCircle, FileText
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { Helmet } from "react-helmet";
import CreateGroupModal from "../../components/general/CreateGroupModal";
import GroupMembersModal from "../../components/general/GroupMembersModal";

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [groupDetails, setGroupDetails] = useState(null);
  
  // Search and input
  const [groupSearch, setGroupSearch] = useState("");
  const [inputText, setInputText] = useState("");
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  
  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  
  // Mobile responsiveness helper
  const [mobileShowChat, setMobileShowChat] = useState(false);
  
  // Hover & active message actions state
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:7575";
  const currentUserId = Number(localStorage.getItem("user_id") || 0);
  const userRoles = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("role_ids") || "[]");
    } catch {
      return [];
    }
  }, []);
  const isOperator = userRoles.includes(3);

  // Load groups on mount and every 10 seconds
  useEffect(() => {
    fetchGroups();
    const interval = setInterval(fetchGroups, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch messages when active group changes
  useEffect(() => {
    if (activeGroup) {
      fetchMessages();
      fetchGroupDetails();
      markAsRead();
      setReplyToMessage(null);
      setAttachedFile(null);
      setShowEmojiPicker(false);
      
      // Setup polling for messages in active group
      const interval = setInterval(fetchMessages, 4000);
      return () => clearInterval(interval);
    } else {
      setMessages([]);
      setGroupDetails(null);
    }
  }, [activeGroup]);

  // Scroll to bottom when messages list changes
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchGroups = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.get(`${API_URL}/api/groups`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGroups(res.data || []);
      
      // Update active group reference if it is loaded
      if (activeGroup) {
        const updatedActive = res.data.find(g => g.id === activeGroup.id);
        if (updatedActive) {
          setActiveGroup(updatedActive);
        }
      }
    } catch (err) {
      console.error("Error loading groups:", err);
    }
  };

  const fetchMessages = async () => {
    if (!activeGroup) return;
    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.get(`${API_URL}/api/groups/${activeGroup.id}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data || []);
    } catch (err) {
      console.error("Error loading messages:", err);
    }
  };

  const fetchGroupDetails = async () => {
    if (!activeGroup) return;
    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.get(`${API_URL}/api/groups/${activeGroup.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGroupDetails(res.data);
    } catch (err) {
      console.error("Error loading group details:", err);
    }
  };

  const markAsRead = async () => {
    if (!activeGroup) return;
    try {
      const token = localStorage.getItem("access_token");
      await axios.post(`${API_URL}/api/groups/${activeGroup.id}/mark-read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Update unread count locally
      setGroups(prev => prev.map(g => g.id === activeGroup.id ? { ...g, unread_count: 0 } : g));
    } catch (err) {
      console.error("Error marking as read:", err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSelectGroup = (group) => {
    setActiveGroup(group);
    setMobileShowChat(true);
  };

  const handleBackToSidebar = () => {
    setMobileShowChat(false);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.post(`${API_URL}/api/feedback/upload`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });
      
      if (res.data && res.data.file_url) {
        setAttachedFile({
          name: file.name,
          url: res.data.file_url,
          type: file.type
        });
      }
    } catch (err) {
      alert("Не удалось загрузить файл");
      console.error("File upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() && !attachedFile) return;

    try {
      const token = localStorage.getItem("access_token");
      const payload = {
        message: inputText.trim(),
        attachment_url: attachedFile ? attachedFile.url : "",
        reply_to_id: replyToMessage ? replyToMessage.id : null
      };

      const res = await axios.post(
        `${API_URL}/api/groups/${activeGroup.id}/messages`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setInputText("");
      setAttachedFile(null);
      setReplyToMessage(null);
      setMessages(prev => [...prev, res.data]);
      
      // Update groups list last message
      fetchGroups();
    } catch (err) {
      console.error("Error sending message:", err);
      alert(err.response?.data?.error || "Не удалось отправить сообщение");
    }
  };

  const handleReactMessage = async (msgId, emoji) => {
    try {
      const token = localStorage.getItem("access_token");
      await axios.post(
        `${API_URL}/api/groups/${activeGroup.id}/messages/${msgId}/react`,
        { emoji },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchMessages();
    } catch (err) {
      console.error("Error reacting to message:", err);
    }
  };

  const handlePinMessage = async (msgId) => {
    try {
      const token = localStorage.getItem("access_token");
      await axios.post(
        `${API_URL}/api/groups/${activeGroup.id}/messages/${msgId}/pin`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchMessages();
      fetchGroupDetails();
    } catch (err) {
      console.error("Error pinning message:", err);
    }
  };

  const handleUnpinMessage = async (msgId) => {
    try {
      const token = localStorage.getItem("access_token");
      await axios.post(
        `${API_URL}/api/groups/${activeGroup.id}/messages/${msgId}/unpin`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchMessages();
      fetchGroupDetails();
    } catch (err) {
      console.error("Error unpinning message:", err);
    }
  };

  const handleDeleteMessage = async (msgId) => {
    if (!window.confirm("Удалить это сообщение?")) return;
    try {
      const token = localStorage.getItem("access_token");
      await axios.delete(
        `${API_URL}/api/groups/${activeGroup.id}/messages/${msgId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages(prev => prev.filter(m => m.id !== msgId));
      fetchGroups();
    } catch (err) {
      console.error("Error deleting message:", err);
    }
  };

  const handleEmojiClick = (emojiObject) => {
    setInputText(prev => prev + emojiObject.emoji);
  };

  // Find pinned message in details or messages
  const pinnedMessage = useMemo(() => {
    return messages.find(m => m.is_pinned);
  }, [messages]);

  const handleScrollToMessage = (msgId) => {
    const element = document.getElementById(`msg-${msgId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.style.backgroundColor = "rgba(226, 26, 28, 0.1)";
      setTimeout(() => {
        element.style.backgroundColor = "";
      }, 2000);
    }
  };

  // Filter groups locally based on search input
  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(groupSearch.toLowerCase())
  );

  // Group member/admin flags for current user
  const isCurrentAdmin = groupDetails?.is_admin || false;

  const popularReactions = ["👍", "❤️", "🔥", "😂", "😮", "😢", "🎉"];

  return (
    <>
      <Helmet>
        <title>Группы — Актив портал</title>
      </Helmet>
      
      <div className="groups-page-container">
        
        {/* Left Sidebar */}
        <div className={`groups-sidebar ${mobileShowChat ? "hidden" : ""}`}>
          <div className="groups-sidebar-header">
            <div className="groups-sidebar-title-row">
              <span className="groups-sidebar-title">Групповые чаты</span>
              <button 
                className="create-group-btn" 
                onClick={() => setIsCreateModalOpen(true)}
                title="Создать группу"
              >
                <PlusCircle size={20} />
              </button>
            </div>
            
            <div className="groups-search-wrapper">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="groups-search-input"
                placeholder="Поиск групп..."
                value={groupSearch}
                onChange={e => setGroupSearch(e.target.value)}
              />
            </div>
          </div>
          
          <div className="groups-list">
            {filteredGroups.length > 0 ? (
              filteredGroups.map(group => {
                const isSelected = activeGroup?.id === group.id;
                const initials = group.name.charAt(0);
                
                // Colors based on group ID
                const bgColors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6"];
                const avatarBg = bgColors[group.id % bgColors.length];

                return (
                  <div 
                    key={group.id} 
                    className={`group-list-item ${isSelected ? "active" : ""}`}
                    onClick={() => handleSelectGroup(group)}
                  >
                    {group.avatar_url ? (
                      <img src={`${API_URL}${group.avatar_url}`} alt={group.name} className="group-avatar" />
                    ) : (
                      <div className="group-avatar" style={{ backgroundColor: avatarBg }}>
                        <span className="group-avatar-initials">{initials}</span>
                      </div>
                    )}
                    
                    <div className="group-item-info">
                      <div className="group-item-name-row">
                        <span className="group-item-name">
                          {group.name}
                          {group.is_announcement && (
                            <span className="announcement-badge">📢 Канал</span>
                          )}
                        </span>
                        {group.last_message_at && (
                          <span className="group-item-time">
                            {new Date(group.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      
                      <div className="group-item-msg-row">
                        <span className="group-item-last-msg">
                          {group.last_message ? group.last_message : "Нет сообщений"}
                        </span>
                        {group.unread_count > 0 && (
                          <span className="group-unread-badge">{group.unread_count}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8", fontSize: "14px" }}>
                Группы не найдены
              </div>
            )}
          </div>
        </div>
        
        {/* Right Chat Area */}
        <div className="groups-chat-area" style={{ display: !activeGroup && mobileShowChat ? "none" : "flex" }}>
          {activeGroup ? (
            <>
              {/* Chat Header */}
              <div className="groups-chat-header">
                <div className="groups-chat-header-info">
                  <button className="back-btn" onClick={handleBackToSidebar}>
                    <ChevronLeft size={24} />
                  </button>
                  
                  {activeGroup.avatar_url ? (
                    <img src={`${API_URL}${activeGroup.avatar_url}`} alt={activeGroup.name} className="group-avatar" style={{ width: "40px", height: "40px" }} />
                  ) : (
                    <div 
                      className="group-avatar" 
                      style={{ 
                        width: "40px", 
                        height: "40px", 
                        backgroundColor: ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6"][activeGroup.id % 7] 
                      }}
                    >
                      <span className="group-avatar-initials">{activeGroup.name.charAt(0)}</span>
                    </div>
                  )}
                  
                  <div className="groups-chat-title-container">
                    <span className="groups-chat-title">
                      {activeGroup.name}
                      {activeGroup.is_announcement && <span className="announcement-badge">📢 Канал</span>}
                    </span>
                    <span className="groups-chat-subtitle">
                      {activeGroup.is_announcement 
                        ? "Официальный канал объявлений" 
                        : `${activeGroup.member_count || 1} участников`
                      }
                    </span>
                  </div>
                </div>
                
                <div className="groups-chat-header-actions">
                  <button className="header-action-btn" onClick={() => setIsMembersModalOpen(true)}>
                    <Users size={16} />
                    <span>Участники</span>
                  </button>
                </div>
              </div>
              
              {/* Pinned Message Bar */}
              {pinnedMessage && (
                <div className="pinned-message-bar" onClick={() => handleScrollToMessage(pinnedMessage.id)} style={{ cursor: "pointer" }}>
                  <div className="pinned-message-content">
                    <Pin size={14} className="pinned-title" style={{ color: "var(--primary-color, #e21a1c)" }} />
                    <div className="pinned-message-info">
                      <div className="pinned-title">Закрепленное сообщение</div>
                      <div className="pinned-text">{pinnedMessage.message || "Вложение"}</div>
                    </div>
                  </div>
                  {isCurrentAdmin && (
                    <button 
                      className="unpin-btn" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnpinMessage(pinnedMessage.id);
                      }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              )}
              
              {/* Messages Container */}
              <div className="groups-messages-container" ref={messagesContainerRef}>
                <div className="groups-messages-scroll">
                  {messages.map((msg, index) => {
                    const isOutgoing = msg.user_id === currentUserId;
                    const isSystem = msg.is_system;
                    
                    // Parse reactions
                    let reactionsObj = {};
                    try {
                      if (msg.reactions) reactionsObj = JSON.parse(msg.reactions);
                    } catch {}
                    
                    const reactionGroups = Object.entries(
                      Object.values(reactionsObj).reduce((acc, emoji) => {
                        acc[emoji] = (acc[emoji] || 0) + 1;
                        return acc;
                      }, {})
                    );

                    // Check if self reacted with this emoji
                    const myReaction = reactionsObj[currentUserId] || null;

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="group-message-wrapper system">
                          <div className="group-message-bubble">
                            {msg.message}
                          </div>
                        </div>
                      );
                    }

                    // For finding replies
                    const repliedMsg = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) : null;

                    return (
                      <div 
                        key={msg.id} 
                        id={`msg-${msg.id}`}
                        className={`group-message-wrapper ${isOutgoing ? "outgoing" : "incoming"}`}
                        onMouseEnter={() => setHoveredMessageId(msg.id)}
                        onMouseLeave={() => setHoveredMessageId(null)}
                      >
                        {!isOutgoing && (
                          <div 
                            className="group-avatar" 
                            style={{ 
                              width: "32px", 
                              height: "32px", 
                              fontSize: "12px",
                              backgroundColor: ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6"][msg.user_id % 7]
                            }}
                          >
                            {msg.username?.charAt(0) || "U"}
                          </div>
                        )}
                        
                        <div className="group-message-bubble">
                          {/* Replied to banner */}
                          {repliedMsg && (
                            <div 
                              onClick={() => handleScrollToMessage(repliedMsg.id)}
                              style={{ 
                                borderLeft: "2px solid var(--primary-color, #e21a1c)", 
                                paddingLeft: "8px", 
                                marginBottom: "6px", 
                                fontSize: "11px", 
                                cursor: "pointer",
                                opacity: 0.8,
                                background: isOutgoing ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.03)"
                              }}
                            >
                              <div style={{ fontWeight: 700 }}>{repliedMsg.username}</div>
                              <div style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                                {repliedMsg.message || "Вложение"}
                              </div>
                            </div>
                          )}

                          {!isOutgoing && <div className="message-author">{msg.username}</div>}
                          
                          {/* Message Text */}
                          {msg.message && <div className="message-text">{msg.message}</div>}
                          
                          {/* Attachment file */}
                          {msg.attachment_url && (
                            <div style={{ marginTop: "6px" }}>
                              {msg.attachment_url.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                                <img 
                                  src={`${API_URL}${msg.attachment_url}`} 
                                  alt="Attachment" 
                                  style={{ maxWidth: "100%", maxHeight: "240px", borderRadius: "8px", cursor: "pointer" }}
                                  onClick={() => window.open(`${API_URL}${msg.attachment_url}`, "_blank")}
                                />
                              ) : (
                                <a 
                                  href={`${API_URL}${msg.attachment_url}`} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  style={{ 
                                    display: "flex", 
                                    alignItems: "center", 
                                    gap: "6px", 
                                    padding: "8px 12px", 
                                    background: isOutgoing ? "rgba(255,255,255,0.15)" : "#f1f5f9", 
                                    borderRadius: "8px",
                                    color: "inherit",
                                    textDecoration: "none"
                                  }}
                                >
                                  <FileText size={18} />
                                  <span style={{ fontSize: "12px", textDecoration: "underline", wordBreak: "break-all" }}>
                                    {msg.attachment_url.split("/").pop()}
                                  </span>
                                </a>
                              )}
                            </div>
                          )}

                          {/* Message Meta Row */}
                          <div className="message-meta">
                            <span className="message-time">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isOutgoing && (
                              <span className="message-status">
                                <span className="receipts-dot" style={{ backgroundColor: "white", opacity: 0.6 }} />
                              </span>
                            )}
                          </div>

                          {/* Reactions Display */}
                          {reactionGroups.length > 0 && (
                            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "6px" }}>
                              {reactionGroups.map(([emoji, count]) => {
                                const didIReact = myReaction === emoji;
                                return (
                                  <button
                                    key={emoji}
                                    onClick={() => handleReactMessage(msg.id, didIReact ? "" : emoji)}
                                    style={{
                                      background: didIReact ? "rgba(226, 26, 28, 0.15)" : "rgba(0,0,0,0.04)",
                                      border: didIReact ? "1px solid var(--primary-color, #e21a1c)" : "1px solid transparent",
                                      borderRadius: "12px",
                                      padding: "2px 6px",
                                      fontSize: "11px",
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "3px",
                                      color: didIReact ? "var(--primary-color, #e21a1c)" : "inherit"
                                    }}
                                  >
                                    <span>{emoji}</span>
                                    <span style={{ fontWeight: 600 }}>{count}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {/* Hover action menu */}
                          {hoveredMessageId === msg.id && (
                            <div 
                              style={{ 
                                position: "absolute",
                                top: "-28px",
                                [isOutgoing ? "left" : "right"]: "0",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                background: "var(--bg-surface, #ffffff)",
                                border: "1px solid var(--border-color, #e2e8f0)",
                                padding: "4px 8px",
                                borderRadius: "16px",
                                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                                zIndex: 10
                              }}
                            >
                              {/* Reactions popup quick pick */}
                              {popularReactions.map(emoji => (
                                <button 
                                  key={emoji}
                                  onClick={() => handleReactMessage(msg.id, myReaction === emoji ? "" : emoji)}
                                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px", padding: "0 2px" }}
                                >
                                  {emoji}
                                </button>
                              ))}
                              
                              <div style={{ width: "1px", height: "14px", backgroundColor: "#cbd5e1", margin: "0 4px" }} />

                              {/* Reply button */}
                              {!activeGroup.is_announcement && (
                                <button 
                                  onClick={() => setReplyToMessage(msg)}
                                  style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
                                  title="Ответить"
                                >
                                  <Reply size={14} />
                                </button>
                              )}

                              {/* Pin Message */}
                              {isCurrentAdmin && (
                                <button 
                                  onClick={() => msg.is_pinned ? handleUnpinMessage(msg.id) : handlePinMessage(msg.id)}
                                  style={{ background: "none", border: "none", cursor: "pointer", color: msg.is_pinned ? "var(--primary-color, #e21a1c)" : "#64748b" }}
                                  title={msg.is_pinned ? "Открепить" : "Закрепить"}
                                >
                                  <Pin size={14} />
                                </button>
                              )}

                              {/* Delete message */}
                              {(isOutgoing || isCurrentAdmin) && (
                                <button 
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}
                                  title="Удалить"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          )}

                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Chat Input Area */}
              {activeGroup.is_announcement && !isOperator ? (
                <div style={{ padding: "16px 20px", backgroundColor: "var(--bg-surface, #ffffff)", borderTop: "1px solid var(--border-color, #e2e8f0)", textAlign: "center", color: "#64748b", fontSize: "13px", fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <AlertCircle size={16} /> Это канал объявлений. Писать сообщения могут только операторы.
                </div>
              ) : (
                <div className="groups-input-container">
                  
                  {/* Reply Indicator banner */}
                  {replyToMessage && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#f1f5f9", borderRadius: "8px", borderLeft: "3px solid var(--primary-color, #e21a1c)", fontSize: "13px" }}>
                      <div>
                        <span style={{ fontWeight: 700 }}>Ответ для {replyToMessage.username}</span>
                        <div style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", fontSize: "12px", color: "#64748b" }}>
                          {replyToMessage.message || "Вложение"}
                        </div>
                      </div>
                      <button onClick={() => setReplyToMessage(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                        <X size={16} />
                      </button>
                    </div>
                  )}

                  {/* Attached file chip */}
                  {attachedFile && (
                    <div style={{ display: "flex", alignItems: "center", justifyBetween: "center", gap: "8px", padding: "6px 12px", background: "#fee2e2", borderRadius: "8px", border: "1px solid #fca5a5", width: "fit-content", fontSize: "12px" }}>
                      <FileText size={16} style={{ color: "var(--primary-color, #e21a1c)" }} />
                      <span style={{ fontWeight: 500, color: "#991b1b" }}>{attachedFile.name}</span>
                      <button onClick={() => setAttachedFile(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#991b1b", display: "flex" }}>
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSendMessage} className="groups-input-row">
                    <button 
                      type="button" 
                      className="input-action-btn"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Paperclip size={20} />
                    </button>
                    
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      style={{ display: "none" }} 
                    />

                    <button 
                      type="button" 
                      className="input-action-btn"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    >
                      <Smile size={20} />
                    </button>

                    <textarea
                      className="groups-message-textarea"
                      placeholder={uploading ? "Загрузка файла..." : "Напишите сообщение..."}
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                      disabled={uploading}
                      rows={1}
                    />

                    <button type="submit" className="groups-send-btn" disabled={uploading}>
                      <Send size={18} />
                    </button>

                    {showEmojiPicker && (
                      <div style={{ position: "absolute", bottom: "60px", left: "0", zIndex: 100 }}>
                        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }} onClick={() => setShowEmojiPicker(false)} />
                        <div style={{ position: "relative" }}>
                          <EmojiPicker onEmojiClick={handleEmojiClick} />
                        </div>
                      </div>
                    )}
                  </form>
                </div>
              )}
            </>
          ) : (
            <div className="groups-chat-empty">
              <Users className="empty-icon" />
              <h3>Выберите чат</h3>
              <p>Выберите группу из списка слева или создайте новую, чтобы начать общение.</p>
            </div>
          )}
        </div>
        
      </div>

      {/* Modals */}
      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(newGroup) => {
          fetchGroups();
          setActiveGroup(newGroup);
        }}
      />

      {activeGroup && (
        <GroupMembersModal
          isOpen={isMembersModalOpen}
          onClose={() => setIsMembersModalOpen(false)}
          group={activeGroup}
          onUpdate={(groupLeftOrDeleted) => {
            fetchGroups();
            if (groupLeftOrDeleted) {
              setActiveGroup(null);
            } else {
              fetchGroupDetails();
            }
          }}
        />
      )}
    </>
  );
}
