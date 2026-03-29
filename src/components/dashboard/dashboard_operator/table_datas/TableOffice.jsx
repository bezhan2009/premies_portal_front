import React, { useEffect, useState, useRef, useCallback } from "react";
import "../../../../styles/components/Table.scss";
import "../../../../styles/components/Office.scss";
import Spinner from "../../../Spinner.jsx";
import { fetchOffices } from "../../../../api/offices/all_offices.js";
import Input from "../../../elements/Input.jsx";
import { useExcelExport } from "../../../../hooks/useExcelExport.js";
import { useTableSort } from "../../../../hooks/useTableSort.js";
import SortIcon from "../../../general/SortIcon.jsx";

const OfficeTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(null);
  const [editField, setEditField] = useState(null);
  const inputRef = useRef(null);
  const backendURL = import.meta.env.VITE_BACKEND_URL;
  const { exportToExcel } = useExcelExport();

  const { items: sortedData, requestSort, sortConfig } = useTableSort(data);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchOffices();
      setData(res || []);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (field, valueOrEvent) => {
    // Поддержка как события, так и прямого значения
    const value = valueOrEvent?.target?.value ?? valueOrEvent;
    setEdit(prev => ({ ...prev, [field]: value }));
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
      if (!response.ok) throw new Error("Ошибка при обновлении");
      setEdit(null);
      setEditField(null);
      loadData();
    } catch (error) {
      console.error("Ошибка:", error);
    } finally {
      setEdit(null);
      setEditField(null);
    }
  };

  const handleCellClick = (office, field) => {
    if (!edit) {
      setEdit(office);
      setEditField(field);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExport = () => {
    const columns = [
      { key: "title", label: "Название офиса" },
      { key: "code", label: "Код офиса" },
    ];
    exportToExcel(sortedData, columns, "Офисы");
  };

  return (
    <div className="report-table-container">
      <div className="table-header-actions" style={{ marginBottom: "10px" }}>
        <h2>Офисы</h2>
        <button className="export-excel-btn" onClick={handleExport}>
          Экспорт в Excel
        </button>
      </div>
      <div
        className="table-reports-div"
        style={{ maxHeight: "calc(100vh - 425px)" }}
      >
        <table className="table-reports">
          <thead>
            <tr>
              <th
                onClick={() => requestSort("title")}
                className="sortable-header"
              >
                Название офиса{" "}
                <SortIcon sortConfig={sortConfig} sortKey="title" />
              </th>
              <th
                onClick={() => requestSort("code")}
                className="sortable-header"
              >
                Код офиса <SortIcon sortConfig={sortConfig} sortKey="code" />
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan="2" style={{ textAlign: "center" }}>
                  <Spinner />
                </td>
              </tr>
            )}
            {!loading && sortedData.length > 0
              ? sortedData.map((office) => (
                <tr key={office.id}>
                  <td onClick={() => handleCellClick(office, "title")}>
                    {edit?.id === office.id && editField === "title" ? (
                      <Input
                        defValue={edit?.title || office.title}
                        ref={inputRef}
                        type="text"
                        value={edit?.title || ""}
                        onChange={(value) => handleChange("title", value)}
                        onEnter={() => saveChange(edit)}
                      />
                    ) : (
                      office.title || "-"
                    )}
                  </td>
                  <td onClick={() => handleCellClick(office, "code")}>
                    {edit?.id === office.id && editField === "code" ? (
                      <Input
                        defValue={edit?.code || office.code}
                        ref={inputRef}
                        type="text"
                        value={edit?.code || ""}
                        onChange={(value) => handleChange("code", value)}
                        onEnter={() => saveChange(edit)}
                      />
                    ) : (
                      office.code || "-"
                    )}
                  </td>
                </tr>
              ))
              : !loading && (
                <tr>
                  <td colSpan="2" style={{ textAlign: "center" }}>
                    Нет данных
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OfficeTable;
