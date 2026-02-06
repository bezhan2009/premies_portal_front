import React, { useEffect, useState } from "react";
import "../../../../styles/components/Table.scss";
import Spinner from "../../../Spinner.jsx";
import Input from "../../../elements/Input.jsx";
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
    const role = roles.find((r) => r.ID === roleId);
    return role ? role.Name : `Unknown (${roleId})`;
  };

  const formatRoles = (roleIds) => {
    if (!roleIds || !Array.isArray(roleIds)) return "No roles";
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("ru-RU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
        <div
          className="filters"
          style={{ display: "flex", gap: "10px", flex: 1 }}
        >
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
      {loading ? (
        <Spinner />
      ) : (
        <>
          {filteredLogs && filteredLogs.length > 0 ? (
            <div
              className="table-reports-div"
              style={{ maxHeight: "calc(100vh - 480px)" }}
            >
              <table className="table-reports">
                <thead>
                  <tr>
                    <th>Дата</th>
                    <th>Оператор</th>
                    <th>Пользователь</th>
                    <th>Роли</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((row, idx) => (
                    <tr key={idx}>
                      <td>{formatDate(row.CreatedAt)}</td>
                      <td>{row.operator?.username || "N/A"}</td>
                      <td>{row.user?.username || "N/A"}</td>
                      <td>{formatRoles(row.role_ids)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <h2>Нет данных</h2>
          )}
        </>
      )}
    </div>
  );
};

export default RolesLogsTable;
