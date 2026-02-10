import React, { useEffect, useState } from "react";
import "../../../../styles/components/Table.scss";
import Spinner from "../../../Spinner.jsx";
import Input from "../../../elements/Input.jsx";
import Select from "../../../elements/Select.jsx";
import { useExcelExport } from "../../../../hooks/useExcelExport.js";
import { useTableSort } from "../../../../hooks/useTableSort.js";
import SortIcon from "../../../general/SortIcon.jsx";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

const JournalTable = () => {
    const [logs, setLogs] = useState([]);
    const [filteredLogs, setFilteredLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Фильтры
    const [usernameFilter, setUsernameFilter] = useState("");
    const [actionFilter, setActionFilter] = useState("");
    const [ipFilter, setIpFilter] = useState("");
    const [urlFilter, setUrlFilter] = useState("");
    const [methodFilter, setMethodFilter] = useState("");
    const [statusCodeFilter, setStatusCodeFilter] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    // Уникальные значения для селектов
    const [uniqueActions, setUniqueActions] = useState([]);
    const [uniqueMethods, setUniqueMethods] = useState([]);
    const [uniqueStatusCodes, setUniqueStatusCodes] = useState([]);

    const { exportToExcel } = useExcelExport();
    const {
        items: sortedLogs,
        requestSort,
        sortConfig,
    } = useTableSort(filteredLogs);

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

                // Извлекаем уникальные значения для фильтров
                const actions = [...new Set(logsData.map(log => log.action))];
                const methods = [...new Set(logsData.map(log => log.metadata?.method).filter(Boolean))];
                const statusCodes = [...new Set(logsData.map(log => log.metadata?.status_code).filter(Boolean))];

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

    // Применение фильтров
    useEffect(() => {
        let filtered = logs;

        if (usernameFilter) {
            filtered = filtered.filter((log) =>
                log.username?.toLowerCase().includes(usernameFilter.toLowerCase())
            );
        }

        if (actionFilter) {
            filtered = filtered.filter((log) => log.action === actionFilter);
        }

        if (ipFilter) {
            filtered = filtered.filter((log) =>
                log.metadata?.ip?.toLowerCase().includes(ipFilter.toLowerCase())
            );
        }

        if (urlFilter) {
            filtered = filtered.filter((log) =>
                log.metadata?.url?.toLowerCase().includes(urlFilter.toLowerCase())
            );
        }

        if (methodFilter) {
            filtered = filtered.filter((log) => log.metadata?.method === methodFilter);
        }

        if (statusCodeFilter) {
            filtered = filtered.filter((log) =>
                String(log.metadata?.status_code) === statusCodeFilter
            );
        }

        if (fromDate) {
            filtered = filtered.filter(
                (log) => new Date(log.CreatedAt) >= new Date(fromDate)
            );
        }

        if (toDate) {
            const endDate = new Date(toDate);
            endDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter((log) => new Date(log.CreatedAt) <= endDate);
        }

        setFilteredLogs(filtered);
    }, [
        usernameFilter,
        actionFilter,
        ipFilter,
        urlFilter,
        methodFilter,
        statusCodeFilter,
        fromDate,
        toDate,
        logs,
    ]);

    const formatDate = (dateString) => {
        try {
            return format(new Date(dateString), "dd.MM.yyyy HH:mm:ss", { locale: ru });
        } catch {
            return dateString;
        }
    };

    const formatObject = (obj) => {
        if (!obj || Object.keys(obj).length === 0) return "—";
        return JSON.stringify(obj, null, 2);
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
                label: "Параметры запроса"
            },
            {
                key: (row) => formatObject(row.metadata?.request_body),
                label: "Тело запроса"
            },
        ];

        exportToExcel(sortedLogs, columns, "Журнал_действий");
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
                    <div className="filters-row" style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
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
                                ...uniqueActions.map(action => ({ value: action, label: action }))
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

                    <div className="filters-row" style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
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
                                ...uniqueMethods.map(method => ({ value: method, label: method }))
                            ]}
                            style={{ flex: 1 }}
                        />
                        <Select
                            placeholder="Статус код"
                            value={statusCodeFilter}
                            onChange={(value) => setStatusCodeFilter(value)}
                            options={[
                                { value: "", label: "Все статусы" },
                                ...uniqueStatusCodes.map(code => ({ value: String(code), label: String(code) }))
                            ]}
                            style={{ flex: 1 }}
                        />
                    </div>

                    <div className="filters-row" style={{ display: "flex", gap: "10px" }}>
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
                        <button
                            className="button"
                            onClick={clearFilters}
                        >
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

            {loading ? (
                <Spinner />
            ) : (
                <>
                    {filteredLogs && filteredLogs.length > 0 ? (
                        <div className="table-wrapper">
                            <div
                                className="table-reports-div"
                                style={{
                                    maxHeight: "calc(100vh - 350px)",
                                    overflowY: "auto"
                                }}
                            >
                                <table className="table-reports">
                                    <thead>
                                    <tr>
                                        <th
                                            onClick={() => requestSort("CreatedAt")}
                                            className="sortable-header"
                                            style={{ width: "170px" }}
                                        >
                                            Дата{" "}
                                            <SortIcon sortConfig={sortConfig} sortKey="CreatedAt" />
                                        </th>
                                        <th
                                            onClick={() => requestSort("username")}
                                            className="sortable-header"
                                            style={{ width: "150px" }}
                                        >
                                            Пользователь{" "}
                                            <SortIcon sortConfig={sortConfig} sortKey="username" />
                                        </th>
                                        <th
                                            onClick={() => requestSort("action")}
                                            className="sortable-header"
                                            style={{ width: "200px" }}
                                        >
                                            Действие{" "}
                                            <SortIcon sortConfig={sortConfig} sortKey="action" />
                                        </th>
                                        <th
                                            onClick={() => requestSort("metadata.ip")}
                                            className="sortable-header"
                                            style={{ width: "150px" }}
                                        >
                                            IP{" "}
                                            <SortIcon sortConfig={sortConfig} sortKey="metadata.ip" />
                                        </th>
                                        <th
                                            onClick={() => requestSort("metadata.url")}
                                            className="sortable-header"
                                        >
                                            URL{" "}
                                            <SortIcon sortConfig={sortConfig} sortKey="metadata.url" />
                                        </th>
                                        <th
                                            onClick={() => requestSort("metadata.method")}
                                            className="sortable-header"
                                            style={{ width: "100px" }}
                                        >
                                            Метод{" "}
                                            <SortIcon sortConfig={sortConfig} sortKey="metadata.method" />
                                        </th>
                                        <th
                                            onClick={() => requestSort("metadata.status_code")}
                                            className="sortable-header"
                                            style={{ width: "120px" }}
                                        >
                                            Статус{" "}
                                            <SortIcon sortConfig={sortConfig} sortKey="metadata.status_code" />
                                        </th>
                                        <th style={{ width: "200px" }}>Параметры запроса</th>
                                        <th style={{ width: "250px" }}>Тело запроса</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {sortedLogs.map((log) => (
                                        <tr key={log.ID}>
                                            <td>{formatDate(log.CreatedAt)}</td>
                                            <td>{log.username || "—"}</td>
                                            <td>{log.action || "—"}</td>
                                            <td>{log.metadata?.ip || "—"}</td>
                                            <td className="url-cell">
                                                <div className="truncate-text" title={log.metadata?.url}>
                                                    {log.metadata?.url || "—"}
                                                </div>
                                            </td>
                                            <td>
                          <span className={`method-badge method-${log.metadata?.method}`}>
                            {log.metadata?.method || "—"}
                          </span>
                                            </td>
                                            <td>
                          <span className={`status-code status-${log.metadata?.status_code}`}>
                            {log.metadata?.status_code || "—"}
                          </span>
                                            </td>
                                            <td className="json-cell">
                                                <div className="truncate-json" title={formatObject(log.metadata?.query_params)}>
                                                    <pre>{formatObject(log.metadata?.query_params)}</pre>
                                                </div>
                                            </td>
                                            <td className="json-cell">
                                                <div className="truncate-json" title={formatObject(log.metadata?.request_body)}>
                                                    <pre>{formatObject(log.metadata?.request_body)}</pre>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="table-footer">
                                <div className="pagination-info">
                                    Показано {filteredLogs.length} из {logs.length} записей
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="no-data">
                            <h2>Нет данных</h2>
                            <p>Попробуйте изменить параметры фильтрации</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default JournalTable;
