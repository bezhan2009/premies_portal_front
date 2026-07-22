import React, { useState } from "react";
import { Send, Paperclip, MessageSquare, AlertCircle, CheckCircle, HelpCircle } from "lucide-react";
import axios from "axios";
import { Helmet } from "react-helmet";
import Spinner from "../../components/Spinner.jsx";

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:7575";

export default function SubmitFeedbackPage() {
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });
  const token = localStorage.getItem("access_token");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() && !file) return;

    setSending(true);
    setStatus({ type: "", text: "" });
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
        message: message.trim(),
        attachment_url: attachmentUrl,
        recipient_id: 0 // Support ticket
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage("");
      setFile(null);
      setStatus({ type: "success", text: "Ваше сообщение успешно отправлено! Мы ответим вам в ближайшее время." });
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", text: "Произошла ошибка при отправке. Пожалуйста, попробуйте еще раз." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="submit-feedback-container">
      <Helmet><title>Обратная связь</title></Helmet>
      <style>{`
        .submit-feedback-container {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          min-height: calc(100vh - 64px);
          background: var(--bg-color);
          padding: 40px 20px;
          font-family: "Inter", sans-serif;
          position: relative;
          overflow: hidden;
        }
        
        /* Background decorations */
        .feedback-bg-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          z-index: 0;
          opacity: 0.15;
          animation: float 10s ease-in-out infinite;
        }
        .blob-1 {
          width: 500px;
          height: 500px;
          background: var(--primary-color);
          top: -100px;
          left: -100px;
        }
        .blob-2 {
          width: 400px;
          height: 400px;
          background: #4ade80;
          bottom: -50px;
          right: -50px;
          animation-delay: -5s;
        }
        
        .feedback-card {
          width: 100%;
          max-width: 650px;
          background: rgba(var(--bg-sidebar-rgb, 255, 255, 255), 0.7);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(128, 128, 128, 0.15);
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.05);
          position: relative;
          z-index: 1;
          animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .feedback-header {
          text-align: center;
          margin-bottom: 32px;
        }
        
        .feedback-icon-wrapper {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, rgba(var(--primary-rgb), 0.1) 0%, rgba(var(--primary-rgb), 0.2) 100%);
          color: var(--primary-color);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          transform: rotate(-5deg);
          box-shadow: 0 8px 16px rgba(var(--primary-rgb), 0.15);
          transition: transform 0.3s ease;
        }
        .feedback-card:hover .feedback-icon-wrapper {
          transform: rotate(0deg) scale(1.05);
        }

        .feedback-header h1 {
          font-size: 28px;
          font-weight: 800;
          color: var(--text-color);
          margin: 0 0 10px 0;
          letter-spacing: -0.5px;
        }
        .feedback-header p {
          font-size: 15px;
          color: var(--text-secondary);
          line-height: 1.5;
          margin: 0;
        }

        .feedback-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .input-group label {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-color);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .textarea-wrapper {
          position: relative;
          border-radius: 16px;
          background: var(--bg-color);
          border: 1px solid var(--border-color);
          transition: all 0.2s ease;
          overflow: hidden;
        }
        .textarea-wrapper:focus-within {
          border-color: var(--primary-color);
          box-shadow: 0 0 0 4px rgba(var(--primary-rgb), 0.1);
        }
        
        textarea.feedback-input {
          width: 100%;
          min-height: 150px;
          padding: 16px;
          background: transparent;
          border: none;
          color: var(--text-color);
          font-size: 15px;
          line-height: 1.5;
          resize: vertical;
          outline: none;
          font-family: inherit;
        }
        
        .file-upload-area {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: var(--bg-secondary);
          border: 1px dashed var(--border-color);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .file-upload-area:hover {
          border-color: var(--primary-color);
          background: rgba(var(--primary-rgb), 0.03);
        }
        .file-icon {
          color: var(--primary-color);
        }
        .file-info {
          flex: 1;
          font-size: 14px;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .file-remove {
          background: rgba(235,37,37,0.1);
          color: #eb2525;
          border: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 16px;
        }

        .submit-btn {
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%);
          color: white;
          border: none;
          padding: 16px 24px;
          border-radius: 14px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.3s ease;
          box-shadow: 0 6px 16px rgba(var(--primary-rgb), 0.25);
          margin-top: 8px;
        }
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(var(--primary-rgb), 0.35);
        }
        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .status-message {
          padding: 16px;
          border-radius: 12px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          font-size: 14px;
          line-height: 1.5;
          animation: slideUp 0.3s ease;
        }
        .status-success {
          background: rgba(74, 222, 128, 0.1);
          color: #166534;
          border: 1px solid rgba(74, 222, 128, 0.2);
        }
        [data-theme='dark'] .status-success {
          color: #4ade80;
        }
        .status-error {
          background: rgba(235, 37, 37, 0.1);
          color: #b91c1c;
          border: 1px solid rgba(235, 37, 37, 0.2);
        }
        [data-theme='dark'] .status-error {
          color: #f87171;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @media (max-width: 600px) {
          .feedback-card {
            padding: 24px;
          }
          .feedback-header h1 {
            font-size: 24px;
          }
        }
      `}</style>

      <div className="feedback-bg-blob blob-1"></div>
      <div className="feedback-bg-blob blob-2"></div>

      <div className="feedback-card">
        <div className="feedback-header">
          <div className="feedback-icon-wrapper">
            <MessageSquare size={32} />
          </div>
          <h1>Обратная связь</h1>
          <p>Есть идеи как улучшить систему или нашли ошибку? <br/>Напишите нам, и мы обязательно рассмотрим ваше обращение.</p>
        </div>

        {status.text && (
          <div className={`status-message status-${status.type}`} style={{ marginBottom: "24px" }}>
            {status.type === "success" ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <div>{status.text}</div>
          </div>
        )}

        <form className="feedback-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="message"><HelpCircle size={16} color="var(--primary-color)" /> Подробное описание</label>
            <div className="textarea-wrapper">
              <textarea
                id="message"
                className="feedback-input"
                placeholder="Расскажите нам подробнее..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={sending}
              ></textarea>
            </div>
          </div>

          <div className="input-group">
            <label>Прикрепить файл (скриншот)</label>
            <label className="file-upload-area">
              <input 
                type="file" 
                style={{ display: "none" }} 
                onChange={(e) => setFile(e.target.files[0])}
                disabled={sending}
              />
              <Paperclip className="file-icon" size={20} />
              <div className="file-info">
                {file ? file.name : "Нажмите, чтобы выбрать файл..."}
              </div>
              {file && (
                <button type="button" className="file-remove" onClick={(e) => { e.preventDefault(); setFile(null); }}>
                  &times;
                </button>
              )}
            </label>
          </div>

          <button type="submit" className="submit-btn" disabled={sending || (!message.trim() && !file)}>
            {sending ? <Spinner size="small" /> : <><Send size={18} /> Отправить сообщение</>}
          </button>
        </form>
      </div>
    </div>
  );
}
