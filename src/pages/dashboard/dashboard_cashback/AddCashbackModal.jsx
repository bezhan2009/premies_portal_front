import React, { useState } from "react";
import Modal from "../../../components/general/Modal.jsx";

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
    { key: "cashback_priority", label: "Приоритет кешбека", type: "number", step: "1" }, // ← новая колонка
];

// ── TagInput ──────────────────────────────────────────────────────────────────
const TagInput = ({ tags, onChange }) => {
    const [inputVal, setInputVal] = useState("");

    const addTags = (raw) => {
        const newTags = raw
            .split(/[,\s]+/)
            .map((s) => s.trim())
            .filter(Boolean);
        if (!newTags.length) return;
        const merged = [...new Set([...tags, ...newTags])];
        onChange(merged);
        setInputVal("");
    };

    const removeTag = (idx) => {
        onChange(tags.filter((_, i) => i !== idx));
    };

    const handleKeyDown = (e) => {
        if (["Enter", ",", " "].includes(e.key)) {
            e.preventDefault();
            addTags(inputVal);
        } else if (e.key === "Backspace" && !inputVal && tags.length) {
            removeTag(tags.length - 1);
        }
    };

    const handleBlur = () => {
        if (inputVal.trim()) addTags(inputVal);
    };

    return (
        <div style={styles.tagBox}>
            {tags.map((tag, i) => (
                <span key={i} style={styles.tag}>
                    {tag}
                    <button
                        type="button"
                        style={styles.tagRemove}
                        onClick={() => removeTag(i)}
                    >
                        ×
                    </button>
                </span>
            ))}
            <input
                style={styles.tagInput}
                value={inputVal}
                placeholder={tags.length ? "" : "Введите тип, затем Enter или запятую"}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
            />
        </div>
    );
};

// ── AddCashbackModal ──────────────────────────────────────────────────────────
const AddCashbackModal = ({ isOpen, onClose, newItem, setNewItem, onSave }) => {
    const handleChange = (key, value) => {
        setNewItem((prev) => ({ ...prev, [key]: value }));
    };

    // transaction_type всегда храним как массив внутри формы
    const tags = Array.isArray(newItem.transaction_type)
        ? newItem.transaction_type
        : newItem.transaction_type
            ? newItem.transaction_type.split(",").map((s) => s.trim()).filter(Boolean)
            : [];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Новая настройка кэшбэка">
            <div style={{ padding: "4px 0 16px" }}>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "14px",
                        marginBottom: "20px",
                    }}
                >
                    {/* Поле transaction_type — теги */}
                    <div style={{ gridColumn: "1 / -1" }}>
                        <label style={styles.label}>Тип транзакции</label>
                        <TagInput
                            tags={tags}
                            onChange={(val) => handleChange("transaction_type", val)}
                        />
                    </div>

                    {/* Остальные поля */}
                    {fields.map(({ key, label, type, step }) => (
                        <div key={key}>
                            <label style={styles.label}>{label}</label>
                            <input
                                type={type}
                                step={step}
                                value={newItem[key] ?? ""}
                                onChange={(e) => handleChange(key, e.target.value)}
                                placeholder={label}
                                style={styles.input}
                            />
                        </div>
                    ))}

                    {/* Чекбокс is_active */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", gridColumn: "1 / -1" }}>
                        <input
                            type="checkbox"
                            id="is_active"
                            checked={!!newItem.is_active}
                            onChange={(e) => handleChange("is_active", e.target.checked)}
                        />
                        <label htmlFor="is_active" style={{ cursor: "pointer" }}>Активен</label>
                    </div>
                </div>

                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                    <button
                        onClick={onClose}
                        className="action-buttons__btn"
                        style={{ backgroundColor: "#6c757d", color: "#fff" }}
                    >
                        Отмена
                    </button>
                    <button onClick={onSave} className="action-buttons__btn">
                        Сохранить
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const styles = {
    label: {
        display: "block",
        fontSize: "12px",
        fontWeight: 500,
        marginBottom: "4px",
        color: "#495057",
    },
    input: {
        width: "100%",
        padding: "7px 10px",
        border: "1px solid #ced4da",
        borderRadius: "4px",
        fontSize: "14px",
        boxSizing: "border-box",
    },
    tagBox: {
        display: "flex",
        flexWrap: "wrap",
        gap: "6px",
        padding: "6px 8px",
        border: "1px solid #ced4da",
        borderRadius: "4px",
        minHeight: "38px",
        alignItems: "center",
        cursor: "text",
        backgroundColor: "#fff",
    },
    tag: {
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        backgroundColor: "#e7f0ff",
        color: "rgba(235,37,37,0.62)",
        borderRadius: "4px",
        padding: "2px 8px",
        fontSize: "13px",
        fontWeight: 500,
    },
    tagRemove: {
        background: "none",
        border: "none",
        cursor: "pointer",
        color: "#eb2525",
        fontSize: "15px",
        lineHeight: 1,
        padding: "0 1px",
        display: "flex",
        alignItems: "center",
    },
    tagInput: {
        border: "none",
        outline: "none",
        fontSize: "14px",
        flex: 1,
        minWidth: "120px",
        background: "transparent",
    },
};

export default AddCashbackModal;
