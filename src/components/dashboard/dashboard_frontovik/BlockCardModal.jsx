import React, { useState } from "react";
import Spinner from "../../Spinner.jsx";

const BlockCardModal = ({ isOpen, onClose, onConfirm, isLoading }) => {
  const [selectedStatus, setSelectedStatus] = useState("");

  if (!isOpen) return null;

  const options = [
    {
      value: "5",
      label: "5 - Операции запрещены (клиент не сможет разблокировать в мобильном приложении)",
    },
    {
      value: "6",
      label: "6 - Карта утеряна, банкомат зажует карту (клиент сможет использовать карту в мобильном приложении)",
    },
    {
      value: "24",
      label: "24 - Временная блокировка по просьбе клиента (клиент СМОЖЕТ разблокировать в мобильном приложении)",
    },
  ];

  const handleConfirm = () => {
    if (selectedStatus) {
      onConfirm(selectedStatus);
    }
  };

  return (
    <div className={`graph-modal-overlay ${isOpen ? "graph-modal-overlay--open" : ""}`}>
      <div className="graph-modal-container" style={{ maxWidth: '500px' }}>
        <div className="graph-modal-header" style={{ background: '#e11d48' }}>
          <h2 className="graph-modal-title" style={{ color: 'white' }}>Заблокировать</h2>
          <button className="graph-modal-close" onClick={onClose} style={{ color: 'white' }}>
            &times;
          </button>
        </div>

        <div className="graph-modal-content" style={{ padding: '20px' }}>
          {isLoading ? (
            <div className="graph-modal-loading">
              <Spinner center />
              <p>Выполнение блокировки...</p>
            </div>
          ) : (
            <>
              <p style={{ marginBottom: '10px', color: '#666' }}>Выберите тип блокировки</p>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  outline: 'none',
                  background: 'white'
                }}
              >
                <option value="">Выберите тип...</option>
                {options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        <div className="graph-modal-footer">
          <button className="graph-modal-close-btn" onClick={onClose}>
            Отмена
          </button>
          <button
            className="selectAll-toggle"
            onClick={handleConfirm}
            disabled={!selectedStatus || isLoading}
            style={{ 
                marginLeft: '10px', 
                background: selectedStatus ? '#e11d48' : '#ccc',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '4px',
                cursor: selectedStatus ? 'pointer' : 'not-allowed'
            }}
          >
            Заблокировать
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlockCardModal;
