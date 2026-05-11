import React, { useEffect, useState } from "react";
import Input from "../../../elements/Input.jsx";
import Select from "../../../elements/Select.jsx";
import { Table } from "../../../table/FlexibleAntTable.jsx";
import { useExcelExport } from "../../../../hooks/useExcelExport.js";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

const JournalTable = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [usernameFilter, setUsernameFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [ipFilter, setIpFilter] = useState("");
  const [urlFilter, setUrlFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [statusCodeFilter, setStatusCodeFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [uniqueActions, setUniqueActions] = useState([]);
  const [uniqueMethods, setUniqueMethods] = useState([]);
  const [uniqueStatusCodes, setUniqueStatusCodes] = useState([]);

  const { exportToExcel } = useExcelExport();

  useEffect(() => {
    const loadData = async () => {
      const token = localStorage.getItem("access_token");
      setLoading(true);

      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/journal/list`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const logsData = await response.json();
        setLogs(logsData);
        setFilteredLogs(logsData);

        const actions = [...new Set(logsData.map((log) => log.action))];
        const methods = [
          ...new Set(logsData.map((log) => log.metadata?.method).filter(Boolean)),
        ];
        const statusCodes = [
          ...new Set(
            logsData.map((log) => log.metadata?.status_code).filter(Boolean),
          ),
        ];

        setUniqueActions(actions);
        setUniqueMethods(methods);
        setUniqueStatusCodes(statusCodes);
      } catch (error) {
        console.error("Ошибка загрузки журнала:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    let filtered = logs;

    if (usernameFilter) {
      filtered = filtered.filter((log) =>
        log.username?.toLowerCase().includes(usernameFilter.toLowerCase()),
      );
    }

    if (actionFilter) {
      filtered = filtered.filter((log) => log.action === actionFilter);
    }

    if (ipFilter) {
      filtered = filtered.filter((log) =>
        log.metadata?.ip?.toLowerCase().includes(ipFilter.toLowerCase()),
      );
    }

    if (urlFilter) {
      filtered = filtered.filter((log) =>
        log.metadata?.url?.toLowerCase().includes(urlFilter.toLowerCase()),
      );
    }

    if (methodFilter) {
      filtered = filtered.filter((log) => log.metadata?.method === methodFilter);
    }

    if (statusCodeFilter) {
      filtered = filtered.filter(
        (log) => String(log.metadata?.status_code) === statusCodeFilter,
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
  }, [
    actionFilter,
    fromDate,
    ipFilter,
    logs,
    methodFilter,
    statusCodeFilter,
    toDate,
    urlFilter,
    usernameFilter,
  ]);

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), "dd.MM.yyyy HH:mm:ss", { locale: ru });
    } catch {
      return dateString;
    }
  };

  const formatObject = (objectValue) => {
    if (!objectValue || Object.keys(objectValue).length === 0) {
      return "—";
    }

    return JSON.stringify(objectValue, null, 2);
  };

  const handleExport = () => {
    const columns = [
      { key: "CreatedAt", label: "Дата", format: formatDate },
      { key: "username", label: "Пользователь" },
      { key: "action", label: "Действие" },
      { key: (row) => row.metadata?.ip || "—", label: "IP адрес" },
      { key: (row) => row.metadata?.url || "—", label: "URL" },
      { key: (row) => row.metadata?.method || "—", label: "Метод" },
      { key: (row) => row.metadata?.status_code || "—", label: "Статус код" },
      {
        key: (row) => formatObject(row.metadata?.query_params),
        label: "Параметры запроса",
      },
      {
        key: (row) => formatObject(row.metadata?.request_body),
        label: "Тело запроса",
      },
    ];

    exportToExcel(filteredLogs, columns, "Журнал_действий");
  };

  const clearFilters = () => {
    setUsernameFilter("");
    setActionFilter("");
    setIpFilter("");
    setUrlFilter("");
    setMethodFilter("");
    setStatusCodeFilter("");
    setFromDate("");
    setToDate("");
  };

  return (
    <div className="report-table-container">
      <div className="table-header-actions" style={{ marginBottom: "20px" }}>
        <div className="filters-container">
          <div className="filters-row" style={{ display: "flex", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
            <Input
              placeholder="Пользователь"
              type="text"
              value={usernameFilter}
              onChange={(value) => setUsernameFilter(value)}
              style={{ flex: 1 }}
            />
            <Select
              placeholder="Действие"
              value={actionFilter}
              onChange={(value) => setActionFilter(value)}
              options={[
                { value: "", label: "Все действия" },
                ...uniqueActions.map((action) => ({ value: action, label: action })),
              ]}
              style={{ flex: 1 }}
            />
            <Input
              placeholder="IP адрес"
              type="text"
              value={ipFilter}
              onChange={(value) => setIpFilter(value)}
              style={{ flex: 1 }}
            />
          </div>

          <div className="filters-row" style={{ display: "flex", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
            <Input
              placeholder="URL"
              type="text"
              value={urlFilter}
              onChange={(value) => setUrlFilter(value)}
              style={{ flex: 1 }}
            />
            <Select
              placeholder="Метод"
              value={methodFilter}
              onChange={(value) => setMethodFilter(value)}
              options={[
                { value: "", label: "Все методы" },
                ...uniqueMethods.map((method) => ({ value: method, label: method })),
              ]}
              style={{ flex: 1 }}
            />
            <Select
              placeholder="Статус код"
              value={statusCodeFilter}
              onChange={(value) => setStatusCodeFilter(value)}
              options={[
                { value: "", label: "Все статусы" },
                ...uniqueStatusCodes.map((code) => ({
                  value: String(code),
                  label: String(code),
                })),
              ]}
              style={{ flex: 1 }}
            />
          </div>

          <div className="filters-row" style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Input
              placeholder="От даты"
              type="datetime-local"
              value={fromDate}
              onChange={(value) => setFromDate(value)}
              style={{ flex: 1 }}
            />
            <Input
              placeholder="До даты"
              type="datetime-local"
              value={toDate}
              onChange={(value) => setToDate(value)}
              style={{ flex: 1 }}
            />
            <button className="button" onClick={clearFilters}>
              Очистить фильтры
            </button>
          </div>
        </div>

        <div className="actions" style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button className="export-excel-btn" onClick={handleExport}>
            Экспорт в Excel
          </button>
        </div>
      </div>

      <Table
        tableId="operator-journal-table"
        dataSource={filteredLogs}
        rowKey={(record) => record.ID}
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
          title="Пользователь"
          dataIndex="username"
          key="username"
          render={(value) => value || "—"}
        />
        <Table.Column
          title="Действие"
          dataIndex="action"
          key="action"
          render={(value) => value || "—"}
        />
        <Table.Column
          title="IP"
          dataIndex={["metadata", "ip"]}
          key="metadata.ip"
          render={(value) => value || "—"}
        />
        <Table.Column
          title="URL"
          dataIndex={["metadata", "url"]}
          key="metadata.url"
          render={(value) => (
            <div className="truncate-text" title={value}>
              {value || "—"}
            </div>
          )}
        />
        <Table.Column
          title="Метод"
          dataIndex={["metadata", "method"]}
          key="metadata.method"
          render={(value) => (
            <span className={`method-badge method-${value}`}>{value || "—"}</span>
          )}
        />
        <Table.Column
          title="Статус"
          dataIndex={["metadata", "status_code"]}
          key="metadata.status_code"
          render={(value) => (
            <span className={`status-code status-${value}`}>{value || "—"}</span>
          )}
        />
        <Table.Column
          title="Параметры запроса"
          key="query_params"
          sortable={false}
          render={(_, record) => (
            <div className="truncate-json" title={formatObject(record.metadata?.query_params)}>
              <pre>{formatObject(record.metadata?.query_params)}</pre>
            </div>
          )}
        />
        <Table.Column
          title="Тело запроса"
          key="request_body"
          sortable={false}
          render={(_, record) => (
            <div className="truncate-json" title={formatObject(record.metadata?.request_body)}>
              <pre>{formatObject(record.metadata?.request_body)}</pre>
            </div>
          )}
        />
      </Table>

      <div className="table-footer">
        <div className="pagination-info">
          Показано {filteredLogs.length} из {logs.length} записей
        </div>
      </div>
    </div>
  );
};

export default JournalTable;
