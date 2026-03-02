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
import AlertMessage from "../../../components/general/AlertMessage.jsx";

// ИСПРАВЛЕНО: cashback_amount теперь число, а не строка
const emptyForm = {
    cashback_amount: 0,  // Изменено с "" на 0
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
        label: "Сумма перевода",
        type: "number",
        step: "0.01",
    },
    { key: "beneficiary_idn", label: "ИНН Бенефициара", type: "text" },
    { key: "beneficiary_iban", label: "IBAN Бенефициара", type: "text" },
    { key: "beneficiary_name", label: "Имя Бенефициара", type: "text" },
    { key: "payment_details", label: "Детали платежа", type: "text" },
    { key: "payer_idn", label: "ИНН Плательщика", type: "text" },
    { key: "payer_name", label: "Имя Плательщика", type: "text" },
    { key: "payer_iban", label: "IBAN Плательщика", type: "text" },
];

const PaymentsTable = () => {
    const { isSidebarOpen, toggleSidebar } = useSidebar();

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newItem, setNewItem] = useState({ ...emptyForm });
    const [showAddForm, setShowAddForm] = useState(false);

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

    // ИСПРАВЛЕНО: Добавлена обработка типов данных
    const handleAdd = async () => {
        // Валидация: проверяем, что все поля (кроме служебных) заполнены
        const requiredFields = fields.filter(
            (f) => !["id", "created_at", "updated_at"].includes(f.key)
        );

        // Проверка на пустые поля
        const isEmptyField = requiredFields.some((field) => {
            const value = newItem[field.key];
            return value === undefined || value === null || value.toString().trim() === "";
        });

        if (isEmptyField) {
            showAlert("Пожалуйста, заполните все поля", "error");
            return;
        }

        // ИСПРАВЛЕНО: Дополнительная проверка для cashback_amount
        if (isNaN(parseFloat(newItem.cashback_amount))) {
            showAlert("Пожалуйста, введите корректную сумму перевода", "error");
            return;
        }

        try {
            setLoading(true);

            // ИСПРАВЛЕНО: Подготавливаем данные с правильными типами
            const paymentData = {
                beneficiary_idn: newItem.beneficiary_idn,
                beneficiary_iban: newItem.beneficiary_iban,
                beneficiary_name: newItem.beneficiary_name,
                payment_details: newItem.payment_details,
                payer_id_n: newItem.payer_id_n,
                payer_name: newItem.payer_name,
                payer_iban: newItem.payer_iban,
                cashback_amount: parseFloat(newItem.cashback_amount) // Преобразуем в число
            };

            // Отправляем данные нового платежа
            const response = await apiClient.post(`${backendURL}/payments`, paymentData);

            if (response.status === 200 || response.status === 201) {
                showAlert("Платёж успешно создан", "success");
                await fetchItems(); // обновляем список
                setNewItem({ ...emptyForm }); // сбрасываем форму
                setShowAddForm(false); // закрываем модалку
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
        // ИСПРАВЛЕНО: Форматирование числа с двумя знаками после запятой для денежных сумм
        if (fieldType === "number" && typeof value === "number") {
            return value.toFixed(2);
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
                {/* Уведомления */}
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
                        setNewItem({ ...emptyForm }); // Сбрасываем форму при закрытии
                    }}
                    newItem={newItem}
                    setNewItem={setNewItem}
                    onSave={handleAdd}
                    fields={fields}
                />

                {loading ? (
                    <p style={{ margin: "16px" }}>Загрузка...</p>
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
