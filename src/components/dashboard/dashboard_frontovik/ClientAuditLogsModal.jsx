import React from "react";
import ClientAuditLogs from "./ClientAuditLogs.jsx";

const ClientAuditLogsModal = ({ isOpen, onClose, logs, loading }) => {
  if (!isOpen) return null;

  return (
    <div className={`graph-modal-overlay ${isOpen ? "graph-modal-overlay--open" : ""}`}>
      <div className="graph-modal-container" style={{ maxWidth: '900px', width: '90%' }}>
        <div className="graph-modal-header" style={{ background: '#1890ff' }}>
          <h2 className="graph-modal-title" style={{ color: 'white' }}>Журнал действий клиента</h2>
          <button className="graph-modal-close" onClick={onClose} style={{ color: 'white' }}>
            &times;
          </button>
        </div>

        <div className="graph-modal-content" style={{ padding: '20px', maxHeight: '550px', overflowY: 'auto' }}>
          <ClientAuditLogs logs={logs} loading={loading} isModalMode={true} />
        </div>

        <div className="graph-modal-footer">
          <button className="graph-modal-close-btn" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientAuditLogsModal;
