import React from "react";

const ClientAuditLogs = ({ logs, loading, isModalMode = false }) => {
  const formatTimestamp = (ts) => {
    if (!ts) return "-";
    try {
      const d = new Date(ts);
      return d.toLocaleString("ru-RU");
    } catch (_) {
      return ts;
    }
  };

  return (
    <div className={isModalMode ? "" : "processing-integration__limits-table"} style={isModalMode ? {} : { marginTop: 24 }}>
      <div className={isModalMode ? "" : "limits-table"}>
        {!isModalMode && (
          <div className="limits-table__header">
            <h2 className="limits-table__title">
              Журнал аудита по клиенту
              <span style={{ fontSize: "14px", fontWeight: "normal", marginLeft: 10, color: "var(--text-muted, #888)" }}>
                (показывает кто просматривал и какие действия совершал)
              </span>
            </h2>
          </div>
        )}

        <div className="limits-table__wrapper" style={{ maxHeight: "400px", overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)" }}>
              Загрузка истории действий...
            </div>
          ) : !logs || logs.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)" }}>
              Действий по данному клиенту не найдено.
            </div>
          ) : (
            <table className="limits-table" style={{ width: "100%" }}>
              <thead className="limits-table__head">
                <tr>
                  <th className="limits-table__th" style={{ padding: "10px 15px", textAlign: "left" }}>Дата и время</th>
                  <th className="limits-table__th" style={{ padding: "10px 15px", textAlign: "left" }}>Пользователь</th>
                  <th className="limits-table__th" style={{ padding: "10px 15px", textAlign: "left" }}>Действие</th>
                  <th className="limits-table__th" style={{ padding: "10px 15px", textAlign: "left" }}>Детали</th>
                </tr>
              </thead>
              <tbody className="limits-table__body">
                {logs.map((log, index) => (
                  <tr key={index} className="limits-table__row" style={{ borderBottom: "1px solid var(--border-color, #eee)" }}>
                    <td className="limits-table__td" style={{ padding: "10px 15px" }}>
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="limits-table__td" style={{ padding: "10px 15px", fontWeight: "bold" }}>
                      {log.username}
                    </td>
                    <td className="limits-table__td" style={{ padding: "10px 15px" }}>
                      <span className="badge" style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "500",
                        backgroundColor: "rgba(24, 144, 255, 0.1)",
                        color: "#1890ff"
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td className="limits-table__td" style={{ padding: "10px 15px", fontSize: "13px", color: "var(--text-secondary)" }}>
                      {log.details || "-"}
                      {log.card_number && ` (Карта: ${log.card_number})`}
                      {log.account_number && ` (Счет: ${log.account_number})`}
                      {log.credit_id && ` (Кредит: ${log.credit_id})`}
                      {log.deposit_id && ` (Депозит: ${log.deposit_id})`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientAuditLogs;
