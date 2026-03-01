import React, { useEffect, useState, useCallback } from "react";
import "../../../styles/components/Table.scss";
import "../../../styles/components/ProcessingIntegration.scss";
import "../../../styles/components/AddCardPriceForm.scss";
import "../../../styles/components/SearchBar.scss";
import { useExcelExport } from "../../../hooks/useExcelExport.js";
import { useTableSort } from "../../../hooks/useTableSort.js";
import SortIcon from "../../../components/general/SortIcon.jsx";
import Sidebar from "../../../components/general/DynamicMenu.jsx";
import useSidebar from "../../../hooks/useSideBar.js";
import { apiClient } from "../../../api/utils/apiClient.js";

const fields = [
  { key: "id", label: "ID", type: "number" },
  { key: "created_at", label: "Дата создания", type: "datetime" },
  { key: "updated_at", label: "Дата обновления", type: "datetime" },
  { key: "amount", label: "Сумма", type: "number", step: "0.01" },
  { key: "utrno", label: "UTRNO", type: "text" },
];

const CardCashbackTable = () => {
  const { isSidebarOpen, toggleSidebar } = useSidebar();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const backendURL = import.meta.env.VITE_BACKEND_URL;
  const { exportToExcel } = useExcelExport();
  const { items: sortedItems, requestSort, sortConfig } = useTableSort(items);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient(`${backendURL}/card-cashback`);
      const data = response.data;
      if (Array.isArray(data)) {
        setItems(data);
      } else if (data && Array.isArray(data.data)) {
        setItems(data.data);
      } else {
        setItems([]);
      }
    } catch (e) {
      console.error("Ошибка загрузки:", e);
      setError("Ошибка загрузки данных");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [backendURL]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleExport = () => {
    const columns = fields.map(({ key, label }) => ({ key, label }));
    exportToExcel(sortedItems, columns, "Кэшбэк по картам");
  };

  const formatValue = (value, fieldType) => {
    if (value === null || value === undefined || value === "") return "-";
    if (fieldType === "datetime") {
      try {
        const d = new Date(value);
        if (isNaN(d.getTime())) return value;
        return d.toLocaleString("ru-RU");
      } catch {
        return value;
      }
    }
    return String(value);
  };

  return (
    <div
      className={`dashboard-container ${isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"}`}
    >
      <Sidebar
        activeLink="card_cashback_list"
        isOpen={isSidebarOpen}
        toggle={toggleSidebar}
      />
      <div className="block_info_prems content-page">
        <div className="table-header-actions" style={{ margin: "16px" }}>
          <h2>Кэшбэк по картам</h2>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button className="export-excel-btn" onClick={handleExport}>
              Экспорт в Excel
            </button>
          </div>
        </div>

        {loading ? (
          <p style={{ margin: "16px" }}>Загрузка...</p>
        ) : error ? (
          <p style={{ color: "red", margin: "16px" }}>{error}</p>
        ) : (
          <div style={{ overflowX: "auto", width: "100%" }}>
            <table
              className="table-reports"
              style={{ minWidth: "max-content" }}
            >
              <thead>
                <tr>
                  {fields.map(({ key, label }) => (
                    <th
                      key={key}
                      onClick={() => requestSort(key)}
                      className="sortable-header"
                    >
                      {label}
                      <SortIcon sortConfig={sortConfig} sortKey={key} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.isArray(sortedItems) && sortedItems.length > 0 ? (
                  sortedItems.map((item) => (
                    <tr key={item.id}>
                      {fields.map((field) => (
                        <td key={field.key}>
                          {formatValue(item[field.key], field.type)}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={fields.length} style={{ textAlign: "center" }}>
                      Нет данных
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CardCashbackTable;
