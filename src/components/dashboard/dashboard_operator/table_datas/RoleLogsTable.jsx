import React, { useEffect, useState } from "react";
import "../../../../styles/components/Table.scss";
import Input from "../../../elements/Input.jsx";
import { Table } from "../../../table/FlexibleAntTable.jsx";
import { useExcelExport } from "../../../../hooks/useExcelExport.js";

const RolesLogsTable = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [operatorFilter, setOperatorFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const { exportToExcel } = useExcelExport();

  useEffect(() => {
    const loadData = async () => {
      const token = localStorage.getItem("access_token");
      setLoading(true);

      try {
        const [logsResponse, rolesResponse] = await Promise.all([
          fetch(`${import.meta.env.VITE_BACKEND_URL}/roles/logs`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }),
          fetch(`${import.meta.env.VITE_BACKEND_URL}/roles`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }),
        ]);

        const logsData = await logsResponse.json();
        const rolesData = await rolesResponse.json();

        setLogs(logsData);
        setFilteredLogs(logsData);
        setRoles(rolesData);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const getRoleName = (roleId) => {
    const role = roles.find((item) => item.ID === roleId);
    return role ? role.Name : `Unknown (${roleId})`;
  };

  const formatRoles = (roleIds) => {
    if (!roleIds || !Array.isArray(roleIds)) {
      return "No roles";
    }

    return roleIds.map(getRoleName).join(", ");
  };

  useEffect(() => {
    let filtered = logs;

    if (operatorFilter) {
      filtered = filtered.filter((log) =>
        log.operator?.username
          ?.toLowerCase()
          .includes(operatorFilter.toLowerCase()),
      );
    }

    if (userFilter) {
      filtered = filtered.filter((log) =>
        log.user?.username?.toLowerCase().includes(userFilter.toLowerCase()),
      );
    }

    if (fromDate) {
      filtered = filtered.filter(
        (log) => new Date(log.CreatedAt) >= new Date(fromDate),
      );
    }

    if (toDate) {
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((log) => new Date(log.CreatedAt) <= endDate);
    }

    setFilteredLogs(filtered);
  }, [operatorFilter, userFilter, fromDate, toDate, logs]);

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleString("ru-RU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const handleExport = () => {
    const columns = [
      { key: "CreatedAt", label: "Дата", format: formatDate },
      { key: (row) => row.operator?.username || "N/A", label: "Оператор" },
      { key: (row) => row.user?.username || "N/A", label: "Пользователь" },
      { key: (row) => formatRoles(row.role_ids), label: "Роли" },
    ];

    exportToExcel(filteredLogs, columns, "Логи_ролей");
  };

  return (
    <div className="report-table-container">
      <div className="table-header-actions" style={{ marginBottom: "20px" }}>
        <div className="filters" style={{ display: "flex", gap: "10px", flex: 1, flexWrap: "wrap" }}>
          <Input
            placeholder="Логин оператора"
            type="text"
            value={operatorFilter}
            onChange={(value) => setOperatorFilter(value)}
          />
          <Input
            placeholder="Логин пользователя"
            type="text"
            value={userFilter}
            onChange={(value) => setUserFilter(value)}
          />
          <Input
            placeholder="От даты"
            type="date"
            value={fromDate}
            onChange={(value) => setFromDate(value)}
          />
          <Input
            placeholder="До даты"
            type="date"
            value={toDate}
            onChange={(value) => setToDate(value)}
          />
        </div>

        <button className="export-excel-btn" onClick={handleExport}>
          Экспорт в Excel
        </button>
      </div>

      <Table
        tableId="operator-role-logs-table"
        dataSource={filteredLogs}
        rowKey={(record, index) => record.ID ?? `${record.CreatedAt}-${index}`}
        loading={loading}
        bordered
        pagination={{ pageSize: 10, showSizeChanger: false }}
        scroll={{ x: "max-content" }}
        locale={{ emptyText: "Нет данных" }}
      >
        <Table.Column
          title="Дата"
          dataIndex="CreatedAt"
          key="CreatedAt"
          render={(value) => formatDate(value)}
        />
        <Table.Column
          title="Оператор"
          dataIndex={["operator", "username"]}
          key="operator.username"
          render={(value) => value || "N/A"}
        />
        <Table.Column
          title="Пользователь"
          dataIndex={["user", "username"]}
          key="user.username"
          render={(value) => value || "N/A"}
        />
        <Table.Column
          title="Роли"
          key="role_ids"
          sortValue={(record) => formatRoles(record.role_ids)}
          render={(_, record) => formatRoles(record.role_ids)}
        />
      </Table>
    </div>
  );
};

export default RolesLogsTable;
