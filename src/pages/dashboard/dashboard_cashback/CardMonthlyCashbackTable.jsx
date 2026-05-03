import React, { useEffect, useState, useCallback, useMemo } from "react";
import "../../../styles/components/Table.scss";
import { apiClient } from "../../../api/utils/apiClient.js";
import Spinner from "../../../components/Spinner.jsx";
import { Table } from "../../../components/table/FlexibleAntTable.jsx";

const fields = [
  { key: "card_id", label: "ID карты", type: "text" },
  { key: "cashback_name", label: "Название кэшбэка", type: "text" },
  { key: "month", label: "Месяц", type: "text" },
  { key: "total_amount", label: "Получено за месяц", type: "amount" },
  { key: "monthly_limit", label: "Месячный лимит", type: "amount" },
];

const getFieldValue = (item, key) => {
  if (key === "cashback_name") return item?.setting?.cashback_name || "-";
  if (key === "monthly_limit") return item?.setting?.monthly_limit || "Без лимита";
  return item?.[key];
};

const CardMonthlyCashbackTable = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const backendURL = import.meta.env.VITE_BACKEND_URL;

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient(`${backendURL}/card-cashback/monthly-limits`);
      const data = response.data;
      if (Array.isArray(data)) {
        setItems(data);
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

  const columns = useMemo(
    () =>
      fields.map(({ key, label }) => ({
        title: label,
        dataIndex: key,
        key,
        render: (_, item) => {
            const val = getFieldValue(item, key);
            if (key === "total_amount") return `${val} TJS`;
            if (key === "monthly_limit" && typeof val === "number") return `${val} TJS`;
            return val;
        },
      })),
    [],
  );

  return (
    <div className="block_info_prems content-page">
      <div className="table-header-actions" style={{ margin: "16px" }}>
        <h2>Месячные лимиты и доходы по картам</h2>
      </div>

      {error ? (
        <p style={{ color: "red", margin: "16px" }}>{error}</p>
      ) : (
        <Table
          tableId="card-monthly-cashback-list"
          columns={columns}
          dataSource={items}
          rowKey={(record) => `${record.card_id}-${record.setting_id}-${record.month}`}
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

export default CardMonthlyCashbackTable;
