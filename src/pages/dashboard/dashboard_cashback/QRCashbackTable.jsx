import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useExcelExport } from "../../../hooks/useExcelExport.js";
import { apiClient } from "../../../api/utils/apiClient.js";
import Spinner from "../../../components/Spinner.jsx";
import { Table } from "../../../components/table/FlexibleAntTable.jsx";

const fields = [
  { key: "id", label: "ID", type: "number" },
  { key: "created_at", label: "Дата создания", type: "datetime" },
  { key: "amount", label: "Сумма", type: "number", step: "0.01" },
  { key: "number_in_arm", label: "Номер в ARM", type: "text" },
  { key: "sender_phone", label: "Телефон отправителя", type: "text" },
  { key: "payment_id", label: "ID платежа", type: "text" },
  { key: "idempotency_key", label: "Ключ идемпотентности", type: "text" },
  { key: "status", label: "Статус", type: "text" },
  { key: "processed_at", label: "Дата обработки", type: "datetime" },
];

const QRCashbackTable = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const backendURL = import.meta.env.VITE_BACKEND_URL;
  const { exportToExcel } = useExcelExport();

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient(`${backendURL}/qr-cashback`);
      const data = response.data;
      if (Array.isArray(data)) {
        setItems(data);
      } else if (data && Array.isArray(data.data)) {
        setItems(data.data);
      } else {
        setItems([]);
      }
    } catch (e) {
      console.error("Ошибка загрузки:", e);
      setError("Ошибка загрузки данных");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [backendURL]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleExport = () => {
    const columns = fields.map(({ key, label }) => ({ key, label }));
    exportToExcel(items, columns, "Кэшбэк по QR");
  };

  const formatValue = (value, fieldType) => {
    if (value === null || value === undefined || value === "") return "-";
    if (fieldType === "datetime") {
      try {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return value;
        return d.toLocaleString("ru-RU");
      } catch {
        return value;
      }
    }
    return String(value);
  };

  const columns = useMemo(
    () =>
      fields.map(({ key, label, type }) => ({
        title: label,
        dataIndex: key,
        key,
        render: (value) => formatValue(value, type),
      })),
    [],
  );

  return (
    <div className="block_info_prems content-page">
      <div className="table-header-actions" style={{ margin: "16px" }}>
        <h2>Кэшбэк по QR</h2>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button className="export-excel-btn" onClick={handleExport}>
            Экспорт в Excel
          </button>
        </div>
      </div>

      {error ? (
        <p style={{ color: "red", margin: "16px" }}>{error}</p>
      ) : (
        <Table
          tableId="cashback-qr-list"
          columns={columns}
          dataSource={items}
          rowKey={(record) => record?.id ?? record?.payment_id}
          loading={{
            spinning: loading,
            indicator: <Spinner size="small" />,
          }}
          pagination={false}
          bordered
          scroll={{ x: "max-content" }}
          locale={{ emptyText: "Нет данных" }}
        />
      )}
    </div>
  );
};

export default QRCashbackTable;
