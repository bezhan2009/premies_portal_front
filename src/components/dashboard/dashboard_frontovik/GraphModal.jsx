import React, { useMemo } from "react";
import { Table } from "../../table/FlexibleAntTable.jsx";
import { useExcelExport } from "../../../hooks/useExcelExport.js";
import Spinner from "../../Spinner.jsx";

const GraphModal = ({ isOpen, onClose, referenceId, graphData, isLoading }) => {
  const { exportToExcel } = useExcelExport();

  const processedData = useMemo(() => {
    if (!graphData || !Array.isArray(graphData)) return [];

    const resultMap = new Map();
    graphData.forEach((item) => {
      const key = `${item.PaymentDate}_${item.Code}`;
      if (!resultMap.has(key)) {
        resultMap.set(key, { ...item, principal: item.Amount || 0, interest: 0, totalAmount: parseFloat(item.Amount || 0) });
      } else {
        const existing = resultMap.get(key);
        existing.interest = item.Amount || 0;
        existing.totalAmount = (parseFloat(existing.principal) + parseFloat(item.Amount || 0)).toFixed(2);
      }
    });
    return Array.from(resultMap.values());
  }, [graphData]);

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
    exportToExcel(processedData, columns, `График_платежей_${referenceId || "export"}`);
  };

  if (!isOpen) return null;

  return (
    <div className={`graph-modal-overlay ${isOpen ? "graph-modal-overlay--open" : ""}`}>
      <div className="graph-modal-container">
        <div className="graph-modal-header">
          <h2 className="graph-modal-title">
            График платежей
            {referenceId && <span className="graph-modal-subtitle"> (Reference ID: {referenceId})</span>}
          </h2>
          <div className="graph-modal-header-actions">
            {processedData?.length > 0 && !isLoading && <button className="export-excel-btn" onClick={handleExport}>Экспорт в Excel</button>}
            <button className="graph-modal-close" onClick={onClose}>&times;</button>
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
                <Table dataSource={processedData} rowKey={(row, idx) => `graph-${idx}`} pagination={false} bordered scroll={{ x: "max-content", y: "60vh" }}>
                  <Table.Column title="ID" dataIndex="ID" key="ID" sortable />
                  <Table.Column title="Код" dataIndex="Code" key="Code" sortable />
                  <Table.Column title="Наименование" dataIndex="LongName" key="LongName" sortable />
                  <Table.Column title="Дата платежа" dataIndex="PaymentDate" key="PaymentDate" sortable />
                  <Table.Column title="Основной долг" dataIndex="principal" key="principal" sortable />
                  <Table.Column title="Проценты" dataIndex="interest" key="interest" sortable />
                  <Table.Column title="Итого к оплате" dataIndex="totalAmount" key="totalAmount" sortable />
                  <Table.Column title="Расчетная сумма" dataIndex="CalculatingAmount" key="CalculatingAmount" sortable />
                  <Table.Column title="Тип" dataIndex="Type" key="Type" sortable />
                  <Table.Column title="Статус" dataIndex="Status" key="Status" sortable />
                  <Table.Column title="Дата с" dataIndex="DateFrom" key="DateFrom" sortable />
                  <Table.Column title="Дата по" dataIndex="DateTo" key="DateTo" sortable />
                  <Table.Column title="Дата расчета" dataIndex="CalculatingDate" key="CalculatingDate" sortable />
                  <Table.Column title="Дата ожидания" dataIndex="ExpectationDate" key="ExpectationDate" sortable />
                </Table>
              </div>
              <div className="graph-modal-footer">
                <div className="graph-summary">
                  <span className="graph-summary-item">Всего записей: <strong>{processedData.length}</strong></span>
                  <span className="graph-summary-item">Reference ID: <strong>{referenceId}</strong></span>
                </div>
                <button className="graph-modal-close-btn" onClick={onClose}>Закрыть</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GraphModal;
