import React, { useState } from "react";
import Modal from "../general/Modal.jsx";
import { uploadClientDocument } from "../../api/clientsDataFiles/clientsDataFiles.js";

export default function ClientDocumentUploadModal({ isOpen, onClose, onUploadSuccess, inn: initialInn = "" }) {
  const [inn, setInn] = useState(initialInn);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!inn.trim() || !title.trim() || !file) {
      setError("Пожалуйста, заполните все поля и выберите файл");
      return;
    }

    setIsLoading(true);
    try {
      await uploadClientDocument(inn, title, file);
      onUploadSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Ошибка при загрузке документа");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Загрузить документ клиента">
      <div className="client-document-upload-modal" style={{ padding: '0 16px 16px' }}>
        {error && <div className="alert-message error-message" style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>ИНН Клиента:</label>
            <input 
              type="text" 
              value={inn} 
              onChange={(e) => setInn(e.target.value)}
              required 
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
          
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>Название документа:</label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              required 
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              placeholder="Например: Паспорт"
            />
          </div>
          
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>Файл:</label>
            <input 
              type="file" 
              onChange={handleFileChange}
              required 
              style={{ width: '100%' }}
            />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button 
              type="button" 
              onClick={onClose}
              disabled={isLoading}
              style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
            >
              Отмена
            </button>
            <button 
              type="submit"
              disabled={isLoading}
              style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              {isLoading ? 'Загрузка...' : 'Загрузить'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
