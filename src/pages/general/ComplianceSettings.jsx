import React, { useEffect, useState, useCallback } from "react";
import Spinner from "../../components/Spinner.jsx";
import { Shield, Save, RefreshCw } from "lucide-react";
import { Helmet } from "react-helmet";

const ComplianceSettings = () => {
  const backendURL = import.meta.env.VITE_BACKEND_URL;
  const token = localStorage.getItem("access_token");

  const [threshold, setThreshold] = useState("0.4");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [error, setError] = useState(null);

  const showAlert = (message, type = "success") => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 3500);
  };

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${backendURL}/compliance/settings`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = await response.json();
      if (json && json.value) {
        setThreshold(json.value);
      }
    } catch (e) {
      console.error("Ошибка загрузки настроек комплайнса:", e);
      setError("Не удалось загрузить настройки");
    } finally {
      setLoading(false);
    }
  }, [backendURL, token]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (e) => {
    e.preventDefault();
    const val = parseFloat(threshold);
    if (isNaN(val) || val < 0.0 || val > 1.0) {
      showAlert("Порог совпадения должен быть числом от 0.0 до 1.0", "error");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`${backendURL}/compliance/settings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value: String(threshold) }),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json.error || "Ошибка при сохранении");
      }

      showAlert("Настройки комплайнса успешно сохранены!");
    } catch (e) {
      console.error(e);
      showAlert(e.message || "Ошибка при сохранении настроек", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-content-wrapper content-page">
      <Helmet>
        <title>Комплайнс — Настройки сходства</title>
      </Helmet>
      <div 
        className="compliance-settings-container" 
        style={{
          maxWidth: "600px",
          margin: "40px auto",
          padding: "32px",
          background: "linear-gradient(145deg, #1e2a3a, #243347)",
          borderRadius: "16px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          color: "#e0e6ed"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <Shield size={32} color="#f59e0b" />
          <h2 style={{ margin: 0, fontSize: "24px", fontWeight: 700 }}>Панель управления Комплайнс</h2>
        </div>

        <p style={{ color: "#8b95a5", fontSize: "14px", lineHeight: "1.6", marginBottom: "32px" }}>
          Здесь вы можете настроить порог сходства для автоматической проверки клиентов в базе данных террористов.
          Запросы к внешнему поисковому сервису будут кэшироваться, но сопоставление пороговых величин сходства
          происходит динамически при каждой проверке.
        </p>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
            <Spinner center label="Загрузка параметров..." />
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", color: "#f97066", padding: "20px" }}>
            <p>{error}</p>
            <button 
              onClick={fetchSettings}
              className="action-buttons__btn"
              style={{ background: "#4a6cf7", color: "#fff", display: "inline-flex", alignItems: "center", gap: "8px" }}
            >
              <RefreshCw size={16} /> Повторить
            </button>
          </div>
        ) : (
          <form onSubmit={handleSave}>
            <div style={{ marginBottom: "28px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <label style={{ fontSize: "15px", fontWeight: 600 }}>Порог совпадения (Similarity):</label>
                <span 
                  style={{ 
                    fontSize: "18px", 
                    fontWeight: 700, 
                    color: "#f59e0b",
                    background: "rgba(245, 158, 11, 0.1)",
                    padding: "4px 10px",
                    borderRadius: "6px" 
                  }}
                >
                  {threshold}
                </span>
              </div>
              
              <input 
                type="range" 
                min="0.1" 
                max="1.0" 
                step="0.01" 
                value={threshold} 
                onChange={(e) => setThreshold(e.target.value)}
                style={{ 
                  width: "100%",
                  height: "6px",
                  background: "#4b5563",
                  borderRadius: "3px",
                  outline: "none",
                  cursor: "pointer"
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", color: "#8b95a5", fontSize: "12px", marginTop: "8px" }}>
                <span>0.1 (Чувствительный)</span>
                <span>1.0 (Точное совпадение)</span>
              </div>
            </div>

            <div 
              style={{ 
                background: "rgba(0, 0, 0, 0.15)", 
                padding: "16px", 
                borderRadius: "10px", 
                borderLeft: "4px solid #f59e0b",
                marginBottom: "32px",
                fontSize: "13px",
                lineHeight: "1.5",
                color: "#cbd5e1"
              }}
            >
              <strong>Примечание:</strong> Значение по умолчанию <strong>0.4</strong>. Если процент сходства во внешнем сервисе
              превышает установленный вами лимит, операционист увидит предупреждение на странице оформления.
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                disabled={saving}
                className="action-buttons__btn"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "12px 24px",
                  fontSize: "15px",
                  fontWeight: 600,
                  background: "linear-gradient(135deg, #4a6cf7, #6366f1)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "10px",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(74, 108, 247, 0.35)",
                  transition: "all 0.25s ease"
                }}
              >
                {saving ? (
                  <Spinner size="small" />
                ) : (
                  <>
                    <Save size={18} />
                    Сохранить настройки
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {alert && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            padding: "14px 24px",
            borderRadius: "10px",
            backgroundColor: alert.type === "success" ? "#d4edda" : "#f8d7da",
            color: alert.type === "success" ? "#155724" : "#721c24",
            border: `1px solid ${alert.type === "success" ? "#c3e6cb" : "#f5c6cb"}`,
            fontWeight: 600,
            zIndex: 9999,
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
            animation: "fadeIn 0.3s ease-out"
          }}
        >
          {alert.message}
        </div>
      )}
    </div>
  );
};

export default ComplianceSettings;
