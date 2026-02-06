import React, { useEffect, useState, useCallback } from "react";
import "../../../../styles/components/Table.scss";
import "../../../../styles/components/ProcessingIntegration.scss";
import "../../../../styles/components/AddCardPriceForm.scss";
import "../../../../styles/components/SearchBar.scss";
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

  // загрузка всех карт
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
    setEditId(card.id);
    setEditedCard({ ...card });
  };

  // сохранение изменений (PATCH)
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

      if (!response.ok) throw new Error("Ошибка при обновлении");

      setCards((prev) =>
        prev.map((c) => (c.id === id ? { ...editedCard } : c)),
      );
      setEditId(null);
    } catch (e) {
      console.error("Ошибка при сохранении:", e);
    }
  };

  // удаление (DELETE)
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

      if (!response.ok) throw new Error("Ошибка при удалении");

      setCards((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      console.error("Ошибка при удалении:", e);
    }
  };

  // добавление новой карты (POST)
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

      if (!response.ok) throw new Error("Ошибка при добавлении");

      // Опционально: можно обновлять локально
      // const created = await response.json();
      // setCards((prev) => [...prev, created]);

      // Небольшой подход: заново загрузить данные через GET
      await fetchCards();

      setNewCard({
        dcl_name: "",
        coast_cards: "",
        coast_credits: "",
        category: "",
      });
    } catch (e) {
      console.error("Ошибка при добавлении:", e);
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

  return (
    <div>
      <div className="table-header-actions" style={{ marginBottom: "10px" }}>
        <h2>Цены карт</h2>
        <button className="export-excel-btn" onClick={handleExport}>
          Экспорт в Excel
        </button>
      </div>

      {/* Форма для добавления новой карты перемещена сюда */}
      <div className="add-card-form" style={{ marginBottom: "20px" }}>
        <h3>Добавить новую карту</h3>
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <input
            value={newCard.dcl_name}
            onChange={(e) =>
              setNewCard({ ...newCard, dcl_name: e.target.value })
            }
            placeholder="Название"
          />
          <input
            type="number"
            value={newCard.coast_cards}
            onChange={(e) =>
              setNewCard({ ...newCard, coast_cards: Number(e.target.value) })
            }
            placeholder="Цена карт"
          />
          <input
            type="number"
            value={newCard.coast_credits}
            onChange={(e) =>
              setNewCard({ ...newCard, coast_credits: Number(e.target.value) })
            }
            placeholder="Цена кредитов"
          />
          <input
            value={newCard.category}
            onChange={(e) =>
              setNewCard({ ...newCard, category: e.target.value })
            }
            placeholder="Категория"
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
              <th>Название</th>
              <th>Цена карт</th>
              <th>Цена кредитов</th>
              <th>Категория</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(cards) && cards.length > 0 ? (
              cards.map((card) => (
                <tr key={card.id}>
                  <td onDoubleClick={() => handleDoubleClick(card)}>
                    {editId === card.id ? (
                      <input
                        value={editedCard.dcl_name}
                        onChange={(e) =>
                          setEditedCard({
                            ...editedCard,
                            dcl_name: e.target.value,
                          })
                        }
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleSave(card.id)
                        }
                        autoFocus
                      />
                    ) : (
                      card.dcl_name
                    )}
                  </td>
                  <td onDoubleClick={() => handleDoubleClick(card)}>
                    {editId === card.id ? (
                      <input
                        type="number"
                        value={editedCard.coast_cards}
                        onChange={(e) =>
                          setEditedCard({
                            ...editedCard,
                            coast_cards: Number(e.target.value),
                          })
                        }
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleSave(card.id)
                        }
                      />
                    ) : (
                      card.coast_cards
                    )}
                  </td>
                  <td onDoubleClick={() => handleDoubleClick(card)}>
                    {editId === card.id ? (
                      <input
                        type="number"
                        value={editedCard.coast_credits}
                        onChange={(e) =>
                          setEditedCard({
                            ...editedCard,
                            coast_credits: Number(e.target.value),
                          })
                        }
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleSave(card.id)
                        }
                      />
                    ) : (
                      card.coast_credits
                    )}
                  </td>
                  <td onDoubleClick={() => handleDoubleClick(card)}>
                    {editId === card.id ? (
                      <input
                        value={editedCard.category}
                        onChange={(e) =>
                          setEditedCard({
                            ...editedCard,
                            category: e.target.value,
                          })
                        }
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleSave(card.id)
                        }
                      />
                    ) : (
                      card.category
                    )}
                  </td>
                  <td>
                    {editId === card.id ? (
                      <button
                        onClick={() => handleSave(card.id)}
                        className="action-buttons__btn"
                      >
                        Сохранить
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDelete(card.id)}
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

export default TableCardPrices;
