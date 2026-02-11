import { useEffect, useState } from "react";
import "../../../../styles/components/Table.scss";
import Spinner from "../../../Spinner.jsx";
import SearchBar from "../../../general/SearchBar.jsx";
import { fetchOffices } from "../../../../api/offices/all_offices.js";
import Input from "../../../elements/Input.jsx";
import { fullUpdateWorkers } from "../../../../api/workers/fullUpdateWorkers.js";
import ModalRoles from "../../../modal/ModalRoles.jsx";
import { useExcelExport } from "../../../../hooks/useExcelExport.js";
import { useTableSort } from "../../../../hooks/useTableSort.js";
import SortIcon from "../../../general/SortIcon.jsx";
import Select from "../../../elements/Select.jsx";

const EmployeesTable = () => {
    const [employees, setEmployees] = useState([]);
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [edit, setEdit] = useState(null);
    const [allOffices, setAllOffices] = useState([]);
    const [openRoles, setOpenRoles] = useState({ data: null, open: false });
    const { exportToExcel } = useExcelExport();

    const {
        items: sortedEmployees,
        requestSort,
        sortConfig,
    } = useTableSort(filteredEmployees);

    const loadData = async () => {
        setLoading(true);
        try {
            const offices = await fetchOffices();
            setAllOffices(offices || []);
            const users = [];
            offices.forEach((office) => {
                if (office.office_user && office.office_user.length > 0) {
                    office.office_user.forEach((u) => {
                        users.push({
                            ID: u.worker.user.ID,
                            officeTitle: office.title,
                            fio: u.worker?.user?.full_name || "",
                            login: u.worker?.user?.username || "",
                            position: u.worker?.position || "",
                            place_work: u.worker?.place_work || "",
                            salary: u.worker?.Salary || "",
                            group:
                                u.worker?.user?.roles?.map((role) => role.Name).join(", ") ||
                                "",
                        });
                    });
                }
            });
            setEmployees(users);
            setFilteredEmployees(users);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleChange = (key, value) => {
        setEdit((prev) => ({ ...prev, [key]: value }));
    };

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
        // Не активируем редактирование если уже редактируем эту строку
        if (edit?.ID === row.ID) {
            e.stopPropagation();
            return;
        }
        setEdit(row);
    };

    const handleSearch = (filtered) => {
        setFilteredEmployees(filtered || []);
    };

    const handleExport = () => {
        const columns = [
            { key: "officeTitle", label: "Название офиса" },
            { key: "fio", label: "ФИО" },
            { key: "login", label: "Логин" },
            { key: "position", label: "Должность" },
            { key: "place_work", label: "Место работы" },
            { key: "salary", label: "Оклад" },
            { key: "group", label: "Группа продаж" },
        ];
        exportToExcel(sortedEmployees, columns, "Сотрудники");
    };

    return (
        <div className="report-table-container">
            <div className="table-header-actions">
                <SearchBar
                    allData={employees}
                    onSearch={handleSearch}
                    placeholder="Поиск по ФИО или названию офиса..."
                    searchFields={[
                        (item) => item.fio || "",
                        (item) => item.officeTitle || "",
                    ]}
                />
                <button className="export-excel-btn" onClick={handleExport}>
                    Экспорт в Excel
                </button>
            </div>
            {loading ? (
                <Spinner />
            ) : (
                <>
                    {filteredEmployees && filteredEmployees.length > 0 ? (
                        <div
                            className="table-reports-div"
                            style={{ maxHeight: " calc(100vh - 480px)" }}
                        >
                            <table className="table-reports">
                                <thead>
                                <tr>
                                    <th
                                        onClick={() => requestSort("officeTitle")}
                                        className="sortable-header"
                                    >
                                        Название офиса{" "}
                                        <SortIcon sortConfig={sortConfig} sortKey="officeTitle" />
                                    </th>
                                    <th
                                        onClick={() => requestSort("fio")}
                                        className="sortable-header"
                                    >
                                        ФИО <SortIcon sortConfig={sortConfig} sortKey="fio" />
                                    </th>
                                    <th
                                        onClick={() => requestSort("login")}
                                        className="sortable-header"
                                    >
                                        Логин <SortIcon sortConfig={sortConfig} sortKey="login" />
                                    </th>
                                    <th
                                        onClick={() => requestSort("position")}
                                        className="sortable-header"
                                    >
                                        Должность{" "}
                                        <SortIcon sortConfig={sortConfig} sortKey="position" />
                                    </th>
                                    <th
                                        onClick={() => requestSort("place_work")}
                                        className="sortable-header"
                                    >
                                        Место работы{" "}
                                        <SortIcon sortConfig={sortConfig} sortKey="place_work" />
                                    </th>
                                    <th
                                        onClick={() => requestSort("salary")}
                                        className="sortable-header"
                                    >
                                        Оклад{" "}
                                        <SortIcon sortConfig={sortConfig} sortKey="salary" />
                                    </th>
                                    <th
                                        onClick={() => requestSort("group")}
                                        className="sortable-header"
                                    >
                                        Группа продаж{" "}
                                        <SortIcon sortConfig={sortConfig} sortKey="group" />
                                    </th>
                                </tr>
                                </thead>
                                <tbody>
                                {sortedEmployees.map((row, idx) => (
                                    <tr key={idx}>
                                        <td onClick={(e) => handleCellClick(row, e)}>
                                            {edit?.ID === row.ID ? (
                                                <div onClick={(e) => e.stopPropagation()}>
                                                    <Select
                                                        options={allOffices.map((office) => ({
                                                            value: office.title,
                                                            label: office.title,
                                                        }))}
                                                        value={edit.officeTitle}
                                                        onChange={(val) => handleChange("officeTitle", val)}
                                                        onEnter={saveChange}
                                                    />
                                                </div>
                                            ) : (
                                                row.officeTitle
                                            )}
                                        </td>
                                        <td onClick={(e) => handleCellClick(row, e)}>
                                            {edit?.ID === row.ID ? (
                                                <div onClick={(e) => e.stopPropagation()}>
                                                    <Input
                                                        type="text"
                                                        value={edit.fio}
                                                        onChange={(e) => handleChange("fio", e)}
                                                        onEnter={saveChange}
                                                    />
                                                </div>
                                            ) : (
                                                row.fio
                                            )}
                                        </td>
                                        <td onClick={(e) => handleCellClick(row, e)}>
                                            {edit?.ID === row.ID ? (
                                                <div onClick={(e) => e.stopPropagation()}>
                                                    <Input
                                                        type="text"
                                                        value={edit.login}
                                                        onChange={(e) => handleChange("login", e)}
                                                        onEnter={saveChange}
                                                    />
                                                </div>
                                            ) : (
                                                row.login
                                            )}
                                        </td>
                                        <td onClick={(e) => handleCellClick(row, e)}>
                                            {edit?.ID === row.ID ? (
                                                <div onClick={(e) => e.stopPropagation()}>
                                                    <Input
                                                        type="text"
                                                        value={edit.position}
                                                        onChange={(e) => handleChange("position", e)}
                                                        onEnter={saveChange}
                                                    />
                                                </div>
                                            ) : (
                                                row.position
                                            )}
                                        </td>
                                        <td onClick={(e) => handleCellClick(row, e)}>
                                            {edit?.ID === row.ID ? (
                                                <div onClick={(e) => e.stopPropagation()}>
                                                    <Select
                                                        options={allOffices.map((office) => ({
                                                            value: office.title,
                                                            label: office.title,
                                                        }))}
                                                        value={edit.place_work}
                                                        onChange={(val) => handleChange("place_work", val)}
                                                        onEnter={saveChange}
                                                    />
                                                </div>
                                            ) : (
                                                row.place_work
                                            )}
                                        </td>
                                        <td onClick={(e) => handleCellClick(row, e)}>
                                            {edit?.ID === row.ID ? (
                                                <div onClick={(e) => e.stopPropagation()}>
                                                    <Input
                                                        type="text"
                                                        value={edit.salary}
                                                        onChange={(e) => handleChange("salary", e)}
                                                        onEnter={saveChange}
                                                    />
                                                </div>
                                            ) : (
                                                row.salary
                                            )}
                                        </td>
                                        <td onClick={(e) => handleCellClick(row, e)}>
                                            {edit?.ID === row.ID ? (
                                                <div onClick={(e) => e.stopPropagation()}>
                                                    <Input
                                                        type="text"
                                                        value={edit.group}
                                                        onChange={(e) => handleChange("group", e)}
                                                        onEnter={saveChange}
                                                    />
                                                </div>
                                            ) : (
                                                row.group
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <h2>Нет данных</h2>
                    )}
                </>
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
