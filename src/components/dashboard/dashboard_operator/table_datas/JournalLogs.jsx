import React, { useEffect, useState, useRef, useCallback } from "react";
import "../../../../styles/components/Table.scss";
import Input from "../../../elements/Input.jsx";
import Select from "../../../elements/Select.jsx";
import { Table } from "../../../table/FlexibleAntTable.jsx";
import { useExcelExport } from "../../../../hooks/useExcelExport.js";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { apiClient } from "../../../../api/utils/apiClient.js";

const PAGE_SIZE = 10;

const JournalTable = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastId, setLastId] = useState(null);

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

  const sentinelRef = useRef(null);
  const { exportToExcel } = useExcelExport();

  const fetchLogs = useCallback(async (after = null, isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const params = new URLSearchParams();
      params.append("limit", PAGE_SIZE);
      if (after) {
        params.append("after", after);
      }
      
      // Добавляем фильтры в запрос, если бэкенд их поддерживает
      if (usernameFilter) params.append("username", usernameFilter);
      if (actionFilter) params.append("action", actionFilter);
      if (fromDate) params.append("from", fromDate);
      if (toDate) params.append("to", toDate);

      const url = `${import.meta.env.VITE_BACKEND_URL}/journal/list?${params.toString()}`;
      const response = await apiClient(url);
      const logsData = response?.data?.logs ?? response?.data ?? [];

      const more = logsData.length === PAGE_SIZE;

      if (isLoadMore) {
        setLogs(prev => [...prev, ...logsData]);
      } else {
        setLogs(logsData);
        
        // Сбор уникальных значений для фильтров (только из первой порции или можно расширять)
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
      }

      setHasMore(more);
      if (logsData.length > 0) {
        setLastId(logsData[logsData.length - 1].ID);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Ошибка загрузки журнала:", error);
      setHasMore(false);
    } finally {
      if (isLoadMore) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, [usernameFilter, actionFilter, fromDate, toDate]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore || loading) return;
    fetchLogs(lastId, true);
  }, [hasMore, loadingMore, loading, lastId, fetchLogs]);

  useEffect(() => {
    fetchLogs(null, false);
  }, [fetchLogs]);

  // Infinite scroll observer
  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadMore]);

  useEffect(() => {
    let filtered = logs;

    // Применяем локальную фильтрацию для полей, которые могут не поддерживаться бэкендом
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

    setFilteredLogs(filtered);
  }, [logs, ipFilter, urlFilter, methodFilter, statusCodeFilter]);

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

      <div className="infinite-scroll-wrapper" style={{ position: "relative" }}>
        <Table
          tableId="operator-journal-table"
          dataSource={filteredLogs}
          rowKey={(record) => record.ID}
          loading={loading}
          bordered
          pagination={false}
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
        
        <div ref={sentinelRef} style={{ height: "20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {loadingMore && <span>Загрузка...</span>}
        </div>
      </div>
    </div>
  );
};

export default JournalTable;
