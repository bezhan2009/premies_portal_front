import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    Archive,
    Building2,
    BriefcaseBusiness,
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock3,
    CreditCard,
    Download,
    Eye,
    ExternalLink,
    FileText,
    FileImage,
    Inbox,
    MapPin,
    Phone,
    Search,
    SlidersHorizontal,
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
const REQUEST_CREATOR_KEY = "request_\u0441reator";

const STATUS_TABS = [
    { key: "all", label: "Все", ids: null },
    { key: "accepted", label: "Заявка принята", ids: [1] },
    { key: "processed", label: "Заявка обработана", ids: [2] },
    { key: "opened", label: "Карта открыта", ids: [3] },
    { key: "activated", label: "Карта активирована", ids: [4] },
    { key: "bad-data", label: "Недостоверные данные", ids: [5] },
    { key: "card-denied", label: "Отказано в карте", ids: [6] },
    { key: "not-approved", label: "Не одобрено", ids: [7] },
    { key: "approved", label: "Одобрено", ids: [8] },
];

const RESIDENT_OPTIONS = [
    { value: "", label: "Все" },
    { value: "Да", label: "Да" },
    { value: "Нет", label: "Нет" },
];

const PASSPORT_DOCUMENTS = [
    {
        key: "front_side_of_the_passport",
        label: "Лицевая сторона",
    },
    {
        key: "back_side_of_the_passport",
        label: "Задняя сторона",
    },
    {
        key: "selfie_with_passport",
        label: "Скан с лицом",
    },
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
    if ([3, 4, 8].includes(statusId)) return "approved";
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
    const tab = STATUS_TABS.find((item) => item.ids?.includes(statusId));
    if (tab) return tab.label;

    const option = [...status].reverse().find((item) => Number(item.value) === statusId);
    return option?.label && option.label !== "Статус" ? option.label : "Заявка принята";
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

const getRequestCreator = (row) => row?.[REQUEST_CREATOR_KEY] || row?.request_creator || "Не указан";

const getUploadUrl = (path) => {
    if (!path) return "";
    const normalizedPath = String(path).replace(/\\/g, "/");
    const backendUrl = import.meta.env.VITE_BACKEND_APPLICATION_URL || "";
    return `${backendUrl}/uploads/${normalizedPath}`;
};

const stringifyForSearch = (value) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "object") {
        return Object.values(value).map(stringifyForSearch).join(" ");
    }
    return String(value);
};

const formatDate = (value) => {
    if (!value) return "Не указана";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

export default function ApplicationsList() {
    const { data, errors, setData } = useFormStore();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const initialSearch = searchParams.get("search") || "";
    const [selectedRows, setSelectedRows] = useState([]);
    const [tableData, setTableData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [detailedApp, setDetailedApp] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [archive, setArchive] = useState(false);
    const [activeStatusTab, setActiveStatusTab] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [nextId, setNextId] = useState(null);
    const [fetching, setFetching] = useState(false);
    const [filters, setFilters] = useState({
        query: initialSearch,
        fullName: "",
        phone: "",
        resident: "",
        card: "",
        channel: "",
        operator: "",
        dateFrom: "",
        dateTo: "",
    });
    const [alert, setAlert] = useState({
        show: false,
        message: "",
        type: "info",
    });

    const getWsUrl = () => {
        const envUrl = import.meta.env.VITE_BACKEND_APPLICATION_URL_WS;
        if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
            return envUrl + "/applications/portal";
        }
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        return `${protocol}//${window.location.hostname}:7676/applications/portal`;
    };
    const wsUrl = getWsUrl();

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
                const activeTab = STATUS_TABS.find((tab) => tab.key === activeStatusTab);

                if (after) params.after = after;
                if (activeTab?.ids?.length === 1) params.status_id = activeTab.ids[0];
                if (filters.dateFrom) params.date_from = filters.dateFrom;
                if (filters.dateTo) params.date_to = filters.dateTo;

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
        [activeStatusTab, archive, filters.dateFrom, filters.dateTo, getAuthHeaders],
    );

    const handleNewApplication = useCallback(
        (newApplication) => {
            setAlert({
                show: true,
                message: `Новая заявка #${newApplication.ID} от ${getRequestCreator(newApplication)}`,
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

    const filteredData = useMemo(() => {
        if (!Array.isArray(tableData)) return [];

        const query = filters.query.trim().toLowerCase();
        const fullNameFilter = filters.fullName.trim().toLowerCase();
        const cardFilter = filters.card.trim().toLowerCase();
        const channelFilter = filters.channel.trim().toLowerCase();
        const operatorFilter = filters.operator.trim().toLowerCase();
        const activeTab = STATUS_TABS.find((tab) => tab.key === activeStatusTab);

        return tableData.filter((row) => {
            const fullName = getFullName(row).toLowerCase();
            const searchHaystack = stringifyForSearch(row).toLowerCase();
            const statusId = getStatusId(row);

            const matchesTab =
                activeStatusTab === "all" || activeTab?.ids?.includes(statusId);
            const matchesQuery = !query || searchHaystack.includes(query);
            const matchesFullName = !fullNameFilter || fullName.includes(fullNameFilter);
            const matchesPhone =
                !filters.phone || String(row?.phone_number || "").includes(filters.phone);
            const matchesResident =
                !filters.resident ||
                (filters.resident === "Да" ? row?.is_resident : !row?.is_resident);
            const matchesCard =
                !cardFilter || String(row?.card_name || "").toLowerCase().includes(cardFilter);
            const matchesChannel =
                !channelFilter || getRequestCreator(row).toLowerCase().includes(channelFilter);
            const matchesOperator =
                !operatorFilter ||
                String(row?.operator_fio || "").toLowerCase().includes(operatorFilter);

            return (
                matchesTab &&
                matchesQuery &&
                matchesFullName &&
                matchesPhone &&
                matchesResident &&
                matchesCard &&
                matchesChannel &&
                matchesOperator
            );
        });
    }, [activeStatusTab, filters, tableData]);

    const statusCounts = useMemo(() => getStatusStats(tableData), [tableData]);
    const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
    const pageStart = (currentPage - 1) * PAGE_SIZE;
    const visibleRows = filteredData.slice(pageStart, pageStart + PAGE_SIZE);
    const allVisibleSelected =
        visibleRows.length > 0 && visibleRows.every((row) => selectedRows.includes(row.ID));
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
            key: "processed",
            label: "Обработано",
            value: statusCounts.processed || 0,
            icon: Clock3,
            tone: "warning",
        },
        {
            key: "approved",
            label: "Одобрено",
            value: statusCounts.approved || 0,
            icon: CheckCircle2,
            tone: "success",
        },
        {
            key: "rejected",
            tabKey: "bad-data",
            label: "Отказ/риски",
            value:
                (statusCounts["bad-data"] || 0) +
                (statusCounts["card-denied"] || 0) +
                (statusCounts["not-approved"] || 0),
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

    const toggleRowSelection = (rowId) => {
        setSelectedRows((prev) =>
            prev.includes(rowId)
                ? prev.filter((id) => id !== rowId)
                : [...prev, rowId],
        );
    };

    const setRowSelection = (rowId, checked) => {
        setSelectedRows((prev) => {
            if (checked) {
                return prev.includes(rowId) ? prev : [...prev, rowId];
            }

            return prev.filter((id) => id !== rowId);
        });
    };

    const toggleFilteredRows = () => {
        const filteredIds = filteredData.map((row) => row.ID);
        const allFilteredSelected =
            filteredIds.length > 0 && filteredIds.every((id) => selectedRows.includes(id));

        setSelectedRows((prev) => {
            if (allFilteredSelected) {
                return prev.filter((id) => !filteredIds.includes(id));
            }

            return [...new Set([...prev, ...filteredIds])];
        });
    };

    const upDateStatusApplications = async (newStatus) => {
        const unapprovedSelected = tableData.filter(
            (row) => selectedRows.includes(row.ID) && getStatusId(row) === 7,
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

    const openApplication = async (row) => {
        try {
            await apiClientApplication.patch(
                `/applications/${row.ID}`,
                {},
                { headers: getAuthHeaders() },
            );
        } catch (e) {
            console.error("Ошибка записи оператора:", e);
        } finally {
            navigate(`/agent/card/${row.ID}`);
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
                                onClick={() => setActiveStatusTab(card.tabKey || card.key)}
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

                    <div className="applications-period-range" aria-label="Период создания заявки">
                        <CalendarDays size={18} />
                        <input
                            type="date"
                            value={filters.dateFrom}
                            onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                            aria-label="Дата от"
                        />
                        <span>по</span>
                        <input
                            type="date"
                            value={filters.dateTo}
                            onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                            aria-label="Дата до"
                        />
                    </div>

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
                            className="applications-action"
                            onClick={toggleFilteredRows}
                            disabled={filteredData.length === 0}
                        >
                            <CheckCircle2 size={18} />
                            Выбрать
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
                            <Select
                                id="resident"
                                value={filters.resident}
                                onChange={(value) => handleFilterChange("resident", value)}
                                options={RESIDENT_OPTIONS}
                                placeholder="Все"
                            />
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
                            <span>Канал</span>
                            <input
                                placeholder="Мобильный банк"
                                value={filters.channel}
                                onChange={(e) => handleFilterChange("channel", e.target.value)}
                            />
                        </label>
                        <label>
                            <span>Оператор</span>
                            <input
                                placeholder="ФИО оператора"
                                value={filters.operator}
                                onChange={(e) => handleFilterChange("operator", e.target.value)}
                            />
                        </label>
                    </section>
                )}

                {selectedRows.length > 0 && (
                    <section className="applications-bulk">
                        <span>Выбрано заявок: {selectedRows.length}</span>
                        <div className="applications-bulk__actions">
                            <Select
                                style={{ border: "1px solid #d8dce3" }}
                                id="status"
                                value={data?.status}
                                onChange={(value) => upDateStatusApplications(value)}
                                options={status}
                                error={errors}
                            />
                            <button
                                type="button"
                                className="applications-clear-selection"
                                onClick={() => setSelectedRows([])}
                            >
                                Снять выбор
                            </button>
                        </div>
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
                                            onClick={(e) => e.stopPropagation()}
                                            aria-label="Выбрать все заявки на странице"
                                        />
                                    </th>
                                    <th>ID</th>
                                    <th>Клиент</th>
                                    <th>Офис получения</th>
                                    <th>Карта</th>
                                    <th>Канал</th>
                                    <th>Статус</th>
                                    <th>Оператор</th>
                                    <th>Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleRows.map((row) => {
                                    const statusGroup = getStatusGroup(row);
                                    const fullName = getFullName(row);

                                    return (
                                        <tr 
                                            key={row.ID}
                                            className={selectedRows.includes(row.ID) ? "applications-row--selected" : ""}
                                            onClick={(e) => {
                                                if (
                                                    e.target.closest('.applications-checkbox-cell') || 
                                                    e.target.closest('.applications-row-actions') ||
                                                    e.target.tagName === 'INPUT' ||
                                                    e.target.closest('button')
                                                ) {
                                                    return;
                                                }
                                                toggleRowSelection(row.ID);
                                            }}
                                        >
                                            <td 
                                                className="applications-checkbox-cell"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedRows.includes(row.ID)}
                                                    onChange={(e) => setRowSelection(row.ID, e.target.checked)}
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
                                                <span className="applications-office">
                                                    <BriefcaseBusiness size={16} />
                                                    {row.receiving_office || "Офис не указан"}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="applications-card-info">
                                                    <strong>{row.card_name || row.card_type || "Карта не указана"}</strong>
                                                    <small>{row.card_code || row.last_card_numbers || "Код не указан"}</small>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="applications-channel">
                                                    {getRequestCreator(row)}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`applications-status applications-status--${statusGroup}`}>
                                                    {getStatusLabel(row)}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="applications-operator">
                                                    {row.operator_fio || "Не назначен"}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="applications-row-actions">
                                                    <button
                                                        type="button"
                                                        className="applications-details-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDetailedApp(row);
                                                        }}
                                                    >
                                                        <FileText size={16} />
                                                        Подробнее
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="applications-open-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openApplication(row);
                                                        }}
                                                    >
                                                        <ExternalLink size={16} />
                                                        Перейти к заявке
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {!loading && visibleRows.length === 0 && (
                                    <tr>
                                        <td colSpan={9}>
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
                {detailedApp && (
                    <div
                        className="application-details-overlay"
                        onClick={() => setDetailedApp(null)}
                    >
                        <div
                            className="application-details-modal"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <header className="application-details-modal__header">
                                <div>
                                    <div className="application-details-modal__title">
                                        <h2>Заявка #{detailedApp?.ID || ""}</h2>
                                        <span className={`applications-status applications-status--${getStatusGroup(detailedApp)}`}>
                                            {getStatusLabel(detailedApp)}
                                        </span>
                                    </div>
                                    <p>{getFullName(detailedApp)}</p>
                                </div>
                                <button
                                    type="button"
                                    className="application-details-modal__close"
                                    onClick={() => setDetailedApp(null)}
                                    aria-label="Закрыть"
                                >
                                    ×
                                </button>
                            </header>

                            <div className="application-details-modal__grid">
                                <div className="application-detail-card">
                                    <Phone size={21} />
                                    <span>Телефон</span>
                                    <strong>{detailedApp.phone_number || "Не указан"}</strong>
                                </div>
                                <div className="application-detail-card">
                                    <CreditCard size={21} />
                                    <span>Карта</span>
                                    <strong>{detailedApp.card_name || detailedApp.card_type || "Не указана"}</strong>
                                </div>
                                <div className="application-detail-card">
                                    <MapPin size={21} />
                                    <span>ИНН</span>
                                    <strong>{detailedApp.inn || "Не указан"}</strong>
                                </div>
                                <div className="application-detail-card">
                                    <Building2 size={21} />
                                    <span>Офис получения</span>
                                    <strong>{detailedApp.receiving_office || "Не указан"}</strong>
                                </div>
                                <div className="application-detail-card">
                                    <CalendarDays size={21} />
                                    <span>Дата создания</span>
                                    <strong>{formatDate(detailedApp.CreatedAt)}</strong>
                                </div>
                                <div className="application-detail-card">
                                    <Eye size={21} />
                                    <span>Оператор</span>
                                    <strong>{detailedApp.operator_fio || "Не назначен"}</strong>
                                </div>
                            </div>

                            <section className="application-documents">
                                <div className="application-documents__head">
                                    <h3>Сканы паспорта</h3>
                                    <span>
                                        Загружено{" "}
                                        {PASSPORT_DOCUMENTS.filter((doc) => detailedApp?.[doc.key]).length} из{" "}
                                        {PASSPORT_DOCUMENTS.length}
                                    </span>
                                </div>

                                <div className="application-documents__grid">
                                    {PASSPORT_DOCUMENTS.map((doc) => {
                                        const filePath = detailedApp?.[doc.key];
                                        const url = getUploadUrl(filePath);

                                        return (
                                            <button
                                                type="button"
                                                key={doc.key}
                                                className={filePath ? "application-document" : "application-document application-document--empty"}
                                                onClick={() => {
                                                    if (url) window.open(url, "_blank");
                                                }}
                                                disabled={!filePath}
                                            >
                                                {filePath ? (
                                                    <img src={url} alt={doc.label} />
                                                ) : (
                                                    <span>
                                                        <FileImage size={34} />
                                                        Нет файла
                                                    </span>
                                                )}
                                                <small>{doc.label}</small>
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
