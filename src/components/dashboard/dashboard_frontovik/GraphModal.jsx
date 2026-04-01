import React, { useMemo } from "react";
import { useExcelExport } from "../../../hooks/useExcelExport.js";
import { useTableSort } from "../../../hooks/useTableSort.js";
import SortIcon from "../../general/SortIcon.jsx";
import Spinner from "../../Spinner.jsx";

// Компонент модального окна для графика платежей
const GraphModal = ({ isOpen, onClose, referenceId, graphData, isLoading }) => {
  const { exportToExcel } = useExcelExport();

  const processedData = useMemo(() => {
    if (!graphData || !Array.isArray(graphData)) return [];

    const resultMap = new Map();
    graphData.forEach((item) => {
      const key = `${item.PaymentDate}_${item.Code}`;
      if (!resultMap.has(key)) {
        resultMap.set(key, {
          ...item,
          principal: item.Amount || 0,
          interest: 0,
          totalAmount: parseFloat(item.Amount || 0),
        });
      } else {
        const existing = resultMap.get(key);
        existing.interest = item.Amount || 0;
        existing.totalAmount = (
          parseFloat(existing.principal) + parseFloat(item.Amount || 0)
        ).toFixed(2);
      }
    });
    return Array.from(resultMap.values());
  }, [graphData]);

  const {
    items: sortedData,
    requestSort,
    sortConfig,
  } = useTableSort(processedData);

  const handleExport = () => {
    const columns = [
      { key: "ID", label: "ID" },
      { key: "Code", label: "Код" },
      { key: "LongName", label: "Наименование" },
      { key: "PaymentDate", label: "Дата платежа" },
      { key: "principal", label: "Основной долг" },
      { key: "interest", label: "Проценты" },
      { key: "totalAmount", label: "Итого к оплате" },
      { key: "CalculatingAmount", label: "Расчетная сумма" },
      { key: "Type", label: "Тип" },
      { key: "Status", label: "Статус" },
      { key: "DateFrom", label: "Дата с" },
      { key: "DateTo", label: "Дата по" },
      { key: "CalculatingDate", label: "Дата расчета" },
      { key: "ExpectationDate", label: "Дата ожидания" },
    ];
    exportToExcel(
      sortedData,
      columns,
      `График_платежей_${referenceId || "export"}`,
    );
  };

  return (
    <div
      className={`graph-modal-overlay ${isOpen ? "graph-modal-overlay--open" : ""}`}
    >
      <div className="graph-modal-container">
        <div className="graph-modal-header">
          <h2 className="graph-modal-title">
            График платежей
            {referenceId && (
              <span className="graph-modal-subtitle">
                {" "}
                (Reference ID: {referenceId})
              </span>
            )}
          </h2>
          <div className="graph-modal-header-actions">
            {sortedData?.length > 0 && !isLoading && (
              <button className="export-excel-btn" onClick={handleExport}>
                Экспорт в Excel
              </button>
            )}
            <button className="graph-modal-close" onClick={onClose}>
              &times;
            </button>
          </div>
        </div>

        <div className="graph-modal-content">
          {isLoading ? (
            <div className="graph-modal-loading">
              <Spinner center />
              <p>Загрузка графика платежей...</p>
            </div>
          ) : (
            <>
              <div className="graph-data-table-container">
                <div className="graph-data-table-wrapper">
                  <table className="graph-data-table">
                    <thead>
                      <tr>
                        <th
                          onClick={() => requestSort("ID")}
                          className="sortable-header"
                        >
                          ID <SortIcon sortConfig={sortConfig} sortKey="ID" />
                        </th>
                        <th
                          onClick={() => requestSort("Code")}
                          className="sortable-header"
                        >
                          Код{" "}
                          <SortIcon sortConfig={sortConfig} sortKey="Code" />
                        </th>
                        <th
                          onClick={() => requestSort("LongName")}
                          className="sortable-header"
                        >
                          Наименование{" "}
                          <SortIcon
                            sortConfig={sortConfig}
                            sortKey="LongName"
                          />
                        </th>
                        <th
                          onClick={() => requestSort("PaymentDate")}
                          className="sortable-header"
                        >
                          Дата платежа{" "}
                          <SortIcon
                            sortConfig={sortConfig}
                            sortKey="PaymentDate"
                          />
                        </th>
                        <th
                          onClick={() => requestSort("principal")}
                          className="sortable-header"
                        >
                          Основной долг{" "}
                          <SortIcon
                            sortConfig={sortConfig}
                            sortKey="principal"
                          />
                        </th>
                        <th
                          onClick={() => requestSort("interest")}
                          className="sortable-header"
                        >
                          Проценты{" "}
                          <SortIcon
                            sortConfig={sortConfig}
                            sortKey="interest"
                          />
                        </th>
                        <th
                          onClick={() => requestSort("totalAmount")}
                          className="sortable-header"
                        >
                          Итого к оплате{" "}
                          <SortIcon
                            sortConfig={sortConfig}
                            sortKey="totalAmount"
                          />
                        </th>
                        <th
                          onClick={() => requestSort("CalculatingAmount")}
                          className="sortable-header"
                        >
                          Расчетная сумма{" "}
                          <SortIcon
                            sortConfig={sortConfig}
                            sortKey="CalculatingAmount"
                          />
                        </th>
                        <th
                          onClick={() => requestSort("Type")}
                          className="sortable-header"
                        >
                          Тип{" "}
                          <SortIcon sortConfig={sortConfig} sortKey="Type" />
                        </th>
                        <th
                          onClick={() => requestSort("Status")}
                          className="sortable-header"
                        >
                          Статус{" "}
                          <SortIcon sortConfig={sortConfig} sortKey="Status" />
                        </th>
                        <th
                          onClick={() => requestSort("DateFrom")}
                          className="sortable-header"
                        >
                          Дата с{" "}
                          <SortIcon
                            sortConfig={sortConfig}
                            sortKey="DateFrom"
                          />
                        </th>
                        <th
                          onClick={() => requestSort("DateTo")}
                          className="sortable-header"
                        >
                          Дата по{" "}
                          <SortIcon sortConfig={sortConfig} sortKey="DateTo" />
                        </th>
                        <th
                          onClick={() => requestSort("CalculatingDate")}
                          className="sortable-header"
                        >
                          Дата расчета{" "}
                          <SortIcon
                            sortConfig={sortConfig}
                            sortKey="CalculatingDate"
                          />
                        </th>
                        <th
                          onClick={() => requestSort("ExpectationDate")}
                          className="sortable-header"
                        >
                          Дата ожидания{" "}
                          <SortIcon
                            sortConfig={sortConfig}
                            sortKey="ExpectationDate"
                          />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedData.map((item, index) => (
                        <tr key={index}>
                          <td>{item.ID}</td>
                          <td>{item.Code}</td>
                          <td>{item.LongName}</td>
                          <td>{item.PaymentDate}</td>
                          <td>{item.principal}</td>
                          <td>{item.interest}</td>
                          <td>{item.totalAmount}</td>
                          <td>{item.CalculatingAmount}</td>
                          <td>{item.Type}</td>
                          <td>{item.Status}</td>
                          <td>{item.DateFrom}</td>
                          <td>{item.DateTo}</td>
                          <td>{item.CalculatingDate}</td>
                          <td>{item.ExpectationDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="graph-modal-footer">
                <div className="graph-summary">
                  <span className="graph-summary-item">
                    Всего записей: <strong>{sortedData.length}</strong>
                  </span>
                  <span className="graph-summary-item">
                    Reference ID: <strong>{referenceId}</strong>
                  </span>
                </div>
                <button className="graph-modal-close-btn" onClick={onClose}>
                  Закрыть
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GraphModal;
