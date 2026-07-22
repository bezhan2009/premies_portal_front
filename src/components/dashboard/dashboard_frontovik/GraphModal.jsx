import React, { useMemo } from "react";
import { useExcelExport } from "../../../hooks/useExcelExport.js";
import { useTableSort } from "../../../hooks/useTableSort.js";
import SortIcon from "../../general/SortIcon.jsx";
import Spinner from "../../Spinner.jsx";
import { Table } from "../../table/FlexibleAntTable.jsx";

// Компонент модального окна для графика платежей
const GraphModal = ({ isOpen, onClose, referenceId, graphData, isLoading }) => {
  const { exportToExcel } = useExcelExport();

  const processedData = useMemo(() => {
    if (!graphData || !Array.isArray(graphData)) return [];

    const resultMap = new Map();
    graphData.forEach((item) => {
      const key = item.PaymentDate;
      if (!resultMap.has(key)) {
        resultMap.set(key, {
          ...item,
          Code: "CR_PD/CR_INTER",
          LongName: "Погашение основного долга и процентов",
          principal: item.Code === "CR_PD" ? parseFloat(item.Amount || 0) : 0,
          interest: item.Code === "CR_INTER" ? parseFloat(item.Amount || 0) : 0,
          totalAmount: parseFloat(item.Amount || 0),
        });
      } else {
        const existing = resultMap.get(key);
        if (item.Code === "CR_PD") {
            existing.principal = parseFloat(item.Amount || 0);
        } else if (item.Code === "CR_INTER") {
            existing.interest = parseFloat(item.Amount || 0);
        }
        existing.totalAmount = (
          parseFloat(existing.principal || 0) + parseFloat(existing.interest || 0)
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
                  <Table
                    tableId="graph-modal-table"
                    rowKey={(record, index) => `${record.PaymentDate}-${index}`}
                    dataSource={sortedData}
                    pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Всего ${total} записей` }}
                    bordered
                    scroll={{ x: "max-content", y: 400 }}
                    columns={[
                      { title: "ID", dataIndex: "ID", key: "ID", sorter: (a, b) => String(a.ID).localeCompare(String(b.ID)) },
                      { title: "Код", dataIndex: "Code", key: "Code", sorter: (a, b) => String(a.Code).localeCompare(String(b.Code)) },
                      { title: "Наименование", dataIndex: "LongName", key: "LongName", sorter: (a, b) => String(a.LongName).localeCompare(String(b.LongName)) },
                      { title: "Дата платежа", dataIndex: "PaymentDate", key: "PaymentDate", sorter: (a, b) => String(a.PaymentDate).localeCompare(String(b.PaymentDate)) },
                      { title: "Основной долг", dataIndex: "principal", key: "principal", sorter: (a, b) => parseFloat(a.principal) - parseFloat(b.principal) },
                      { title: "Проценты", dataIndex: "interest", key: "interest", sorter: (a, b) => parseFloat(a.interest) - parseFloat(b.interest) },
                      { title: "Итого к оплате", dataIndex: "totalAmount", key: "totalAmount", sorter: (a, b) => parseFloat(a.totalAmount) - parseFloat(b.totalAmount) },
                      { title: "Расчетная сумма", dataIndex: "CalculatingAmount", key: "CalculatingAmount", sorter: (a, b) => parseFloat(a.CalculatingAmount) - parseFloat(b.CalculatingAmount) },
                      { title: "Тип", dataIndex: "Type", key: "Type", sorter: (a, b) => String(a.Type).localeCompare(String(b.Type)) },
                      { title: "Статус", dataIndex: "Status", key: "Status", sorter: (a, b) => String(a.Status).localeCompare(String(b.Status)) },
                      { title: "Дата с", dataIndex: "DateFrom", key: "DateFrom", sorter: (a, b) => String(a.DateFrom).localeCompare(String(b.DateFrom)) },
                      { title: "Дата по", dataIndex: "DateTo", key: "DateTo", sorter: (a, b) => String(a.DateTo).localeCompare(String(b.DateTo)) },
                      { title: "Дата расчета", dataIndex: "CalculatingDate", key: "CalculatingDate", sorter: (a, b) => String(a.CalculatingDate).localeCompare(String(b.CalculatingDate)) },
                      { title: "Дата ожидания", dataIndex: "ExpectationDate", key: "ExpectationDate", sorter: (a, b) => String(a.ExpectationDate).localeCompare(String(b.ExpectationDate)) },
                    ]}
                  />
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
