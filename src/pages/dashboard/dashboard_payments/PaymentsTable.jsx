import React, { useEffect, useState, useCallback } from "react";
import "../../../styles/components/Table.scss";
import "../../../styles/components/ProcessingIntegration.scss";
import "../../../styles/components/SearchBar.scss";
import { useExcelExport } from "../../../hooks/useExcelExport.js";
import { useTableSort } from "../../../hooks/useTableSort.js";
import SortIcon from "../../../components/general/SortIcon.jsx";
import { apiClient } from "../../../api/utils/apiClient.js";
import AddPaymentModal from "./AddPaymentModal.jsx";
import AlertMessage from "../../../components/general/AlertMessage.jsx";
import Spinner from "../../../components/Spinner.jsx";

// Добавлено поле bic
const emptyForm = {
  cashback_amount: 0,
  beneficiary_idn: "",
  beneficiary_iban: "",
  beneficiary_name: "",
  payment_details: "",
  payer_idn: "",
  payer_name: "",
  payer_iban: "",
  bic: "", // новое поле
};

// Добавлено поле bic в список полей
const fields = [
  { key: "id", label: "ID", type: "number" },
  { key: "created_at", label: "Дата создания", type: "datetime" },
  { key: "updated_at", label: "Дата обновления", type: "datetime" },
  {
    key: "cashback_amount",
    label: "Сумма перевода",
    type: "number",
    step: "0.01",
  },
  { key: "beneficiary_idn", label: "ИНН получатель", type: "text" },
  { key: "beneficiary_iban", label: "Счёт получатель", type: "text" },
  { key: "beneficiary_name", label: "Имя получатель", type: "text" },
  { key: "payment_details", label: "Детали платежа", type: "text" },
  { key: "payer_idn", label: "ИНН Отправитель", type: "text" },
  { key: "payer_name", label: "Имя Отправитель", type: "text" },
  { key: "payer_iban", label: "Счёт Отправителя", type: "text" },
  { key: "bic", label: "БИК банка получателя", type: "text" }, // новое поле
];


const PaymentsTable = () => {

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState({ ...emptyForm });
  const [showAddForm, setShowAddForm] = useState(false);
  // Состояние для типа платежа
  const [paymentType, setPaymentType] = useState("internal"); // "internal" или "domestic"

  // Состояние для уведомлений
  const [alert, setAlert] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const backendURL = import.meta.env.VITE_BACKEND_URL;
  const { exportToExcel } = useExcelExport();
  const { items: sortedItems, requestSort, sortConfig } = useTableSort(items);

  const showAlert = (message, type = "success") => {
    setAlert({
      show: true,
      message,
      type,
    });
  };

  const hideAlert = () => {
    setAlert({
      show: false,
      message: "",
      type: "success",
    });
  };

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
      showAlert("Ошибка загрузки данных", "error");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [backendURL]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleAdd = async () => {
    // Валидация: все поля, кроме служебных, должны быть заполнены
    const requiredFields = fields.filter((f) => {
      if (paymentType === "internal") {
        return !["id", "created_at", "updated_at", "bic"].includes(f.key);
      } else {
        return !["id", "created_at", "updated_at"].includes(f.key);
      }
    });

    const isEmptyField = requiredFields.some((field) => {
      const value = newItem[field.key];
      return (
        value === undefined || value === null || value.toString().trim() === ""
      );
    });

    if (isEmptyField) {
      showAlert("Пожалуйста, заполните все поля", "error");
      return;
    }

    if (isNaN(parseFloat(newItem.cashback_amount))) {
      showAlert("Пожалуйста, введите корректную сумму перевода", "error");
      return;
    }

    try {
      setLoading(true);

      // Базовые поля
      const paymentData = {
        beneficiary_idn: newItem.beneficiary_idn,
        beneficiary_iban: newItem.beneficiary_iban,
        beneficiary_name: newItem.beneficiary_name,
        payment_details: newItem.payment_details,
        payer_idn: newItem.payer_idn,
        payer_name: newItem.payer_name,
        payer_iban: newItem.payer_iban,
        cashback_amount: parseFloat(newItem.cashback_amount),
      };

      // Для внутренних платежей внутри страны добавляем BIC
      if (paymentType === "domestic") {
        paymentData.bic = newItem.bic;
      }

      // Выбор эндпоинта в зависимости от типа
      // const endpoint =
      //     paymentType === "internal"
      //         ? `${backendURL}/payments/internal`
      //         : `${backendURL}/payments/domestic`;

      const response = await apiClient.post("/payments", paymentData);

      if (response.status === 200 || response.status === 201) {
        showAlert("Платёж успешно создан", "success");
        await fetchItems();
        setNewItem({ ...emptyForm });
        setShowAddForm(false);
        // Сбросить тип на внутренний для следующего раза (опционально)
        setPaymentType("internal");
      } else {
        throw new Error("Неожиданный ответ сервера");
      }
    } catch (e) {
      console.error("Ошибка при создании платежа:", e);
      showAlert("Ошибка при создании платежа", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    try {
      const columns = fields.map(({ key, label }) => ({ key, label }));
      exportToExcel(sortedItems, columns, "Платежи");
      showAlert("Экспорт выполнен успешно", "success");
    } catch (e) {
      console.error("Ошибка экспорта:", e);
      showAlert("Ошибка при экспорте в Excel", "error");
    }
  };

  const formatValue = (value, fieldType, fieldKey) => {
    if (value === null || value === undefined || value === "") return "-";

    if (fieldKey === "id") {
      return Number.isInteger(value)
        ? value.toString()
        : Math.floor(value).toString();
    }

    if (fieldType === "datetime") {
      try {
        const d = new Date(value);
        if (isNaN(d.getTime())) return value;
        return d.toLocaleString("ru-RU");
      } catch {
        return value;
      }
    }

    if (fieldKey === "cashback_amount" && typeof value === "number") {
      return value.toFixed(2);
    }

    if (fieldType === "number" && typeof value === "number") {
      return value.toString();
    }

    return String(value);
  };

  return (
    <div className="block_info_prems content-page">
        {alert.show && (
          <AlertMessage
            message={alert.message}
            type={alert.type}
            onClose={hideAlert}
            duration={3000}
          />
        )}

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
          onClose={() => {
            setShowAddForm(false);
            setNewItem({ ...emptyForm });
            setPaymentType("internal"); // сброс типа при закрытии
          }}
          newItem={newItem}
          setNewItem={setNewItem}
          onSave={handleAdd}
          fields={fields}
          paymentType={paymentType}
          setPaymentType={setPaymentType}
        />

        {loading ? (
          <div style={{ padding: "16px" }}>
            <Spinner center label="Загружаем список платежей" />
          </div>
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
                          {formatValue(item[field.key], field.type, field.key)}
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
  );
};

export default PaymentsTable;
