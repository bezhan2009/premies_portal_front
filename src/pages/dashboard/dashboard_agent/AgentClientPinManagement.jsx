import React, { useEffect, useState, useCallback } from "react";
import { useExcelExport } from "../../../hooks/useExcelExport.js";
import { useTableSort } from "../../../hooks/useTableSort.js";
import SortIcon from "../../../components/general/SortIcon.jsx";
import Modal from "../../../components/general/Modal.jsx";
import Input from "../../../components/elements/Input.jsx";
import Spinner from "../../../components/Spinner.jsx";

const TABLE_COLUMNS = [
  { key: "id", label: "ID" },
  { key: "client_code", label: "Код клиента" },
  { key: "pin", label: "PIN-код" },
  { key: "created_at", label: "Дата создания" },
];

const EMPTY_FORM = {
  client_code: "",
  pin: "",
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

const PinFormModal = ({ isOpen, onClose, form, setForm, onSave, title }) => {
  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div style={{ padding: "4px 0 16px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "14px",
            marginBottom: "20px",
          }}
        >
          <div>
            <label style={styles.label}>Код клиента</label>
            <Input
              id="client_code"
              type="text"
              value={form.client_code ?? ""}
              onChange={(value) => handleChange("client_code", value.trim())}
              placeholder="Введите уникальный код клиента"
            />
          </div>

          <div>
            <label style={styles.label}>PIN-код (5 цифр)</label>
            <Input
              id="pin"
              type="password"
              maxLength={5}
              value={form.pin ?? ""}
              onChange={(value) => handleChange("pin", value.replace(/\D/g, "").slice(0, 5))}
              placeholder="*****"
            />
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
            {form.id ? "Сохранить" : "Создать"}
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
          <h1>Удаление PIN-кода</h1>
          <p>
            Вы уверены, что хотите удалить PIN-код для этого клиента?
            <br />
            <strong>Код клиента:</strong> {item.client_code || "—"}
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

const AgentClientPinManagement = () => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const token = localStorage.getItem("access_token");

  const { exportToExcel } = useExcelExport();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const { items: sortedItems, requestSort, sortConfig } = useTableSort(items);

  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);

  const [alert, setAlert] = useState(null);

  const showAlert = (message, type = "success") => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 3500);
  };

  const request = useCallback(
    async (path, options = {}) => {
      const url = `${backendUrl}${path}`;
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
    [backendUrl, token],
  );

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const json = await request("/agent-client-pin");
      const data = Array.isArray(json) ? json : json.data ?? [];
      setItems(data);
    } catch (e) {
      console.error("Ошибка загрузки PIN-кодов:", e);
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
      item.client_code,
      item.pin,
    ].some((value) => value && String(value).toLowerCase().includes(query));
  });

  const handleSave = async () => {
    if (!createForm.client_code) {
      showAlert("Код клиента обязателен", "error");
      return;
    }
    if (!createForm.pin || createForm.pin.length !== 5) {
      showAlert("PIN-код должен состоять ровно из 5 цифр", "error");
      return;
    }

    const isEdit = !!createForm.id;
    try {
      if (isEdit) {
        await request(`/agent-client-pin/${createForm.id}`, {
          method: "PUT",
          body: JSON.stringify({
            client_code: createForm.client_code,
            pin: createForm.pin,
          }),
        });
        showAlert("PIN-код успешно обновлен");
      } else {
        await request("/agent-client-pin", {
          method: "POST",
          body: JSON.stringify(createForm),
        });
        showAlert("PIN-код успешно создан");
      }
      setShowCreate(false);
      setCreateForm(EMPTY_FORM);
      fetchItems();
    } catch (e) {
      console.error(e);
      showAlert(e.message || "Ошибка при сохранении PIN-кода", "error");
    }
  };

  const openEdit = (item) => {
    setCreateForm({
      id: item.id || item.ID,
      client_code: item.client_code,
      pin: item.pin,
    });
    setShowCreate(true);
  };

  const openDelete = (item) => {
    setDeleteTarget(item);
    setShowDelete(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await request(`/agent-client-pin/${deleteTarget.id || deleteTarget.ID}`, { method: "DELETE" });
      showAlert("PIN-код удален");
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
      "PIN-коды клиентов",
    );
  };

  const formatCell = (key, value) => {
    if (value === null || value === undefined || value === "") return "—";
    if (key === "CreatedAt") return fmtDateTime(value);
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
            <h2 style={{ margin: 0 }}>Управление PIN-кодами клиентов</h2>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div className="search-bar" style={{ marginBottom: 0 }}>
                <input
                  type="text"
                  placeholder="Поиск по коду клиента..."
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
                + Добавить PIN
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 16 }}>
              <Spinner center label="Загружаем PIN-коды клиентов" />
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
                              style={{ padding: "4px 12px", fontSize: 13, backgroundColor: "#007bff", color: "#fff" }}
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

      <PinFormModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        form={createForm}
        setForm={setCreateForm}
        onSave={handleSave}
        title={createForm.id ? "Редактирование PIN-кода клиента" : "Новый PIN-код клиента"}
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

export default AgentClientPinManagement;
