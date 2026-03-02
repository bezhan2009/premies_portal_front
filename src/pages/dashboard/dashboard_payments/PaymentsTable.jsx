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

const emptyForm = {
  cashback_amount: "",
  beneficiary_id_n: "",
  beneficiary_iban: "",
  beneficiary_name: "",
  payment_details: "",
  payer_id_n: "",
  payer_name: "",
  payer_iban: "",
};

const fields = [
  { key: "id", label: "ID", type: "number" },
  { key: "created_at", label: "Дата создания", type: "datetime" },
  {
    key: "cashback_amount",
    label: "Сумма кэшбэка",
    type: "number",
    step: "0.01",
  },
  { key: "beneficiary_idn", label: "ID Бенефициара", type: "text" },
  { key: "beneficiary_iban", label: "IBAN Бенефициара", type: "text" },
  { key: "beneficiary_name", label: "Имя Бенефициара", type: "text" },
  { key: "payment_details", label: "Детали платежа", type: "text" },
  { key: "payer_idn", label: "ID Плательщика", type: "text" },
  { key: "payer_name", label: "Имя Плательщика", type: "text" },
  { key: "payer_iban", label: "IBAN Плательщика", type: "text" },
];

const PaymentsTable = () => {
  const { isSidebarOpen, toggleSidebar } = useSidebar();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newItem, setNewItem] = useState({ ...emptyForm });
  const [showAddForm, setShowAddForm] = useState(false);

  const backendURL = import.meta.env.VITE_BACKEND_URL;
  const { exportToExcel } = useExcelExport();
  const { items: sortedItems, requestSort, sortConfig } = useTableSort(items);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient(`${backendURL}/payments`);
      const data = await response.data;
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

  const handleAdd = async () => {

    console.log("Add new payment:", newItem);
      try {
          const token = localStorage.getItem("access_token");
          const response = await fetch(`${backendURL}/payments`, {
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(newItem),
          });
          if (!response.ok) throw new Error("Ошибка при добавлении");
          await fetchItems();
          setNewItem({ ...emptyForm });
          setShowAddForm(false);
      } catch (e) {
          console.error("Ошибка при добавлении:", e);
      }
    setNewItem({ ...emptyForm });
    setShowAddForm(false);
  };

  const handleExport = () => {
    const columns = fields.map(({ key, label }) => ({ key, label }));
    exportToExcel(sortedItems, columns, "Платежи");
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
        activeLink="payments_list"
        isOpen={isSidebarOpen}
        toggle={toggleSidebar}
      />
      <div className="block_info_prems content-page">
        <div className="table-header-actions" style={{ margin: "16px" }}>
          <h2>Список платежей</h2>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              className="action-buttons__btn"
              onClick={() => setShowAddForm((v) => !v)}
            >
              {showAddForm ? "− Скрыть форму" : "+ Создать платеж"}
            </button>
            <button className="export-excel-btn" onClick={handleExport}>
              Экспорт в Excel
            </button>
          </div>
        </div>

        {showAddForm && (
          <div className="add-card-form" style={{ margin: "0 16px 20px" }}>
            <h3 style={{ marginBottom: "10px" }}>Новый платеж</h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: "10px",
                marginBottom: "12px",
              }}
            >
              {fields
                .filter(
                  (f) => !["id", "created_at", "updated_at"].includes(f.key),
                )
                .map(({ key, label, type, step }) => (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <label style={{ fontSize: "12px", color: "#666" }}>
                      {label}
                    </label>
                    <input
                      type={type}
                      step={step}
                      value={newItem[key]}
                      onChange={(e) =>
                        setNewItem({ ...newItem, [key]: e.target.value })
                      }
                      placeholder={label}
                    />
                  </div>
                ))}
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={handleAdd} className="action-buttons__btn">
                Создать
              </button>
              <button
                onClick={() => {
                  setNewItem({ ...emptyForm });
                  setShowAddForm(false);
                }}
                className="action-buttons__btn"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

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

export default PaymentsTable;
