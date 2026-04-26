import React from "react";
import Spinner from "../../Spinner.jsx";

const LIMIT_NAMES_MAPPING = {
  LMTTZ201: "Снятие в ПВН в сети банка (Сумма)",
  LMTTZ202: "Снятие в ПВН в сети банка (Количество)",
  LMTTZ203: "Снятие в ПВН в сети банка (Сумма)",
  LMTTZ204: "Снятие в ПВН в сети банка (Количество)",
  LMTTZ205: "Снятие в банкомате в сети банка (Сумма)",
  LMTTZ206: "Снятие в банкомате в сети банка (Количество)",
  LMTTZ207: "Снятие в банкомате в сети банка (Сумма)",
  LMTTZ208: "Снятие в банкомате в сети банка (Количество)",
  LMTTZ209: "Оплата картой в POS в сети банка (Сумма)",
  LMTTZ210: "Оплата картой в POS в сети банка (Количество)",
  LMTTZ211: "Оплата картой в POS в сети банка (Сумма)",
  LMTTZ212: "Оплата картой в POS в сети банка (Количество)",
  LMTTZ213: "Оплата в интернете в сети банка (Сумма)",
  LMTTZ214: "Оплата в интернете в сети банка (Количество)",
  LMTTZ215: "Оплата в интернете в сети банка (Сумма)",
  LMTTZ216: "Оплата в интернете в сети банка (Количество)",
  LMTTZ217: "Снятие в ПВН в чужой сети (Сумма)",
  LMTTZ218: "Снятие в ПВН в чужой сети (Количество)",
  LMTTZ219: "Снятие в ПВН в чужой сети (Сумма)",
  LMTTZ220: "Снятие в ПВН в чужой сети (Количество)",
  LMTTZ221: "Снятие в банкомате в чужой сети (Сумма)",
  LMTTZ222: "Снятие в банкомате в чужой сети (Количество)",
  LMTTZ223: "Снятие в банкомате в чужой сети (Сумма)",
  LMTTZ224: "Снятие в банкомате в чужой сети (Количество)",
  LMTTZ225: "Оплата картой в POS в чужой сети (Сумма)",
  LMTTZ226: "Оплата картой в POS в чужой сети (Количество)",
  LMTTZ227: "Оплата картой в POS в чужой сети (Сумма)",
  LMTTZ228: "Оплата картой в POS в чужой сети (Количество)",
  LMTTZ229: "Оплата в интернете в чужой сети (Сумма)",
  LMTTZ230: "Оплата в интернете в чужой сети (Количество)",
  LMTTZ231: "Оплата в интернете в чужой сети (Сумма)",
  LMTTZ232: "Оплата в интернете в чужой сети (Количество)",
  LMTTZ233: "Все операции внутри сети (Сумма)",
  LMTTZ234: "Все операции внутри сети (Количество)",
  LMTTZ235: "Все операции внутри сети (Сумма)",
  LMTTZ236: "Все операции внутри сети (Количество)",
  LMTTZ237: "Все операции в чужой сети (Сумма)",
  LMTTZ238: "Все операции в чужой сети (Количество)",
  LMTTZ239: "Все операции в чужой сети (Сумма)",
  LMTTZ240: "Все операции в чужой сети (Количество)",
  LMTTZ245: "Все операции пластиковой картой",
  LMTTZ246: "Все операции пластиковой картой",
};

const getCycleTypeName = (type) => {
  if (type === "4") return "Месяц";
  if (type === "0") return "День";
  return type;
};

const getCurrencyName = (code) => {
  if (code === "840") return "USD";
  if (code === "972") return "TJS";
  if (code === "978") return "EUR";
  return code;
};

const CardLimitsModal = ({ isOpen, onClose, limits, isLoading, cardId }) => {
  if (!isOpen) return null;

  return (
    <div className={`graph-modal-overlay ${isOpen ? "graph-modal-overlay--open" : ""}`}>
      <div className="graph-modal-container" style={{ maxWidth: '900px', width: '90%' }}>
        <div className="graph-modal-header" style={{ background: '#e11d48' }}>
          <h2 className="graph-modal-title" style={{ color: 'white' }}>Лимиты карты: {cardId}</h2>
          <button className="graph-modal-close" onClick={onClose} style={{ color: 'white' }}>
            &times;
          </button>
        </div>

        <div className="graph-modal-content" style={{ padding: '0', maxHeight: '70vh', overflowY: 'auto' }}>
          {isLoading ? (
            <div className="graph-modal-loading" style={{ padding: '40px' }}>
              <Spinner center />
              <p>Загрузка лимитов...</p>
            </div>
          ) : (
            <div className="processing-integration__limits-table">
              <table className="limits-table">
                <thead className="limits-table__header">
                  <tr className="limits-table__row">
                    <th className="limits-table__th">ID</th>
                    <th className="limits-table__th">Наименование</th>
                    <th className="limits-table__th">Цикл</th>
                    <th className="limits-table__th">Валюта</th>
                    <th className="limits-table__th">Макс. значение</th>
                    <th className="limits-table__th">Использовано</th>
                  </tr>
                </thead>
                <tbody className="limits-table__body">
                  {limits && limits.length > 0 ? (
                    limits.map((limit, idx) => (
                      <tr key={idx} className="limits-table__row">
                        <td className="limits-table__td" style={{ fontSize: '11px', color: '#666' }}>{limit.name}</td>
                        <td className="limits-table__td">{LIMIT_NAMES_MAPPING[limit.name] || "Неизвестный лимит"}</td>
                        <td className="limits-table__td">{getCycleTypeName(limit.cycleType)}</td>
                        <td className="limits-table__td">{getCurrencyName(limit.currency)}</td>
                        <td className="limits-table__td" style={{ fontWeight: 'bold' }}>
                            {limit.value === "999999999999" ? "∞" : Number(limit.value).toLocaleString()}
                        </td>
                        <td className="limits-table__td" style={{ color: Number(limit.currentValue) > 0 ? '#e11d48' : 'inherit' }}>
                            {Number(limit.currentValue).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="limits-table__row">
                      <td colSpan="6" className="limits-table__td" style={{ textAlign: 'center', padding: '20px' }}>
                        Лимиты не найдены
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="graph-modal-footer">
          <button className="graph-modal-close-btn" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  );
};

export default CardLimitsModal;
