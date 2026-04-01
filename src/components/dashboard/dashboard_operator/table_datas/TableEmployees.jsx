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

const mapWorker = (w) => {
    if (!w) return null;

    return {
        ID:         w.ID ?? w.id,
        fio:        w.user?.full_name || "",
        login:      w.user?.username || "",
        position:   w.position || "",
        place_work: w.place_work || "",
        salary:     w.salary ?? "",
        group:      formatRoles(w.user?.roles),
        plan:       w.plan ?? "",
        salary_project: w.salary_project ?? "",
        user_id:    w.user_id,
    };
};

const EmployeesTable = () => {
    const backendURL = import.meta.env.VITE_BACKEND_URL;

    const [employees, setEmployees] = useState([]);
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [edit, setEdit] = useState(null);
    const [openRoles, setOpenRoles] = useState({ data: null, open: false });

    const { exportToExcel } = useExcelExport();
    const { items: sortedEmployees, requestSort, sortConfig } = useTableSort(filteredEmployees);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const url = `${backendURL}/workers`;
            const response = await apiClient(url);

            const raw = response?.data?.workers ?? response?.data ?? [];

            const rows = Array.isArray(raw)
                ? raw.map(mapWorker).filter(Boolean) // 🔥 убрали null
                : [];

            setEmployees(rows);
            setFilteredEmployees(rows);
        } catch (e) {
            console.error("Ошибка загрузки сотрудников:", e);
            setEmployees([]);
            setFilteredEmployees([]);
        } finally {
            setLoading(false);
        }
    }, [backendURL]);

    useEffect(() => { loadData(); }, [loadData]);

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
        if (!row) return;
        if (edit?.ID === row.ID) { e.stopPropagation(); return; }
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
        exportToExcel(sortedEmployees, columns, "Сотрудники");
    };

    return (
        <div className="report-table-container">

            <div className="table-header-actions" style={{ flexWrap: "wrap", gap: 10 }}>
                <SearchBar
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

            {loading ? (
                <Spinner />
            ) : sortedEmployees.length > 0 ? (
                <div className="table-reports-div" style={{ maxHeight: "calc(100vh - 480px)" }}>
                    <table className="table-reports">
                        <thead>
                        <tr>
                            {[
                                ["fio", "ФИО"],
                                ["login", "Логин"],
                                ["position", "Должность"],
                                ["place_work", "Место работы"],
                                ["salary", "Оклад"],
                                ["plan", "План"],
                                ["salary_project", "Зарплатный проект"],
                                ["group", "Группа продаж"],
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
                            if (!row) return null; // 🔥 защита

                            const isEditing = edit?.ID === row.ID;

                            return (
                                <tr key={idx}>
                                    <td onClick={(e) => handleCellClick(row, e)}>
                                        {isEditing ? (
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <Input type="text" value={edit.fio}
                                                       onChange={(v) => handleChange("fio", v)}
                                                       onEnter={saveChange} />
                                            </div>
                                        ) : row.fio || "—"}
                                    </td>

                                    <td onClick={(e) => handleCellClick(row, e)}>
                                        {isEditing ? (
                                            <Input type="text" value={edit.login}
                                                   onChange={(v) => handleChange("login", v)}
                                                   onEnter={saveChange} />
                                        ) : row.login || "—"}
                                    </td>

                                    <td onClick={(e) => handleCellClick(row, e)}>
                                        {isEditing ? (
                                            <Input type="text" value={edit.position}
                                                   onChange={(v) => handleChange("position", v)}
                                                   onEnter={saveChange} />
                                        ) : row.position || "—"}
                                    </td>

                                    <td onClick={(e) => handleCellClick(row, e)}>
                                        {isEditing ? (
                                            <Input type="text" value={edit.place_work}
                                                   onChange={(v) => handleChange("place_work", v)}
                                                   onEnter={saveChange} />
                                        ) : row.place_work || "—"}
                                    </td>

                                    <td onClick={(e) => handleCellClick(row, e)}>
                                        {isEditing ? (
                                            <Input type="number" value={edit.salary}
                                                   onChange={(v) => handleChange("salary", v)}
                                                   onEnter={saveChange} />
                                        ) : row.salary !== "" ? row.salary : "—"}
                                    </td>

                                    <td onClick={(e) => handleCellClick(row, e)}>
                                        {isEditing ? (
                                            <Input type="number" value={edit.plan}
                                                   onChange={(v) => handleChange("plan", v)}
                                                   onEnter={saveChange} />
                                        ) : row.plan || "—"}
                                    </td>

                                    <td onClick={(e) => handleCellClick(row, e)}>
                                        {isEditing ? (
                                            <Input type="number" value={edit.salary_project}
                                                   onChange={(v) => handleChange("salary_project", v)}
                                                   onEnter={saveChange} />
                                        ) : row.salary_project || "—"}
                                    </td>

                                    <td onClick={(e) => handleCellClick(row, e)}>
                                        {isEditing ? (
                                            <Input type="text" value={edit.group}
                                                   onChange={(v) => handleChange("group", v)}
                                                   onEnter={saveChange} />
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

export default EmployeesTable;
