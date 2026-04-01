import React, { useEffect, useState, useCallback } from "react";
import "../../styles/components/Table.scss";
import "../../styles/components/ProcessingIntegration.scss";
import "../../styles/components/AddCardPriceForm.scss";
import "../../styles/components/SearchBar.scss";
import { useExcelExport } from "../../hooks/useExcelExport.js";
import { useTableSort } from "../../hooks/useTableSort.js";
import SortIcon from "../../components/general/SortIcon.jsx";
import Modal from "../../components/general/Modal.jsx";
import Select from "../../components/elements/Select.jsx";
import Input from "../../components/elements/Input.jsx";
import Spinner from "../../components/Spinner.jsx";

export const bankOptions = [
  { bic: "350101101", name: "Национальный банк Таджикистана (НБТ)" },
  { bic: "350101369", name: 'ОАО "Ориёнбанк"' },
  { bic: "350101626", name: 'ГУП СБ РТ "Амонатбанк"' },
  { bic: "350101655", name: 'ГУП ПЭБТ "Саноатсодиротбонк"' },
  { bic: "350101706", name: 'Филиал КБ "Тижорат"' },
  { bic: "350101720", name: 'ОАО "Тавхидбонк"' },
  { bic: "350101736", name: 'ЗАО "Бонки рушди Точикистон"' },
  { bic: "350101779", name: 'ЗАО "Актив Бонк"' },
  { bic: "350101803", name: 'ЗАО "Бонки байналмилалии Точикистон"' },
  { bic: "350101805", name: 'ЗАО "Инвестиционно-кредитный банк Таджикистан"' },
  { bic: "350101808", name: 'ЗАО "Спитамен Бонк"' },
  { bic: "350101815", name: 'ЗАО "Фридом Бонк Точикистон"' },
  { bic: "350101820", name: 'ЗАО "Васл Бонк"' },
  { bic: "350101841", name: 'ЗАО "Душанбе Сити Бонк"' },
  { bic: "350101858", name: 'ОАО "Коммерцбонк Таджикистана"' },
  { bic: "350101892", name: 'ЗАО "Хумо Бонк"' },
  { bic: "350101900", name: 'ОАО "АлифБонк"' },
  { bic: "350501707", name: 'ОАО "Бонки Эсхата"' },
  { bic: "350501848", name: 'ЗАО Бонки "Арванд"' },
  { bic: "350501876", name: 'ЗАО Бонки "Имон Интернейшнл"' },
];

const TEXT_FIELDS = [
  { key: "beneficiary_idn", label: "ИНН получателя" },
  { key: "beneficiary_name", label: "Имя получателя" },
  { key: "beneficiary_iban", label: "IBAN получателя" },
  { key: "payment_details", label: "Детали платежа" },
  { key: "payer_idn", label: "ИНН плательщика" },
  { key: "payer_name", label: "Имя плательщика" },
  { key: "payer_iban", label: "IBAN плательщика" },
];

const TABLE_COLUMNS = [
  { key: "ID", label: "ID" },
  { key: "payer_iban", label: "IBAN плательщика" },
  { key: "payer_name", label: "Имя плательщика" },
  { key: "payer_idn", label: "ИНН плательщика" },
  { key: "beneficiary_iban", label: "IBAN получателя" },
  { key: "beneficiary_name", label: "Имя получателя" },
  { key: "beneficiary_idn", label: "ИНН получателя" },
  { key: "payment_details", label: "Детали платежа" },
  { key: "bic", label: "БИК" },
  { key: "is_active", label: "Активен" },
  { key: "CreatedAt", label: "Дата создания" },
];

const EMPTY_FORM = {
  beneficiary_idn: "",
  beneficiary_name: "",
  beneficiary_iban: "",
  payment_details: "",
  payer_idn: "",
  payer_name: "",
  payer_iban: "",
  bic: "",
  is_active: true,
};

const fmtDateTime = (value) => {
  if (!value) return "—";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("ru-RU");
  } catch {
    return value;
  }
};

const bicLabel = (bic) => {
  const bank = bankOptions.find((item) => item.bic === bic);
  return bank ? `${bank.name} (${bank.bic})` : bic || "—";
};

const WithdrawFormModal = ({ isOpen, onClose, form, setForm, onSave, title }) => {
  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div style={{ padding: "4px 0 16px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "14px",
            marginBottom: "20px",
          }}
        >
          {TEXT_FIELDS.map(({ key, label }) => (
            <div key={key}>
              <label style={styles.label}>{label}</label>
              <Input
                id={key}
                type="text"
                value={form[key] ?? ""}
                onChange={(value) => handleChange(key, value)}
                placeholder={label}
              />
            </div>
          ))}

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={styles.label}>БИК банка получателя</label>
            <Select
              title="БИК банка получателя"
              value={form.bic || ""}
              onChange={(value) => handleChange("bic", value)}
              options={[
                { value: "", label: "Выберите банк" },
                ...bankOptions.map((bank) => ({
                  value: bank.bic,
                  label: `${bank.name} (${bank.bic})`,
                })),
              ]}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, gridColumn: "1 / -1" }}>
            <input
              type="checkbox"
              id="is_active_modal"
              checked={!!form.is_active}
              onChange={(e) => handleChange("is_active", e.target.checked)}
            />
            <label htmlFor="is_active_modal" style={{ cursor: "pointer" }}>
              Активен
            </label>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
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

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, item }) => {
  if (!isOpen || !item) return null;

  return (
    <div className="logout-confirmation">
      <div className="confirmation-box">
        <div>
          <h1>Удаление настройки</h1>
          <p>
            Вы уверены, что хотите удалить настройку?
            <br />
            <strong>IBAN плательщика:</strong> {item.payer_iban || "—"}
            <br />
            <strong>Имя:</strong> {item.payer_name || "—"}
            <br />
            <br />
            Это действие необратимо.
          </p>
        </div>
        <div className="confirmation-buttons">
          <button
            className="confirm-btn"
            style={{ backgroundColor: "#dc3545" }}
            onClick={onConfirm}
          >
            Удалить
          </button>
          <button className="cancel-btn" onClick={onClose}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
};

const AbsWithdrawSettings = () => {
  const backendABS = import.meta.env.VITE_BACKEND_ABS_SERVICE_URL;
  const token = localStorage.getItem("access_token");

  const { exportToExcel } = useExcelExport();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const { items: sortedItems, requestSort, sortConfig } = useTableSort(items);

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  const [alert, setAlert] = useState(null);

  const showAlert = (message, type = "success") => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 3500);
  };

  const request = useCallback(
    async (path, options = {}) => {
      const url = `${backendABS}${path}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers || {}),
        },
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json.error || json.message || `HTTP ${response.status}`);
      }
      return json;
    },
    [backendABS, token],
  );

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const json = await request("/abs-withdraw");
      const data = Array.isArray(json) ? json : json.data ?? [];
      setItems(data);
    } catch (e) {
      console.error("Ошибка загрузки:", e);
      setError("Ошибка загрузки данных");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const baseItems = sortedItems.length ? sortedItems : items;
  const displayItems = baseItems.filter((item) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return [
      item.payer_iban,
      item.payer_name,
      item.payer_idn,
      item.beneficiary_iban,
      item.beneficiary_name,
      item.beneficiary_idn,
      item.bic,
      item.payment_details,
    ].some((value) => value && String(value).toLowerCase().includes(query));
  });

  const handleCreate = async () => {
    try {
      await request("/abs-withdraw", {
        method: "POST",
        body: JSON.stringify(createForm),
      });
      showAlert("Настройка успешно создана");
      setShowCreate(false);
      setCreateForm(EMPTY_FORM);
      fetchItems();
    } catch (e) {
      console.error(e);
      showAlert(e.message || "Ошибка при создании настройки", "error");
    }
  };

  const openEdit = (item) => {
    setEditTarget(item);
    setEditForm({
      beneficiary_idn: item.beneficiary_idn || "",
      beneficiary_name: item.beneficiary_name || "",
      beneficiary_iban: item.beneficiary_iban || "",
      payment_details: item.payment_details || "",
      payer_idn: item.payer_idn || "",
      payer_name: item.payer_name || "",
      payer_iban: item.payer_iban || "",
      bic: item.bic || "",
      is_active: item.is_active ?? true,
    });
    setShowEdit(true);
  };

  const handleUpdate = async () => {
    if (!editTarget) return;

    try {
      await request(`/abs-withdraw/${editTarget.ID}`, {
        method: "PUT",
        body: JSON.stringify(editForm),
      });
      showAlert("Настройка успешно обновлена");
      setShowEdit(false);
      setEditTarget(null);
      fetchItems();
    } catch (e) {
      console.error(e);
      showAlert(e.message || "Ошибка при обновлении", "error");
    }
  };

  const openDelete = (item) => {
    setDeleteTarget(item);
    setShowDelete(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await request(`/abs-withdraw/${deleteTarget.ID}`, { method: "DELETE" });
      showAlert("Настройка удалена");
      setShowDelete(false);
      setDeleteTarget(null);
      fetchItems();
    } catch (e) {
      console.error(e);
      showAlert(e.message || "Ошибка при удалении", "error");
    }
  };

  const handleExport = () => {
    exportToExcel(
      displayItems,
      TABLE_COLUMNS.map(({ key, label }) => ({ key, label })),
      "АБС Настройки списаний",
    );
  };

  const formatCell = (key, value) => {
    if (value === null || value === undefined || value === "") return "—";
    if (key === "is_active") return value ? "✅ Да" : "❌ Нет";
    if (key === "CreatedAt") return fmtDateTime(value);
    if (key === "bic") return bicLabel(value);
    return String(value);
  };

  return (
    <div className="page-content-wrapper content-page">
      <div className="applications-list" style={{ flexDirection: "column", gap: "20px", height: "auto" }}>
        <main>
          <div
            className="table-header-actions"
            style={{
              margin: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <h2 style={{ margin: 0 }}>Настройки АБС-списаний</h2>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div className="search-bar" style={{ marginBottom: 0 }}>
                <input
                  type="text"
                  placeholder="Поиск по IBAN, имени, ИНН…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ minWidth: 240 }}
                />
              </div>
              <button className="export-excel-btn" onClick={handleExport}>
                Экспорт в Excel
              </button>
              <button
                className="action-buttons__btn"
                onClick={() => {
                  setCreateForm(EMPTY_FORM);
                  setShowCreate(true);
                }}
              >
                + Добавить
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 16 }}>
              <Spinner center label="Загружаем настройки списаний" />
            </div>
          ) : error ? (
            <p style={{ color: "red", margin: 16 }}>{error}</p>
          ) : (
            <div className="my-applications-content" style={{ overflowX: "auto", width: "100%" }}>
              <table className="table-reports" style={{ minWidth: "max-content" }}>
                <thead>
                  <tr>
                    {TABLE_COLUMNS.map(({ key, label }) => (
                      <th key={key} onClick={() => requestSort(key)} className="sortable-header">
                        {label}
                        <SortIcon sortConfig={sortConfig} sortKey={key} />
                      </th>
                    ))}
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {displayItems.length > 0 ? (
                    displayItems.map((item) => (
                      <tr key={item.ID}>
                        {TABLE_COLUMNS.map(({ key }) => (
                          <td key={key}>{formatCell(key, item[key])}</td>
                        ))}
                        <td>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              className="action-buttons__btn"
                              style={{ padding: "4px 12px", fontSize: 13 }}
                              onClick={() => openEdit(item)}
                            >
                              Изменить
                            </button>
                            <button
                              className="action-buttons__btn"
                              style={{ padding: "4px 12px", fontSize: 13, backgroundColor: "#dc3545", color: "#fff" }}
                              onClick={() => openDelete(item)}
                            >
                              Удалить
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={TABLE_COLUMNS.length + 1} style={{ textAlign: "center" }}>
                        Нет данных
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      <WithdrawFormModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        form={createForm}
        setForm={setCreateForm}
        onSave={handleCreate}
        title="Новая настройка списания"
      />

      <WithdrawFormModal
        isOpen={showEdit}
        onClose={() => {
          setShowEdit(false);
          setEditTarget(null);
        }}
        form={editForm}
        setForm={setEditForm}
        onSave={handleUpdate}
        title={`Редактирование настройки #${editTarget?.ID ?? ""}`}
      />

      <DeleteConfirmModal
        isOpen={showDelete}
        onClose={() => {
          setShowDelete(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
        item={deleteTarget}
      />

      {alert && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            padding: "12px 20px",
            borderRadius: 10,
            backgroundColor: alert.type === "success" ? "#d4edda" : "#f8d7da",
            color: alert.type === "success" ? "#155724" : "#721c24",
            border: `1px solid ${alert.type === "success" ? "#c3e6cb" : "#f5c6cb"}`,
            fontWeight: 500,
            zIndex: 9999,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          {alert.message}
        </div>
      )}
    </div>
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
};

export default AbsWithdrawSettings;
