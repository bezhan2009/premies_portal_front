// ApplicationsList.jsx
import React, { useEffect, useState, useCallback } from "react";
import Input from "../../components/elements/Input";
import { useFormStore } from "../../hooks/useFormState";
import { status as defaultStatusList } from "../../const/defConst";
import fileLogo from "../../assets/file_logo.png";
import Select from "../../components/elements/Select";
import HeaderAgent from "../../components/dashboard/dashboard_agent/MenuAgent.jsx";
import Spinner from "../../components/Spinner.jsx";
import { AiFillDelete, AiFillEdit, AiOutlineEye, AiOutlineLeft, AiOutlineRight, AiOutlineClockCircle, AiOutlineCheckCircle, AiOutlineCloseCircle, AiOutlineInbox, AiOutlineSearch, AiOutlineFilter, AiOutlineFolderOpen, AiOutlineDownload } from "react-icons/ai";
import { useNavigate } from "react-router-dom";
import { apiClientApplication } from "../../api/utils/apiClientApplication.js";
import { useWebSocket } from "../../api/application/wsnotifications.js";
import AlertMessage from "../../components/general/AlertMessage.jsx";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import isBetween from 'dayjs/plugin/isBetween';
dayjs.extend(isBetween);

const { RangePicker } = DatePicker;

function ImagePreviewModal({ imageUrl, onClose }) {
    if (!imageUrl) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80" onClick={onClose}>
            <div
                className="relative bg-white rounded-2xl overflow-hidden animate-scaleIn max-w-4xl w-full mx-4"
                onClick={(e) => e.stopPropagation()}
            >
                <button className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/80 rounded-full w-10 h-10 flex items-center justify-center transition-colors" onClick={onClose}>
                    ×
                </button>
                <img
                    src={imageUrl}
                    alt="Предпросмотр"
                    className="w-full max-h-[80vh] object-contain"
                />
            </div>
        </div>
    );
}

function ApplicationDetailsModal({ application, onClose, onNavigate, onPreviewImage }) {
    if (!application) return null;

    const renderScan = (path, label) => {
        if (!path) {
            return (
                <div className="flex flex-col items-center justify-center bg-gray-50 border border-gray-100 rounded-2xl p-6 h-48">
                    <div className="text-gray-300 mb-2">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    </div>
                    <span className="text-sm text-gray-400">Нет файла</span>
                    <span className="text-xs text-gray-400 mt-4">{label}</span>
                </div>
            );
        }
        
        const backendUrl = import.meta.env.VITE_BACKEND_APPLICATION_URL;
        const fullUrl = `${backendUrl}/uploads/${path.replace(/\\/g, "/")}`;
        
        return (
            <div className="flex flex-col relative group">
                <div className="bg-gray-50 border border-gray-200 rounded-2xl h-48 overflow-hidden cursor-pointer relative" onClick={() => onPreviewImage(fullUrl)}>
                    <img src={fullUrl} alt={label} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <AiOutlineEye className="text-white opacity-0 group-hover:opacity-100 text-3xl" />
                    </div>
                </div>
                <div className="text-center mt-3 text-sm font-medium text-gray-500">{label}</div>
            </div>
        );
    };

    const statusLabel = application.application_status?.name || "Новая";
    let badgeBg = "bg-red-50 text-red-600";
    let dotColor = "bg-red-500";
    if (statusLabel.toLowerCase().includes("одобрен") && !statusLabel.toLowerCase().includes("не одобрен")) {
        badgeBg = "bg-green-50 text-green-600";
        dotColor = "bg-green-500";
    } else if (statusLabel.toLowerCase().includes("отказано") || statusLabel.toLowerCase().includes("не одобрен") || statusLabel.toLowerCase().includes("недостоверные")) {
        badgeBg = "bg-rose-100 text-rose-700";
        dotColor = "bg-rose-600";
    } else if (statusLabel.toLowerCase().includes("обработан") || statusLabel.toLowerCase().includes("проверк")) {
        badgeBg = "bg-yellow-50 text-yellow-600";
        dotColor = "bg-yellow-500";
    }

    const fullName = `${application.surname || ""} ${application.name || ""} ${application.patronymic || ""}`.trim();

    // Count uploaded scans
    let uploadedCount = 0;
    if (application.front_side_of_the_passport) uploadedCount++;
    if (application.back_side_of_the_passport) uploadedCount++;
    if (application.selfie_with_passport) uploadedCount++;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-3xl w-full max-w-3xl shadow-xl flex flex-col overflow-hidden animate-scaleIn" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="px-8 pt-8 pb-6 relative">
                    <button onClick={onClose} className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                        ×
                    </button>
                    <div className="flex items-center gap-4 mb-2">
                        <h2 className="text-2xl font-bold text-gray-900">Заявка #{application.ID}</h2>
                        <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${badgeBg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
                            {statusLabel}
                        </div>
                    </div>
                    <p className="text-gray-500 text-lg">{fullName}</p>
                </div>

                {/* Body */}
                <div className="px-8 pb-8 flex-1 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        <div className="bg-gray-50 rounded-2xl p-4 flex flex-col justify-center">
                            <span className="text-sm text-gray-500 flex items-center gap-2 mb-1"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg> Телефон</span>
                            <span className="font-semibold text-gray-900">{application.phone_number || "-"}</span>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-4 flex flex-col justify-center">
                            <span className="text-sm text-gray-500 flex items-center gap-2 mb-1"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg> Карта</span>
                            <span className="font-semibold text-gray-900">{application.card_name || "-"}</span>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-4 flex flex-col justify-center">
                            <span className="text-sm text-gray-500 flex items-center gap-2 mb-1"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> Адрес</span>
                            <span className="font-semibold text-gray-900">{application.delivery_address || "-"}</span>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-4 flex flex-col justify-center">
                            <span className="text-sm text-gray-500 flex items-center gap-2 mb-1"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> Офис получения</span>
                            <span className="font-semibold text-gray-900">{application.receiving_office || "-"}</span>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-4 flex flex-col justify-center">
                            <span className="text-sm text-gray-500 flex items-center gap-2 mb-1">ИНН</span>
                            <span className="font-semibold text-gray-900">{application.inn || "-"}</span>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-4 flex flex-col justify-center">
                            <span className="text-sm text-gray-500 flex items-center gap-2 mb-1">Канал (создатель)</span>
                            <span className="font-semibold text-gray-900">{application.request_сreator || "-"}</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">Сканы паспорта</h3>
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                            Загружено {uploadedCount} из 3
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {renderScan(application.front_side_of_the_passport, "Лицевая сторона")}
                        {renderScan(application.back_side_of_the_passport, "Задняя сторона")}
                        {renderScan(application.selfie_with_passport, "Скан с лицом")}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="px-8 py-5 border-t border-gray-100 bg-white flex items-center justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors">
                        Закрыть
                    </button>
                    <button onClick={() => { onClose(); onNavigate(application.ID); }} className="px-6 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors">
                        Перейти к заявке
                    </button>
                </div>
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
        resident: "",
    });
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [dateRange, setDateRange] = useState(null);
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

    const applyFilters = (data, currentFilters, search, dateRangeArray, statusId) => {
        if (!Array.isArray(data)) return [];

        return data.filter((row) => {
            const fullName = `${row?.surname || ""} ${row?.name || ""} ${row?.patronymic || ""}`.toLowerCase();
            
            const matchesText = !search ? true : (
                fullName?.includes(search?.toLowerCase()) ||
                row?.phone_number?.includes(search) ||
                row?.ID?.toString()?.includes(search) ||
                row?.card_name?.toLowerCase()?.includes(search?.toLowerCase())
            );

            const matchesStatus = !statusId ? true : (row?.application_status?.ID === Number(statusId) || row?.application_status_id === Number(statusId));

            let matchesDate = true;
            if (dateRangeArray && dateRangeArray.length === 2 && dateRangeArray[0] && dateRangeArray[1]) {
                const start = dateRangeArray[0].startOf('day');
                const end = dateRangeArray[1].endOf('day');
                const rowDate = dayjs(row.CreatedAt);
                matchesDate = rowDate.isBetween(start, end, null, '[]');
            }

            return matchesText && matchesStatus && matchesDate &&
                (!currentFilters?.resident ||
                    (currentFilters?.resident === "Да"
                        ? row?.is_resident
                        : !row?.is_resident));
        });
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

    const filteredData = applyFilters(tableData, filters, searchQuery, dateRange, data?.status);

    // Calculate Stats based on loaded data (since full stats API may not exist)
    const stats = {
        total: tableData.length,
        inProgress: tableData.filter(r => {
            const s = r.application_status?.name?.toLowerCase() || "";
            return s.includes("проверк") || s.includes("обработан");
        }).length,
        approved: tableData.filter(r => {
            const s = r.application_status?.name?.toLowerCase() || "";
            return s.includes("одобрен") && !s.includes("не одобрен");
        }).length,
        rejected: tableData.filter(r => {
            const s = r.application_status?.name?.toLowerCase() || "";
            return s.includes("отказано") || s.includes("не одобрен") || s.includes("недостоверные");
        }).length,
        new: tableData.filter(r => {
            const s = r.application_status?.name?.toLowerCase() || "";
            return !s.includes("проверк") && !s.includes("обработан") && !s.includes("одобрен") && !s.includes("отказано") && !s.includes("недостоверные");
        }).length,
    };

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
            <div className="applications-list bg-[#F8F9FB] min-h-screen p-6 font-sans">
                <main className="w-full space-y-6">
                    {alert.show && (
                        <AlertMessage
                            message={alert.message}
                            type={alert.type}
                            onClose={() => setAlert({ ...alert, show: false })}
                            duration={5000}
                        />
                    )}

                    {/* Stats Header */}
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-1">Заявки на карты</h1>
                        <p className="text-gray-500 mb-6">Обработка и проверка заявок клиентов на выпуск карт</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-700">
                                    <AiOutlineInbox size={24} />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                                    <div className="text-sm text-gray-500">Всего заявок</div>
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-yellow-50 flex items-center justify-center text-yellow-600">
                                    <AiOutlineClockCircle size={24} />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-gray-900">{stats.inProgress}</div>
                                    <div className="text-sm text-gray-500">На проверке</div>
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                                    <AiOutlineCheckCircle size={24} />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-gray-900">{stats.approved}</div>
                                    <div className="text-sm text-gray-500">Одобренные</div>
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                                    <AiOutlineCloseCircle size={24} />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-gray-900">{stats.rejected}</div>
                                    <div className="text-sm text-gray-500">Отклоненные</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Status Tabs */}
                    <div className="bg-white rounded-full p-2 shadow-sm border border-gray-100 flex items-center gap-2 overflow-x-auto whitespace-nowrap">
                        {[
                            { id: "", label: "Все", count: stats.total },
                            { id: "1", label: "Заявка принята", count: stats.new },
                            { id: "2", label: "Заявка обработана", count: stats.inProgress },
                            { id: "3", label: "Карта открыта" },
                            { id: "4", label: "Карта активирована" },
                            { id: "5", label: "Недостоверные данные", count: stats.rejected },
                            { id: "6", label: "Отказано в карте" },
                            { id: "7", label: "Не одобрено" },
                            { id: "8", label: "Одобрено", count: stats.approved },
                        ].map((tab) => {
                            const isActive = (data?.status || "") === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setData("status", tab.id)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                                        isActive ? "bg-red-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"
                                    }`}
                                >
                                    {tab.label}
                                    {tab.count !== undefined && (
                                        <span className={`px-2 py-0.5 rounded-full text-xs ${isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Controls Row */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-[300px]">
                            <div className="relative flex-1 max-w-sm">
                                <AiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                                <input
                                    type="text"
                                    placeholder="Поиск: ФИО, телефон, ID, карта"
                                    className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="max-w-xs bg-white rounded-2xl shadow-sm border border-gray-100">
                                <RangePicker 
                                    className="w-full h-[46px] border-none rounded-2xl px-4" 
                                    placeholder={['Дата от', 'Дата до']}
                                    value={dateRange}
                                    onChange={(dates) => setDateRange(dates)}
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                className="bg-white hover:bg-gray-50 text-gray-700 px-5 py-3 rounded-2xl shadow-sm border border-gray-100 font-medium transition-colors text-sm flex items-center gap-2"
                                onClick={() => setShowFilters(!showFilters)}
                            >
                                <AiOutlineFilter className="text-lg" /> Фильтры
                            </button>
                            <button
                                className={`px-5 py-3 rounded-2xl shadow-sm border border-gray-100 font-medium transition-colors text-sm flex items-center gap-2 ${archive ? "bg-gray-800 text-white border-gray-800" : "bg-white hover:bg-gray-50 text-gray-700"}`}
                                onClick={() => setArchive(!archive)}
                            >
                                <AiOutlineFolderOpen className="text-lg" /> Архив
                            </button>
                            <button
                                className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-2xl shadow-sm border border-red-600 font-medium transition-colors text-sm flex items-center gap-2"
                                onClick={handleExport}
                            >
                                <AiOutlineDownload className="text-lg" /> Выгрузка
                            </button>
                        </div>
                    </div>

                    {showFilters && (
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-slideIn">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium text-gray-500">Резидент</label>
                                    <div className="h-[42px]">
                                        <Select
                                            value={filters.resident}
                                            onChange={(val) => handleFilterChange("resident", val)}
                                            options={[
                                                { value: "", label: "Все" },
                                                { value: "Да", label: "Да" },
                                                { value: "Нет", label: "Нет" },
                                            ]}
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium text-gray-500">Показать записей</label>
                                    <Input
                                        type="number"
                                        placeholder="Кол-во записей"
                                        onChange={(e) => setData("limit", e)}
                                        value={data?.limit}
                                        id={"limit"}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Table */}
                    <div
                        className="my-applications-content bg-white rounded-2xl shadow-sm border border-gray-100 overflow-auto mb-6"
                        onScroll={scrollHandler}
                        style={{ position: "relative", maxHeight: "calc(100vh - 360px)" }}
                    >
                        {filteredData.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "4rem", color: "gray" }}>
                                {loading ? <Spinner /> : "Нет данных для отображения"}
                            </div>
                        ) : (
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-transparent border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 w-14">
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
                                        <th className="px-4 py-4 text-xs font-semibold tracking-wider text-gray-400 uppercase">ID</th>
                                        <th className="px-4 py-4 text-xs font-semibold tracking-wider text-gray-400 uppercase">КЛИЕНТ</th>
                                        <th className="px-4 py-4 text-xs font-semibold tracking-wider text-gray-400 uppercase">КАРТА</th>
                                        <th className="px-4 py-4 text-xs font-semibold tracking-wider text-gray-400 uppercase">ОФИС ПОЛУЧЕНИЯ</th>
                                        <th className="px-4 py-4 text-xs font-semibold tracking-wider text-gray-400 uppercase">СТАТУС</th>
                                        <th className="px-4 py-4 text-xs font-semibold tracking-wider text-gray-400 uppercase">ОПЕРАТОР</th>
                                        <th className="px-6 py-4 text-xs font-semibold tracking-wider text-gray-400 uppercase text-right">ДЕЙСТВИЯ</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {filteredData
                                        ?.slice(0, data?.limit || filteredData?.length)
                                        ?.map((row, index) => {
                                            const statusObj = row.application_status;
                                            const statusLabel = statusObj?.name || "Новая";
                                            let badgeBg = "bg-red-50";
                                            let badgeText = "text-red-600";
                                            let dotColor = "bg-red-500";

                                            if (statusLabel.toLowerCase().includes("одобрен") && !statusLabel.toLowerCase().includes("не одобрен")) {
                                              badgeBg = "bg-green-50";
                                              badgeText = "text-green-600";
                                              dotColor = "bg-green-500";
                                            } else if (statusLabel.toLowerCase().includes("отказано") || statusLabel.toLowerCase().includes("не одобрен") || statusLabel.toLowerCase().includes("недостоверные")) {
                                              badgeBg = "bg-rose-100";
                                              badgeText = "text-rose-700";
                                              dotColor = "bg-rose-600";
                                            } else if (statusLabel.toLowerCase().includes("обработан") || statusLabel.toLowerCase().includes("проверк")) {
                                              badgeBg = "bg-yellow-50";
                                              badgeText = "text-yellow-600";
                                              dotColor = "bg-yellow-500";
                                            }

                                            const initials = `${row.surname?.[0] || ""}${row.name?.[0] || ""}`.toUpperCase();
                                            const fullName = `${row.surname || ""} ${row.name || ""} ${row.patronymic || ""}`.trim();

                                            return (
                                                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors items-center h-20">
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
                                                    <td className="px-4 py-4 text-gray-500 font-medium">#{row.ID}</td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold shrink-0">
                                                                {initials || "КЛ"}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold text-gray-900">{fullName || "Не указано"}</span>
                                                                <span className="text-xs text-gray-400">{row.phone_number}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-sm text-gray-900 uppercase">{row.card_name || "Неизвестно"}</span>
                                                            <span className="text-xs text-gray-400 max-w-[180px] truncate" title={row.request_сreator || row.delivery_address}>{row.request_сreator || row.delivery_address || "-"}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-sm text-gray-700 whitespace-normal max-w-[180px]">
                                                        {row.receiving_office || "-"}
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${badgeBg} ${badgeText}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
                                                            {statusLabel}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-sm text-gray-700 whitespace-normal">
                                                        {row.operator_fio || "-"}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button 
                                                                onClick={() => setSelectedApplication(row)}
                                                                className="border border-gray-200 rounded-full px-4 py-2 text-xs font-medium text-gray-700 flex items-center gap-1.5 bg-white hover:bg-gray-50 transition-colors"
                                                            >
                                                                <AiOutlineEye size={16} />
                                                                Открыть
                                                            </button>
                                                            <button 
                                                                onClick={async () => {
                                                                    const username = localStorage.getItem("username");
                                                                    if (username) {
                                                                        try {
                                                                            await apiClientApplication.patch(
                                                                                `/applications/${row.ID}`,
                                                                                { operator_fio: username },
                                                                                { headers: getAuthHeaders() }
                                                                            );
                                                                        } catch (e) {
                                                                            console.error("Failed to update operator FIO:", e);
                                                                        }
                                                                    }
                                                                    navigate(`/agent/card/${row.ID}`);
                                                                }}
                                                                className="bg-red-600 rounded-full px-4 py-2 text-xs font-medium text-white flex items-center gap-1.5 hover:bg-red-700 transition-colors"
                                                            >
                                                                Перейти к заявке
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
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

            <ApplicationDetailsModal 
                application={selectedApplication} 
                onClose={() => setSelectedApplication(null)}
                onNavigate={async (id) => {
                    const username = localStorage.getItem("username");
                    if (username) {
                        try {
                            await apiClientApplication.patch(
                                `/applications/${id}`,
                                { operator_fio: username },
                                { headers: getAuthHeaders() }
                            );
                        } catch (e) {
                            console.error("Failed to update operator FIO:", e);
                        }
                    }
                    navigate(`/agent/card/${id}`);
                }}
                onPreviewImage={(url) => setPreviewImage(url)}
            />
            
            <ImagePreviewModal
                imageUrl={previewImage}
                onClose={() => setPreviewImage(null)}
            />
        </>
    );
}
