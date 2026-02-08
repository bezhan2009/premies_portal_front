import React, { useEffect, useState, useCallback } from "react";
import "../../../../styles/components/Table.scss";
import "../../../../styles/components/ProcessingIntegration.scss";
import "../../../../styles/components/AddCardPriceForm.scss";
import "../../../../styles/components/SearchBar.scss";
import { useExcelExport } from "../../../../hooks/useExcelExport.js";
import { useTableSort } from "../../../../hooks/useTableSort.js";
import SortIcon from "../../../general/SortIcon.jsx";

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

  const { items: sortedCards, requestSort, sortConfig } = useTableSort(cards);

  // загрузка всех карт
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

      console.log("API data:", data);

      if (Array.isArray(data)) {
        setCards(data);
      } else if (data && Array.isArray(data.data)) {
        setCards(data.data);
      } else {
        console.error("Неправильный формат ответа:", data);
        setCards([]);
      }
    } catch (e) {
      console.error("Ошибка загрузки:", e);
      setError("Ошибка загрузки данных");
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [backendURL]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  // двойной клик для редактирования
  const handleDoubleClick = (card) => {
    setEditId(card.ID);
    setEditedCard({ ...card });
  };

  // сохранение изменений (PATCH)
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

      if (!response.ok) throw new Error("Ошибка при обновлении");

      setCards((prev) =>
        prev.map((c) => (c.ID === id ? { ...editedCard } : c)),
      );
      setEditId(null);
    } catch (e) {
      console.error("Ошибка при сохранении:", e);
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

      if (!response.ok) throw new Error("Ошибка при удалении");

      setCards((prev) => prev.filter((c) => c.ID !== id));
    } catch (e) {
      console.error("Ошибка при удалении:", e);
    }
  };

  // добавление новой карты (POST)
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

      if (!response.ok) throw new Error("Ошибка при добавлении");

      // Опционально: можно обновлять локально
      // const created = await response.json();
      // setCards((prev) => [...prev, created]);

      // Небольшой подход: заново загрузить данные через GET
      await fetchCards();

      setNewCard({
        title: "",
        code: "",
      });
    } catch (e) {
      console.error("Ошибка при добавлении:", e);
    }
  };

  const handleExport = () => {
    const columns = [
      { key: "title", label: "Название" },
      { key: "code", label: "Код" },
    ];
    exportToExcel(sortedCards, columns, "Мерчанты");
  };

  return (
    <div>
      <div className="table-header-actions" style={{ marginBottom: "10px" }}>
        <h2>Мерчанты</h2>
        <button className="export-excel-btn" onClick={handleExport}>
          Экспорт в Excel
        </button>
      </div>

      {/* Форма для добавления новой карты перемещена сюда */}
      <div className="add-card-form" style={{ marginBottom: "20px" }}>
        <h3>Добавить нового мерчанта</h3>
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <input
            value={newCard.title}
            onChange={(e) => setNewCard({ ...newCard, title: e.target.value })}
            placeholder="Название"
          />
          <input
            value={newCard.code}
            onChange={(e) =>
              setNewCard({ ...newCard, code: String(e.target.value) })
            }
            placeholder="Код"
          />
          <button onClick={handleAdd} className="action-buttons__btn">
            Добавить
          </button>
        </div>
      </div>

      {loading ? (
        <p>Загрузка...</p>
      ) : error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : (
        <table className="table-reports">
          <thead>
            <tr>
              <th
                onClick={() => requestSort("title")}
                className="sortable-header"
              >
                Название <SortIcon sortConfig={sortConfig} sortKey="title" />
              </th>
              <th
                onClick={() => requestSort("code")}
                className="sortable-header"
              >
                Код <SortIcon sortConfig={sortConfig} sortKey="code" />
              </th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(sortedCards) && sortedCards.length > 0 ? (
              sortedCards.map((card) => (
                <tr key={card.ID}>
                  <td onDoubleClick={() => handleDoubleClick(card)}>
                    {editId === card.ID ? (
                      <input
                        value={editedCard.title}
                        onChange={(e) =>
                          setEditedCard({
                            ...editedCard,
                            title: e.target.value,
                          })
                        }
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleSave(card.ID)
                        }
                        autoFocus
                      />
                    ) : (
                      card.title
                    )}
                  </td>
                  <td onDoubleClick={() => handleDoubleClick(card)}>
                    {editId === card.ID ? (
                      <input
                        value={editedCard.code}
                        onChange={(e) =>
                          setEditedCard({
                            ...editedCard,
                            code: String(e.target.value),
                          })
                        }
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleSave(card.ID)
                        }
                      />
                    ) : (
                      card.code
                    )}
                  </td>
                  <td>
                    {editId === card.ID ? (
                      <button
                        onClick={() => handleSave(card.ID)}
                        className="action-buttons__btn"
                      >
                        Сохранить
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDelete(card.ID)}
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
                <td colSpan="6" style={{ textAlign: "center" }}>
                  Нет данных
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default TableCardMargents;
