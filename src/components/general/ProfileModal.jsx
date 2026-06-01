import React, { useState, useEffect } from "react";
import Modal from "./Modal.jsx";
import Spinner from "../Spinner.jsx";
import { User, Mail, Phone, Shield } from "lucide-react";

export default function ProfileModal({ isOpen, onClose, onProfileUpdated }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [fullName, setFullName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [complianceCode, setComplianceCode] = useState("");

  const token = localStorage.getItem("access_token");

  useEffect(() => {
    if (isOpen) {
      fetchUserData();
    }
  }, [isOpen]);

  const fetchUserData = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Не удалось загрузить данные профиля");
      const data = await response.json();
      setFullName(data.full_name || "");
      setFirstName(data.first_name || "");
      setLastName(data.last_name || "");
      setEmail(data.email || "");
      setPhone(data.phone || "");
      setComplianceCode(data.compliance_code || "");
    } catch (err) {
      console.error(err);
      setError(err.message || "Ошибка при получении профиля");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/user`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone: phone,
          compliance_code: complianceCode,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Не удалось сохранить изменения");
      }

      setSuccess("Профиль успешно обновлен");
      // Update local storage full name if it's cached there
      if (fullName) {
        // Find if they store full_name/fio in localStorage
        localStorage.setItem("full_name", fullName);
      }
      
      if (onProfileUpdated) {
        onProfileUpdated(fullName);
      }
      
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || "Ошибка при сохранении профиля");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Мой профиль">
      <style>{`
        .profile-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 10px 0;
          color: #ffffff;
        }
        .profile-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .profile-field label {
          font-size: 13px;
          color: #fca5a5;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .profile-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .profile-input-wrapper svg {
          position: absolute;
          left: 14px;
          color: #ef4444;
          opacity: 0.8;
        }
        .profile-input-wrapper input {
          width: 100%;
          background: rgba(15, 10, 10, 0.6);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 12px;
          padding: 12px 16px 12px 42px;
          color: #ffffff;
          font-size: 14px;
          transition: all 0.3s ease;
        }
        .profile-input-wrapper input:focus {
          border-color: #ef4444;
          outline: none;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
        }
        .profile-buttons {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 20px;
        }
        .profile-btn {
          border: none;
          border-radius: 12px;
          padding: 12px 24px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .profile-btn-save {
          background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
          color: #ffffff;
          box-shadow: 0 6px 16px rgba(239, 68, 68, 0.25);
        }
        .profile-btn-save:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 22px rgba(239, 68, 68, 0.4);
          filter: brightness(1.1);
        }
        .profile-btn-cancel {
          background: rgba(239, 68, 68, 0.08);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.25);
        }
        .profile-btn-cancel:hover {
          background: #ef4444;
          color: #ffffff;
        }
        .profile-alert {
          border-radius: 12px;
          padding: 14px;
          font-size: 14px;
          font-weight: 600;
          text-align: center;
        }
        .profile-alert-error {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid #ef4444;
          color: #fca5a5;
        }
        .profile-alert-success {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid #10b981;
          color: #a7f3d0;
        }
      `}</style>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
          <Spinner size="medium" label="Загрузка профиля..." />
        </div>
      ) : (
        <form className="profile-form" onSubmit={handleSubmit}>
          {error && <div className="profile-alert profile-alert-error">{error}</div>}
          {success && <div className="profile-alert profile-alert-success">{success}</div>}

          <div className="profile-field">
            <label><User size={16} /> ФИО сотрудника</label>
            <div className="profile-input-wrapper">
              <User size={18} />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Иванов Иван Иванович"
                required
              />
            </div>
          </div>

          <div className="profile-field">
            <label><User size={16} /> Имя</label>
            <div className="profile-input-wrapper">
              <User size={18} />
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Иван"
                required
              />
            </div>
          </div>

          <div className="profile-field">
            <label><User size={16} /> Фамилия</label>
            <div className="profile-input-wrapper">
              <User size={18} />
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Иванов"
                required
              />
            </div>
          </div>

          <div className="profile-field">
            <label><Mail size={16} /> Электронная почта</label>
            <div className="profile-input-wrapper">
              <Mail size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
              />
            </div>
          </div>

          <div className="profile-field">
            <label><Phone size={16} /> Номер телефона</label>
            <div className="profile-input-wrapper">
              <Phone size={18} />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="99290000000"
                required
              />
            </div>
          </div>

          <div className="profile-field">
            <label><Shield size={16} /> Код комплаенса</label>
            <div className="profile-input-wrapper">
              <Shield size={18} />
              <input
                type="text"
                value={complianceCode}
                onChange={(e) => setComplianceCode(e.target.value)}
                placeholder="Введите свой комплаенс код"
              />
            </div>
          </div>

          <div className="profile-buttons">
            <button
              type="button"
              className="profile-btn profile-btn-cancel"
              onClick={onClose}
              disabled={saving}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="profile-btn profile-btn-save"
              disabled={saving}
            >
              {saving ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
