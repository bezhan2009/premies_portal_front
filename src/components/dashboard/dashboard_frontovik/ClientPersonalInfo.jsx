import React from "react";
import {
  FaSpinner,
  FaCopy,
  FaHistory
} from "react-icons/fa";
import { serviceCodes } from "../../../utils/serviceCodes";
import DynamicDocxButtons from "../../general/DynamicDocxButtons";
import { extractDocxClientData } from "../../../utils/docxTemplateHelpers";

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
  isSalaryClient,
  verifiedClientCodes = [],
  onPromptPin,
}) => {
  if (!selectedClient) return null;

  const isSelectedClientPinRequired = selectedClient && selectedClient.requires_pin && !verifiedClientCodes.includes(selectedClient.client_code);

  const name = selectedClient.long_name || `${selectedClient.surname || ""} ${selectedClient.name || ""} ${selectedClient.patronymic || ""}`.trim();
  const code = selectedClient.client_code || "Не указан";
  const phone = selectedClient.phone || "Не указан";
  const inn = selectedClient.tax_code || "Не указан";
  
  const typeVal = selectedClient.client_type?.toLowerCase();
  const clientTypeName = typeVal === "corporate" ? "Юридическое лицо" : typeVal === "individual" ? "Физическое лицо" : (selectedClient.ClientTypeName || selectedClient.client_type_name || (selectedClient.tax_code ? "Юридическое лицо" : "Физическое лицо"));

  const branchCode = code && code !== "Не указан" ? code.replace(/[^0-9]/g, "").substring(0, 4) : null;
  const serviceText = branchCode && serviceCodes[branchCode] ? serviceCodes[branchCode] : "";

  return (
    <div className="client-results-section">
      {/* ── MULTIPLE CLIENTS SELECTOR ── */}
      {clientsData.length > 1 && (
        <div className="client-selector-card">
          <span className="client-selector-label">Найдено несколько клиентов ({clientsData.length}):</span>
          <div className="client-selector-buttons">
            {clientsData.map((client, index) => {
              const isPinRequired = client.requires_pin && !verifiedClientCodes.includes(client.client_code);
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSelectedClientIndex(index)}
                  className={`client-selector-btn ${
                    selectedClientIndex === index ? "active" : ""
                  }`}
                >
                  {index + 1}. {isPinRequired ? "Введите пин чтобы увидеть клиента" : (client.long_name || `${client.surname || ""} ${client.name || ""}`)}
                  {!isPinRequired && client.tax_code && ` (ИНН: ${client.tax_code})`}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CLIENT SUMMARY DASHBOARD CARD ── */}
      {isSelectedClientPinRequired ? (
        <div className="abs-client-summary-card" style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
           <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#374151' }}>Для просмотра этого клиента требуется ввести PIN-код</h3>
           <p style={{ marginTop: '8px', fontSize: '14px', color: '#4b5563' }}>Введите PIN-код для получения доступа к личным данным клиента.</p>
           <button 
             type="button" 
             onClick={() => onPromptPin && onPromptPin(selectedClient)}
             style={{
               marginTop: '16px',
               background: 'var(--primary-color, #e11d48)',
               color: 'white',
               border: 'none',
               padding: '10px 20px',
               borderRadius: '8px',
               cursor: 'pointer',
               fontWeight: '600',
               boxShadow: '0 2px 4px rgba(225, 29, 72, 0.2)'
             }}
           >
             Ввести PIN-код
           </button>
        </div>
      ) : (
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
            <div className="summary-identity-info" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
              <div className="summary-identity-fio">
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{name}</h2>
              </div>
              <div className="summary-identity-code" style={{ display: 'flex', gap: '20px', color: '#888', fontSize: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span>Код клиента: {code}</span>
                {serviceText && <span>Обслуживается: {serviceText}</span>}
                {isSalaryClient && (
                  <span className="salary-client-badge" style={{ 
                    backgroundColor: 'var(--primary-color)', 
                    color: 'white', 
                    padding: '3px 10px', 
                    borderRadius: '12px', 
                    fontSize: '12px', 
                    fontWeight: '600',
                    letterSpacing: '0.3px',
                    boxShadow: '0 2px 4px rgba(var(--primary-rgb), 0.2)'
                  }}>
                    Зарплатный клиент
                  </span>
                )}
              </div>

              {/* Metadata fields Grid inside Identity info to align with FIO */}
              <div className="summary-metadata-grid" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(5, 1fr)', 
                gap: '15px', 
                marginTop: '10px' 
              }}>
                <div className="metadata-field" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#888' }}>ИНН</span>
                  <span className="font-mono" style={{ fontSize: '14px', fontWeight: '500' }}>{inn}</span>
                </div>

                <div className="metadata-field" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#888' }}>Телефон</span>
                  <span className="font-mono" style={{ fontSize: '14px', fontWeight: '500' }}>{phone}</span>
                </div>

                <div className="metadata-field" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#888' }}>Тип клиента</span>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>{clientTypeName}</span>
                </div>

                <div className="metadata-field" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#888' }}>Мобильный банкинг</span>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>
                    {isMobile === null ? (
                      <span className="mobile-status-checking" style={{ color: '#888' }}>Неизвестно</span>
                    ) : isMobile?.isMobileAppRegistered === true ? (
                      <span className="mobile-status-connected" style={{ color: '#16a34a', fontWeight: 600 }}>Подключен</span>
                    ) : isMobile?.isMobileAppRegistered === false ? (
                      <span className="mobile-status-disconnected" style={{ color: '#e11d48', fontWeight: 600 }}>Не подключен</span>
                    ) : (isMobile && (typeof isMobile === 'string' || isMobile?.Iban || isMobile?.iban || isMobile?.account)) ? (
                      <span className="mobile-status-connected" style={{ color: '#16a34a', fontWeight: 600 }}>Подключен</span>
                    ) : (
                      <span className="mobile-status-disconnected" style={{ color: '#e11d48', fontWeight: 600 }}>Не подключен</span>
                    )}
                  </span>
                </div>

                <div className="metadata-field" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#888' }}>Telegram бот</span>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>
                    {telegramLoading ? (
                      <span className="tg-status-text italic" style={{ color: '#888' }}>Проверка...</span>
                    ) : telegramData?.userTelegramId ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="mobile-status-connected" style={{ color: '#333' }}>Подключен</span>
                        <button 
                          onClick={() => handleDeleteTelegram(phone)}
                          disabled={telegramDeleteLoading}
                          style={{ fontSize: '13px', color: '#c8102e', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                        >
                          {telegramDeleteLoading ? <FaSpinner className="spin" /> : "Отключить"}
                        </button>
                      </div>
                    ) : (
                      <span className="mobile-status-disconnected" style={{ color: '#333' }}>Не подключен</span>
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
              <DynamicDocxButtons
                page="ClientDetails"
                section="Документы клиента"
                data={extractDocxClientData(selectedClient)}
              />
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
      )}
    </div>
  );
};

export default ClientPersonalInfo;

