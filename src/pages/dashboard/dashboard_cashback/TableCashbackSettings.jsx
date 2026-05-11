import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useExcelExport } from "../../../hooks/useExcelExport.js";
import AddCashbackModal from "./AddCashbackModal.jsx";
import Spinner from "../../../components/Spinner.jsx";
import { Table } from "../../../components/table/FlexibleAntTable.jsx";

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
    transaction_type: [],
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
    cashback_priority: "",
    monthly_limit: "",
    is_active: true,
};

const fields = [
    { key: "card_number", label: "Номер карты", type: "text" },
    { key: "card_id", label: "ID карты", type: "text" },
    { key: "response_code", label: "Код ответа", type: "text" },
    { key: "reqamt", label: "Сумма запроса", type: "number", step: "0.01" },
    { key: "amount", label: "Сумма", type: "number", step: "0.01" },
    { key: "conamt", label: "Конв. сумма", type: "number", step: "0.01" },
    { key: "acctbal", label: "Баланс счёта", type: "number", step: "0.01" },
    { key: "netbal", label: "Чистый баланс", type: "number", step: "0.01" },
    { key: "utrnno", label: "UTRN", type: "number", step: "1" },
    { key: "currency", label: "Валюта", type: "number", step: "1" },
    { key: "conCurrency", label: "Конв. валюта", type: "number", step: "1" },
    { key: "reversal", label: "Реверсал", type: "number", step: "1" },
    { key: "transaction_type", label: "Тип транзакции", type: "tags" },
    { key: "mcc", label: "MCC", type: "number", step: "1" },
    { key: "atm_id", label: "ATM ID", type: "text" },
    { key: "account", label: "Счёт", type: "text" },
    { key: "from_date", label: "Дата от", type: "date" },
    { key: "to_date", label: "Дата до", type: "date" },
    { key: "from_time", label: "Время от", type: "time" },
    { key: "to_time", label: "Время до", type: "time" },
    { key: "exclude_transaction_types", label: "Искл. типы", type: "text" },
    { key: "exclude_atm_ids", label: "Искл. ATM", type: "text" },
    { key: "exclude_mcc", label: "Искл. MCC", type: "text" },
    { key: "exclude_accounts", label: "Искл. счета", type: "text" },
    { key: "account_withdraw", label: "Счёт вывода", type: "text" },
    { key: "idn_withdraw", label: "IDN вывода", type: "text" },
    { key: "full_name_withdraw", label: "ФИО вывода", type: "text" },
    { key: "cashback_percentage", label: "% кэшбэка", type: "number", step: "0.01" },
    { key: "cashback_name", label: "Название кэшбэка", type: "text" },
    { key: "cashback_priority", label: "Приоритет кешбека", type: "number", step: "1" },
    { key: "monthly_limit", label: "Месячный лимит", type: "number", step: "0.01" },
    { key: "is_active", label: "Активен", type: "checkbox" },
];

// Оптимизированный парсер без рекурсий и циклов
const parseTransactionType = (value) => {
    if (Array.isArray(value)) return value.flatMap(v => parseTransactionType(v));
    if (value == null || value === "") return [];

    let str = String(value).trim();

    try {
        const parsed = JSON.parse(str);
        if (Array.isArray(parsed)) return parsed.flatMap(v => parseTransactionType(v));
        if (typeof parsed === "string") str = parsed.trim();
    } catch { }

    if (str.startsWith("{") && str.endsWith("}")) {
        const inner = str.slice(1, -1).trim();
        if (!inner) return [];
        return inner.split(",").map(v => v.trim().replace(/^["'\\]+|["'\\]+$/g, "")).filter(Boolean);
    }

    return str.split(",").map(v => v.trim()).filter(Boolean);
};

const normalizeItem = (item) => ({
    ...item,
    transaction_type: parseTransactionType(item.transaction_type),
});

// ------ Компоненты ячеек (мемоизированные) ------
const TagDisplay = React.memo(({ tags }) => {
    if (!tags.length) return <span style={{ color: "#aaa" }}>-</span>;
    return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {tags.map((tag, idx) => (
                <span key={idx} style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                    background: "#e7f0ff",
                    color: "#2563eb",
                    borderRadius: "4px",
                    padding: "2px 7px",
                    fontSize: "12px",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                }}>{tag}</span>
            ))}
        </div>
    );
});

const InlineTagInput = React.memo(({ tags, onChange }) => {
    const [inputVal, setInputVal] = useState("");

    const addTags = useCallback((raw) => {
        const newTags = raw.split(/[,\s]+/).map(v => v.trim()).filter(Boolean);
        if (!newTags.length) return;
        onChange([...new Set([...tags, ...newTags])]);
        setInputVal("");
    }, [tags, onChange]);

    const removeTag = useCallback((idx) => {
        onChange(tags.filter((_, i) => i !== idx));
    }, [tags, onChange]);

    const handleKeyDown = (e) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTags(inputVal);
        } else if (e.key === "Backspace" && !inputVal && tags.length) {
            removeTag(tags.length - 1);
        }
    };

    const tagStyle = {
        display: "inline-flex",
        alignItems: "center",
        gap: "3px",
        background: "#e7f0ff",
        color: "#2563eb",
        borderRadius: "4px",
        padding: "2px 7px",
        fontSize: "12px",
        fontWeight: 500,
        whiteSpace: "nowrap",
    };
    const tagRemoveStyle = { background: "none", border: "none", cursor: "pointer", color: "#2563eb", fontSize: "14px" };
    const tagBoxStyle = {
        display: "flex", flexWrap: "wrap", gap: "4px", padding: "4px 6px",
        border: "1px solid #ced4da", borderRadius: "4px", minHeight: "32px",
        alignItems: "center", background: "#fff", minWidth: "160px",
    };
    const tagInputStyle = { border: "none", outline: "none", fontSize: "13px", flex: 1, minWidth: "80px", background: "transparent" };

    return (
        <div style={tagBoxStyle}>
            {tags.map((tag, index) => (
                <span key={index} style={tagStyle}>
                    {tag}
                    <button type="button" style={tagRemoveStyle} onClick={() => removeTag(index)}>x</button>
                </span>
            ))}
            <input
                style={tagInputStyle}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => inputVal.trim() && addTags(inputVal)}
            />
        </div>
    );
});

const ReadonlyCell = React.memo(({ value, fieldType }) => {
    const formatValue = (val, type) => {
        if (type === "checkbox") return val ? "Да" : "Нет";
        if (val == null || val === "") return "-";
        if (Array.isArray(val)) return val.join(", ") || "-";
        if (type === "date") {
            try {
                const d = new Date(val);
                if (isNaN(d.getTime())) return val;
                return d.toLocaleDateString("ru-RU");
            } catch { return val; }
        }
        return String(val);
    };

    if (fieldType === "tags") return <TagDisplay tags={Array.isArray(value) ? value : parseTransactionType(value)} />;
    return <>{formatValue(value, fieldType)}</>;
});

const EditableCell = React.memo(({ field, value, onChange, onSave }) => {
    const [localValue, setLocalValue] = useState(() => {
        if (field.type === "date" && value) {
            try { return new Date(value).toISOString().slice(0, 10); } catch { return value; }
        }
        return value ?? "";
    });

    useEffect(() => {
        if (field.type === "date" && value) {
            try { setLocalValue(new Date(value).toISOString().slice(0, 10)); } catch { setLocalValue(value); }
        } else {
            setLocalValue(value ?? "");
        }
    }, [value, field.type]);

    const handleChange = (newVal) => {
        setLocalValue(newVal);
        onChange(newVal);
    };

    if (field.type === "checkbox") {
        return <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />;
    }
    if (field.type === "tags") {
        return <InlineTagInput tags={Array.isArray(value) ? value : parseTransactionType(value)} onChange={onChange} />;
    }
    return (
        <input
            type={field.type}
            step={field.step}
            value={localValue}
            style={{ width: "100%", minWidth: "80px", boxSizing: "border-box", padding: "4px 6px", border: "1px solid #ced4da", borderRadius: "4px", fontSize: "13px" }}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSave()}
        />
    );
});

// ------ Основной компонент ------
const TableCashbackSettings = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editId, setEditId] = useState(null);
    const [editedItem, setEditedItem] = useState({});
    const [newItem, setNewItem] = useState({ ...emptyForm });
    const [showAddModal, setShowAddModal] = useState(false);

    const backendURL = import.meta.env.VITE_BACKEND_URL;
    const { exportToExcel } = useExcelExport();
    const abortControllerRef = useRef(null);

    const fetchItems = useCallback(async () => {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        try {
            const token = localStorage.getItem("access_token");
            setLoading(true);
            const response = await fetch(`${backendURL}/cashback-settings`, {
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                signal,
            });
            const data = await response.json();
            let rawItems = [];
            if (Array.isArray(data)) rawItems = data;
            else if (data && Array.isArray(data.data)) rawItems = data.data;
            else rawItems = [];

            const normalized = rawItems.map(normalizeItem);
            setItems(normalized);
            setError(null);
        } catch (e) {
            if (e.name !== "AbortError") {
                console.error("Ошибка загрузки:", e);
                setError("Ошибка загрузки данных");
                setItems([]);
            }
        } finally {
            setLoading(false);
        }
    }, [backendURL]);

    useEffect(() => {
        fetchItems();
        return () => abortControllerRef.current?.abort();
    }, [fetchItems]);

    const handleDoubleClick = useCallback((item) => {
        setEditId(item.ID);
        setEditedItem({
            ...item,
            transaction_type: Array.isArray(item.transaction_type) ? [...item.transaction_type] : parseTransactionType(item.transaction_type),
        });
    }, []);

    const toDateOnly = (value) => {
        if (!value) return "";
        return String(value).includes("T") ? String(value).slice(0, 10) : value;
    };

    const buildPayload = useCallback((raw) => ({
        ...raw,
        reqamt: parseFloat(raw.reqamt) || 0,
        amount: parseFloat(raw.amount) || 0,
        conamt: parseFloat(raw.conamt) || 0,
        acctbal: parseFloat(raw.acctbal) || 0,
        netbal: parseFloat(raw.netbal) || 0,
        utrnno: parseInt(raw.utrnno, 10) || 0,
        currency: parseInt(raw.currency, 10) || 0,
        conCurrency: parseInt(raw.conCurrency, 10) || 0,
        reversal: parseInt(raw.reversal, 10) || 0,
        mcc: parseInt(raw.mcc, 10) || 0,
        cashback_percentage: parseFloat(raw.cashback_percentage) || 0,
        cashback_priority: parseInt(raw.cashback_priority, 10) || 0,
        monthly_limit: parseFloat(raw.monthly_limit) || 0,
        from_date: toDateOnly(raw.from_date),
        to_date: toDateOnly(raw.to_date),
        transaction_type: Array.isArray(raw.transaction_type) ? raw.transaction_type : parseTransactionType(raw.transaction_type),
    }), []);

    const handleSave = useCallback(async () => {
        if (!editId) return;
        try {
            const token = localStorage.getItem("access_token");
            const payload = buildPayload(editedItem);
            const response = await fetch(`${backendURL}/cashback-settings/${editId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error("Ошибка при обновлении");
            setItems(prev => prev.map(item => item.ID === editId ? normalizeItem({ ...payload, ID: editId }) : item));
            setEditId(null);
            setEditedItem({});
        } catch (e) {
            console.error("Ошибка при сохранении:", e);
        }
    }, [editId, editedItem, backendURL, buildPayload]);

    const handleDelete = useCallback(async (id) => {
        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(`${backendURL}/cashback-settings/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            });
            if (!response.ok) throw new Error("Ошибка при удалении");
            setItems(prev => prev.filter(item => item.ID !== id));
        } catch (e) {
            console.error("Ошибка при удалении:", e);
        }
    }, [backendURL]);

    const handleAdd = useCallback(async () => {
        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(`${backendURL}/cashback-settings`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(buildPayload(newItem)),
            });
            if (!response.ok) throw new Error("Ошибка при добавлении");
            await fetchItems();
            setNewItem({ ...emptyForm });
            setShowAddModal(false);
        } catch (e) {
            console.error("Ошибка при добавлении:", e);
        }
    }, [backendURL, buildPayload, newItem, fetchItems]);

    const handleExport = useCallback(() => {
        const cols = fields.map(({ key, label }) => ({ key, label }));
        exportToExcel(items, cols, "Настройки кэшбэка");
    }, [items, exportToExcel]);

    const columns = useMemo(() => {
        const actionCol = {
            title: "Действия",
            key: "actions",
            width: 150,
            render: (_, item) => editId === item.ID ? (
                <button onClick={handleSave} className="action-buttons__btn">Сохранить</button>
            ) : (
                <button onClick={() => handleDelete(item.ID)} className="action-buttons__btn">Удалить</button>
            ),
        };

        const dataCols = fields.map((field) => ({
            title: field.label,
            dataIndex: field.key,
            key: field.key,
            render: (_, item) => {
                const isEditing = editId === item.ID;
                if (isEditing) {
                    return (
                        <EditableCell
                            field={field}
                            value={editedItem[field.key]}
                            onChange={(val) => setEditedItem(prev => ({ ...prev, [field.key]: val }))}
                            onSave={handleSave}
                        />
                    );
                }
                return (
                    <div onDoubleClick={() => handleDoubleClick(item)}>
                        <ReadonlyCell value={item[field.key]} fieldType={field.type} />
                    </div>
                );
            },
        }));
        return [...dataCols, actionCol];
    }, [editId, editedItem, handleSave, handleDelete, handleDoubleClick]);

    return (
        <div className="block_info_prems content-page">
            <div className="table-header-actions" style={{ margin: "16px" }}>
                <h2>Настройки кэшбэка</h2>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <button className="action-buttons__btn" onClick={() => setShowAddModal(true)}>+ Добавить настройку</button>
                    <button className="export-excel-btn" onClick={handleExport}>Экспорт в Excel</button>
                </div>
            </div>

            <AddCashbackModal
                isOpen={showAddModal}
                onClose={() => { setShowAddModal(false); setNewItem({ ...emptyForm }); }}
                newItem={newItem}
                setNewItem={setNewItem}
                onSave={handleAdd}
            />

            {error ? (
                <p style={{ color: "red", margin: "16px" }}>{error}</p>
            ) : (
                <Table
                    tableId="cashback-settings"
                    columns={columns}
                    dataSource={items}
                    rowKey={(record) => record?.ID ?? record?.id}
                    loading={{ spinning: loading, indicator: <Spinner size="small" /> }}
                    pagination={false}
                    bordered
                    scroll={{ x: "max-content" }}
                    locale={{ emptyText: "Нет данных" }}
                />
            )}
        </div>
    );
};

export default TableCashbackSettings;
