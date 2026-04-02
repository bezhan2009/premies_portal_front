import { useCallback, useEffect, useState } from "react";
import "../../../../styles/components/Table.scss";
import SearchBar from "../../../general/SearchBar.jsx";
import Input from "../../../elements/Input.jsx";
import { Table } from "../../../table/FlexibleAntTable.jsx";
import { fullUpdateWorkers } from "../../../../api/workers/fullUpdateWorkers.js";
import { useExcelExport } from "../../../../hooks/useExcelExport.js";
import { apiClient } from "../../../../api/utils/apiClient.js";

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
  const [edit, setEdit] = useState(null);

  const { exportToExcel } = useExcelExport();

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const url = `${backendURL}/workers`;
      const response = await apiClient(url);
      const rawWorkers = response?.data?.workers ?? response?.data ?? [];
      const rows = Array.isArray(rawWorkers)
        ? rawWorkers.map(mapWorker).filter(Boolean)
        : [];

      setEmployees(rows);
      setFilteredEmployees(rows);
    } catch (error) {
      console.error("Ошибка загрузки сотрудников:", error);
      setEmployees([]);
      setFilteredEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [backendURL]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleChange = (key, value) => {
    setEdit((previous) => ({ ...previous, [key]: value }));
  };

  const saveChange = async () => {
    try {
      await fullUpdateWorkers({ ...edit, fio: edit.fio.trim() });
      await loadData();
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
        pagination={{ pageSize: 10, showSizeChanger: false }}
        scroll={{ x: "max-content" }}
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
    </div>
  );
};

export default EmployeesTable;
