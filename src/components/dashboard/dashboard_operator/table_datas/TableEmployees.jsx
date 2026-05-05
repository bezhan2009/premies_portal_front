import { useCallback, useEffect, useState, useRef } from "react";
import "../../../../styles/components/Table.scss";
import SearchBar from "../../../general/SearchBar.jsx";
import Input from "../../../elements/Input.jsx";
import { Table } from "../../../table/FlexibleAntTable.jsx";
import { fullUpdateWorkers } from "../../../../api/workers/fullUpdateWorkers.js";
import { useExcelExport } from "../../../../hooks/useExcelExport.js";
import { apiClient } from "../../../../api/utils/apiClient.js";

const PAGE_SIZE = 10; // Количество записей на одну загрузку

const formatRoles = (roles) => {
    if (!Array.isArray(roles)) {
        return "";
    }

    return roles
        .map((role) => {
            if (typeof role === "string") {
                return role;
            }

            return role?.Name || role?.name || "";
        })
        .filter(Boolean)
        .join(", ");
};

const mapWorker = (worker) => {
    if (!worker) {
        return null;
    }

    return {
        ID: worker.ID ?? worker.id,
        fio: worker.user?.full_name || "",
        login: worker.user?.username || "",
        position: worker.position || "",
        place_work: worker.place_work || "",
        salary: worker.salary ?? "",
        group: formatRoles(worker.user?.roles),
        plan: worker.plan ?? "",
        salary_project: worker.salary_project ?? "",
        user_id: worker.user_id,
    };
};

const EmployeesTable = () => {
    const backendURL = import.meta.env.VITE_BACKEND_URL;

    const [employees, setEmployees] = useState([]);
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [lastId, setLastId] = useState(null); // after для следующего запроса
    const [edit, setEdit] = useState(null);
    const searchBarRef = useRef(null);

    const { exportToExcel } = useExcelExport();

    // Функция загрузки данных (первая или последующие)
    const fetchWorkers = useCallback(async (after = null, isLoadMore = false) => {
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

            const url = `${backendURL}/workers?${params.toString()}`;
            const response = await apiClient(url);
            let rawWorkers = response?.data?.workers ?? response?.data ?? [];

            if (!Array.isArray(rawWorkers)) {
                rawWorkers = [];
            }

            const rows = rawWorkers.map(mapWorker).filter(Boolean);

            // Определяем, есть ли ещё данные
            const more = rows.length === PAGE_SIZE;

            if (isLoadMore) {
                setEmployees(prev => [...prev, ...rows]);
                setFilteredEmployees(prev => [...prev, ...rows]);
            } else {
                setEmployees(rows);
                setFilteredEmployees(rows);
            }

            setHasMore(more);

            // Обновляем lastId (последний ID из загруженной порции)
            if (rows.length > 0) {
                const newLastId = rows[rows.length - 1].ID;
                setLastId(newLastId);
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error("Ошибка загрузки сотрудников:", error);
            if (!isLoadMore) {
                setEmployees([]);
                setFilteredEmployees([]);
            }
            setHasMore(false);
        } finally {
            if (isLoadMore) {
                setLoadingMore(false);
            } else {
                setLoading(false);
            }
        }
    }, [backendURL]);

    // Первоначальная загрузка
    const loadData = useCallback(() => {
        setLastId(null);
        setHasMore(true);
        setEmployees([]);
        setFilteredEmployees([]);
        return fetchWorkers(null, false);
    }, [fetchWorkers]);

    // Загрузка следующей страницы
    const loadMore = useCallback(() => {
        if (!hasMore || loadingMore || loading) return;
        fetchWorkers(lastId, true);
    }, [hasMore, loadingMore, loading, lastId, fetchWorkers]);

    // Сброс и перезагрузка после редактирования
    const refreshData = useCallback(async () => {
        await loadData();
    }, [loadData]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleChange = (key, value) => {
        setEdit((previous) => ({ ...previous, [key]: value }));
    };

    const saveChange = async () => {
        try {
            await fullUpdateWorkers({ ...edit, fio: edit.fio.trim() });
            await refreshData();
            setEdit(null);
        } catch (error) {
            console.error(error);
        }
    };

    const handleCellClick = (row) => {
        if (!row || edit?.ID === row.ID) {
            return;
        }
        setEdit(row);
    };

    const handleExport = () => {
        const columns = [
            { key: "fio", label: "ФИО" },
            { key: "login", label: "Логин" },
            { key: "position", label: "Должность" },
            { key: "place_work", label: "Место работы" },
            { key: "salary", label: "Оклад" },
            { key: "plan", label: "План" },
            { key: "salary_project", label: "Зарплатный проект" },
            { key: "group", label: "Группа продаж" },
        ];

        exportToExcel(filteredEmployees, columns, "Сотрудники");
    };

    const renderEditableCell = (record, field, type = "text") => {
        const isEditing = edit?.ID === record.ID;

        if (isEditing) {
            return (
                <div onClick={(event) => event.stopPropagation()}>
                    <Input
                        type={type}
                        value={edit?.[field] ?? ""}
                        onChange={(value) => handleChange(field, value)}
                        onEnter={saveChange}
                    />
                </div>
            );
        }

        return (
            <div
                onClick={() => handleCellClick(record)}
                style={{ cursor: "pointer" }}
            >
                {record[field] !== "" && record[field] !== null && record[field] !== undefined
                    ? record[field]
                    : "—"}
            </div>
        );
    };

    return (
        <div className="report-table-container">
            <div className="table-header-actions" style={{ flexWrap: "wrap", gap: 10 }}>
                <SearchBar
                    key={employees.length} // Пересоздаём SearchBar при изменении списка, чтобы перефильтровать
                    allData={employees}
                    onSearch={(filtered) => setFilteredEmployees(filtered || [])}
                    placeholder="Поиск по ФИО, логину, должности..."
                    searchFields={[
                        (item) => item?.fio || "",
                        (item) => item?.login || "",
                        (item) => item?.position || "",
                        (item) => item?.place_work || "",
                    ]}
                />

                <button className="export-excel-btn" onClick={handleExport}>
                    Экспорт в Excel
                </button>
            </div>

            <Table
                tableId="operator-employees-table"
                dataSource={filteredEmployees}
                rowKey={(record) => record.ID}
                loading={loading}
                bordered
                pagination={false} // Отключаем встроенную пагинацию, используем свою
                scroll={{ x: "max-content", y: "calc(100vh - 250px)" }}
                locale={{ emptyText: "Нет данных" }}
            >
                <Table.Column
                    title="ФИО"
                    dataIndex="fio"
                    key="fio"
                    render={(_, record) => renderEditableCell(record, "fio")}
                />
                <Table.Column
                    title="Логин"
                    dataIndex="login"
                    key="login"
                    render={(_, record) => renderEditableCell(record, "login")}
                />
                <Table.Column
                    title="Должность"
                    dataIndex="position"
                    key="position"
                    render={(_, record) => renderEditableCell(record, "position")}
                />
                <Table.Column
                    title="Место работы"
                    dataIndex="place_work"
                    key="place_work"
                    render={(_, record) => renderEditableCell(record, "place_work")}
                />
                <Table.Column
                    title="Оклад"
                    dataIndex="salary"
                    key="salary"
                    render={(_, record) => renderEditableCell(record, "salary", "number")}
                />
                <Table.Column
                    title="План"
                    dataIndex="plan"
                    key="plan"
                    render={(_, record) => renderEditableCell(record, "plan", "number")}
                />
                <Table.Column
                    title="Зарплатный проект"
                    dataIndex="salary_project"
                    key="salary_project"
                    render={(_, record) =>
                        renderEditableCell(record, "salary_project", "number")
                    }
                />
                <Table.Column
                    title="Группа продаж"
                    dataIndex="group"
                    key="group"
                    render={(_, record) => renderEditableCell(record, "group")}
                />
            </Table>

            {hasMore && (
                <div style={{ textAlign: "center", marginTop: 16 }}>
                    <button
                        onClick={loadMore}
                        disabled={loadingMore || loading}
                        className="load-more-btn"
                        style={{
                            padding: "8px 16px",
                            background: loadingMore ? "#f5f5f5" : "#1890ff",
                            color: loadingMore ? "#aaa" : "#fff",
                            border: "none",
                            borderRadius: 4,
                            cursor: loadingMore ? "not-allowed" : "pointer",
                        }}
                    >
                        {loadingMore ? "Загрузка..." : "Загрузить ещё"}
                    </button>
                </div>
            )}
        </div>
    );
};

export default EmployeesTable;
