import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Input, Button, Space, Tag } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import "../../../styles/components/Table.scss";
import "../../../styles/components/ProcessingIntegration.scss";
import { useExcelExport } from "../../../hooks/useExcelExport.js";
import { apiClient } from "../../../api/utils/apiClient.js";
import Spinner from "../../../components/Spinner.jsx";
import { Table } from "../../../components/table/FlexibleAntTable.jsx";

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

  const getColumnSearchProps = (dataIndex, label) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }}>
        <Input
          placeholder={`Поиск ${label}`}
          value={selectedKeys[0]}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => confirm()}
          style={{ marginBottom: 8, display: "block" }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => confirm()}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Поиск
          </Button>
          <Button onClick={() => clearFilters()} size="small" style={{ width: 90 }}>
            Сброс
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered) => <SearchOutlined style={{ color: filtered ? "#1890ff" : undefined }} />,
    onFilter: (value, record) =>
      record[dataIndex] ? record[dataIndex].toString().toLowerCase().includes(value.toLowerCase()) : false,
  });

  const columns = useMemo(
    () => [
      {
        title: "ID",
        dataIndex: "id",
        key: "id",
        sorter: (a, b) => a.id - b.id,
        width: 80,
      },
      {
        title: "Дата создания",
        dataIndex: "created_at",
        key: "created_at",
        sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
        render: (val) => (val ? new Date(val).toLocaleString("ru-RU") : "-"),
      },
      {
        title: "Сумма",
        dataIndex: "amount",
        key: "amount",
        sorter: (a, b) => a.amount - b.amount,
        render: (val) => `${val} TJS`,
      },
      {
        title: "Номер в ARM",
        dataIndex: "number_in_arm",
        key: "number_in_arm",
        ...getColumnSearchProps("number_in_arm", "Номер в ARM"),
      },
      {
        title: "Телефон отправителя",
        dataIndex: "sender_phone",
        key: "sender_phone",
        ...getColumnSearchProps("sender_phone", "Телефон отправителя"),
      },
      {
        title: "ID платежа",
        dataIndex: "payment_id",
        key: "payment_id",
        ...getColumnSearchProps("payment_id", "ID платежа"),
      },
      {
        title: "Ключ идемпотентности",
        dataIndex: "idempotency_key",
        key: "idempotency_key",
        ...getColumnSearchProps("idempotency_key", "Ключ идемпотентности"),
      },
      {
        title: "Статус",
        dataIndex: "status",
        key: "status",
        filters: [
          { text: "pending", value: "pending" },
          { text: "success", value: "success" },
          { text: "failed", value: "failed" },
        ],
        onFilter: (value, record) => record.status === value,
        render: (val) => {
          let color = "orange";
          if (val === "success") color = "green";
          if (val === "failed") color = "red";
          return <Tag color={color}>{val}</Tag>;
        },
      },
      {
        title: "Дата обработки",
        dataIndex: "processed_at",
        key: "processed_at",
        sorter: (a, b) => new Date(a.processed_at) - new Date(b.processed_at),
        render: (val) => (val ? new Date(val).toLocaleString("ru-RU") : "-"),
      },
    ],
    [],
  );

  const handleExport = () => {
    const exportColumns = columns.map((col) => ({ key: col.dataIndex, label: col.title }));
    exportToExcel(items, exportColumns, "Кэшбэк по QR");
  };

  return (
    <div className="block_info_prems content-page">
      <div className="table-header-actions" style={{ margin: "16px" }}>
        <h2>Кэшбэк по QR</h2>
        <Button className="export-excel-btn" onClick={handleExport}>
          Экспорт в Excel
        </Button>
      </div>

      {error ? (
        <p style={{ color: "red", margin: "16px" }}>{error}</p>
      ) : (
        <Table
          tableId="cashback-qr-list"
          columns={columns}
          dataSource={items}
          rowKey={(record) => record.id || record.payment_id}
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

export default QRCashbackTable;
