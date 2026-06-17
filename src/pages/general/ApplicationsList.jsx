// ApplicationsList.jsx
import React, { useEffect, useState, useCallback } from "react";
import Input from "../../components/elements/Input";
import { useFormStore } from "../../hooks/useFormState";
import { status } from "../../const/defConst";
import fileLogo from "../../assets/file_logo.png";
import Select from "../../components/elements/Select";
import HeaderAgent from "../../components/dashboard/dashboard_agent/MenuAgent.jsx";
import Spinner from "../../components/Spinner.jsx";
import { AiFillDelete, AiFillEdit, AiOutlineEye, AiOutlineLeft, AiOutlineRight } from "react-icons/ai";
import { useNavigate } from "react-router-dom";
import { apiClientApplication } from "../../api/utils/apiClientApplication.js";
import { useWebSocket } from "../../api/application/wsnotifications.js";
import AlertMessage from "../../components/general/AlertMessage.jsx";

function ImagePreviewModal({ imageUrl, onClose }) {
    if (!imageUrl) return null;
    return (
        <div className="custom-modal-overlay" onClick={onClose}>
            <div
                className="custom-modal-content animate-scaleIn"
                onClick={(e) => e.stopPropagation()}
            >
                <button className="custom-modal-close" onClick={onClose}>
                    ×
                </button>
                <img
                    src={imageUrl}
                    alt="Предпросмотр"
                    className="custom-modal-image"
                />
            </div>
        </div>
    );
}

export default function ApplicationsList() {
    const { data, errors, setData } = useFormStore();
    const [selectedRows, setSelectedRows] = useState([]);
    const [tableData, setTableData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [archive, setArchive] = useState(false);
    const [selectAll, setSelectAll] = useState(false);
    const [nextId, setNextId] = useState(null);
    const [fetching, setFetching] = useState(true);
    const [filters, setFilters] = useState({
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
    const navigate = useNavigate();

    const wsUrl =
        import.meta.env.VITE_BACKEND_APPLICATION_URL_WS + "/applications/portal";

    // Вспомогательная функция для получения заголовков с токеном
    const getAuthHeaders = () => {
        const token = localStorage.getItem("access_token");
        return {
            Authorization: `Bearer ${token}`,
        };
    };

    const fetchData = useCallback(
        async (nextId = null, reset = false) => {
            try {
                setLoading(true);
                const params = {};

                if (nextId) params.after = nextId;
                if (data?.month) params.month = data.month;
                if (data?.year) params.year = data.year;
                if (data?.status) params.status_id = data.status;

                const response = await apiClientApplication.get(
                    archive ? "/applications/archive" : "/applications",
                    {
                        params,
                        headers: getAuthHeaders(), // 🔐 Добавлен токен
                    },
                );
                const result = response.data || [];

                if (reset || nextId === null) {
                    setTableData(result);
                } else {
                    setTableData((prev) => {
                        const existingIds = new Set(prev.map((item) => item.ID));
                        const newItems = result.filter((item) => !existingIds.has(item.ID));
                        return [...prev, ...newItems];
                    });
                }

                setNextId(result?.[result?.length - 1]?.ID);
                setFetching(false);
            } catch (error) {
                console.log("Ошибка загрузки заявок:", error);
            } finally {
                setLoading(false);
                setFetching(false);
            }
        },
        [archive, data?.month, data?.year, data?.status],
    );

    const handleNewApplication = useCallback(
        (newApplication) => {
            console.log("Новая заявка получена:", newApplication);

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
        console.table({
            name: "target",
            scrollHeight: target.scrollHeight,
            scrollTop: target.scrollTop,
            clientHeight: target.clientHeight,
        });

        if (!fetching) {
            if (target.scrollHeight - (target.scrollTop + target.clientHeight) < 1) {
                setFetching(true);
            }
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const applyFilters = (data, currentFilters) => {
        if (!Array.isArray(data)) return [];

        return data.filter((row) => {
            const fullName =
                `${row?.surname || ""} ${row?.name || ""} ${row?.patronymic || ""}`.toLowerCase();
            return (
                fullName?.includes(currentFilters?.fullName?.toLowerCase() || "") &&
                row?.phone_number?.includes(currentFilters?.phone || "") &&
                (!currentFilters?.resident ||
                    (currentFilters?.resident === "Да"
                        ? row?.is_resident
                        : !row?.is_resident)) &&
                (!currentFilters?.card ||
                    row?.card_name
                        ?.toLowerCase()
                        ?.includes(currentFilters?.card?.toLowerCase() || ""))
            );
        });
    };

    const headers = [
        "Телефон",
        "Кодовое слово",
        "Имя на карте",
        "Пол",
        "Резидент",
        "Документ",
        "ИНН",
        "Адрес",
        "Карта",
    ];

    const renderFileIcon = (path) => {
        if (!path) return null;
        const backendUrl = import.meta.env.VITE_BACKEND_APPLICATION_URL;
        const fullUrl = `${backendUrl}/uploads/${path.replace(/\\/g, "/")}`;
        return (
            <button
                className="file-icon-button"
                onClick={() => setPreviewImage(fullUrl)}
            >
                <img src={fileLogo} alt="Файл" width={48} height={60} />
            </button>
        );
    };

    const formatDate = (date) => {
        if (!date) return "";
        const d = new Date(date);
        if (isNaN(d)) return "";
        return d.toISOString().split("T")[0];
    };

    const deleteApplication = async (id) => {
        try {
            // 🔐 Прямой вызов API с заголовком авторизации
            await apiClientApplication.delete(`/applications/${id}`, {
                headers: getAuthHeaders(),
            });
            setTimeout(() => fetchData(), 200);
        } catch (e) {
            console.error(e);
        }
    };

    const filteredData = applyFilters(tableData, filters);

    const upDateStatusApplications = async (status) => {
        // Проверяем, есть ли среди выбранных заявок те, у которых статус "Не одобрено" (7)
        const unapprovedSelected = tableData.filter(
            (row) => selectedRows.includes(row.ID) && row.application_status_id === 7
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
            // 🔐 Выполняем запросы с токеном
            await Promise.all(
                selectedRows.map((id) =>
                    apiClientApplication.patch(
                        `/applications/${id}`,
                        { application_status_id: +status },
                        { headers: getAuthHeaders() }
                    )
                )
            );

            setData("status", "");
            fetchData(null, true);
            setSelectedRows([]);
            setSelectAll(false);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchData(null, true);
    }, [archive, fetchData]);

    useEffect(() => {
        fetchData(null, true);
    }, [data?.month, data?.year, data?.status, fetchData]);

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

    return (
        <>
            <div className="applications-list content-page">
                <main>
                    {alert.show && (
                        <AlertMessage
                            message={alert.message}
                            type={alert.type}
                            onClose={() => setAlert({ ...alert, show: false })}
                            duration={5000}
                        />
                    )}

                    <div className="my-applications-header">
                        <Select
                            style={{ border: selectedRows.length && "4px solid #ff1a1a" }}
                            id={"status"}
                            value={data?.status}
                            onChange={(e) => {
                                if (!selectedRows.length) setData("status", e);
                                else upDateStatusApplications(e);
                            }}
                            options={status}
                            error={errors}
                        />
                        <button className="Unloading" onClick={handleExport}>
                            Выгрузка для карт
                        </button>
                        <button
                            className="filter-toggle"
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            Фильтры
                        </button>
                        <button
                            className={archive ? "archive-toggle active" : "archive-toggle"}
                            onClick={() => setArchive(!archive)}
                        >
                            Архив
                        </button>
                        <button
                            className={selectAll ? "selectAll-toggle active" : "selectAll-toggle"}
                            onClick={() => {
                                const nextSelectAll = !selectAll;
                                setSelectAll(nextSelectAll);
                                if (nextSelectAll) {
                                    setSelectedRows(filteredData.map((e) => e.ID));
                                } else {
                                    setSelectedRows([]);
                                }
                            }}
                        >
                            Выбрать все
                        </button>
                    </div>

                    {showFilters && (
                        <div className="filters animate-slideIn">
                            <input
                                placeholder="ФИО"
                                value={filters.fullName}
                                onChange={(e) => handleFilterChange("fullName", e.target.value)}
                            />
                            <input
                                placeholder="Телефон"
                                value={filters.phone}
                                onChange={(e) => handleFilterChange("phone", e.target.value)}
                            />
                            <Select
                                value={filters.resident}
                                onChange={(val) => handleFilterChange("resident", val)}
                                options={[
                                    { value: "", label: "Резидент" },
                                    { value: "Да", label: "Да" },
                                    { value: "Нет", label: "Нет" },
                                ]}
                            />
                            <input
                                placeholder="Карта"
                                value={filters.card}
                                onChange={(e) => handleFilterChange("card", e.target.value)}
                            />
                        </div>
                    )}

                    <div className="my-applications-sub-header">
                        <div>
                            Поиск по месяцам
                            <Input
                                type="number"
                                placeholder={""}
                                onChange={(e) => setData("month", e)}
                                value={data?.month}
                                id={"month"}
                            />
                        </div>
                        <div>
                            Поиск по годам
                            <Input
                                type="number"
                                placeholder={""}
                                onChange={(e) => setData("year", e)}
                                value={data?.year}
                                id={"year"}
                            />
                        </div>
                        {loading ? (
                            <Spinner />
                        ) : (
                            <div>
                                Показать{" "}
                                <Input
                                    type="number"
                                    placeholder={""}
                                    onChange={(e) => setData("limit", e)}
                                    value={data?.limit}
                                    id={"limit"}
                                />{" "}
                                записей
                            </div>
                        )}
                    </div>

                    <div
                        className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6"
                        onScroll={scrollHandler}
                        style={{ position: "relative" }}
                    >
                        {filteredData.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "2rem", color: "gray" }}>
                                Нет данных для отображения
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-transparent border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4">
                                            <input 
                                                type="checkbox" 
                                                className="custom-checkbox rounded-full border-gray-300 w-5 h-5 text-red-600 focus:ring-red-500" 
                                                checked={selectAll}
                                                onChange={(e) => {
                                                    const nextSelectAll = e.target.checked;
                                                    setSelectAll(nextSelectAll);
                                                    if (nextSelectAll) {
                                                        setSelectedRows(filteredData.map((e) => e.ID));
                                                    } else {
                                                        setSelectedRows([]);
                                                    }
                                                }}
                                            />
                                        </th>
                                        <th className="px-6 py-4 text-xs font-semibold tracking-wider text-gray-400 uppercase">ID</th>
                                        <th className="px-6 py-4 text-xs font-semibold tracking-wider text-gray-400 uppercase">КЛИЕНТ</th>
                                        <th className="px-6 py-4 text-xs font-semibold tracking-wider text-gray-400 uppercase">КАРТА</th>
                                        <th className="px-6 py-4 text-xs font-semibold tracking-wider text-gray-400 uppercase">ОФИС ПОЛУЧЕНИЯ</th>
                                        <th className="px-6 py-4 text-xs font-semibold tracking-wider text-gray-400 uppercase">СТАТУС</th>
                                        <th className="px-6 py-4 text-xs font-semibold tracking-wider text-gray-400 uppercase">ДЕЙСТВИЯ</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {filteredData
                                        ?.slice(0, data?.limit || filteredData?.length)
                                        ?.map((row, index) => {
                                            let badgeBg = "bg-red-50";
                                            let badgeText = "text-red-600";
                                            let dotColor = "bg-red-500";
                                            let statusText = "Новая";

                                            const statusObj = status.find(s => s.value === row.application_status_id && s.label !== "Статус");
                                            const label = statusObj ? statusObj.label.toLowerCase() : "";

                                            if (label.includes("одобрен") && !label.includes("не одобрен")) {
                                              statusText = "Одобрена";
                                              badgeBg = "bg-green-50";
                                              badgeText = "text-green-600";
                                              dotColor = "bg-green-500";
                                            } else if (label.includes("отказано") || label.includes("не одобрен") || label.includes("недостоверные")) {
                                              statusText = "Отклонена";
                                              badgeBg = "bg-rose-100";
                                              badgeText = "text-rose-700";
                                              dotColor = "bg-rose-600";
                                            } else if (label.includes("обработан") || label.includes("проверк")) {
                                              statusText = "На проверке";
                                              badgeBg = "bg-yellow-50";
                                              badgeText = "text-yellow-600";
                                              dotColor = "bg-yellow-500";
                                            } else {
                                              statusText = "Новая";
                                              badgeBg = "bg-red-50";
                                              badgeText = "text-red-500";
                                              dotColor = "bg-red-400";
                                            }

                                            const initials = `${row.surname?.[0] || ""}${row.name?.[0] || ""}`.toUpperCase();
                                            const fullName = `${row.surname || ""} ${row.name || ""} ${row.patronymic || ""}`.trim();

                                            return (
                                                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors items-center">
                                                    <td className="px-6 py-4">
                                                        <input
                                                            type="checkbox"
                                                            className="custom-checkbox rounded-full border-gray-300 w-5 h-5 text-red-600 focus:ring-red-500"
                                                            checked={selectedRows.includes(row.ID)}
                                                            onChange={(e) => {
                                                                setSelectedRows(
                                                                    e.target.checked
                                                                        ? [...selectedRows, row.ID]
                                                                        : selectedRows.filter((id) => id !== row.ID),
                                                                );
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-500 font-medium">#{row.ID}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold shrink-0">
                                                                {initials || "КЛ"}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold text-gray-900">{fullName}</span>
                                                                <span className="text-xs text-gray-400">{row.phone_number}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-sm text-gray-900 uppercase">{row.card_name || "Неизвестно"}</span>
                                                            <span className="text-xs text-gray-400">{row.delivery_address || "-"}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-700 whitespace-normal max-w-[200px]">
                                                        {row.receiving_office || "-"}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${badgeBg} ${badgeText}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
                                                            {statusText}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <button 
                                                            onClick={() => navigate(`/agent/card/${row.ID}`)}
                                                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 flex items-center gap-1 bg-white hover:bg-gray-50 transition-colors"
                                                        >
                                                            <AiOutlineEye size={16} />
                                                            Открыть
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {filteredData.length > 0 && (
                            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white">
                                <div className="text-sm text-gray-500">
                                    Показано {filteredData.length} из {filteredData.length} заявок
                                </div>
                                <div className="flex items-center gap-2">
                                    <button className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-300 cursor-not-allowed">
                                        <AiOutlineLeft size={14} />
                                    </button>
                                    <button className="w-8 h-8 flex items-center justify-center rounded-full bg-red-600 text-white font-medium text-sm">
                                        1
                                    </button>
                                    <button className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 font-medium text-sm hover:bg-gray-50 transition-colors">
                                        2
                                    </button>
                                    <button className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                                        <AiOutlineRight size={14} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            <ImagePreviewModal
                imageUrl={previewImage}
                onClose={() => setPreviewImage(null)}
            />
        </>
    );
}
