import React from "react";

const ClientPersonalInfo = ({
  clientsData,
  selectedClientIndex,
  setSelectedClientIndex,
  selectedClient,
  tableData,
  handleExportClientInfo,
  copySelectedClientToClipboard,
  copyAllClientsToClipboard,
}) => {
  if (!selectedClient) return null;

  return (
    <>
      {clientsData.length > 1 && (
        <div className="processing-integration__client-selector">
          <div className="client-selector">
            <h3 className="client-selector__title">
              Найдено клиентов: {clientsData.length}
            </h3>
            <div className="client-selector__controls">
              <select
                value={selectedClientIndex}
                onChange={(e) =>
                  setSelectedClientIndex(parseInt(e.target.value))
                }
                className="client-selector__select"
              >
                {clientsData.map((client, index) => (
                  <option key={index} value={index}>
                    {index + 1}. {client.surname} {client.name}{" "}
                    {client.patronymic}
                    {client.tax_code && ` (ИНН: ${client.tax_code})`}
                  </option>
                ))}
              </select>
              <div className="client-selector__navigation">
                <button
                  onClick={() =>
                    setSelectedClientIndex((prev) => Math.max(0, prev - 1))
                  }
                  disabled={selectedClientIndex === 0}
                  className="client-selector__nav-btn client-selector__nav-btn--prev"
                >
                  ← Предыдущий
                </button>
                <button
                  onClick={() =>
                    setSelectedClientIndex((prev) =>
                      Math.min(clientsData.length - 1, prev + 1),
                    )
                  }
                  disabled={selectedClientIndex === clientsData.length - 1}
                  className="client-selector__nav-btn client-selector__nav-btn--next"
                >
                  Следующий →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="processing-integration__limits-table">
        <div className="limits-table">
          <div className="limits-table__header">
            <h2 className="limits-table__title">
              Данные клиента из АБС
              {clientsData.length > 1 && (
                <span className="limits-table__client-counter">
                  (Клиент {selectedClientIndex + 1} из {clientsData.length})
                </span>
              )}
            </h2>
            <div className="limits-table__actions">
              <button
                onClick={handleExportClientInfo}
                className="export-excel-btn"
                style={{ marginRight: 10 }}
              >
                Экспорт в Excel
              </button>
              <button
                onClick={copySelectedClientToClipboard}
                className="limits-table__action-btn limits-table__action-btn--secondary"
              >
                Скопировать JSON клиента
              </button>
              {clientsData.length > 1 && (
                <button
                  onClick={copyAllClientsToClipboard}
                  className="limits-table__action-btn limits-table__action-btn--secondary"
                >
                  Скопировать JSON всех клиентов
                </button>
              )}
            </div>
          </div>

          <div className="limits-table__wrapper">
            <table className="limits-table">
              <thead className="limits-table__head">
                <tr>
                  {tableData &&
                    tableData.map((item, i) => (
                      <th
                        key={i}
                        className="limits-table__th limits-table__th--field"
                      >
                        {item.label}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="limits-table__body">
                <tr className="limits-table__row">
                  {tableData.map((item) => (
                    <td
                      key={item.key}
                      className="limits-table__td limits-table__td--value"
                    >
                      <span className="current-value">
                        {item.value || (item.value === 0 ? 0 : "Не указано")}
                      </span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="limits-table__footer">
            <div className="limits-table__stats">
              <span className="limits-table__stat">
                ФИО: {selectedClient.surname} {selectedClient.name}{" "}
                {selectedClient.patronymic}
              </span>
              <span className="limits-table__stat">
                Телефон: {selectedClient.phone}
              </span>
              <span className="limits-table__stat">
                ИНН: {selectedClient.tax_code}
              </span>
              <span className="limits-table__stat">
                Код клиента: {selectedClient.client_code}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ClientPersonalInfo;
