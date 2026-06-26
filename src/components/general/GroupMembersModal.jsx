import React, { useState, useEffect } from "react";
import axios from "axios";
import { X, Search, User, Shield, ShieldAlert, Trash2, LogOut, UserPlus } from "lucide-react";

export default function GroupMembersModal({ isOpen, onClose, group, onUpdate }) {
  const [members, setMembers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:7575";
  const currentUserId = Number(localStorage.getItem("user_id") || 0);

  useEffect(() => {
    if (isOpen && group?.id) {
      fetchGroupDetails();
      fetchUsers();
      setError("");
      setSearchQuery("");
    }
  }, [isOpen, group]);

  const fetchGroupDetails = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.get(`${API_URL}/api/groups/${group.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data) {
        setMembers(res.data.members || []);
        setIsAdmin(res.data.is_admin || false);
      }
    } catch (err) {
      console.error("Error loading group details:", err);
      setError("Не удалось загрузить участников");
    }
  };

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
      console.error("Error loading users list:", err);
    }
  };

  const handleAddMember = async (user) => {
    setError("");
    try {
      const token = localStorage.getItem("access_token");
      await axios.post(
        `${API_URL}/api/groups/${group.id}/members`,
        { user_id: user.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSearchQuery("");
      fetchGroupDetails();
      if (onUpdate) onUpdate();
    } catch (err) {
      setError(err.response?.data?.error || "Не удалось добавить участника");
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm("Вы уверены, что хотите удалить этого участника?")) return;
    setError("");
    try {
      const token = localStorage.getItem("access_token");
      await axios.delete(
        `${API_URL}/api/groups/${group.id}/members/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchGroupDetails();
      if (onUpdate) onUpdate();
    } catch (err) {
      setError(err.response?.data?.error || "Не удалось удалить участника");
    }
  };

  const handlePromoteMember = async (userId) => {
    setError("");
    try {
      const token = localStorage.getItem("access_token");
      await axios.post(
        `${API_URL}/api/groups/${group.id}/members/${userId}/promote`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchGroupDetails();
    } catch (err) {
      setError(err.response?.data?.error || "Не удалось назначить администратором");
    }
  };

  const handleDemoteMember = async (userId) => {
    setError("");
    try {
      const token = localStorage.getItem("access_token");
      await axios.post(
        `${API_URL}/api/groups/${group.id}/members/${userId}/demote`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchGroupDetails();
    } catch (err) {
      setError(err.response?.data?.error || "Не удалось разжаловать администратора");
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm("Вы действительно хотите выйти из группы?")) return;
    setError("");
    try {
      const token = localStorage.getItem("access_token");
      await axios.post(
        `${API_URL}/api/groups/${group.id}/leave`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onClose();
      if (onUpdate) onUpdate(true); // true means full refresh/group left
    } catch (err) {
      setError(err.response?.data?.error || "Не удалось выйти из группы");
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm("ВНИМАНИЕ: Вы уверены, что хотите удалить группу? Все сообщения будут стерты навсегда!")) return;
    setError("");
    try {
      const token = localStorage.getItem("access_token");
      await axios.delete(
        `${API_URL}/api/groups/${group.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onClose();
      if (onUpdate) onUpdate(true);
    } catch (err) {
      setError(err.response?.data?.error || "Не удалось удалить группу");
    }
  };

  if (!isOpen) return null;

  // Filter users for adding (exclude current members)
  const filteredUsers = searchQuery.trim() === ""
    ? []
    : allUsers.filter(u => {
        const query = searchQuery.toLowerCase();
        const matchesName = u.full_name?.toLowerCase().includes(query);
        const matchesUsername = u.username?.toLowerCase().includes(query);
        const matchesEmail = u.email?.toLowerCase().includes(query);
        const isNotMember = !members.some(m => m.user_id === u.id);
        return (matchesName || matchesUsername || matchesEmail) && isNotMember;
      }).slice(0, 5);

  return (
    <div className="groups-modal-overlay" onClick={onClose}>
      <div className="groups-modal" onClick={e => e.stopPropagation()}>
        <div className="groups-modal-header">
          <h3 className="groups-modal-title">👥 Участники группы</h3>
          <button className="groups-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="groups-modal-body" style={{ overflowY: "auto" }}>
          {error && (
            <div style={{ color: "#ef4444", fontSize: "13px", backgroundColor: "#fee2e2", padding: "10px", borderRadius: "8px", border: "1px solid #fca5a5", marginBottom: "12px" }}>
              {error}
            </div>
          )}

          {/* Add member section (admin only) */}
          {isAdmin && !group.is_announcement && (
            <div className="groups-form-group" style={{ position: "relative", marginBottom: "16px" }}>
              <label className="groups-form-label">Добавить участника</label>
              <div className="groups-search-wrapper">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  className="groups-form-input"
                  style={{ paddingLeft: "36px" }}
                  placeholder="Введите имя или username..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Add member search results */}
              {filteredUsers.length > 0 && (
                <div className="member-search-results">
                  {filteredUsers.map(user => (
                    <div key={user.id} className="member-search-item" onClick={() => handleAddMember(user)}>
                      <div className="member-info-mini">
                        <div className="group-avatar" style={{ width: "24px", height: "24px", fontSize: "10px", backgroundColor: "#64748b" }}>
                          {user.full_name?.charAt(0) || user.username?.charAt(0) || "U"}
                        </div>
                        <span>{user.full_name || user.username}</span>
                      </div>
                      <span style={{ fontSize: "11px", color: "var(--primary-color, #e21a1c)", fontWeight: 600 }}>Добавить</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Members list */}
          <div className="groups-form-group">
            <label className="groups-form-label">Участники ({members.length})</label>
            <div className="group-members-list">
              {members.map(member => {
                const isSelf = member.user_id === currentUserId;
                return (
                  <div key={member.user_id} className="group-member-item">
                    <div className="member-info-mini">
                      <div className="group-avatar" style={{ width: "32px", height: "32px", fontSize: "12px", backgroundColor: member.is_admin ? "#e21a1c" : "#64748b" }}>
                        {member.full_name?.charAt(0) || member.username?.charAt(0) || "U"}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: isSelf ? "700" : "500" }}>
                          {member.full_name || member.username} {isSelf && "(Вы)"}
                        </span>
                        <span style={{ fontSize: "10px", color: "#64748b" }}>@{member.username}</span>
                      </div>
                      {member.is_admin && (
                        <span className="admin-badge">Admin</span>
                      )}
                    </div>

                    {/* Member actions (for admin/creator) */}
                    <div className="member-item-actions">
                      {isAdmin && !isSelf && !group.is_announcement && (
                        <>
                          {member.is_admin ? (
                            <button
                              className="member-action-btn-small"
                              onClick={() => handleDemoteMember(member.user_id)}
                              title="Разжаловать"
                            >
                              Снять админа
                            </button>
                          ) : (
                            <button
                              className="member-action-btn-small"
                              onClick={() => handlePromoteMember(member.user_id)}
                              title="Назначить админом"
                            >
                              Сделать админом
                            </button>
                          )}
                          <button
                            className="member-action-btn-small btn-remove"
                            onClick={() => handleRemoveMember(member.user_id)}
                            title="Удалить из группы"
                          >
                            Удалить
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="groups-modal-footer" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            {/* Delete group (creator/admin only) */}
            {isAdmin && (
              <button className="modal-btn btn-danger" onClick={handleDeleteGroup} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Trash2 size={16} /> Удалить группу
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {/* Self leave button */}
            {!group.is_announcement && (
              <button className="modal-btn btn-secondary" onClick={handleLeaveGroup} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <LogOut size={16} /> Выйти
              </button>
            )}
            <button className="modal-btn btn-secondary" onClick={onClose}>
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
