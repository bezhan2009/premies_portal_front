import React, { useState, useEffect } from "react";
import axios from "axios";
import { X, Search, User, Camera, Trash2 } from "lucide-react";

export default function CreateGroupModal({ isOpen, onClose, onSuccess }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:7575";

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      // Reset state
      setName("");
      setDescription("");
      setAvatarFile(null);
      setAvatarPreview("");
      setSelectedUsers([]);
      setSearchQuery("");
      setError("");
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.get(`${API_URL}/users/emails`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && res.data.users) {
        setAllUsers(res.data.users);
      }
    } catch (err) {
      console.error("Error loading users:", err);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectUser = (user) => {
    if (!selectedUsers.some(u => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
    setSearchQuery("");
  };

  const handleRemoveUser = (userId) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Название группы обязательно");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("access_token");
      
      // 1. Create group
      const payload = {
        name: name.trim(),
        description: description.trim(),
        member_ids: selectedUsers.map(u => u.id)
      };

      const res = await axios.post(`${API_URL}/api/groups`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const newGroup = res.data;

      // 2. If avatar selected, upload avatar
      if (avatarFile && newGroup.id) {
        const formData = new FormData();
        formData.append("avatar", avatarFile);

        const avatarRes = await axios.post(
          `${API_URL}/api/groups/${newGroup.id}/avatar`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data"
            }
          }
        );
        newGroup.avatar_url = avatarRes.data.avatar_url;
      }

      onSuccess(newGroup);
      onClose();
    } catch (err) {
      console.error("Error creating group:", err);
      setError(err.response?.data?.error || "Не удалось создать группу");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Filter users based on search
  const filteredUsers = searchQuery.trim() === "" 
    ? [] 
    : allUsers.filter(u => {
        const query = searchQuery.toLowerCase();
        const matchesName = u.full_name?.toLowerCase().includes(query);
        const matchesUsername = u.username?.toLowerCase().includes(query);
        const matchesEmail = u.email?.toLowerCase().includes(query);
        const isNotSelected = !selectedUsers.some(su => su.id === u.id);
        return (matchesName || matchesUsername || matchesEmail) && isNotSelected;
      }).slice(0, 5); // Limit search results to 5

  return (
    <div className="groups-modal-overlay" onClick={onClose}>
      <div className="groups-modal" onClick={e => e.stopPropagation()}>
        <div className="groups-modal-header">
          <h3 className="groups-modal-title">👥 Создать группу</h3>
          <button className="groups-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="groups-modal-body">
            {error && (
              <div style={{ color: "#ef4444", fontSize: "13px", backgroundColor: "#fee2e2", padding: "10px", borderRadius: "8px", border: "1px solid #fca5a5" }}>
                {error}
              </div>
            )}

            {/* Avatar upload */}
            <div className="avatar-upload-container">
              <div className="avatar-upload-preview" onClick={() => document.getElementById("group-avatar-input").click()}>
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar Preview" />
                ) : (
                  <Camera size={24} style={{ color: "#94a3b8" }} />
                )}
              </div>
              <div className="avatar-upload-text">
                <span className="avatar-upload-btn" onClick={() => document.getElementById("group-avatar-input").click()}>
                  Выбрать аватар
                </span>
                <span>PNG, JPG до 5MB</span>
              </div>
              <input
                id="group-avatar-input"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: "none" }}
              />
            </div>

            {/* Group Name */}
            <div className="groups-form-group">
              <label className="groups-form-label">Название группы *</label>
              <input
                type="text"
                className="groups-form-input"
                placeholder="Введите название группы"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={100}
                required
              />
            </div>

            {/* Description */}
            <div className="groups-form-group">
              <label className="groups-form-label">Описание (необязательно)</label>
              <textarea
                className="groups-form-textarea"
                placeholder="О чем эта группа?"
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={500}
              />
            </div>

            {/* Member search */}
            <div className="groups-form-group" style={{ position: "relative" }}>
              <label className="groups-form-label">Добавить участников</label>
              <div className="groups-search-wrapper">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  className="groups-form-input"
                  style={{ paddingLeft: "36px" }}
                  placeholder="Поиск по имени, username или email"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Autocomplete dropdown */}
              {filteredUsers.length > 0 && (
                <div className="member-search-results">
                  {filteredUsers.map(user => (
                    <div key={user.id} className="member-search-item" onClick={() => handleSelectUser(user)}>
                      <div className="member-info-mini">
                        <div className="group-avatar" style={{ width: "24px", height: "24px", fontSize: "10px", backgroundColor: "#64748b" }}>
                          {user.full_name?.charAt(0) || user.username?.charAt(0) || "U"}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span>{user.full_name || user.username}</span>
                          <span style={{ fontSize: "10px", color: "#64748b" }}>@{user.username}</span>
                        </div>
                      </div>
                      <span style={{ fontSize: "11px", color: "var(--primary-color, #e21a1c)", fontWeight: 600 }}>Добавить</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected members chips */}
            {selectedUsers.length > 0 && (
              <div className="groups-form-group">
                <label className="groups-form-label">Выбранные участники ({selectedUsers.length})</label>
                <div className="member-selected-list">
                  {selectedUsers.map(user => (
                    <div key={user.id} className="member-chip">
                      <span>{user.full_name || user.username}</span>
                      <button type="button" onClick={() => handleRemoveUser(user.id)}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="groups-modal-footer">
            <button type="button" className="modal-btn btn-secondary" onClick={onClose} disabled={loading}>
              Отмена
            </button>
            <button type="submit" className="modal-btn btn-primary" disabled={loading}>
              {loading ? "Создание..." : "Создать группу"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
