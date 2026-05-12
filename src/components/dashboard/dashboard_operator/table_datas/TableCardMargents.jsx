import React, { useCallback, useEffect, useState } from "react";
import { Table } from "../../../table/FlexibleAntTable.jsx";
import { useExcelExport } from "../../../../hooks/useExcelExport.js";

const TableCardMargents = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editedCard, setEditedCard] = useState({});
  const [newCard, setNewCard] = useState({
    title: "",
    code: "",
  });

  const backendURL = import.meta.env.VITE_BACKEND_URL;
  const { exportToExcel } = useExcelExport();

  const fetchCards = useCallback(async () => {
    try {
      const token = localStorage.getItem("access_token");

      setLoading(true);
      const response = await fetch(`${backendURL}/merchants`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();

      if (Array.isArray(data)) {
        setCards(data);
      } else if (data && Array.isArray(data.data)) {
        setCards(data.data);
      } else {
        console.error("Неправильный формат ответа:", data);
        setCards([]);
      }
    } catch (error) {
      console.error("Ошибка загрузки:", error);
      setError("Ошибка загрузки данных");
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [backendURL]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const handleDoubleClick = (card) => {
    setEditId(card.ID);
    setEditedCard({ ...card });
  };

  const handleSave = async (id) => {
    try {
      const token = localStorage.getItem("access_token");

      const response = await fetch(`${backendURL}/merchants/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editedCard),
      });

      if (!response.ok) {
        throw new Error("Ошибка при обновлении");
      }

      setCards((previous) =>
        previous.map((card) => (card.ID === id ? { ...editedCard } : card)),
      );
      setEditId(null);
    } catch (error) {
      console.error("Ошибка при сохранении:", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem("access_token");

      const response = await fetch(`${backendURL}/merchants/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Ошибка при удалении");
      }

      setCards((previous) => previous.filter((card) => card.ID !== id));
    } catch (error) {
      console.error("Ошибка при удалении:", error);
    }
  };

  const handleAdd = async () => {
    try {
      const token = localStorage.getItem("access_token");

      const response = await fetch(`${backendURL}/merchants`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newCard),
      });

      if (!response.ok) {
        throw new Error("Ошибка при добавлении");
      }

      await fetchCards();
      setNewCard({
        title: "",
        code: "",
      });
    } catch (error) {
      console.error("Ошибка при добавлении:", error);
    }
  };

  const handleExport = () => {
    const columns = [
      { key: "title", label: "Название" },
      { key: "code", label: "Код" },
    ];

    exportToExcel(cards, columns, "Мерчанты");
  };

  const renderEditableCell = (card, field) => {
    const isEditing = editId === card.ID;

    if (isEditing) {
      return (
        <input
          value={editedCard[field] ?? ""}
          onChange={(event) =>
            setEditedCard((previous) => ({
              ...previous,
              [field]:
                field === "code"
                  ? String(event.target.value)
                  : event.target.value,
            }))
          }
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleSave(card.ID);
            }
          }}
          autoFocus={field === "title"}
        />
      );
    }

    return (
      <div
        onDoubleClick={() => handleDoubleClick(card)}
        style={{ cursor: "pointer" }}
      >
        {card[field]}
      </div>
    );
  };

  return (
    <div>
      <div className="table-header-actions" style={{ marginBottom: "10px" }}>
        <h2>Мерчанты</h2>
        <button className="export-excel-btn" onClick={handleExport}>
          Экспорт в Excel
        </button>
      </div>

      <div className="add-card-form" style={{ marginBottom: "20px" }}>
        <h3>Добавить нового мерчанта</h3>
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
          <input
            value={newCard.title}
            onChange={(event) =>
              setNewCard((previous) => ({
                ...previous,
                title: event.target.value,
              }))
            }
            placeholder="Название"
          />
          <input
            value={newCard.code}
            onChange={(event) =>
              setNewCard((previous) => ({
                ...previous,
                code: String(event.target.value),
              }))
            }
            placeholder="Код"
          />
          <button onClick={handleAdd} className="action-buttons__btn">
            Добавить
          </button>
        </div>
      </div>

      {error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : (
        <Table
          tableId="operator-merchants-table"
          dataSource={cards}
          rowKey={(record) => record.ID}
          loading={loading}
          bordered
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: "max-content" }}
          locale={{ emptyText: "Нет данных" }}
        >
          <Table.Column
            title="Название"
            dataIndex="title"
            key="title"
            render={(_, record) => renderEditableCell(record, "title")}
          />
          <Table.Column
            title="Код"
            dataIndex="code"
            key="code"
            render={(_, record) => renderEditableCell(record, "code")}
          />
          <Table.Column
            title="Действия"
            key="actions"
            sortable={false}
            render={(_, record) =>
              editId === record.ID ? (
                <button
                  onClick={() => handleSave(record.ID)}
                  className="action-buttons__btn"
                >
                  Сохранить
                </button>
              ) : (
                <button
                  onClick={() => handleDelete(record.ID)}
                  className="action-buttons__btn"
                >
                  Удалить
                </button>
              )
            }
          />
        </Table>
      )}
    </div>
  );
};

export default TableCardMargents;
