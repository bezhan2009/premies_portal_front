import React, { useCallback, useEffect, useState } from "react";
import { Table } from "../../../table/FlexibleAntTable.jsx";
import { fetchOffices } from "../../../../api/offices/all_offices.js";
import Input from "../../../elements/Input.jsx";
import { useExcelExport } from "../../../../hooks/useExcelExport.js";

const OfficeTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(null);
  const [editField, setEditField] = useState(null);

  const backendURL = import.meta.env.VITE_BACKEND_URL;
  const { exportToExcel } = useExcelExport();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchOffices();
      setData(response || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleChange = (field, valueOrEvent) => {
    const value = valueOrEvent?.target?.value ?? valueOrEvent;
    setEdit((previous) => ({ ...previous, [field]: value }));
  };

  const saveChange = async (editedOffice) => {
    const token = localStorage.getItem("access_token");

    try {
      const response = await fetch(`${backendURL}/office/${editedOffice.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editedOffice),
      });

      if (!response.ok) {
        throw new Error("Ошибка при обновлении");
      }

      await loadData();
    } catch (error) {
      console.error("Ошибка:", error);
    } finally {
      setEdit(null);
      setEditField(null);
    }
  };

  const handleCellClick = (office, field) => {
    if (edit?.id === office.id && editField === field) {
      return;
    }

    setEdit(office);
    setEditField(field);
  };

  const handleExport = () => {
    const columns = [
      { key: "title", label: "Название офиса" },
      { key: "code", label: "Код офиса" },
      { key: "application_view_name", label: "Название в заявках" },
    ];

    exportToExcel(data, columns, "Офисы");
  };

  const renderEditableCell = (record, field) => {
    const isEditing = edit?.id === record.id && editField === field;

    if (isEditing) {
      return (
        <div onClick={(event) => event.stopPropagation()}>
          <Input
            type="text"
            value={edit?.[field] || ""}
            onChange={(value) => handleChange(field, value)}
            onEnter={() => saveChange(edit)}
          />
        </div>
      );
    }

    return (
      <div
        onClick={() => handleCellClick(record, field)}
        style={{ cursor: "pointer" }}
      >
        {record[field] || "-"}
      </div>
    );
  };

  return (
    <div className="report-table-container">
      <div className="table-header-actions" style={{ marginBottom: "10px" }}>
        <h2>Офисы</h2>
        <button className="export-excel-btn" onClick={handleExport}>
          Экспорт в Excel
        </button>
      </div>

      <Table
        tableId="operator-office-table"
        dataSource={data}
        rowKey={(record) => record.id}
        loading={loading}
        bordered
        pagination={{ pageSize: 10, showSizeChanger: false }}
        scroll={{ x: "max-content" }}
        locale={{ emptyText: "Нет данных" }}
      >
        <Table.Column
          title="Название офиса"
          dataIndex="title"
          key="title"
          render={(_, record) => renderEditableCell(record, "title")}
        />
        <Table.Column
          title="Код офиса"
          dataIndex="code"
          key="code"
          render={(_, record) => renderEditableCell(record, "code")}
        />
        <Table.Column
          title="Название в заявках"
          dataIndex="application_view_name"
          key="application_view_name"
          render={(_, record) => renderEditableCell(record, "application_view_name")}
        />
      </Table>
    </div>
  );
};

export default OfficeTable;
