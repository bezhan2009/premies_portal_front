import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Archive,
    BriefcaseBusiness,
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock3,
    Download,
    Eye,
    Inbox,
    Search,
    SlidersHorizontal,
    Trash2,
    XCircle,
} from "lucide-react";
import { useFormStore } from "../../hooks/useFormState";
import { status } from "../../const/defConst";
import Select from "../../components/elements/Select";
import Spinner from "../../components/Spinner.jsx";
import { apiClientApplication } from "../../api/utils/apiClientApplication.js";
import { useWebSocket } from "../../api/application/wsnotifications.js";
import AlertMessage from "../../components/general/AlertMessage.jsx";

const PAGE_SIZE = 8;

const STATUS_TABS = [
    { key: "all", label: "Все", ids: null },
    { key: "new", label: "Новые", ids: [1] },
    { key: "review", label: "На проверке", ids: [2] },
    { key: "approved", label: "Одобренные", ids: [8] },
    { key: "rejected", label: "Отклоненные", ids: [5, 6, 7] },
];

const getStatusId = (row) =>
    Number(
        row?.application_status_id ??
            row?.status_id ??
            row?.statusId ??
            row?.application_status?.ID ??
            row?.application_status?.id ??
            0,
    );

const getStatusGroup = (row) => {
    const statusId = getStatusId(row);
    if (statusId === 8) return "approved";
    if ([5, 6, 7].includes(statusId)) return "rejected";
    if (statusId === 2) return "review";
    return "new";
};

const getStatusLabel = (row) => {
    const statusId = getStatusId(row);
    const explicitLabel =
        row?.application_status?.name ||
        row?.application_status?.Name ||
        row?.application_status_name ||
        row?.status_name ||
        row?.status;

    if (explicitLabel && explicitLabel !== "Статус") return explicitLabel;
    if (statusId === 8) return "Одобрена";
    if ([5, 6, 7].includes(statusId)) return "Отклонена";
    if (statusId === 2) return "На проверке";
    if (statusId === 1) return "Новая";

    const option = [...status].reverse().find((item) => Number(item.value) === statusId);
    return option?.label && option.label !== "Статус" ? option.label : "Новая";
};

const getFullName = (row) =>
    [row?.surname, row?.name, row?.patronymic]
        .filter(Boolean)
        .join(" ")
        .trim() || "Без имени";

const getInitials = (row) => {
    const parts = [row?.surname, row?.name].filter(Boolean);
    if (parts.length === 0) return "ЗК";
    return parts.map((part) => String(part).charAt(0).toUpperCase()).join("");
};

const getStatusStats = (rows) =>
    STATUS_TABS.reduce((acc, tab) => {
        acc[tab.key] = tab.ids
            ? rows.filter((row) => tab.ids.includes(getStatusId(row))).length
            : rows.length;
        return acc;
    }, {});

export default function ApplicationsList() {
    const { data, errors, setData } = useFormStore();
    const navigate = useNavigate();
    const [selectedRows, setSelectedRows] = useState([]);
    const [tableData, setTableData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [archive, setArchive] = useState(false);
    const [activeStatusTab, setActiveStatusTab] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [nextId, setNextId] = useState(null);
    const [fetching, setFetching] = useState(false);
    const [filters, setFilters] = useState({
        query: "",
        fullName: "",
        phone: "",
        resident: "",
        card: "",
    });
    const [alert, setAlert] = useState({
        show: false,
        message: "",
        type: "info",
    });

    const wsUrl =
        import.meta.env.VITE_BACKEND_APPLICATION_URL_WS + "/applications/portal";

    const getAuthHeaders = useCallback(() => {
        const token = localStorage.getItem("access_token");
        return {
            Authorization: `Bearer ${token}`,
        };
    }, []);

    const fetchData = useCallback(
        async (after = null, reset = false) => {
            try {
                setLoading(true);
                const params = {};

                if (after) params.after = after;
                if (data?.month) params.month = data.month;
                if (data?.year) params.year = data.year;
                if (data?.status) params.status_id = data.status;

                const response = await apiClientApplication.get(
                    archive ? "/applications/archive" : "/applications",
                    {
                        params,
                        headers: getAuthHeaders(),
                    },
                );
                const result = response.data || [];

                if (reset || after === null) {
                    setTableData(result);
                } else {
                    setTableData((prev) => {
                        const existingIds = new Set(prev.map((item) => item.ID));
                        const newItems = result.filter((item) => !existingIds.has(item.ID));
                        return [...prev, ...newItems];
                    });
                }

                setNextId(result?.[result?.length - 1]?.ID);
            } catch (error) {
                console.log("Ошибка загрузки заявок:", error);
            } finally {
                setLoading(false);
                setFetching(false);
            }
        },
        [archive, data?.month, data?.year, data?.status, getAuthHeaders],
    );

    const handleNewApplication = useCallback(
        (newApplication) => {
            setAlert({
                show: true,
                message: `Новая заявка #${newApplication.ID} от ${newApplication.request_сreator}`,
                type: "info",
            });

            if (!archive) {
                fetchData(null, true);
            }
        },
        [archive, fetchData],
    );

    useWebSocket(wsUrl, handleNewApplication, [archive]);

    const handleExport = async () => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const token = localStorage.getItem("access_token");
            const response = await fetch(`${backendUrl}/automation/application`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ application_ids: selectedRows }),
            });
            if (!response.ok) throw new Error("Ошибка при получении файла");
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "Отчет заявок.xlsx";
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Ошибка выгрузки:", error);
        }
    };

    const scrollHandler = (e) => {
        const target = e.target;
        if (
            !fetching &&
            nextId &&
            target.scrollHeight - (target.scrollTop + target.clientHeight) < 12
        ) {
            setFetching(true);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const deleteApplication = async (id) => {
        try {
            await apiClientApplication.delete(`/applications/${id}`, {
                headers: getAuthHeaders(),
            });
            setSelectedRows((prev) => prev.filter((selectedId) => selectedId !== id));
            setTimeout(() => fetchData(null, true), 200);
        } catch (e) {
            console.error(e);
        }
    };

    const filteredData = useMemo(() => {
        if (!Array.isArray(tableData)) return [];

        const query = filters.query.trim().toLowerCase();
        const fullNameFilter = filters.fullName.trim().toLowerCase();
        const cardFilter = filters.card.trim().toLowerCase();

        return tableData.filter((row) => {
            const fullName = getFullName(row).toLowerCase();
            const searchHaystack = [
                row?.ID,
                fullName,
                row?.phone_number,
                row?.card_name,
                row?.card_type,
                row?.last_card_numbers,
                row?.receiving_office,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const matchesTab =
                activeStatusTab === "all" || getStatusGroup(row) === activeStatusTab;
            const matchesQuery = !query || searchHaystack.includes(query);
            const matchesFullName = !fullNameFilter || fullName.includes(fullNameFilter);
            const matchesPhone =
                !filters.phone || String(row?.phone_number || "").includes(filters.phone);
            const matchesResident =
                !filters.resident ||
                (filters.resident === "Да" ? row?.is_resident : !row?.is_resident);
            const matchesCard =
                !cardFilter || String(row?.card_name || "").toLowerCase().includes(cardFilter);

            return (
                matchesTab &&
                matchesQuery &&
                matchesFullName &&
                matchesPhone &&
                matchesResident &&
                matchesCard
            );
        });
    }, [activeStatusTab, filters, tableData]);

    const statusCounts = useMemo(() => getStatusStats(tableData), [tableData]);
    const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
    const pageStart = (currentPage - 1) * PAGE_SIZE;
    const visibleRows = filteredData.slice(pageStart, pageStart + PAGE_SIZE);
    const allVisibleSelected =
        visibleRows.length > 0 && visibleRows.every((row) => selectedRows.includes(row.ID));
    const periodLabel =
        data?.month || data?.year
            ? [data?.month ? `Месяц ${data.month}` : null, data?.year ? `Год ${data.year}` : null]
                  .filter(Boolean)
                  .join(", ")
            : "Весь период";

    const paginationPages = useMemo(() => {
        const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
        return [...pages]
            .filter((page) => page >= 1 && page <= totalPages)
            .sort((a, b) => a - b);
    }, [currentPage, totalPages]);

    const statsCards = [
        {
            key: "all",
            label: "Всего заявок",
            value: statusCounts.all || 0,
            icon: Inbox,
            tone: "neutral",
        },
        {
            key: "review",
            label: "На проверке",
            value: statusCounts.review || 0,
            icon: Clock3,
            tone: "warning",
        },
        {
            key: "approved",
            label: "Одобренные",
            value: statusCounts.approved || 0,
            icon: CheckCircle2,
            tone: "success",
        },
        {
            key: "rejected",
            label: "Отклоненные",
            value: statusCounts.rejected || 0,
            icon: XCircle,
            tone: "danger",
        },
    ];

    const toggleVisibleRows = (checked) => {
        const visibleIds = visibleRows.map((row) => row.ID);
        setSelectedRows((prev) => {
            if (checked) {
                return [...new Set([...prev, ...visibleIds])];
            }
            return prev.filter((id) => !visibleIds.includes(id));
        });
    };

    const upDateStatusApplications = async (newStatus) => {
        const unapprovedSelected = tableData.filter(
            (row) => selectedRows.includes(row.ID) && row.application_status_id === 7,
        );
        if (unapprovedSelected.length > 0) {
            setAlert({
                show: true,
                message: "Нельзя изменить статус для заявок, которые не одобрены комплаенсом",
                type: "error",
            });
            return;
        }

        try {
            await Promise.all(
                selectedRows.map((id) =>
                    apiClientApplication.patch(
                        `/applications/${id}`,
                        { application_status_id: +newStatus },
                        { headers: getAuthHeaders() },
                    ),
                ),
            );

            setData("status", "");
            fetchData(null, true);
            setSelectedRows([]);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchData(null, true);
    }, [fetchData]);

    useEffect(() => {
        if (fetching && nextId !== undefined) {
            fetchData(nextId);
        }
    }, [fetching, nextId, fetchData]);

    useEffect(() => {
        if (data.month || data.month === "") {
            localStorage.setItem("month", data.month);
        }
        if (data.year || data.year === "") {
            localStorage.setItem("year", data.year);
        }
    }, [data]);

    useEffect(() => {
        const savedMonth = localStorage.getItem("month");
        const savedYear = localStorage.getItem("year");
        if (savedMonth) setData("month", savedMonth);
        if (savedYear) setData("year", savedYear);
    }, [setData]);

    useEffect(() => {
        setCurrentPage(1);
    }, [activeStatusTab, filters, archive]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    return (
        <div className="applications-list content-page applications-list-redesign">
            <main>
                {alert.show && (
                    <AlertMessage
                        message={alert.message}
                        type={alert.type}
                        onClose={() => setAlert({ ...alert, show: false })}
                        duration={5000}
                    />
                )}

                <section className="applications-hero">
                    <div>
                        <h1>Заявки на карты</h1>
                        <p>Обработка и проверка заявок клиентов на выпуск карт</p>
                    </div>
                </section>

                <section className="applications-stats">
                    {statsCards.map((card) => {
                        const Icon = card.icon;
                        return (
                            <button
                                type="button"
                                key={card.key}
                                className={`applications-stat applications-stat--${card.tone}`}
                                onClick={() => setActiveStatusTab(card.key)}
                            >
                                <span className="applications-stat__icon">
                                    <Icon size={20} />
                                </span>
                                <span>
                                    <strong>{card.value}</strong>
                                    <small>{card.label}</small>
                                </span>
                            </button>
                        );
                    })}
                </section>

                <section className="applications-tabs" aria-label="Фильтр по статусу">
                    {STATUS_TABS.map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            className={activeStatusTab === tab.key ? "active" : ""}
                            onClick={() => setActiveStatusTab(tab.key)}
                        >
                            {tab.label}
                            <span>{statusCounts[tab.key] || 0}</span>
                        </button>
                    ))}
                </section>

                <section className="applications-toolbar">
                    <label className="applications-search">
                        <Search size={19} />
                        <input
                            type="search"
                            placeholder="Поиск: ФИО, телефон, ID, карта"
                            value={filters.query}
                            onChange={(e) => handleFilterChange("query", e.target.value)}
                        />
                    </label>

                    <button
                        type="button"
                        className="applications-period-btn"
                        onClick={() => setShowFilters((prev) => !prev)}
                    >
                        <CalendarDays size={18} />
                        {periodLabel}
                    </button>

                    <div className="applications-toolbar__actions">
                        <button
                            type="button"
                            className={showFilters ? "applications-action active" : "applications-action"}
                            onClick={() => setShowFilters((prev) => !prev)}
                        >
                            <SlidersHorizontal size={18} />
                            Фильтры
                        </button>
                        <button
                            type="button"
                            className={archive ? "applications-action active" : "applications-action"}
                            onClick={() => setArchive((prev) => !prev)}
                        >
                            <Archive size={18} />
                            Архив
                        </button>
                        <button
                            type="button"
                            className="applications-action applications-action--primary"
                            onClick={handleExport}
                        >
                            <Download size={18} />
                            Выгрузка
                        </button>
                    </div>
                </section>

                {showFilters && (
                    <section className="applications-filters animate-slideIn">
                        <label>
                            <span>ФИО</span>
                            <input
                                placeholder="Клиент"
                                value={filters.fullName}
                                onChange={(e) => handleFilterChange("fullName", e.target.value)}
                            />
                        </label>
                        <label>
                            <span>Телефон</span>
                            <input
                                placeholder="992..."
                                value={filters.phone}
                                onChange={(e) => handleFilterChange("phone", e.target.value)}
                            />
                        </label>
                        <label>
                            <span>Резидент</span>
                            <select
                                value={filters.resident}
                                onChange={(e) => handleFilterChange("resident", e.target.value)}
                            >
                                <option value="">Все</option>
                                <option value="Да">Да</option>
                                <option value="Нет">Нет</option>
                            </select>
                        </label>
                        <label>
                            <span>Карта</span>
                            <input
                                placeholder="Тип карты"
                                value={filters.card}
                                onChange={(e) => handleFilterChange("card", e.target.value)}
                            />
                        </label>
                        <label>
                            <span>Месяц</span>
                            <input
                                type="number"
                                min="1"
                                max="12"
                                value={data?.month || ""}
                                onChange={(e) => setData("month", e.target.value)}
                            />
                        </label>
                        <label>
                            <span>Год</span>
                            <input
                                type="number"
                                min="2020"
                                value={data?.year || ""}
                                onChange={(e) => setData("year", e.target.value)}
                            />
                        </label>
                    </section>
                )}

                {selectedRows.length > 0 && (
                    <section className="applications-bulk">
                        <span>Выбрано заявок: {selectedRows.length}</span>
                        <Select
                            style={{ border: "1px solid #d8dce3" }}
                            id="status"
                            value={data?.status}
                            onChange={(value) => upDateStatusApplications(value)}
                            options={status}
                            error={errors}
                        />
                    </section>
                )}

                <section className="applications-table-card">
                    <div className="applications-table-wrap" onScroll={scrollHandler}>
                        <table>
                            <thead>
                                <tr>
                                    <th className="applications-checkbox-cell">
                                        <input
                                            type="checkbox"
                                            checked={allVisibleSelected}
                                            onChange={(e) => toggleVisibleRows(e.target.checked)}
                                            aria-label="Выбрать все заявки на странице"
                                        />
                                    </th>
                                    <th>ID</th>
                                    <th>Клиент</th>
                                    <th>Карта</th>
                                    <th>Офис получения</th>
                                    <th>Статус</th>
                                    <th>Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleRows.map((row) => {
                                    const statusGroup = getStatusGroup(row);
                                    const fullName = getFullName(row);

                                    return (
                                        <tr key={row.ID}>
                                            <td className="applications-checkbox-cell">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedRows.includes(row.ID)}
                                                    onChange={(e) => {
                                                        setSelectedRows((prev) =>
                                                            e.target.checked
                                                                ? [...prev, row.ID]
                                                                : prev.filter((id) => id !== row.ID),
                                                        );
                                                    }}
                                                    aria-label={`Выбрать заявку ${row.ID}`}
                                                />
                                            </td>
                                            <td className="applications-id">#{row.ID}</td>
                                            <td>
                                                <div className="applications-client">
                                                    <span className="applications-avatar">
                                                        {getInitials(row)}
                                                    </span>
                                                    <span>
                                                        <strong>{fullName}</strong>
                                                        <small>{row.phone_number || "Телефон не указан"}</small>
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="applications-card-info">
                                                    <strong>{row.card_name || row.card_type || "Карта не указана"}</strong>
                                                    <small>{row.delivery_address || row.card_code || "Адрес не указан"}</small>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="applications-office">
                                                    <BriefcaseBusiness size={16} />
                                                    {row.receiving_office || "Офис не указан"}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`applications-status applications-status--${statusGroup}`}>
                                                    {getStatusLabel(row)}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="applications-row-actions">
                                                    <button
                                                        type="button"
                                                        className="applications-open-btn"
                                                        onClick={() => navigate(`/agent/card/${row.ID}`)}
                                                    >
                                                        <Eye size={16} />
                                                        Открыть
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="applications-delete-btn"
                                                        onClick={() => deleteApplication(row.ID)}
                                                        title="Удалить заявку"
                                                        aria-label={`Удалить заявку ${row.ID}`}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {!loading && visibleRows.length === 0 && (
                                    <tr>
                                        <td colSpan={7}>
                                            <div className="applications-empty">
                                                Нет данных для отображения
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {loading && (
                            <div className="applications-loading">
                                <Spinner />
                            </div>
                        )}
                    </div>

                    <footer className="applications-table-footer">
                        <span>
                            Показано{" "}
                            {filteredData.length === 0
                                ? "0"
                                : `${pageStart + 1}-${Math.min(pageStart + PAGE_SIZE, filteredData.length)}`}{" "}
                            из {filteredData.length} заявок
                        </span>

                        <div className="applications-pagination">
                            <button
                                type="button"
                                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                                disabled={currentPage === 1}
                                aria-label="Предыдущая страница"
                            >
                                <ChevronLeft size={17} />
                            </button>
                            {paginationPages.map((page) => (
                                <button
                                    key={page}
                                    type="button"
                                    className={currentPage === page ? "active" : ""}
                                    onClick={() => setCurrentPage(page)}
                                >
                                    {page}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() =>
                                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                                }
                                disabled={currentPage === totalPages}
                                aria-label="Следующая страница"
                            >
                                <ChevronRight size={17} />
                            </button>
                        </div>
                    </footer>
                </section>
            </main>
        </div>
    );
}
