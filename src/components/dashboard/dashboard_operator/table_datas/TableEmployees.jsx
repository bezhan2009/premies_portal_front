import { useEffect, useState, useCallback } from "react";
import "../../../../styles/components/Table.scss";
import Spinner from "../../../Spinner.jsx";
import SearchBar from "../../../general/SearchBar.jsx";
import Input from "../../../elements/Input.jsx";
import { fullUpdateWorkers } from "../../../../api/workers/fullUpdateWorkers.js";
import ModalRoles from "../../../modal/ModalRoles.jsx";
import { useExcelExport } from "../../../../hooks/useExcelExport.js";
import { useTableSort } from "../../../../hooks/useTableSort.js";
import SortIcon from "../../../../components/general/SortIcon.jsx";
import { apiClient } from "../../../../api/utils/apiClient.js";

const formatRoles = (roles) => {
    if (!Array.isArray(roles)) return "";
    return roles
        .map((role) => {
            if (typeof role === "string") return role;
            return role?.Name || role?.name || "";
        })
        .filter(Boolean)
        .join(", ");
};

// ── map WorkerResponse DTO → flat row ─────────────────────────────────────────
const mapWorker = (w) => ({
    ID:         w.id,
    fio:        w.user?.full_name  || "",
    login:      w.user?.username   || w.user?.Username || "",
    position:   w.position         || "",
    place_work: w.place_work       || "",
    salary:     w.salary           ?? "",
    group:      formatRoles(w.user?.roles),
    plan:           w.plan            ?? "",
    salary_project: w.salary_project  ?? "",
    user_id:        w.user_id,
});

const EmployeesTable = () => {
    const backendURL = import.meta.env.VITE_BACKEND_URL;

    const now = new Date();
    const [month, setMonth]       = useState(now.getMonth() + 1);
    const [year, setYear]         = useState(now.getFullYear());

    const [employees, setEmployees]             = useState([]);
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [loading, setLoading]                 = useState(true);
    const [edit, setEdit]                       = useState(null);
    const [openRoles, setOpenRoles]             = useState({ data: null, open: false });

    const { exportToExcel }                         = useExcelExport();
    const { items: sortedEmployees, requestSort, sortConfig } = useTableSort(filteredEmployees);

    // ── fetch ──────────────────────────────────────────────────────────────────
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const url = `${backendURL}/workers?month=${month}&year=${year}`;
            const response = await apiClient(url);

            // бэк возвращает { workers: [...] }
            const raw = response?.data?.workers ?? response?.data ?? [];
            const rows = Array.isArray(raw) ? raw.map(mapWorker) : [];

            setEmployees(rows);
            setFilteredEmployees(rows);
        } catch (e) {
            console.error("Ошибка загрузки сотрудников:", e);
            setEmployees([]);
            setFilteredEmployees([]);
        } finally {
            setLoading(false);
        }
    }, [backendURL, month, year]);

    useEffect(() => { loadData(); }, [loadData]);

    // ── edit helpers ───────────────────────────────────────────────────────────
    const handleChange = (key, value) =>
        setEdit((prev) => ({ ...prev, [key]: value }));

    const saveChange = async () => {
        try {
            await fullUpdateWorkers({ ...edit, fio: edit.fio.trim() });
            await loadData();
            setEdit(null);
        } catch (e) {
            console.error(e);
        }
    };

    const handleCellClick = (row, e) => {
        if (edit?.ID === row.ID) { e.stopPropagation(); return; }
        setEdit(row);
    };

    // ── export ─────────────────────────────────────────────────────────────────
    const handleExport = () => {
        const columns = [
            { key: "fio",            label: "ФИО" },
            { key: "login",          label: "Логин" },
            { key: "position",       label: "Должность" },
            { key: "place_work",     label: "Место работы" },
            { key: "salary",         label: "Оклад" },
            { key: "plan",           label: "План" },
            { key: "salary_project", label: "Зарплатный проект" },
            { key: "group",          label: "Группа продаж" },
        ];
        exportToExcel(sortedEmployees, columns, "Сотрудники");
    };

    // ── months for selector ───────────────────────────────────────────────────
    const months = [
        { value: 1,  label: "Январь" },  { value: 2,  label: "Февраль" },
        { value: 3,  label: "Март" },    { value: 4,  label: "Апрель" },
        { value: 5,  label: "Май" },     { value: 6,  label: "Июнь" },
        { value: 7,  label: "Июль" },    { value: 8,  label: "Август" },
        { value: 9,  label: "Сентябрь"},{ value: 10, label: "Октябрь" },
        { value: 11, label: "Ноябрь" }, { value: 12, label: "Декабрь" },
    ];

    // ── render ─────────────────────────────────────────────────────────────────
    return (
        <div className="report-table-container">

            {/* ── Header ── */}
            <div className="table-header-actions" style={{ flexWrap: "wrap", gap: 10 }}>
                <SearchBar
                    allData={employees}
                    onSearch={(filtered) => setFilteredEmployees(filtered || [])}
                    placeholder="Поиск по ФИО, логину, должности..."
                    searchFields={[
                        (item) => item.fio       || "",
                        (item) => item.login     || "",
                        (item) => item.position  || "",
                        (item) => item.place_work|| "",
                    ]}
                />

                {/* Period selectors */}
                <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    style={selectorStyle}
                >
                    {months.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                </select>

                <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    style={selectorStyle}
                >
                    {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>

                <button className="export-excel-btn" onClick={handleExport}>
                    Экспорт в Excel
                </button>
            </div>

            {/* ── Table ── */}
            {loading ? (
                <Spinner />
            ) : sortedEmployees.length > 0 ? (
                <div className="table-reports-div" style={{ maxHeight: "calc(100vh - 480px)" }}>
                    <table className="table-reports">
                        <thead>
                        <tr>
                            {[
                                ["fio",            "ФИО"],
                                ["login",          "Логин"],
                                ["position",       "Должность"],
                                ["place_work",     "Место работы"],
                                ["salary",         "Оклад"],
                                ["plan",           "План"],
                                ["salary_project", "Зарплатный проект"],
                                ["group",          "Группа продаж"],
                            ].map(([key, label]) => (
                                <th
                                    key={key}
                                    onClick={() => requestSort(key)}
                                    className="sortable-header"
                                >
                                    {label} <SortIcon sortConfig={sortConfig} sortKey={key} />
                                </th>
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        {sortedEmployees.map((row, idx) => {
                            const isEditing = edit?.ID === row.ID;
                            return (
                                <tr key={idx}>
                                    {/* ФИО */}
                                    <td onClick={(e) => handleCellClick(row, e)}>
                                        {isEditing ? (
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <Input type="text" value={edit.fio}
                                                       onChange={(v) => handleChange("fio", v)}
                                                       onEnter={saveChange} />
                                            </div>
                                        ) : row.fio || "—"}
                                    </td>

                                    {/* Логин */}
                                    <td onClick={(e) => handleCellClick(row, e)}>
                                        {isEditing ? (
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <Input type="text" value={edit.login}
                                                       onChange={(v) => handleChange("login", v)}
                                                       onEnter={saveChange} />
                                            </div>
                                        ) : row.login || "—"}
                                    </td>

                                    {/* Должность */}
                                    <td onClick={(e) => handleCellClick(row, e)}>
                                        {isEditing ? (
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <Input type="text" value={edit.position}
                                                       onChange={(v) => handleChange("position", v)}
                                                       onEnter={saveChange} />
                                            </div>
                                        ) : row.position || "—"}
                                    </td>

                                    {/* Место работы */}
                                    <td onClick={(e) => handleCellClick(row, e)}>
                                        {isEditing ? (
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <Input type="text" value={edit.place_work}
                                                       onChange={(v) => handleChange("place_work", v)}
                                                       onEnter={saveChange} />
                                            </div>
                                        ) : row.place_work || "—"}
                                    </td>

                                    {/* Оклад */}
                                    <td onClick={(e) => handleCellClick(row, e)}>
                                        {isEditing ? (
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <Input type="number" value={edit.salary}
                                                       onChange={(v) => handleChange("salary", v)}
                                                       onEnter={saveChange} />
                                            </div>
                                        ) : row.salary !== "" ? row.salary : "—"}
                                    </td>

                                    {/* План */}
                                    <td onClick={(e) => handleCellClick(row, e)}>
                                        {isEditing ? (
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <Input type="number" value={edit.plan}
                                                       onChange={(v) => handleChange("plan", v)}
                                                       onEnter={saveChange} />
                                            </div>
                                        ) : row.plan || "—"}
                                    </td>

                                    {/* Зарплатный проект */}
                                    <td onClick={(e) => handleCellClick(row, e)}>
                                        {isEditing ? (
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <Input type="number" value={edit.salary_project}
                                                       onChange={(v) => handleChange("salary_project", v)}
                                                       onEnter={saveChange} />
                                            </div>
                                        ) : row.salary_project || "—"}
                                    </td>

                                    {/* Группа продаж */}
                                    <td onClick={(e) => handleCellClick(row, e)}>
                                        {isEditing ? (
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <Input type="text" value={edit.group}
                                                       onChange={(v) => handleChange("group", v)}
                                                       onEnter={saveChange} />
                                            </div>
                                        ) : row.group || "—"}
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <h2>Нет данных</h2>
            )}

            <ModalRoles
                open={openRoles.open}
                data={openRoles.data}
                setOpenRoles={setOpenRoles}
            />
        </div>
    );
};

const selectorStyle = {
    padding: "6px 10px",
    borderRadius: "8px",
    border: "1px solid #ced4da",
    fontSize: "14px",
    cursor: "pointer",
};

export default EmployeesTable;
