import React, { useEffect, useState, useCallback, useMemo } from "react";
import "../../../styles/components/Table.scss";
import "../../../styles/components/ProcessingIntegration.scss";
import "../../../styles/components/AddCardPriceForm.scss";
import "../../../styles/components/SearchBar.scss";
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
  { key: "is_active", label: "Активен", type: "checkbox" },
];

// ─── Ключевое исправление ────────────────────────────────────────────────────
// Рекурсивно разворачивает вложенные JSON-строки и фигурные-скобочные литералы
// до тех пор, пока не получится чистый массив строк без слешей.
const parseTransactionType = (value) => {
  if (Array.isArray(value)) {
    // Если массив — разворачиваем каждый элемент рекурсивно
    return value.flatMap((v) => parseTransactionType(v));
  }

  if (value === null || value === undefined || value === "") return [];

  let str = String(value).trim();

  // Пока строка выглядит как JSON или обёрнута в лишние кавычки — разворачиваем
  let prev = null;
  while (str !== prev) {
    prev = str;

    // Снимаем обрамляющие двойные кавычки (экранированный JSON)
    if (str.startsWith('"') && str.endsWith('"')) {
      try {
        const parsed = JSON.parse(str);
        if (typeof parsed === "string") {
          str = parsed.trim();
          continue;
        }
        if (Array.isArray(parsed)) {
          return parsed.flatMap((v) => parseTransactionType(v));
        }
      } catch {
        // не JSON — идём дальше
      }
    }

    // Пробуем разобрать как JSON-массив или JSON-строку
    if (str.startsWith("[") || str.startsWith("{")) {
      try {
        const parsed = JSON.parse(str);
        if (Array.isArray(parsed)) {
          return parsed.flatMap((v) => parseTransactionType(v));
        }
        if (typeof parsed === "string") {
          str = parsed.trim();
          continue;
        }
      } catch {
        // не валидный JSON
      }
    }

    // PostgreSQL / Go-массив вида {680,774,678}
    if (str.startsWith("{") && str.endsWith("}")) {
      const inner = str.slice(1, -1).trim();
      if (inner) {
        return inner
          .split(",")
          .map((v) => v.trim().replace(/^"+|"+$/g, ""))
          .filter(Boolean);
      }
      return [];
    }
  }

  // Если осталась обычная строка с запятыми — разбиваем
  return str
    .split(",")
    .map((v) => v.trim().replace(/^"+|"+$/g, ""))
    .filter(Boolean);
};
// ────────────────────────────────────────────────────────────────────────────

const tagBoxStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "4px",
  padding: "4px 6px",
  border: "1px solid #ced4da",
  borderRadius: "4px",
  minHeight: "32px",
  alignItems: "center",
  background: "#fff",
  minWidth: "160px",
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

const tagRemoveStyle = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "#2563eb",
  fontSize: "14px",
  lineHeight: 1,
  padding: 0,
};

const tagInputStyle = {
  border: "none",
  outline: "none",
  fontSize: "13px",
  flex: 1,
  minWidth: "80px",
  background: "transparent",
};

const InlineTagInput = ({ tags, onChange }) => {
  const [inputVal, setInputVal] = useState("");

  const addTags = (raw) => {
    const newTags = raw
      .split(/[,\s]+/)
      .map((v) => v.trim())
      .filter(Boolean);
    if (!newTags.length) return;
    onChange([...new Set([...tags, ...newTags])]);
    setInputVal("");
  };

  const removeTag = (idx) => onChange(tags.filter((_, i) => i !== idx));

  const handleKeyDown = (event) => {
    if (["Enter", ","].includes(event.key)) {
      event.preventDefault();
      addTags(inputVal);
      return;
    }
    if (event.key === "Backspace" && !inputVal && tags.length) {
      removeTag(tags.length - 1);
    }
  };

  return (
    <div style={tagBoxStyle}>
      {tags.map((tag, index) => (
        <span key={index} style={tagStyle}>
          {tag}
          <button type="button" style={tagRemoveStyle} onClick={() => removeTag(index)}>
            x
          </button>
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
};

const TagDisplay = ({ value }) => {
  const tags = parseTransactionType(value); // ← используем новый парсер

  if (!tags.length) return <span style={{ color: "#aaa" }}>-</span>;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
      {tags.map((tag, index) => (
        <span key={index} style={tagStyle}>
          {tag}
        </span>
      ))}
    </div>
  );
};

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

  const handleDoubleClick = useCallback((item) => {
    setEditId(item.ID);
    setEditedItem({
      ...item,
      // parseTransactionType гарантирует чистый массив строк
      transaction_type: parseTransactionType(item.transaction_type),
    });
  }, []);

  const toDateOnly = (value) => {
    if (!value) return "";
    return String(value).includes("T") ? String(value).slice(0, 10) : value;
  };

  const buildPayload = useCallback(
    (raw) => ({
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
      from_date: toDateOnly(raw.from_date),
      to_date: toDateOnly(raw.to_date),
      // Отправляем ТОЛЬКО чистый массив строк — никакого JSON.stringify
      transaction_type: parseTransactionType(raw.transaction_type),
    }),
    [],
  );

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const payload = buildPayload(editedItem);
      const response = await fetch(`${backendURL}/cashback-settings/${editId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Ошибка при обновлении");

      setItems((prev) =>
        prev.map((item) => (item.ID === editId ? { ...payload, ID: editId } : item)),
      );
      setEditId(null);
      setEditedItem({});
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

      setItems((prev) => prev.filter((item) => item.ID !== id));
    } catch (e) {
      console.error("Ошибка при удалении:", e);
    }
  };

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
      setShowAddModal(false);
    } catch (e) {
      console.error("Ошибка при добавлении:", e);
    }
  };

  const handleExport = () => {
    const columns = fields.map(({ key, label }) => ({ key, label }));
    exportToExcel(items, columns, "Настройки кэшбэка");
  };

  const formatValue = (value, fieldType) => {
    if (fieldType === "checkbox") return value ? "Да" : "Нет";
    if (fieldType === "tags") return null;
    if (value === null || value === undefined || value === "") return "-";
    if (Array.isArray(value)) return value.join(", ") || "-";
    if (fieldType === "date") {
      try {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleDateString("ru-RU");
      } catch {
        return value;
      }
    }
    return String(value);
  };

  const renderCell = useCallback(
    (item, field) => {
      const isEditing = editId === item.ID;

      if (field.type === "tags") {
        if (!isEditing) return <TagDisplay value={item[field.key]} />;

        return (
          <InlineTagInput
            tags={
              Array.isArray(editedItem[field.key])
                ? editedItem[field.key]
                : parseTransactionType(editedItem[field.key])
            }
            onChange={(value) => setEditedItem({ ...editedItem, [field.key]: value })}
          />
        );
      }

      if (!isEditing) return formatValue(item[field.key], field.type);

      let inputVal = editedItem[field.key] ?? "";
      if (field.type === "date" && inputVal) {
        try {
          inputVal = new Date(inputVal).toISOString().slice(0, 10);
        } catch {
          inputVal = editedItem[field.key] ?? "";
        }
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
          style={{
            width: "100%",
            minWidth: "80px",
            boxSizing: "border-box",
            padding: "4px 6px",
            border: "1px solid #ced4da",
            borderRadius: "4px",
            fontSize: "13px",
          }}
          onChange={(e) =>
            setEditedItem({ ...editedItem, [field.key]: e.target.value })
          }
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
        />
      );
    },
    [editId, editedItem, handleSave],
  );

  const columns = useMemo(
    () => [
      ...fields.map((field) => ({
        title: field.label,
        dataIndex: field.key,
        key: field.key,
        render: (_, item) => (
          <div onDoubleClick={() => handleDoubleClick(item)}>
            {renderCell(item, field)}
          </div>
        ),
      })),
      {
        title: "Действия",
        key: "actions",
        sortable: false,
        width: 150,
        render: (_, item) =>
          editId === item.ID ? (
            <button onClick={handleSave} className="action-buttons__btn">
              Сохранить
            </button>
          ) : (
            <button
              onClick={() => handleDelete(item.ID)}
              className="action-buttons__btn"
            >
              Удалить
            </button>
          ),
      },
    ],
    [editId, handleDelete, handleDoubleClick, handleSave, renderCell],
  );

  return (
    <div className="block_info_prems content-page">
      <div className="table-header-actions" style={{ margin: "16px" }}>
        <h2>Настройки кэшбэка</h2>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button className="action-buttons__btn" onClick={() => setShowAddModal(true)}>
            + Добавить настройку
          </button>
          <button className="export-excel-btn" onClick={handleExport}>
            Экспорт в Excel
          </button>
        </div>
      </div>

      <AddCashbackModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setNewItem({ ...emptyForm });
        }}
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
          loading={{
            spinning: loading,
            indicator: <Spinner size="small" />,
          }}
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
