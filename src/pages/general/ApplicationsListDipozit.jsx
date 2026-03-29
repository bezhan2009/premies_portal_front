// ApplicationsListDipozit.jsx
import React, { useEffect, useState, useCallback } from "react";
import Input from "../../components/elements/Input";
import { useFormStore } from "../../hooks/useFormState";
import { status } from "../../const/defConst";
import Select from "../../components/elements/Select";
import Spinner from "../../components/Spinner.jsx";
import "../../styles/checkbox.scss";
import { AiFillDelete, AiFillEdit } from "react-icons/ai";
import { useNavigate } from "react-router-dom";
import { apiClientApplicationDipozit } from "../../api/utils/apiClientApplicationDipozit.js";

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
                <img src={imageUrl} alt="Предпросмотр" className="custom-modal-image" />
            </div>
        </div>
    );
}

export default function ApplicationsListDipozit() {
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
        client_code: "",
        type_of_deposit: "",
        accrued_account: "",
        withdraw_account: "",
        sum_of_deposit: "",
        deposit_currency: "",
        deposit_term_month: "",
    });
    const navigate = useNavigate();

    const fetchData = useCallback(
        async (afterId = null, reset = false) => {
            try {
                setLoading(true);
                const backendUrl = import.meta.env.VITE_BACKEND_APPLICATION_DIPOZIT_URL;
                let query = new URLSearchParams();

                if (afterId) query.append("after", afterId);
                if (data?.month) query.append("month", data?.month);
                if (data?.year) query.append("year", data?.year);
                if (data?.status && !selectedRows.length)
                    query.append("status_id", data?.status);

                const url = `${backendUrl}deposits${archive ? "/archive" : ""}${query.toString() ? `?${query.toString()}` : ""}`;
                const response = await fetch(url);
                const result = await response.json();

                if (reset) {
                    setTableData(result);
                } else {
                    setTableData((prev) => [...prev, ...result]);
                }

                setNextId(result?.[result?.length - 1]?.ID);
                setFetching(false);
            } catch (error) {
                console.error("Ошибка загрузки заявок:", error);
            } finally {
                setLoading(false);
                setFetching(false);
            }
        },
        [archive, data?.month, data?.year, data?.status, selectedRows.length]
    );

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const applyFilters = (dataArr) => {
        if (!Array.isArray(dataArr)) return [];
        return dataArr.filter((row) => {
            return Object.entries(filters).every(([key, value]) => {
                if (!value) return true;
                const rowValue = row[key];
                if (rowValue == null) return false;
                return String(rowValue).toLowerCase().includes(String(value).toLowerCase());
            });
        });
    };

    const deleteApplication = async (id) => {
        const confirmDelete = window.confirm("Вы уверены, что хотите удалить?");
        if (!confirmDelete) return;
        try {
            await apiClientApplicationDipozit.delete(`/deposits/${id}`);
            fetchData(null, true);
        } catch (e) {
            console.error(e);
        }
    };

    const handleExport = async () => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const token = localStorage.getItem("access_token");
            const response = await fetch(`${backendUrl}/automation/deposits`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ deposits_ids: selectedRows }),
            });
            if (!response.ok) throw new Error("Ошибка при получении файла");
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "Отчет_депозитов.xlsx";
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
        if (!fetching && !loading && nextId !== undefined) {
            if (target.scrollHeight - (target.scrollTop + target.clientHeight) < 1) {
                setFetching(true);
            }
        }
    };

    const filteredData = applyFilters(tableData);

    useEffect(() => {
        fetchData(null, true);
    }, [archive, fetchData]);

    useEffect(() => {
        fetchData(null, true);
    }, [data?.month, data?.year, data?.status, fetchData]);

    useEffect(() => {
        if (selectAll) {
            setSelectedRows(filteredData.map((item) => item.ID));
        } else {
            setSelectedRows([]);
        }
    }, [selectAll, filteredData]);

    useEffect(() => {
        if (fetching && nextId !== undefined && !loading) {
            fetchData(nextId);
        }
    }, [fetching, nextId, fetchData, loading]);

    useEffect(() => {
        if (data.month || data.month === "") localStorage.setItem("month", data.month);
        if (data.year || data.year === "") localStorage.setItem("year", data.year);
    }, [data]);

    useEffect(() => {
        const savedMonth = localStorage.getItem("month");
        const savedYear = localStorage.getItem("year");
        if (savedMonth) setData("month", savedMonth);
        if (savedYear) setData("year", savedYear);
    }, [setData]);

    const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    return (
        <>
            <div className="applications-list content-page">
                <main>
                    <div className="my-applications-header">
                        <Select
                            id="status"
                            value={data?.status}
                            onChange={(val) => setData("status", val)}
                            options={status}
                            error={errors}
                            style={{ width: "200px" }}
                        />
                        <button className="Unloading" onClick={handleExport}>
                            Выгрузка
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
                            onClick={() => setSelectAll(!selectAll)}
                        >
                            Выбрать все
                        </button>
                    </div>

                    {showFilters && (
                        <div className="filters animate-slideIn">
                            <input
                                placeholder="Код клиента"
                                onChange={(e) => handleFilterChange("client_code", e.target.value)}
                            />
                            <input
                                placeholder="Тип депозита"
                                onChange={(e) => handleFilterChange("type_of_deposit", e.target.value)}
                            />
                            <input
                                placeholder="Начисленный счет"
                                onChange={(e) => handleFilterChange("accrued_account", e.target.value)}
                            />
                            <input
                                placeholder="Выводный счет"
                                onChange={(e) => handleFilterChange("withdraw_account", e.target.value)}
                            />
                            <input
                                placeholder="Сумма"
                                onChange={(e) => handleFilterChange("sum_of_deposit", e.target.value)}
                            />
                            <input
                                placeholder="Валюта"
                                onChange={(e) => handleFilterChange("deposit_currency", e.target.value)}
                            />
                            <input
                                placeholder="Месяцы"
                                onChange={(e) => handleFilterChange("deposit_term_month", e.target.value)}
                            />
                        </div>
                    )}

                    <div className="my-applications-sub-header">
                        <div>
                            Поиск по месяцам
                            <Input
                                type="number"
                                onChange={(e) => setData("month", e)}
                                value={data?.month || ""}
                                id="month"
                            />
                        </div>
                        <div>
                            Поиск по годам
                            <Input
                                type="number"
                                onChange={(e) => setData("year", e)}
                                value={data?.year || ""}
                                id="year"
                            />
                        </div>
                        <div>
                            Показать
                            <Input
                                type="number"
                                onChange={(e) => setData("limit", e)}
                                value={data?.limit || ""}
                                id="limit"
                            />
                            записей
                        </div>
                    </div>

                    <div
                        className="my-applications-content"
                        onScroll={scrollHandler}
                        style={{ position: "relative", maxHeight: "70vh", overflowY: "auto" }}
                    >
                        {loading && filteredData.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "2rem" }}>
                                <Spinner />
                            </div>
                        ) : filteredData.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "2rem", color: "gray" }}>
                                Нет данных для отображения
                            </div>
                        ) : (
                            <table className="sort-table">
                                <thead>
                                <tr>
                                    <th>Выбрать</th>
                                    <th>ID</th>
                                    <th>Код клиента</th>
                                    <th>Тип депозита</th>
                                    <th>Начисленный счет</th>
                                    <th>Выводный счет</th>
                                    <th>Сумма</th>
                                    <th>Валюта</th>
                                    <th>Месяцы</th>
                                    <th>Дата создания</th>
                                    <th>Дата обновления</th>
                                    <th>Действия</th>
                                </tr>
                                </thead>
                                <tbody>
                                {filteredData.slice(0, data?.limit || filteredData.length).map((row) => (
                                    <tr key={row.ID}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                className="custom-checkbox"
                                                checked={selectedRows.includes(row.ID)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedRows([...selectedRows, row.ID]);
                                                    } else {
                                                        setSelectedRows(selectedRows.filter((id) => id !== row.ID));
                                                    }
                                                }}
                                            />
                                        </td>
                                        <td>{row.ID}</td>
                                        <td>{row.client_code || "—"}</td>
                                        <td>{row.type_of_deposit || "—"}</td>
                                        <td>{row.accrued_account || "—"}</td>
                                        <td>{row.withdraw_account || "—"}</td>
                                        <td>{row.sum_of_deposit || "—"}</td>
                                        <td>{row.deposit_currency || "—"}</td>
                                        <td>{row.deposit_term_month || "—"}</td>
                                        <td>{formatDate(row.CreatedAt)}</td>
                                        <td>{formatDate(row.UpdatedAt)}</td>
                                        <td className="active-table">
                                            <AiFillEdit
                                                onClick={() => navigate(`/agent/dipozit/card/${row.ID}`)}
                                                style={{ fontSize: 35, color: "green", cursor: "pointer", marginBottom: "10px" }}
                                            />
                                            <AiFillDelete
                                                onClick={() => deleteApplication(row.ID)}
                                                style={{ fontSize: 35, color: "#c31414", cursor: "pointer" }}
                                            />
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </main>
            </div>

            <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />
        </>
    );
}
