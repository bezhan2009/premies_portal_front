import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Input, Button, Space } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import "../../../styles/components/Table.scss";
import { apiClient } from "../../../api/utils/apiClient.js";
import Spinner from "../../../components/Spinner.jsx";
import { Table } from "../../../components/table/FlexibleAntTable.jsx";

const CardMonthlyCashbackTable = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [searchedColumn, setSearchedColumn] = useState("");
  const [sortedInfo, setSortedInfo] = useState({
    columnKey: "Month",
    order: "descend",
  });

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

  const handleTableChange = (pagination, filters, sorter) => {
    setSortedInfo(sorter);
  };

  const handleSearch = (selectedKeys, confirm, dataIndex) => {
    confirm();
    setSearchText(selectedKeys[0]);
    setSearchedColumn(dataIndex);
  };

  const handleReset = (clearFilters) => {
    clearFilters();
    setSearchText("");
  };

  const getColumnSearchProps = (dataIndex, label) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }}>
        <Input
          placeholder={`Поиск ${label}`}
          value={selectedKeys[0]}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => handleSearch(selectedKeys, confirm, dataIndex)}
          style={{ marginBottom: 8, display: "block" }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => handleSearch(selectedKeys, confirm, dataIndex)}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Поиск
          </Button>
          <Button onClick={() => handleReset(clearFilters)} size="small" style={{ width: 90 }}>
            Сброс
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered) => <SearchOutlined style={{ color: filtered ? "#1890ff" : undefined }} />,
    onFilter: (value, record) => {
      const val = dataIndex.split('.').reduce((obj, key) => obj?.[key], record);
      return val ? val.toString().toLowerCase().includes(value.toLowerCase()) : false;
    },
  });

  const columns = useMemo(
    () => [
      {
        title: "ID карты",
        dataIndex: "card_id",
        key: "CardID",
        ...getColumnSearchProps("CardID", "ID карты"),
        sorter: (a, b) => String(a.card_id).localeCompare(String(b.card_id)),
        sortOrder: sortedInfo.columnKey === "CardID" ? sortedInfo.order : null,
      },
      {
        title: "Название кэшбэка",
        dataIndex: ["setting", "cashback_name"],
        key: "cashback_name",
        ...getColumnSearchProps("setting.cashback_name", "Название кэшбэка"),
        render: (_, record) => record?.setting?.cashback_name || "-",
        sorter: (a, b) => String(a?.setting?.cashback_name || "").localeCompare(String(b?.setting?.cashback_name || "")),
        sortOrder: sortedInfo.columnKey === "cashback_name" ? sortedInfo.order : null,
      },
      {
        title: "Месяц",
        dataIndex: "month",
        key: "Month",
        ...getColumnSearchProps("Month", "Месяц"),
        sorter: (a, b) => String(a.month).localeCompare(String(b.month)),
        sortOrder: sortedInfo.columnKey === "Month" ? sortedInfo.order : null,
      },
      {
        title: "Получено за месяц",
        dataIndex: "total_amount",
        key: "total_amount",
        sorter: (a, b) => a.total_amount - b.total_amount,
        render: (val) => `${val || 0} TJS`,
        sortOrder: sortedInfo.columnKey === "total_amount" ? sortedInfo.order : null,
      },
      {
        title: "Месячный лимит",
        dataIndex: ["setting", "monthly_limit"],
        key: "monthly_limit",
        render: (_, record) => record?.setting?.monthly_limit ? `${record.setting.monthly_limit} TJS` : "Без лимита",
        sorter: (a, b) => (a?.setting?.monthly_limit || 0) - (b?.setting?.monthly_limit || 0),
        sortOrder: sortedInfo.columnKey === "monthly_limit" ? sortedInfo.order : null,
      },
    ],
    [sortedInfo],
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
          rowKey={(record) => `${record.CardID}-${record.SettingID}-${record.Month}`}
          loading={{
            spinning: loading,
            indicator: <Spinner size="small" />,
          }}
          pagination={{ pageSize: 10 }}
          bordered
          scroll={{ x: "max-content" }}
          locale={{ emptyText: "Нет данных" }}
          onChange={handleTableChange}
        />
      )}
    </div>
  );
};

export default CardMonthlyCashbackTable;
