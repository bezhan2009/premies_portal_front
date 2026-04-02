import React, { useCallback, useEffect, useState } from "react";
import "../../../../styles/components/Table.scss";
import "../../../../styles/components/ProcessingIntegration.scss";
import "../../../../styles/components/AddCardPriceForm.scss";
import "../../../../styles/components/SearchBar.scss";
import { Table } from "../../../table/FlexibleAntTable.jsx";
import { useExcelExport } from "../../../../hooks/useExcelExport.js";

const TableCardPrices = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editedCard, setEditedCard] = useState({});
  const [newCard, setNewCard] = useState({
    dcl_name: "",
    coast_cards: "",
    coast_credits: "",
    category: "",
  });

  const backendURL = import.meta.env.VITE_BACKEND_URL;
  const { exportToExcel } = useExcelExport();

  const fetchCards = useCallback(async () => {
    try {
      const token = localStorage.getItem("access_token");

      setLoading(true);
      const response = await fetch(`${backendURL}/cards/prices`, {
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
    setEditId(card.id);
    setEditedCard({ ...card });
  };

  const handleSave = async (id) => {
    try {
      const token = localStorage.getItem("access_token");

      const response = await fetch(`${backendURL}/cards/prices/${id}`, {
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
        previous.map((card) => (card.id === id ? { ...editedCard } : card)),
      );
      setEditId(null);
    } catch (error) {
      console.error("Ошибка при сохранении:", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem("access_token");

      const response = await fetch(`${backendURL}/cards/prices/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Ошибка при удалении");
      }

      setCards((previous) => previous.filter((card) => card.id !== id));
    } catch (error) {
      console.error("Ошибка при удалении:", error);
    }
  };

  const handleAdd = async () => {
    try {
      const token = localStorage.getItem("access_token");

      const response = await fetch(`${backendURL}/cards/prices`, {
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
        dcl_name: "",
        coast_cards: "",
        coast_credits: "",
        category: "",
      });
    } catch (error) {
      console.error("Ошибка при добавлении:", error);
    }
  };

  const handleExport = () => {
    const columns = [
      { key: "dcl_name", label: "Название" },
      { key: "coast_cards", label: "Цена карт" },
      { key: "coast_credits", label: "Цена кредитов" },
      { key: "category", label: "Категория" },
    ];

    exportToExcel(cards, columns, "Цены_карт");
  };

  const renderEditableCell = (card, field, type = "text") => {
    const isEditing = editId === card.id;

    if (isEditing) {
      return (
        <input
          type={type}
          value={editedCard[field] ?? ""}
          onChange={(event) =>
            setEditedCard((previous) => ({
              ...previous,
              [field]:
                type === "number"
                  ? Number(event.target.value)
                  : event.target.value,
            }))
          }
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleSave(card.id);
            }
          }}
          autoFocus={field === "dcl_name"}
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
        <h2>Цены карт</h2>
        <button className="export-excel-btn" onClick={handleExport}>
          Экспорт в Excel
        </button>
      </div>

      <div className="add-card-form" style={{ marginBottom: "20px" }}>
        <h3>Добавить новую карту</h3>
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
          <input
            value={newCard.dcl_name}
            onChange={(event) =>
              setNewCard((previous) => ({
                ...previous,
                dcl_name: event.target.value,
              }))
            }
            placeholder="Название"
          />
          <input
            type="number"
            value={newCard.coast_cards}
            onChange={(event) =>
              setNewCard((previous) => ({
                ...previous,
                coast_cards: Number(event.target.value),
              }))
            }
            placeholder="Цена карт"
          />
          <input
            type="number"
            value={newCard.coast_credits}
            onChange={(event) =>
              setNewCard((previous) => ({
                ...previous,
                coast_credits: Number(event.target.value),
              }))
            }
            placeholder="Цена кредитов"
          />
          <input
            value={newCard.category}
            onChange={(event) =>
              setNewCard((previous) => ({
                ...previous,
                category: event.target.value,
              }))
            }
            placeholder="Категория"
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
          tableId="operator-card-prices-table"
          dataSource={cards}
          rowKey={(record) => record.id}
          loading={loading}
          bordered
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: "max-content" }}
          locale={{ emptyText: "Нет данных" }}
        >
          <Table.Column
            title="Название"
            dataIndex="dcl_name"
            key="dcl_name"
            render={(_, record) => renderEditableCell(record, "dcl_name")}
          />
          <Table.Column
            title="Цена карт"
            dataIndex="coast_cards"
            key="coast_cards"
            render={(_, record) => renderEditableCell(record, "coast_cards", "number")}
          />
          <Table.Column
            title="Цена кредитов"
            dataIndex="coast_credits"
            key="coast_credits"
            render={(_, record) =>
              renderEditableCell(record, "coast_credits", "number")
            }
          />
          <Table.Column
            title="Категория"
            dataIndex="category"
            key="category"
            render={(_, record) => renderEditableCell(record, "category")}
          />
          <Table.Column
            title="Действия"
            key="actions"
            sortable={false}
            render={(_, record) =>
              editId === record.id ? (
                <button
                  onClick={() => handleSave(record.id)}
                  className="action-buttons__btn"
                >
                  Сохранить
                </button>
              ) : (
                <button
                  onClick={() => handleDelete(record.id)}
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

export default TableCardPrices;
