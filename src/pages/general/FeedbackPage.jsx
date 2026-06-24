import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Send, CheckCircle2, AlertCircle } from "lucide-react";
import { Helmet } from "react-helmet";

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:7575";

export default function FeedbackPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");
  
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const getRoles = () => {
    try { return JSON.parse(localStorage.getItem("role_ids") || "[]"); } 
    catch { return []; }
  };
  const isOperator = getRoles().includes(3);

  useEffect(() => {
    if (isOperator) navigate("/operator/feedback");
  }, [isOperator, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlError = params.get("errorMsg");
    const urlPage = params.get("page");
    
    if (urlError || urlPage) {
      let initialText = "";
      if (urlPage) initialText += `[Страница: ${urlPage}]\n`;
      if (urlError) initialText += `[Ошибка: ${urlError}]\n\n`;
      setDescription(initialText);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    setSubmitting(true);
    setErrorMsg("");
    try {
      await axios.post(`${API_URL}/api/feedback`, { message: description.trim() }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubmitted(true);
      setDescription("");
    } catch (err) {
      setErrorMsg("Не удалось отправить обращение. Пожалуйста, попробуйте еще раз.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="feedback-form-container">
      <Helmet><title>Обратная связь</title></Helmet>
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
          max-width: 500px;
          background: var(--bg-sidebar);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 32px;
          box-shadow: var(--shadow-lg);
        }
        .feedback-card h2 { margin: 0 0 16px 0; font-size: 22px; color: var(--text-color); text-align: center; }
        .feedback-textarea {
          width: 100%;
          min-height: 150px;
          background: var(--bg-color);
          border: 1px solid var(--border-input);
          border-radius: 10px;
          padding: 16px;
          color: var(--text-color);
          font-size: 15px;
          resize: vertical;
          margin-bottom: 16px;
          outline: none;
          box-sizing: border-box;
        }
        .feedback-textarea:focus { border-color: var(--primary-color); }
        .feedback-submit-btn {
          width: 100%;
          background: var(--primary-color);
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 14px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .feedback-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .error-banner { background: rgba(235,37,37,0.1); color: #eb2525; padding: 12px; border-radius: 8px; display: flex; gap: 8px; margin-bottom: 16px; }
        .success-state { text-align: center; }
        .success-state h3 { color: var(--text-color); margin: 16px 0; }
        .btn-reset { background: transparent; border: 1px solid var(--border-color); color: var(--text-color); padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; }
      `}</style>
      <div className="feedback-card">
        {!submitted ? (
          <form onSubmit={handleSubmit}>
            <h2>Обратная связь</h2>
            {errorMsg && <div className="error-banner"><AlertCircle size={18}/><span>{errorMsg}</span></div>}
            <textarea 
              className="feedback-textarea"
              placeholder="Опишите вашу проблему или предложение..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
            />
            <button type="submit" className="feedback-submit-btn" disabled={submitting || !description.trim()}>
              <Send size={18} />
              <span>{submitting ? "Отправка..." : "Отправить"}</span>
            </button>
          </form>
        ) : (
          <div className="success-state">
            <CheckCircle2 size={48} color="#10b981" style={{margin: '0 auto'}}/>
            <h3>Отправлено!</h3>
            <button className="btn-reset" onClick={() => setSubmitted(false)}>Отправить еще</button>
          </div>
        )}
      </div>
    </div>
  );
}
