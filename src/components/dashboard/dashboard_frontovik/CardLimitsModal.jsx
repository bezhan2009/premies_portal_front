import { LIMIT_NAMES_MAPPING } from "../../../const/defConst.js";
import Spinner from "../../Spinner.jsx";

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
    <div
      className={`graph-modal-overlay ${isOpen ? "graph-modal-overlay--open" : ""}`}
    >
      <div
        className="graph-modal-container"
        style={{ maxWidth: "900px", width: "90%" }}
      >
        <div className="graph-modal-header" style={{ background: "#e11d48" }}>
          <h2 className="graph-modal-title" style={{ color: "white" }}>
            Лимиты карты: {cardId}
          </h2>
          <button
            className="graph-modal-close"
            onClick={onClose}
            style={{ color: "white" }}
          >
            &times;
          </button>
        </div>

        <div
          className="graph-modal-content"
          style={{ padding: "0", maxHeight: "70vh", overflowY: "auto" }}
        >
          {isLoading ? (
            <div className="graph-modal-loading" style={{ padding: "40px" }}>
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
                        <td
                          className="limits-table__td"
                          style={{ fontSize: "11px", color: "#666" }}
                        >
                          {limit.name}
                        </td>
                        <td className="limits-table__td">
                          {LIMIT_NAMES_MAPPING[limit.name] ||
                            "Неизвестный лимит"}
                        </td>
                        <td className="limits-table__td">
                          {getCycleTypeName(limit.cycleType)}
                        </td>
                        <td className="limits-table__td">
                          {getCurrencyName(limit.currency)}
                        </td>
                        <td
                          className="limits-table__td"
                          style={{ fontWeight: "bold" }}
                        >
                          {limit.value === "999999999999"
                            ? "∞"
                            : Number(limit.value).toLocaleString()}
                        </td>
                        <td
                          className="limits-table__td"
                          style={{
                            color:
                              Number(limit.currentValue) > 0
                                ? "#e11d48"
                                : "inherit",
                          }}
                        >
                          {Number(limit.currentValue).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="limits-table__row">
                      <td
                        colSpan="6"
                        className="limits-table__td"
                        style={{ textAlign: "center", padding: "20px" }}
                      >
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
          <button className="graph-modal-close-btn" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

export default CardLimitsModal;
