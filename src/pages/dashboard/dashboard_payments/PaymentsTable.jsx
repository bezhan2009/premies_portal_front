import React, { useEffect, useState, useCallback } from "react";
import "../../../styles/components/Table.scss";
import "../../../styles/components/ProcessingIntegration.scss";
import "../../../styles/components/SearchBar.scss";
import { useExcelExport } from "../../../hooks/useExcelExport.js";
import { useTableSort } from "../../../hooks/useTableSort.js";
import SortIcon from "../../../components/general/SortIcon.jsx";
import Sidebar from "../../../components/general/DynamicMenu.jsx";
import useSidebar from "../../../hooks/useSideBar.js";
import { apiClient } from "../../../api/utils/apiClient.js";
import AddPaymentModal from "./AddPaymentModal.jsx";

const emptyForm = {
  cashback_amount: "",
  beneficiary_idn: "",
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
  { key: "updated_at", label: "Дата обновления", type: "datetime" },
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
  { key: "payer_id_n", label: "ID Плательщика", type: "text" },
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
    try {
      // setLoading(true);
      const response = await apiClient.post(`${backendURL}/payments`);
      const data = await response.data;
      if (data) {
        fetchItems();
      }
    } catch (e) {
      console.error("Ошибка загрузки:", e);
      // setError("Ошибка загрузки данных");
      // setItems([]);
    } finally {
      // setLoading(false);
    }
    console.log("Add new payment:", newItem);
    // setNewItem({ ...emptyForm });
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
              onClick={() => setShowAddForm(true)}
            >
              + Добавить платеж
            </button>
            <button className="export-excel-btn" onClick={handleExport}>
              Экспорт в Excel
            </button>
          </div>
        </div>

        <AddPaymentModal
          isOpen={showAddForm}
          onClose={() => setShowAddForm(false)}
          newItem={newItem}
          setNewItem={setNewItem}
          onSave={handleAdd}
          fields={fields}
        />

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
