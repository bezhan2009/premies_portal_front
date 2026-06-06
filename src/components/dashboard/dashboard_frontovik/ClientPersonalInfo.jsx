import React from "react";
import {
  FaSpinner,
  FaCopy,
  FaHistory
} from "react-icons/fa";

const ClientPersonalInfo = ({
  clientsData,
  selectedClientIndex,
  setSelectedClientIndex,
  selectedClient,
  handleExportClientInfo,
  copySelectedClientToClipboard,
  copyAllClientsToClipboard,
  showAuditLogsBtn,
  onOpenAuditLogs,
  isMobile,
  telegramLoading,
  telegramData,
  handleDeleteTelegram,
  telegramDeleteLoading,
  clientPhotoUrl,
  clientPhotoLoading,
  onOpenClientPhoto,
  onOpenClientDocuments,
  documentsCount = 0,
  selectedClientINN,
}) => {
  if (!selectedClient) return null;

  const name = selectedClient.long_name || `${selectedClient.surname || ""} ${selectedClient.name || ""} ${selectedClient.patronymic || ""}`.trim();
  const code = selectedClient.client_code || "Не указан";
  const phone = selectedClient.phone || "Не указан";
  const inn = selectedClient.tax_code || "Не указан";
  
  const typeVal = selectedClient.client_type?.toLowerCase();
  const clientTypeName = typeVal === "corporate" ? "Юридическое лицо" : typeVal === "individual" ? "Физическое лицо" : (selectedClient.ClientTypeName || selectedClient.client_type_name || (selectedClient.tax_code ? "Юридическое лицо" : "Физическое лицо"));

  return (
    <div className="client-results-section">
      {/* ── MULTIPLE CLIENTS SELECTOR ── */}
      {clientsData.length > 1 && (
        <div className="client-selector-card">
          <span className="client-selector-label">Найдено несколько клиентов ({clientsData.length}):</span>
          <div className="client-selector-buttons">
            {clientsData.map((client, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setSelectedClientIndex(index)}
                className={`client-selector-btn ${
                  selectedClientIndex === index ? "active" : ""
                }`}
              >
                {index + 1}. {client.long_name || `${client.surname || ""} ${client.name || ""}`}
                {client.tax_code && ` (ИНН: ${client.tax_code})`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── CLIENT SUMMARY DASHBOARD CARD ── */}
      <div className="abs-client-summary-card">
        
        {/* Upper row: Avatar/Selfie, Name, Actions */}
        <div className="summary-card-header">
          
          {/* 1. Selfie Photo Box */}
          <div className="summary-selfie-box">
            <button
              type="button"
              className="summary-photo-btn"
              onClick={onOpenClientPhoto}
              disabled={!clientPhotoUrl}
              title={clientPhotoUrl ? "Посмотреть фото клиента" : "Фото клиента не найдено"}
            >
              {clientPhotoLoading ? (
                <div className="photo-placeholder"><FaSpinner className="spin" /></div>
              ) : clientPhotoUrl ? (
                <img src={clientPhotoUrl} alt="Фото клиента" className="summary-photo-img" />
              ) : (
                <div className="photo-placeholder">Фото</div>
              )}
            </button>
          </div>

          {/* 2. Client Identity Metadata */}
          <div className="summary-identity-info">
            <div className="summary-identity-fio">
              <h2>{name}</h2>
            </div>
            <div className="summary-identity-code font-mono">
              Код ABS: <span>{code}</span>
            </div>

            {/* Metadata fields Grid inside Identity info to align with FIO */}
            <div className="summary-metadata-grid">
              <div className="metadata-field">
                <div className="field-icon-label">
                  <span>ИНН:</span>
                </div>
                <span className="field-value font-mono">{inn}</span>
              </div>

              <div className="metadata-field">
                <div className="field-icon-label">
                  <span>Телефон:</span>
                </div>
                <span className="field-value font-mono">{phone}</span>
              </div>

              <div className="metadata-field">
                <div className="field-icon-label">
                  <span>Тип клиента:</span>
                </div>
                <span className="field-value">{clientTypeName}</span>
              </div>

              <div className="metadata-field">
                <div className="field-icon-label">
                  <span>Мобильный банкинг:</span>
                </div>
                <span className="field-value">
                  {isMobile ? (
                    <span className="mobile-status-connected">
                      Подключен (IBAN: {isMobile?.Iban || "-"})
                    </span>
                  ) : isMobile !== null ? (
                    <span className="mobile-status-disconnected">Не подключен</span>
                  ) : (
                    <span className="mobile-status-checking">Неизвестно</span>
                  )}
                </span>
              </div>

              <div className="metadata-field">
                <div className="field-icon-label">
                  <span>Телеграмм бот:</span>
                </div>
                <span className="field-value">
                  {telegramLoading ? (
                    <span className="tg-status-text italic">Проверка...</span>
                  ) : telegramData?.userTelegramId ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="mobile-status-connected">Подключен</span>
                      <button 
                        onClick={() => handleDeleteTelegram(phone)}
                        disabled={telegramDeleteLoading}
                        style={{ fontSize: '13px', color: '#c8102e', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        {telegramDeleteLoading ? <FaSpinner className="spin" /> : "Отключить"}
                      </button>
                    </div>
                  ) : (
                    <span className="mobile-status-disconnected">Не подключен</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Lower row: Action Toolbar */}
        <div className="summary-actions-toolbar">
          <div className="actions-left-group">
            {showAuditLogsBtn && (
              <button onClick={onOpenAuditLogs} className="btn-toolbar-action btn-toolbar-audit">
                <FaHistory />
                <span>Журнал действий</span>
              </button>
            )}
            <button onClick={handleExportClientInfo} className="btn-toolbar-action btn-toolbar-excel">
              <span>Экспорт клиента в Excel</span>
            </button>
            <button 
              onClick={onOpenClientDocuments} 
              className="btn-toolbar-action btn-toolbar-documents"
              disabled={clientPhotoLoading && !documentsCount}
            >
              <span>Документы ({documentsCount})</span>
            </button>
          </div>
          
          <div className="actions-right-group">
            <button onClick={copySelectedClientToClipboard} className="btn-toolbar-action btn-toolbar-copy">
              <FaCopy />
              <span>Копировать JSON клиента</span>
            </button>
            {clientsData.length > 1 && (
              <button onClick={copyAllClientsToClipboard} className="btn-toolbar-action btn-toolbar-copy-all">
                <FaCopy />
                <span>Копировать JSON всех ({clientsData.length})</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ClientPersonalInfo;

