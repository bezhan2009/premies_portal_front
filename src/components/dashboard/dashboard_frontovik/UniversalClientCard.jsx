import React, { useState } from "react";
import { 
  FaUser, 
  FaBuilding, 
  FaSearch, 
  FaEye, 
  FaEyeSlash, 
  FaChevronDown, 
  FaChevronRight,
  FaFileAlt,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaUsers
} from "react-icons/fa";
import { serviceCodes } from "../../../utils/serviceCodes";

// Date formatting helper
const formatDateValue = (val) => {
  if (typeof val !== 'string') return val;
  // Match YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split('-');
    return `${d}.${m}.${y}`;
  }
  // Match YYYY-MM-DDTHH:mm:ss
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
    const datePart = val.substring(0, 10);
    const timePart = val.substring(11, 19);
    const [y, m, d] = datePart.split('-');
    return `${d}.${m}.${y} ${timePart}`;
  }
  return val;
};

// Check if a value is empty (null, undefined, "", empty object, empty array)
const isEmptyValue = (val) => {
  if (val === null || val === undefined) return true;
  if (typeof val === 'string' && val.trim() === '') return true;
  if (Array.isArray(val) && val.length === 0) return true;
  if (typeof val === 'object' && Object.keys(val).length === 0) return true;
  return false;
};

// Classifier and AddInfo extractor helper
const getClassifierOrAddInfo = (client, code) => {
  const upperCode = code.toUpperCase();
  // Search in ClientClassifier
  if (Array.isArray(client.ClientClassifier)) {
    const found = client.ClientClassifier.find(c => 
      c.Classifier?.Code?.toUpperCase() === upperCode || 
      c.Classifier?.Name?.toUpperCase() === upperCode
    );
    if (found) return found.Value?.Name || found.Value?.Value || null;
  }
  // Search in AddInfoList
  if (Array.isArray(client.AddInfoList)) {
    const found = client.AddInfoList.find(a => a.Code?.toUpperCase() === upperCode);
    if (found) return found.Value || null;
  }
  return null;
};

// Founders extractor helper
const getFounders = (client) => {
  if (!Array.isArray(client.AddInfoList)) return [];
  return client.AddInfoList.filter(a => 
    a.Code?.toLowerCase().includes("uchreditel") || 
    a.Code?.toLowerCase().includes("учредитель")
  );
};

// Recursive JSON node renderer
const JsonNode = ({ label, value, hideEmpty, searchTerm }) => {
  const [isOpen, setIsOpen] = useState(false);

  // If empty and hiding is turned on, do not render
  if (hideEmpty && isEmptyValue(value)) return null;

  const displayLabel = label;
  const isLabelMatched = searchTerm ? displayLabel.toLowerCase().includes(searchTerm.toLowerCase()) : false;

  // Render Null / Empty
  if (value === null || value === undefined) {
    const valText = "Нет данных";
    const isValueMatched = searchTerm ? valText.toLowerCase().includes(searchTerm.toLowerCase()) : false;
    if (searchTerm && !isLabelMatched && !isValueMatched) return null;

    return (
      <div className="json-node-leaf">
        <span className={`json-node-key ${isLabelMatched ? 'highlighted-search' : ''}`}>{displayLabel}:</span>
        <span className={`json-node-value null-value ${isValueMatched ? 'highlighted-search' : ''}`}>{valText}</span>
      </div>
    );
  }

  // Render Array
  if (Array.isArray(value)) {
    if (value.length === 0) {
      const valText = "Нет данных (пустой список)";
      const isValueMatched = searchTerm ? valText.toLowerCase().includes(searchTerm.toLowerCase()) : false;
      if (searchTerm && !isLabelMatched && !isValueMatched) return null;

      return (
        <div className="json-node-leaf">
          <span className={`json-node-key ${isLabelMatched ? 'highlighted-search' : ''}`}>{displayLabel}:</span>
          <span className={`json-node-value null-value ${isValueMatched ? 'highlighted-search' : ''}`}>{valText}</span>
        </div>
      );
    }

    // Check if any children match search term
    let hasMatchingChild = false;
    if (searchTerm) {
      // Simple deep check
      const stringified = JSON.stringify(value).toLowerCase();
      hasMatchingChild = stringified.includes(searchTerm.toLowerCase());
    }

    if (searchTerm && !isLabelMatched && !hasMatchingChild) return null;

    // Custom label for specific array items
    const getArrayItemLabel = (item, idx) => {
      if (displayLabel === "DetailedAddresses" || displayLabel === "addresses") {
        return `Адрес #${idx + 1} (${item.Type?.Name || item.type?.name || "Основной"})`;
      }
      if (displayLabel === "ContactData") {
        return `Контакт #${idx + 1} (${item.Type?.Name || item.type?.name || "Основной"})`;
      }
      if (displayLabel === "RegistrationDocuments") {
        return `Документ #${idx + 1} (${item.Type?.Name || item.type?.name || "Регистрация"})`;
      }
      return `Элемент #${idx + 1}`;
    };

    return (
      <details className="json-node-branch" open={searchTerm ? true : undefined}>
        <summary className="json-node-summary">
          <span className="summary-icon"><FaChevronRight className="chevron-icon" /></span>
          <span className={`json-node-key ${isLabelMatched ? 'highlighted-search' : ''}`}>{displayLabel}</span>
          <span className="json-node-badge count-badge">массив [{value.length}]</span>
        </summary>
        <div className="json-node-children">
          {value.map((item, idx) => (
            <div key={idx} className="json-array-card">
              <div className="json-array-card-header">{getArrayItemLabel(item, idx)}</div>
              <div className="json-array-card-body">
                {typeof item === 'object' ? (
                  Object.entries(item).map(([k, v]) => (
                    <JsonNode key={k} label={k} value={v} hideEmpty={hideEmpty} searchTerm={searchTerm} />
                  ))
                ) : (
                  <JsonNode label={`Значение`} value={item} hideEmpty={hideEmpty} searchTerm={searchTerm} />
                )}
              </div>
            </div>
          ))}
        </div>
      </details>
    );
  }

  // Render Object
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      const valText = "Нет данных (пустой объект)";
      const isValueMatched = searchTerm ? valText.toLowerCase().includes(searchTerm.toLowerCase()) : false;
      if (searchTerm && !isLabelMatched && !isValueMatched) return null;

      return (
        <div className="json-node-leaf">
          <span className={`json-node-key ${isLabelMatched ? 'highlighted-search' : ''}`}>{displayLabel}:</span>
          <span className={`json-node-value null-value ${isValueMatched ? 'highlighted-search' : ''}`}>{valText}</span>
        </div>
      );
    }

    // Check if any children match search term
    let hasMatchingChild = false;
    if (searchTerm) {
      const stringified = JSON.stringify(value).toLowerCase();
      hasMatchingChild = stringified.includes(searchTerm.toLowerCase());
    }

    if (searchTerm && !isLabelMatched && !hasMatchingChild) return null;

    return (
      <details className="json-node-branch" open={searchTerm ? true : undefined}>
        <summary className="json-node-summary">
          <span className="summary-icon"><FaChevronRight className="chevron-icon" /></span>
          <span className={`json-node-key ${isLabelMatched ? 'highlighted-search' : ''}`}>{displayLabel}</span>
          <span className="json-node-badge object-badge">объект</span>
        </summary>
        <div className="json-node-children">
          {Object.entries(value).map(([k, v]) => (
            <JsonNode key={k} label={k} value={v} hideEmpty={hideEmpty} searchTerm={searchTerm} />
          ))}
        </div>
      </details>
    );
  }

  // Render Leaf (Primitive)
  const displayValue = formatDateValue(value);
  const isValueMatched = searchTerm ? String(displayValue).toLowerCase().includes(searchTerm.toLowerCase()) : false;

  if (searchTerm && !isLabelMatched && !isValueMatched) return null;

  return (
    <div className="json-node-leaf">
      <span className={`json-node-key ${isLabelMatched ? 'highlighted-search' : ''}`}>{displayLabel}:</span>
      <span className={`json-node-value ${isValueMatched ? 'highlighted-search' : ''}`}>{String(displayValue)}</span>
    </div>
  );
};

const UniversalClientCard = ({ client }) => {
  const [hideEmpty, setHideEmpty] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  if (!client) return <div className="empty-tab-state">Данные клиента отсутствуют</div>;

  const clientType = client.Type || client.client_type || "individual";
  const isCorporate = clientType === "corporate";

  // Actions for expandable tree
  const expandAll = () => {
    const detailsElements = document.querySelectorAll(".universal-client-tree details");
    detailsElements.forEach(el => el.open = true);
  };

  const collapseAll = () => {
    const detailsElements = document.querySelectorAll(".universal-client-tree details");
    detailsElements.forEach(el => el.open = false);
  };

  // Highlights extraction
  const inn = client.TaxIdentificationNumber?.Code || client.tax_code || "Нет данных";
  const code = client.Code || client.client_code || "Нет данных";
  const birthDate = formatDateValue(client.BirthDate || client.birth_date);
  const sex = client.Sex === "M" ? "Мужской" : client.Sex === "F" ? "Женский" : (client.Sex || "Нет данных");
  const longName = client.LongName || client.long_name || "Нет данных";

  return (
    <div className="universal-client-card-container">
      
      {/* ── SECTION 1: DEDICATED PROMINENT TYPE HIGHLIGHT ── */}
      <div className={`client-highlight-summary-box ${isCorporate ? "corporate-style" : "individual-style"}`}>
        <div className="summary-box-header">
          <div className="type-badge-icon">
            {isCorporate ? <FaBuilding className="icon" /> : <FaUser className="icon" />}
          </div>
          <div>
            <span className="type-label-tag">{isCorporate ? "ЮРИДИЧЕСКОЕ ЛИЦО (corporate)" : "ФИЗИЧЕСКОЕ ЛИЦО (individual)"}</span>
            <h4 className="summary-client-name">{longName}</h4>
          </div>
        </div>

        <div className="summary-details-grid">
          <div className="summary-grid-item">
            <span className="grid-label">Код клиента (ABS)</span>
            <span className="grid-value font-mono">{code}</span>
          </div>

          <div className="summary-grid-item">
            <span className="grid-label">ИНН / БИН</span>
            <span className="grid-value font-mono">{inn}</span>
          </div>

          {/* Individual Specific Highlights */}
          {!isCorporate && (
            <>
              <div className="summary-grid-item">
                <span className="grid-label">Дата рождения</span>
                <span className="grid-value">{birthDate || "Нет данных"}</span>
              </div>
              <div className="summary-grid-item">
                <span className="grid-label">Пол</span>
                <span className="grid-value">{sex}</span>
              </div>
            </>
          )}

          {/* Corporate Specific Highlights */}
          {isCorporate && (
            <>
              <div className="summary-grid-item">
                <span className="grid-label">ОКВЭД</span>
                <span className="grid-value">{getClassifierOrAddInfo(client, "OKVED") || getClassifierOrAddInfo(client, "ОКВЭД") || "Нет данных"}</span>
              </div>
              <div className="summary-grid-item">
                <span className="grid-label">ОКОНХ</span>
                <span className="grid-value">{getClassifierOrAddInfo(client, "OKONX") || getClassifierOrAddInfo(client, "ОКОНХ") || "Нет данных"}</span>
              </div>
              <div className="summary-grid-item">
                <span className="grid-label">КФС</span>
                <span className="grid-value">{getClassifierOrAddInfo(client, "KFS") || getClassifierOrAddInfo(client, "КФС") || "Нет данных"}</span>
              </div>
              <div className="summary-grid-item">
                <span className="grid-label">КОПФ</span>
                <span className="grid-value">{getClassifierOrAddInfo(client, "KOPF") || getClassifierOrAddInfo(client, "КОПФ") || "Нет данных"}</span>
              </div>
              <div className="summary-grid-item">
                <span className="grid-label">ОКОГУ</span>
                <span className="grid-value">{getClassifierOrAddInfo(client, "OKOGU") || getClassifierOrAddInfo(client, "ОКОГУ") || "Нет данных"}</span>
              </div>
              <div className="summary-grid-item">
                <span className="grid-label">КТП</span>
                <span className="grid-value">{getClassifierOrAddInfo(client, "KTP") || getClassifierOrAddInfo(client, "КТП") || "Нет данных"}</span>
              </div>
            </>
          )}
        </div>

        {/* Corporate Founders Summary Box */}
        {isCorporate && getFounders(client).length > 0 && (
          <div className="founders-summary-wrapper">
            <div className="founders-header">
              <FaUsers className="f-icon" />
              <span>Учредители компании (из AddInfoList)</span>
            </div>
            <div className="founders-grid">
              {getFounders(client).map((founder, fIdx) => (
                <div key={fIdx} className="founder-badge-card">
                  <span className="f-code">{founder.Code}:</span>
                  <span className="f-val">{founder.Value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Highlight arrays for both types (Addresses, Contacts, Documents) */}
        <div className="collapsible-highlights-row">
          {/* Contacts Summary */}
          {client.ContactData && client.ContactData.length > 0 && (
            <div className="highlight-pill-group">
              <span className="group-title"><FaPhoneAlt className="p-icon" /> Контакты:</span>
              <div className="pill-list">
                {client.ContactData.map((c, cIdx) => (
                  <span key={cIdx} className="pill-item">
                    {c.Type?.Name || c.type?.name || "Тел"}: <strong>{c.Value}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Addresses Summary */}
          {client.DetailedAddresses && client.DetailedAddresses.length > 0 && (
            <div className="highlight-pill-group">
              <span className="group-title"><FaMapMarkerAlt className="p-icon" /> Адреса:</span>
              <div className="pill-list">
                {client.DetailedAddresses.map((a, aIdx) => (
                  <span key={aIdx} className="pill-item" title={a.AddressString}>
                    {a.Type?.Name || a.type?.name || "Адрес"}: <strong>{a.AddressString || `${a.City?.Name || ""}, ${a.Street?.Name || ""} ${a.HouseNumber?.Value || ""}`}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Documents Summary */}
          {client.RegistrationDocuments && client.RegistrationDocuments.length > 0 && (
            <div className="highlight-pill-group">
              <span className="group-title"><FaFileAlt className="p-icon" /> Рег. документы:</span>
              <div className="pill-list">
                {client.RegistrationDocuments.map((d, dIdx) => (
                  <span key={dIdx} className="pill-item">
                    {d.Type?.Name || "Док"}: <strong>№{d.Number}</strong> {d.Serie && `сер. ${d.Serie}`} (от {formatDateValue(d.IssueDate)})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 2: 100% RECURSIVE DATA TREE VIEW ── */}
      <div className="full-json-tree-section">
        <div className="tree-section-header">
          <h5>Полный JSON-дерево (100% данных API)</h5>
          
          <div className="tree-toolbar-actions">
            
            {/* Search Input */}
            <div className="tree-search-wrapper">
              <FaSearch className="search-icon" />
              <input 
                type="text" 
                placeholder="Поиск по ключам или значениям..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="tree-search-input"
              />
              {searchTerm && (
                <button className="clear-search-btn" onClick={() => setSearchTerm("")}>×</button>
              )}
            </div>

            {/* Toggle Switch to hide empty values */}
            <button 
              onClick={() => setHideEmpty(!hideEmpty)} 
              className={`toggle-empty-fields-btn ${hideEmpty ? "active" : ""}`}
              title={hideEmpty ? "Показывать пустые поля" : "Скрывать пустые поля"}
            >
              {hideEmpty ? <FaEyeSlash /> : <FaEye />}
              <span>{hideEmpty ? "Скрыто пустые" : "Показать пустые"}</span>
            </button>

            {/* Expand / Collapse */}
            <div className="expand-collapse-group">
              <button onClick={expandAll} className="btn-tree-action">Развернуть всё</button>
              <button onClick={collapseAll} className="btn-tree-action">Свернуть всё</button>
            </div>
          </div>
        </div>

        {/* Recursive rendering of all fields */}
        <div className="universal-client-tree">
          {Object.entries(client).map(([key, val]) => (
            <JsonNode 
              key={key} 
              label={key} 
              value={val} 
              hideEmpty={hideEmpty} 
              searchTerm={searchTerm} 
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default UniversalClientCard;
