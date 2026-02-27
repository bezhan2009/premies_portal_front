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

const emptyForm = {
    card_number: "",
    card_id: "",
    response_code: "",
    reqamt: "",
    amount: "",
    conamt: "",
    acctbal: "",
    netbal: "",
    utrnno: "",
    currency: "",
    conCurrency: "",
    reversal: "",
    transaction_type: "",
    mcc: "",
    atm_id: "",
    account: "",
    from_date: "",
    to_date: "",
    from_time: "",
    to_time: "",
    exclude_transaction_types: "",
    exclude_atm_ids: "",
    exclude_mcc: "",
    exclude_accounts: "",
    account_withdraw: "",
    idn_withdraw: "",
    full_name_withdraw: "",
    cashback_percentage: "",
    cashback_name: "",
    is_active: true,
};

// Описание полей: тип инпута + лейбл
const fields = [
    { key: "card_number",              label: "Номер карты",         type: "text" },
    { key: "card_id",                  label: "ID карты",            type: "text" },
    { key: "response_code",            label: "Код ответа",          type: "text" },
    { key: "reqamt",                   label: "Сумма запроса",       type: "number", step: "0.01" },
    { key: "amount",                   label: "Сумма",               type: "number", step: "0.01" },
    { key: "conamt",                   label: "Конв. сумма",         type: "number", step: "0.01" },
    { key: "acctbal",                  label: "Баланс счёта",        type: "number", step: "0.01" },
    { key: "netbal",                   label: "Чистый баланс",       type: "number", step: "0.01" },
    { key: "utrnno",                   label: "UTRN",                type: "number", step: "1" },
    { key: "currency",                 label: "Валюта",              type: "number", step: "1" },
    { key: "conCurrency",              label: "Конв. валюта",        type: "number", step: "1" },
    { key: "reversal",                 label: "Реверсал",            type: "number", step: "1" },
    { key: "transaction_type",         label: "Тип транзакции",      type: "number", step: "1" },
    { key: "mcc",                      label: "MCC",                 type: "number", step: "1" },
    { key: "atm_id",                   label: "ATM ID",              type: "text" },
    { key: "account",                  label: "Счёт",                type: "text" },
    { key: "from_date",                label: "Дата от",             type: "date" },
    { key: "to_date",                  label: "Дата до",             type: "date" },
    { key: "from_time",                label: "Время от",            type: "time" },
    { key: "to_time",                  label: "Время до",            type: "time" },
    { key: "exclude_transaction_types",label: "Искл. типы",          type: "text" },
    { key: "exclude_atm_ids",          label: "Искл. ATM",           type: "text" },
    { key: "exclude_mcc",              label: "Искл. MCC",           type: "text" },
    { key: "exclude_accounts",         label: "Искл. счета",         type: "text" },
    { key: "account_withdraw",          label: "Счёт вывода",          type: "text" },
    { key: "idn_withdraw",              label: "IDN вывода",            type: "text" },
    { key: "full_name_withdraw",        label: "ФИО вывода",            type: "text" },
    { key: "cashback_percentage",       label: "% кэшбэка",             type: "number", step: "0.01" },
    { key: "cashback_name",             label: "Название кэшбэка",      type: "text" },
    { key: "is_active",                 label: "Активен",               type: "checkbox" },
];

const TableCashbackSettings = () => {
    const { isSidebarOpen, toggleSidebar } = useSidebar();

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [editId, setEditId] = useState(null);
    const [editedItem, setEditedItem] = useState({});
    const [newItem, setNewItem] = useState({ ...emptyForm });
    const [showAddForm, setShowAddForm] = useState(false);

    const backendURL = import.meta.env.VITE_BACKEND_URL;
    const { exportToExcel } = useExcelExport();
    const { items: sortedItems, requestSort, sortConfig } = useTableSort(items);

    const fetchItems = useCallback(async () => {
        try {
            const token = localStorage.getItem("access_token");
            setLoading(true);
            const response = await fetch(`${backendURL}/cashback-settings`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });
            const data = await response.json();
            if (Array.isArray(data)) {
                setItems(data);
            } else if (data && Array.isArray(data.data)) {
                setItems(data.data);
            } else {
                console.error("Неправильный формат ответа:", data);
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

    const handleDoubleClick = (item) => {
        setEditId(item.ID);
        setEditedItem({ ...item });
    };

    const handleSave = async () => {
        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(`${backendURL}/cashback-settings/${editId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(editedItem),
            });
            if (!response.ok) throw new Error("Ошибка при обновлении");
            setItems((prev) =>
                prev.map((c) => (c.ID === editId ? { ...editedItem } : c))
            );
            setEditId(null);
        } catch (e) {
            console.error("Ошибка при сохранении:", e);
        }
    };

    const handleDelete = async (id) => {
        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(`${backendURL}/cashback-settings/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });
            if (!response.ok) throw new Error("Ошибка при удалении");
            setItems((prev) => prev.filter((c) => c.ID !== id));
        } catch (e) {
            console.error("Ошибка при удалении:", e);
        }
    };

    // "2025-05-01" → "2025-05-01T00:00:00Z"
    const toRFC3339Date = (val) => {
        if (!val) return "0001-01-01T00:00:00Z";
        return val + "T00:00:00Z";
    };

    const buildPayload = (raw) => ({
        ...raw,
        reqamt:           parseFloat(raw.reqamt)           || 0,
        amount:           parseFloat(raw.amount)           || 0,
        conamt:           parseFloat(raw.conamt)           || 0,
        acctbal:          parseFloat(raw.acctbal)          || 0,
        netbal:           parseFloat(raw.netbal)           || 0,
        utrnno:           parseInt(raw.utrnno)             || 0,
        currency:         parseInt(raw.currency)           || 0,
        conCurrency:      parseInt(raw.conCurrency)        || 0,
        reversal:         parseInt(raw.reversal)           || 0,
        transaction_type: parseInt(raw.transaction_type)   || 0,
        mcc:              parseInt(raw.mcc)                || 0,
        cashback_percentage: parseFloat(raw.cashback_percentage) || 0,
        from_date:        toRFC3339Date(raw.from_date),
        to_date:          toRFC3339Date(raw.to_date),
    });

    const handleAdd = async () => {
        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(`${backendURL}/cashback-settings`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(buildPayload(newItem)),
            });
            if (!response.ok) throw new Error("Ошибка при добавлении");
            await fetchItems();
            setNewItem({ ...emptyForm });
            setShowAddForm(false);
        } catch (e) {
            console.error("Ошибка при добавлении:", e);
        }
    };

    const handleExport = () => {
        const columns = fields.map(({ key, label }) => ({ key, label }));
        exportToExcel(sortedItems, columns, "Настройки кэшбэка");
    };

    // Инпут с правильным типом для ячейки при редактировании
    // Форматирование значения для отображения в ячейке
    const formatValue = (value, fieldType) => {
        if (fieldType === "checkbox") return value ? "✓" : "✗";
        if (value === null || value === undefined || value === "") return "-";
        if (fieldType === "date") {
            try {
                const d = new Date(value);
                if (isNaN(d.getTime())) return value;
                return d.toLocaleDateString("ru-RU");
            } catch { return value; }
        }
        return String(value);
    };

    const renderCell = (item, field) => {
        if (editId !== item.ID) return formatValue(item[field.key], field.type);
        // При редактировании date-поля: преобразуем ISO → "YYYY-MM-DD" для input[type=date]
        let inputVal = editedItem[field.key] ?? "";
        if (field.type === "date" && inputVal) {
            try { inputVal = new Date(inputVal).toISOString().slice(0, 10); } catch {}
        }
        if (field.type === "checkbox") {
            return (
                <input
                    type="checkbox"
                    checked={!!editedItem[field.key]}
                    onChange={(e) =>
                        setEditedItem({ ...editedItem, [field.key]: e.target.checked })
                    }
                />
            );
        }
        return (
            <input
                type={field.type}
                step={field.step}
                value={inputVal}
                onChange={(e) =>
                    setEditedItem({ ...editedItem, [field.key]: e.target.value })
                }
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
        );
    };

    return (
        <div className={`dashboard-container ${isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"}`}>
            <Sidebar activeLink="cashback_settings" isOpen={isSidebarOpen} toggle={toggleSidebar} />
            <div className="block_info_prems content-page">

                {/* Шапка */}
                <div className="table-header-actions" style={{ margin: "16px" }}>
                    <h2>Настройки кэшбэка</h2>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <button
                            className="action-buttons__btn"
                            onClick={() => setShowAddForm((v) => !v)}
                        >
                            {showAddForm ? "− Скрыть форму" : "+ Добавить настройку"}
                        </button>
                        <button className="export-excel-btn" onClick={handleExport}>
                            Экспорт в Excel
                        </button>
                    </div>
                </div>

                {/* Форма добавления */}
                {showAddForm && (
                    <div className="add-card-form" style={{ margin: "0 16px 20px" }}>
                        <h3 style={{ marginBottom: "10px" }}>Новая настройка кэшбэка</h3>
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                                gap: "10px",
                                marginBottom: "12px",
                            }}
                        >
                            {fields.map(({ key, label, type, step }) =>
                                type === "checkbox" ? (
                                    <label key={key} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                        <input
                                            type="checkbox"
                                            checked={!!newItem[key]}
                                            onChange={(e) =>
                                                setNewItem({ ...newItem, [key]: e.target.checked })
                                            }
                                        />
                                        {label}
                                    </label>
                                ) : (
                                    <input
                                        key={key}
                                        type={type}
                                        step={step}
                                        value={newItem[key]}
                                        onChange={(e) =>
                                            setNewItem({ ...newItem, [key]: e.target.value })
                                        }
                                        placeholder={label}
                                    />
                                )
                            )}
                        </div>
                        <div style={{ display: "flex", gap: "10px" }}>
                            <button onClick={handleAdd} className="action-buttons__btn">
                                Сохранить
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
                    /* Обёртка для горизонтального скролла таблицы */
                    <div style={{ overflowX: "auto", width: "100%" }}>
                        <table className="table-reports" style={{ minWidth: "max-content" }}>
                            <thead>
                            <tr>
                                {fields.map(({ key, label }) => (
                                    <th
                                        key={key}
                                        onClick={() => requestSort(key)}
                                        className="sortable-header"
                                    >
                                        {label}{" "}
                                        <SortIcon sortConfig={sortConfig} sortKey={key} />
                                    </th>
                                ))}
                                <th>Действия</th>
                            </tr>
                            </thead>
                            <tbody>
                            {Array.isArray(sortedItems) && sortedItems.length > 0 ? (
                                sortedItems.map((item) => (
                                    <tr key={item.ID}>
                                        {fields.map((field) => (
                                            <td
                                                key={field.key}
                                                onDoubleClick={() => handleDoubleClick(item)}
                                            >
                                                {renderCell(item, field)}
                                            </td>
                                        ))}
                                        <td>
                                            {editId === item.ID ? (
                                                <button
                                                    onClick={handleSave}
                                                    className="action-buttons__btn"
                                                >
                                                    Сохранить
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleDelete(item.ID)}
                                                    className="action-buttons__btn"
                                                >
                                                    Удалить
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={fields.length + 1} style={{ textAlign: "center" }}>
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

export default TableCashbackSettings;