import React, { useEffect, useState, useRef } from 'react';
import '../../../../styles/components/Table.scss';
import '../../../../styles/components/Office.scss';
import Spinner from '../../../Spinner.jsx';
import { fetchOffices } from "../../../../api/offices/all_offices.js";

const OfficeTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [highlightedId, setHighlightedId] = useState(null);
  const inputRef = useRef(null);

  const backendURL = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchOffices();
      setData(res || []);
    } finally {
      setLoading(false);
    }
  };

  const handleDoubleClick = (office) => {
    setEditId(office.ID);
    setEditedTitle(office.title);
  };

  const handleChange = (e) => {
    setEditedTitle(e.target.value);
  };

  const saveChange = async (office) => {
    if (editedTitle.trim() === "" || editedTitle === office.title) {
      setEditId(null);
      return;
    }

    const token = localStorage.getItem("access_token");

    try {
      const response = await fetch(`${backendURL}/office/${office.ID}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: editedTitle,
          director_id: office.director_id,
        }),
      });

      if (!response.ok) throw new Error("Ошибка при обновлении");

      await saveChange(office); // уберём .json() — ничего не нужно с сервера
      setData(prev =>
          prev.map(item =>
              item.ID === office.ID ? { ...item, title: editedTitle } : item
          )
      );

      setHighlightedId(office.ID);
      setTimeout(() => setHighlightedId(null), 1500); // сброс подсветки

    } catch (error) {
      console.error("Ошибка:", error);
    } finally {
      setEditId(null);
    }
  };

  const handleKeyDown = (e, office) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveChange(office);
    } else if (e.key === "Escape") {
      setEditId(null);
    }
  };

  return (
      <div className="report-table-container">
        <table className="table-reports">
          <thead>
          <tr>
            <th>Название офиса</th>
          </tr>
          </thead>
          <tbody>
          {loading && (
              <tr>
                <td style={{ textAlign: "center" }}>
                  <Spinner />
                </td>
              </tr>
          )}

          {!loading && data.length > 0 ? (
              data.map((office) => (
                  <tr
                      key={office.ID}
                      className={highlightedId === office.ID ? "row-updated" : ""}
                  >
                    <td onDoubleClick={() => handleDoubleClick(office)}>
                      {editId === office.ID ? (
                          <input
                              ref={inputRef}
                              type="text"
                              value={editedTitle}
                              onChange={handleChange}
                              onBlur={() => saveChange(office)}
                              onKeyDown={(e) => handleKeyDown(e, office)}
                              autoFocus
                          />
                      ) : (
                          office.title || "-"
                      )}
                    </td>
                  </tr>
              ))
          ) : (
              !loading && (
                  <tr>
                    <td style={{ textAlign: "center" }}>Нет данных</td>
                  </tr>
              )
          )}
          </tbody>
        </table>
      </div>
  );
};

export default OfficeTable;
