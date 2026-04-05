import React, { useState, useEffect, useCallback } from "react";
import { Table } from "../../../table/FlexibleAntTable.jsx";
import "../../../../styles/components/ProcessingIntegration.scss";
import "../../../../styles/components/BlockInfo.scss";
import AlertMessage from "../../../general/AlertMessage.jsx";
import { getCurrencyCode } from "../../../../api/utils/getCurrencyCode.js";
import { useExcelExport } from "../../../../hooks/useExcelExport.js";

const getLimitDescription = (limitId) => {
  const descriptions = {
    LMTTZ285: "Чужой ВПН в месяц(сумма)",
    LMTTZ292: "Чужой ПОС в день(кол-во)",
    LMTTZ272: "Наш АТМ в день(кол-во)",
    LMTTZ288: "Чужой АТМ в день(кол-во)",
    LMTTZ362: "Корректировка лимита",
    LMTTZ363: "Корректировка лимита",
    LMTTZ271: "Наш АТМ в день(сумма)",
    LMTTZ273: "Наш АТМ в месяц(сумма)",
    LMTTZ280: "Наш ЕПОС в день(кол-во)",
    LMTTZ281: "Наш ЕПОС в месяц(сумма)",
    LMTTZ268: "Наш ПВН в день(кол-во)",
    LMTTZ270: "Наш ПВН в месяц(кол-во)",
    LMTTZ283: "Чужой ПВН в день(сумма)",
    LMTTZ290: "Чужой АТМ в месяц(кол-во)",
    LMTTZ274: "Наш АТМ в месяц(кол-во)",
    LMTTZ294: "Чужой ПОС в месяц(кол-во)",
    LMTTZ371: "Наш АТМ в день(сумма)",
    LMTTZ276: "Наш ПОС в день(кол-во)",
    LMTTZ278: "Наш ПОС в месяц(кол-во)",
    LMTTZ282: "Наш ЕПОС в месяц(кол-во)",
    LMTTZ297: "Чужой ЕПОС в месяц(сумма)",
    LMTTZ269: "Наш ПВН в месяц(сумма)",
    LMTTZ279: "Наш ЕПОС в день(сумма)",
    LMTTZ286: "Чужой ВПН в месяц(кол-во)",
    LMTTZ298: "Чужой ЕПОС в месяц(кол-во)",
    LMTTZ289: "Чужой АТМ в месяц(сумма)",
    LMTTZ291: "Чужой ПОС в день(сумма)",
    LMTTZ296: "Чужой ЕПОС в день(кол-во)",
    LMTTZ275: "Наш ПОС в день(сумма)",
    LMTTZ287: "Чужой АТМ в день(сумма)",
    LMTTZ293: "Чужой ПОС в месяц(сумма)",
    LMTTZ369: "Технический лимит системы",
    LMTTZ284: "Чужой ПВН в день(кол-во)",
    LMTTZ370: "Системный лимит безопасности",
    LMTTZ372: "Общий лимит расходов(кол-во)",
    LMTTZ267: "Наш ПВН в день(сумма)",
    LMTTZ295: "Чужой ЕПОС в день(сумма)",
    LMTTZ277: "Наш ПОС в месяц(сумма)",
  };
  return descriptions[limitId] || `Лимит ${limitId}`;
};

const API_BASE_URL = import.meta.env.VITE_BACKEND_PROCESSING_URL;
const api = {
  getLimits: async (cardNumber) => {
    const response = await fetch(`${API_BASE_URL}/api/Transactions/limits/${cardNumber}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  },
  updateLimit: async (cardNumber, limitName, limitValue) => {
    const url = `${API_BASE_URL}/api/Transactions/${cardNumber}?limitName=${encodeURIComponent(limitName)}&limitValue=${encodeURIComponent(limitValue)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  },
};

const CustomSelect = ({ value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find((opt) => opt.value === value);
  return (
    <div className="custom-select">
      <div className={`custom-select__trigger ${isOpen ? "custom-select__trigger--open" : ""}`} onClick={() => setIsOpen(!isOpen)}>
        <span className="custom-select__value">{selected ? selected.label : ""}</span>
        <span className={`custom-select__arrow ${isOpen ? "custom-select__arrow--open" : ""}`}>▼</span>
      </div>
      {isOpen && (
        <>
          <div className="custom-select__backdrop" onClick={() => setIsOpen(false)} />
          <div className="custom-select__dropdown">
            {options.map((option) => (
              <div key={option.value} className={`custom-select__option ${value === option.value ? "custom-select__option--selected" : ""}`} onClick={() => { onChange(option.value); setIsOpen(false); }}>
                {option.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const LimitEditModal = ({ isOpen, onClose, limit, onSave }) => {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { if (isOpen && limit) { setValue((limit.newValue || limit.value).toString()); setError(""); } }, [isOpen, limit]);
  const handleSave = () => {
    const numValue = parseFloat(value.replace(/\s/g, ""));
    if (!value.trim()) { setError("Значение не может быть пустым"); return; }
    if (isNaN(numValue) || numValue < 0) { setError("Введите корректное числовое значение"); return; }
    onSave(limit.name, numValue);
    onClose();
  };
  if (!isOpen) return null;
  return (
    <div className="modal-overlay-processing" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-processing">
        <button className="modal-processing__close" onClick={onClose}>×</button>
        <div className="modal-processing__header">
          <h3 className="modal-processing__title">Изменение лимита</h3>
          <p className="modal-processing__subtitle">{getLimitDescription(limit?.name)}</p>
          <p className="modal-processing__info">ID: {limit?.name}</p>
        </div>
        <div className="modal-processing__body">
          <label className="modal-processing__label">Новое значение лимита</label>
          <input type="text" className={`modal-processing__input ${error ? "modal-processing__input--error" : ""}`} value={value.replace(/\B(?=(\d{3})+(?!\d))/g, " ")} onChange={(e) => setValue(e.target.value.replace(/\s/g, ""))} onKeyPress={(e) => e.key === "Enter" && handleSave()} autoFocus />
          {error && <div className="modal-processing__error">{error}</div>}
          <div className="modal-processing__info">Текущее: <strong>{limit?.currentValue.toLocaleString()} {getCurrencyCode(limit?.currency)}</strong></div>
        </div>
        <div className="modal-processing__footer">
          <button className="modal-processing__btn--secondary" onClick={onClose}>Отмена</button>
          <button className="modal-processing__btn--primary" onClick={handleSave}>Сохранить</button>
        </div>
      </div>
    </div>
  );
};

export default function ProcessingIntegrationLimits() {
  const [cardNumber, setCardNumber] = useState("");
  const [displayCardNumber, setDisplayCardNumber] = useState("");
  const [limitData, setLimitData] = useState([]);
  const [filteredLimitData, setFilteredLimitData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { exportToExcel } = useExcelExport();
  const [editModal, setEditModal] = useState({ isOpen: false, limit: null });
  const [alert, setAlert] = useState({ show: false, message: "", type: "success" });

  const showAlert = (message, type = "success") => setAlert({ show: true, message, type });
  const hideAlert = () => setAlert({ show: false, message: "", type: "success" });

  const handleCardNumberChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 16);
    setCardNumber(digitsOnly);
    setDisplayCardNumber(digitsOnly.replace(/(\d{4})(?=\d)/g, "$1 "));
  };

  const handleCardNumberSearch = async () => {
    if (cardNumber.length === 16) {
      setIsLoading(true);
      try {
        const limits = await api.getLimits(cardNumber);
        setLimitData(limits.map(l => ({ ...l, description: getLimitDescription(l.name), newValue: null })));
        showAlert(`Загружено ${limits.length} лимитов`);
      } catch (e) { showAlert(e.message, "error"); }
      finally { setIsLoading(false); }
    }
  };

  useEffect(() => {
    let filtered = limitData.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()) || l.description.toLowerCase().includes(searchQuery.toLowerCase()));
    filtered.sort((a, b) => {
      const numA = parseInt(a.name.match(/\d+$/)?.[0] || 0);
      const numB = parseInt(b.name.match(/\d+$/)?.[0] || 0);
      return sortOrder === "asc" ? numA - numB : numB - numA;
    });
    setFilteredLimitData(filtered);
  }, [limitData, searchQuery, sortOrder]);

  const handleSaveAll = async () => {
    const changes = limitData.filter(l => l.newValue !== null && l.newValue !== l.value);
    if (!changes.length) return showAlert("Нет изменений", "info");
    setIsSaving(true);
    let success = 0;
    for (const c of changes) {
      try { await api.updateLimit(cardNumber, c.name, c.newValue.toString()); success++; }
      catch (e) { console.error(e); }
    }
    if (success) {
      setLimitData(prev => prev.map(l => l.newValue !== null ? { ...l, value: l.newValue, newValue: null } : l));
      showAlert(`Сохранено ${success} лимитов`);
    } else showAlert("Ошибка сохранения", "error");
    setIsSaving(false);
  };

  const handleExport = () => {
    const columns = [
      { key: "name", label: "ID" },
      { key: "description", label: "Описание" },
      { key: (row) => `${row.currentValue} ${getCurrencyCode(row.currency)}`, label: "Текущее" },
      { key: (row) => `${row.value} ${getCurrencyCode(row.currency)}`, label: "Лимит" },
    ];
    exportToExcel(filteredLimitData, columns, `Лимиты_${cardNumber}`);
  };

  return (
    <div className="block_info_prems content-page" align="center">
      {alert.show && <AlertMessage message={alert.message} type={alert.type} onClose={hideAlert} duration={3000} />}
      <div className="processing-integration">
        <div className="processing-integration__container">
          <div className="processing-integration__header">
            <h1 className="processing-integration__title">Управление лимитами</h1>
          </div>
          <div className="processing-integration__search-card">
            <div className="search-card__content">
              <input type="text" value={displayCardNumber} onChange={handleCardNumberChange} placeholder="0000 0000 0000 0000" className="search-card__input" maxLength={19} disabled={isLoading || isSaving} />
              <button onClick={handleCardNumberSearch} disabled={cardNumber.length !== 16 || isLoading || isSaving} className="search-card__button">{isLoading ? "..." : "Найти"}</button>
            </div>
          </div>
          {limitData.length > 0 && (
            <div className="processing-integration__limits-table">
              <div className="limits-table">
                <div className="limits-table__header">
                  <h2 className="limits-table__title">Лимиты карты {displayCardNumber}</h2>
                  <div className="limits-table__actions">
                    <button onClick={handleExport} className="export-excel-btn">Excel</button>
                    <button onClick={handleSaveAll} className="limits-table__action-btn--primary" disabled={isSaving}>Сохранить изменения</button>
                  </div>
                </div>
                <div className="limits-table__filters">
                  <input type="text" placeholder="Поиск..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  <CustomSelect value={sortOrder} onChange={setSortOrder} options={[{ value: "asc", label: "По возрастанию" }, { value: "desc", label: "По убыванию" }]} />
                </div>
                <Table dataSource={filteredLimitData} rowKey="name" pagination={{ pageSize: 15 }} bordered>
                  <Table.Column title="Лимит" key="info" render={(_, row) => <div><div>{row.description}</div><small>ID: {row.name}</small></div>} />
                  <Table.Column title="Текущее" key="curr" render={(_, row) => `${row.currentValue.toLocaleString()} ${getCurrencyCode(row.currency)}`} />
                  <Table.Column title="Лимит" key="limit" render={(_, row) => `${row.value.toLocaleString()} ${getCurrencyCode(row.currency)}`} />
                  <Table.Column title="Новое" key="new" render={(_, row) => row.newValue !== null ? <span className="new-value--changed">{row.newValue.toLocaleString()} {getCurrencyCode(row.currency)}</span> : "—"} />
                  <Table.Column title="Действие" key="act" render={(_, row) => <button onClick={() => setEditModal({ isOpen: true, limit: row })} disabled={isSaving}>Изменить</button>} />
                </Table>
              </div>
            </div>
          )}
          {isLoading && <div className="spinner"></div>}
        </div>
      </div>
      <LimitEditModal isOpen={editModal.isOpen} onClose={() => setEditModal({ isOpen: false, limit: null })} limit={editModal.limit} onSave={(name, val) => setLimitData(prev => prev.map(l => l.name === name ? { ...l, newValue: val } : l))} />
    </div>
  );
}
