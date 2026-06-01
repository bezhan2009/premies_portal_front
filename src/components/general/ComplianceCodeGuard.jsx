import React, { useState, useEffect } from "react";
import Spinner from "../Spinner.jsx";
import { FaShieldAlt, FaKey, FaSpinner } from "react-icons/fa";

export default function ComplianceCodeGuard({ children }) {
  const [checking, setChecking] = useState(true);
  const [hasCode, setHasCode] = useState(false);
  const [complianceCode, setComplianceCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const token = localStorage.getItem("access_token");

  useEffect(() => {
    checkComplianceCode();
  }, [token]);

  const checkComplianceCode = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Не удалось загрузить данные пользователя");
      const data = await response.json();
      if (data.compliance_code && data.compliance_code.trim() !== "") {
        setHasCode(true);
      } else {
        setHasCode(false);
      }
    } catch (err) {
      console.error(err);
      setError("Ошибка при проверке комплаенс кода");
    } finally {
      setChecking(false);
    }
  };

  const handleSaveCode = async (e) => {
    e.preventDefault();
    if (!complianceCode.trim()) {
      setError("Код комплаенса не может быть пустым");
      return;
    }
    setError("");
    setSaving(true);

    try {
      // First, fetch existing profile details to avoid overwriting with blank values
      const userRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!userRes.ok) throw new Error("Не удалось получить текущие данные профиля");
      const userData = await userRes.json();

      // Submit update
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/user`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: userData.full_name,
          email: userData.email,
          phone: userData.phone,
          compliance_code: complianceCode.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Не удалось сохранить код комплаенса");
      }

      setHasCode(true);
    } catch (err) {
      setError(err.message || "Ошибка при сохранении кода");
    } finally {
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#0b0505" }}>
        <Spinner size="large" label="Проверка комплаенс-прав..." />
      </div>
    );
  }

  if (hasCode) {
    return children;
  }

  return (
    <div className="lock-screen-overlay">
      <style>{`
        .lock-screen-overlay {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: radial-gradient(circle at center, #1b0a0a 0%, #0b0505 100%);
          padding: 24px;
        }
        .lock-card {
          background: #140b0b;
          border: 1px solid rgba(239, 68, 68, 0.25);
          border-radius: 24px;
          padding: 40px;
          max-width: 480px;
          width: 100%;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 40px rgba(239, 68, 68, 0.1);
          text-align: center;
          animation: lockCardIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .lock-icon-wrapper {
          width: 80px;
          height: 80px;
          border-radius: 50px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
        }
        .lock-icon-wrapper svg {
          font-size: 36px;
          color: #ef4444;
          filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.5));
        }
        .lock-card h2 {
          color: #ffffff;
          font-size: 22px;
          font-weight: 800;
          margin-bottom: 12px;
          letter-spacing: -0.5px;
        }
        .lock-card p {
          color: #fca5a5;
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 28px;
        }
        .lock-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
          text-align: left;
        }
        .lock-form label {
          font-size: 12px;
          color: #fca5a5;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .lock-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .lock-input-wrapper svg {
          position: absolute;
          left: 14px;
          color: #ef4444;
        }
        .lock-input-wrapper input {
          width: 100%;
          background: rgba(15, 10, 10, 0.6);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 12px;
          padding: 12px 16px 12px 42px;
          color: #ffffff;
          font-size: 14px;
          transition: all 0.3s ease;
        }
        .lock-input-wrapper input:focus {
          border-color: #ef4444;
          outline: none;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
        }
        .lock-btn {
          background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
          color: #ffffff;
          border: none;
          border-radius: 12px;
          padding: 14px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 6px 16px rgba(239, 68, 68, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .lock-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 22px rgba(239, 68, 68, 0.4);
          filter: brightness(1.1);
        }
        .lock-error {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid #ef4444;
          border-radius: 12px;
          padding: 12px;
          color: #fca5a5;
          font-size: 13px;
          font-weight: 600;
          text-align: center;
        }
        @keyframes lockCardIn {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <div className="lock-card">
        <div className="lock-icon-wrapper">
          <FaShieldAlt />
        </div>
        <h2>Доступ ограничен</h2>
        <p>Для работы с разделом комплаенс необходимо установить ваш уникальный код комплаенс-офицера.</p>
        
        <form className="lock-form" onSubmit={handleSaveCode}>
          {error && <div className="lock-error">{error}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label htmlFor="comp-code">Ваш комплаенс код</label>
            <div className="lock-input-wrapper">
              <FaKey />
              <input
                type="text"
                id="comp-code"
                value={complianceCode}
                onChange={(e) => setComplianceCode(e.target.value)}
                placeholder="Например: COMP-99"
                required
                disabled={saving}
              />
            </div>
          </div>
          <button type="submit" className="lock-btn" disabled={saving}>
            {saving ? (
              <FaSpinner className="pulse-animation" />
            ) : (
              <span>Активировать доступ</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
