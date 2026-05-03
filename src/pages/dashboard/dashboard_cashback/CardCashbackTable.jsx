import React, { useEffect, useState, useCallback, useMemo } from "react";
import "../../../styles/components/Table.scss";
import "../../../styles/components/ProcessingIntegration.scss";
import "../../../styles/components/AddCardPriceForm.scss";
import "../../../styles/components/SearchBar.scss";
import { useExcelExport } from "../../../hooks/useExcelExport.js";
import { apiClient } from "../../../api/utils/apiClient.js";
import Spinner from "../../../components/Spinner.jsx";
import { Table } from "../../../components/table/FlexibleAntTable.jsx";
import {getCurrencyCode} from "../../../api/utils/getCurrencyCode.js";

const fields = [
  { key: "ID", label: "ID", type: "number" },
  { key: "created_at", label: "Дата создания", type: "datetime" },
  { key: "amount", label: "Сумма кэшбэка", type: "amount_currency" },
  { key: "utrno", label: "UTRNO", type: "text" },
  { key: "cashback_name", label: "Название кэшбэка", type: "text" },
  { key: "card_number", label: "Номер карты", type: "text" },
  { key: "card_id", label: "ID карты", type: "text" },
  { key: "account_number", label: "Номер счёта", type: "text" },
  { key: "atm_id", label: "ID банкомата", type: "text" },
  { key: "terminal_address", label: "Адрес терминала", type: "text" },
  { key: "status", label: "Статус", type: "status" },
  { key: "reversal", label: "Возврат", type: "reversal" },
  { key: "actions", label: "Действия", type: "actions" },
];

const getFieldValue = (item, key) => {
  if (item?.[key] !== undefined) return item[key];
  if (key === "ID") return item?.id;
  return item?.[key];
};

const CardCashbackTable = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const backendURL = import.meta.env.VITE_BACKEND_URL;
  const { exportToExcel } = useExcelExport();

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient(`${backendURL}/card-cashback`);
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
    const columns = fields
      .filter((f) => f.key !== "actions")
      .map(({ key, label }) => ({ key, label }));
    exportToExcel(items, columns, "Кэшбэк по картам");
  };

  const handlePay = async (utrno) => {
    try {
      await apiClient.post(`${backendURL}/card-cashback/pay/${utrno}`);
      fetchItems();
    } catch (e) {
      console.error("Ошибка при оплате:", e);
      alert("Ошибка при повторе платежа");
    }
  };

  const handleReturn = async (utrno) => {
    if (!window.confirm("Вы уверены, что хотите вернуть кэшбэк?")) return;
    try {
      await apiClient.post(`${backendURL}/card-cashback/return/${utrno}`);
      fetchItems();
    } catch (e) {
      console.error("Ошибка при возврате:", e);
      alert("Ошибка при возврате кэшбэка");
    }
  };

  const formatValue = (value, fieldType, item) => {
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

    if (fieldType === "amount_currency") {
      const currencyCode = getCurrencyCode(String(item?.currency ?? ""));
      return `${value} ${currencyCode}`;
    }

    if (fieldType === "status") {
      const color = value === "Оплачено" ? "green" : value === "Ошибка АБС" ? "red" : "orange";
      return <span style={{ color, fontWeight: "bold" }}>{value || "В обработке"}</span>;
    }

    if (fieldType === "reversal") {
      return value === "ДА" ? <span style={{ color: "red", fontWeight: "bold" }}>ДА</span> : "НЕТ";
    }

    if (fieldType === "actions") {
      return (
        <div style={{ display: "flex", gap: "5px" }}>
          {item.status === "Ошибка АБС" && (
            <button
              onClick={() => handlePay(item.utrno)}
              style={{ padding: "5px 10px", backgroundColor: "#4CAF50", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
            >
              Оплатить
            </button>
          )}
          <button
            onClick={() => handleReturn(item.utrno)}
            style={{ padding: "5px 10px", backgroundColor: "#f44336", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
          >
            Вернуть кэшбэк
          </button>
        </div>
      );
    }

    return String(value);
  };

  const columns = useMemo(
    () =>
      fields.map(({ key, label, type }) => ({
        title: label,
        dataIndex: key,
        key,
        render: (_, item) => formatValue(getFieldValue(item, key), type, item),
      })),
    [],
  );

  return (
    <div className="block_info_prems content-page">
      <div className="table-header-actions" style={{ margin: "16px" }}>
        <h2>Кэшбэк по картам</h2>
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
          tableId="cashback-card-list"
          columns={columns}
          dataSource={items}
          rowKey={(record) => record?.ID ?? record?.id ?? record?.utrno}
          loading={{
            spinning: loading,
            indicator: <Spinner size="small" />,
          }}
          pagination={{ pageSize: 10 }}
          bordered
          scroll={{ x: "max-content" }}
          locale={{ emptyText: "Нет данных" }}
        />
      )}
    </div>
  );
};

export default CardCashbackTable;
