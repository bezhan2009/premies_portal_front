import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Send, MessageSquare, AlertCircle, CheckCircle2, FileText, Info } from "lucide-react";
import { Helmet } from "react-helmet";

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:7575";

export default function FeedbackPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");
  
  // Form fields
  const [category, setCategory] = useState("Ошибка / Сбой в системе");
  const [pageName, setPageName] = useState("");
  const [description, setDescription] = useState("");
  
  // UI states
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Check role
  const getRoles = () => {
    try {
      return JSON.parse(localStorage.getItem("role_ids") || "[]");
    } catch {
      return [];
    }
  };
  const isOperator = getRoles().includes(3);

  // Redirect operator to their separate workspace
  useEffect(() => {
    if (isOperator) {
      navigate("/operator/feedback");
    }
  }, [isOperator, navigate]);

  // Read URL query parameters for errors
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlError = params.get("errorMsg");
    const urlPage = params.get("page");
    
    if (urlError || urlPage) {
      setCategory("Ошибка / Сбой в системе");
      if (urlPage) setPageName(urlPage);
      if (urlError) setDescription(urlError);
      
      // Clean query parameters from URL without reloading
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    setSubmitting(true);
    setErrorMsg("");
    try {
      // Format feedback message nicely
      let formattedMessage = `[Категория: ${category}]`;
      if (pageName.trim()) {
        formattedMessage += ` [Страница: ${pageName.trim()}]`;
      }
      formattedMessage += `\n\n${description.trim()}`;

      const axiosConfig = {
        headers: { Authorization: `Bearer ${token}` }
      };

      await axios.post(`${API_URL}/api/feedback`, { message: formattedMessage }, axiosConfig);
      setSubmitted(true);
      setDescription("");
      setPageName("");
    } catch (err) {
      console.error("Error sending feedback:", err);
      setErrorMsg("Не удалось отправить обращение. Пожалуйста, попробуйте еще раз.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSubmitted(false);
    setCategory("Ошибка / Сбой в системе");
    setPageName("");
    setDescription("");
  };

  return (
    <div className="feedback-form-container">
      <Helmet>
        <title>Обратная связь</title>
      </Helmet>

      <style>{`
        .feedback-form-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: calc(100vh - 64px);
          background: var(--bg-color);
          padding: 24px;
          font-family: 'Inter', sans-serif;
        }

        .feedback-card {
          width: 100%;
          max-width: 600px;
          background: var(--bg-sidebar);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          box-shadow: var(--shadow-lg);
          padding: 32px;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .feedback-card:hover {
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        }

        .feedback-header {
          text-align: center;
          margin-bottom: 28px;
        }
        
        .feedback-icon-wrapper {
          width: 56px;
          height: 56px;
          border-radius: 28px;
          background: rgba(var(--primary-rgb), 0.1);
          color: var(--primary-color);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px auto;
        }

        .feedback-header h2 {
          font-size: 22px;
          font-weight: 700;
          color: var(--text-color);
          margin: 0 0 8px 0;
        }

        .feedback-header p {
          font-size: 14px;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.5;
        }

        .feedback-form-group {
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .feedback-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-color);
        }

        .feedback-select,
        .feedback-input,
        .feedback-textarea {
          width: 100%;
          background: var(--bg-color);
          border: 1px solid var(--border-input);
          border-radius: 10px;
          padding: 12px 16px;
          color: var(--text-color);
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .feedback-select:focus,
        .feedback-input:focus,
        .feedback-textarea:focus {
          border-color: var(--primary-color);
          box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.15);
        }

        .feedback-select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          background-size: 16px;
          cursor: pointer;
        }

        .feedback-textarea {
          resize: vertical;
          min-height: 120px;
          line-height: 1.5;
        }

        .feedback-hint {
          font-size: 11px;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 4px;
        }

        .feedback-submit-btn {
          width: 100%;
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%);
          color: #ffffff;
          border: none;
          border-radius: 10px;
          padding: 14px;
          font-size: 15px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.15);
          margin-top: 10px;
        }

        .feedback-submit-btn:hover:not(:disabled) {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }

        .feedback-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-banner {
          background: rgba(235, 37, 37, 0.1);
          border: 1px solid rgba(235, 37, 37, 0.2);
          border-radius: 8px;
          padding: 12px 16px;
          color: #eb2525;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
        }

        /* Success State */
        .success-state {
          text-align: center;
          padding: 16px 0;
        }

        .success-icon-wrapper {
          color: #10b981;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          animation: scaleUp 0.4s ease-out;
        }

        .success-state h3 {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-color);
          margin: 0 0 12px 0;
        }

        .success-state p {
          font-size: 14px;
          color: var(--text-secondary);
          margin: 0 0 24px 0;
          line-height: 1.6;
        }

        .btn-reset {
          background: var(--bg-color);
          border: 1px solid var(--border-color);
          color: var(--text-color);
          border-radius: 10px;
          padding: 12px 24px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-reset:hover {
          background: var(--bg-secondary);
          border-color: var(--text-secondary);
        }

        @keyframes scaleUp {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>

      <div className="feedback-card">
        {!submitted ? (
          <form onSubmit={handleSubmit}>
            <div className="feedback-header">
              <div className="feedback-icon-wrapper">
                <MessageSquare size={26} />
              </div>
              <h2>Обратная связь</h2>
              <p>
                Обнаружили сбой в системе или хотите предложить идею? Заполните форму, и специалисты техподдержки примут меры.
              </p>
            </div>

            {errorMsg && (
              <div className="error-banner">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="feedback-form-group">
              <label className="feedback-label">Категория обращения</label>
              <select 
                className="feedback-select" 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Ошибка / Сбой в системе">Ошибка / Сбой в системе</option>
                <option value="Предложение по улучшению">Предложение по улучшению</option>
                <option value="Вопрос по работе портала">Вопрос по работе портала</option>
                <option value="Другое">Другое</option>
              </select>
            </div>

            <div className="feedback-form-group">
              <label className="feedback-label">Страница портала (необязательно)</label>
              <input 
                type="text" 
                className="feedback-input"
                placeholder="Пример: /cards, /credits, Главная..."
                value={pageName}
                onChange={(e) => setPageName(e.target.value)}
              />
              <div className="feedback-hint">
                <FileText size={12} />
                <span>Укажите страницу, на которой возникла проблема.</span>
              </div>
            </div>

            <div className="feedback-form-group">
              <label className="feedback-label">Описание проблемы / Ваше сообщение</label>
              <textarea 
                className="feedback-textarea"
                placeholder="Пожалуйста, опишите проблему или детали вашего предложения..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
              <div className="feedback-hint">
                <Info size={12} />
                <span>Опишите последовательность ваших действий, если это сбой.</span>
              </div>
            </div>

            <button 
              type="submit" 
              className="feedback-submit-btn"
              disabled={submitting || !description.trim()}
            >
              <Send size={16} />
              <span>{submitting ? "Отправка..." : "Отправить обращение"}</span>
            </button>
          </form>
        ) : (
          <div className="success-state">
            <div className="success-icon-wrapper">
              <CheckCircle2 size={56} />
            </div>
            <h3>Обращение успешно отправлено!</h3>
            <p>
              Спасибо за информацию! Мы передали данные разработчикам для скорейшего анализа и устранения неполадки.
            </p>
            <button className="btn-reset" onClick={handleResetForm}>
              Отправить еще одно сообщение
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
