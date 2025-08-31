import React, { useEffect, useState, useCallback, useRef } from "react";
import "../../../../styles/components/Table.scss";
import Spinner from "../../../Spinner.jsx";
import SearchBar from "../../../general/SearchBar.jsx";
import { fetchReportKCAndTests } from "../../../../api/operator/reports/report_kc.js";

const TableReportsTest = ({ month, year }) => {
  const [data, setData] = useState([]);
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editedTests, setEditedTests] = useState("");
  const [highlightedId, setHighlightedId] = useState(null);
  const observer = useRef();
  const backendURL = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    const loadAll = async () => {
      let all = [];
      let after = null;

      while (true) {
        const chunk = await fetchReportKCAndTests(month, year, after);
        if (!chunk || chunk.length === 0) break;

        all = [...all, ...chunk];
        after = chunk[chunk.length - 1]?.ID;
        if (chunk.length < 10) break;
      }

      setAllData(all);
    };

    loadAll();
  }, [month, year]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setIsSearching(false);
      setHasMore(true);
      setData([]);

      try {
        const chunk = await fetchReportKCAndTests(month, year, null);
        setData(chunk);
        if (chunk.length < 10) setHasMore(false);
      } catch (e) {
        console.error("Ошибка загрузки данных", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [month, year]);

  const loadMore = async () => {
    if (loadingMore || !hasMore || isSearching) return;

    setLoadingMore(true);
    try {
      const lastId = data[data.length - 1]?.ID;
      const chunk = await fetchReportKCAndTests(month, year, lastId);
      setData((prev) => [...prev, ...chunk]);
      if (chunk.length < 10) setHasMore(false);
    } catch (e) {
      console.error("Ошибка догрузки", e);
    } finally {
      setLoadingMore(false);
    }
  };

  const lastRowRef = useCallback(
    (node) => {
      if (loadingMore) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      });

      if (node) observer.current.observe(node);
    },
    [loadingMore, hasMore, data]
  );

  const handleSearch = async (filtered) => {
    if (!filtered) {
      setIsSearching(false);
      setLoading(true);
      try {
        const chunk = await fetchReportKCAndTests(month, year, null);
        setData(chunk);
        setHasMore(chunk.length >= 10);
      } finally {
        setLoading(false);
      }
      return;
    }

    setIsSearching(true);
    setData(filtered);
    setHasMore(false);
  };

  const handleDoubleClick = (row) => {
    const value = row.ServiceQuality?.[0]?.tests ?? "";
    setEditId(row.ID);
    setEditedTests(value.toString());
  };

  const saveTests = async (row) => {
    const token = localStorage.getItem("access_token");
    const value = Number(editedTests);

    try {
      const existing = row.ServiceQuality?.[0];

      if (existing?.ID) {
        const res = await fetch(
          `${backendURL}/service-quality/${existing.ID}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              tests: value,
              WorkerID: row.ID,
            }),
          }
        );

        if (!res.ok) throw new Error("Ошибка при PATCH");

        setData((prev) =>
          prev.map((item) =>
            item.ID === row.ID
              ? {
                  ...item,
                  ServiceQuality: [{ ...existing, tests: value }],
                }
              : item
          )
        );
      } else {
        const createdAt = new Date(Date.UTC(year, month - 1, 1)).toISOString();
        const res = await fetch(`${backendURL}/service-quality`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            tests: value,
            coefficient: 0,
            complaint: 0,
            call_center: 0,
            WorkerID: row.ID,
            CreatedAt: createdAt,
          }),
        });

        if (!res.ok) throw new Error("Ошибка при POST");

        const created = await res.json();

        setData((prev) =>
          prev.map((item) =>
            item.ID === row.ID
              ? {
                  ...item,
                  ServiceQuality: [
                    {
                      ID: created.ID,
                      tests: value,
                    },
                  ],
                }
              : item
          )
        );
      }

      setHighlightedId(row.ID);
      setTimeout(() => setHighlightedId(null), 1500);
    } catch (e) {
      console.error("Ошибка обновления:", e);
    } finally {
      setEditId(null);
    }
  };

  return (
    <div className="report-table-container">
      <SearchBar
        allData={allData}
        onSearch={handleSearch}
        placeholder="Поиск по ФИО"
        searchFields={[(item) => item.user?.full_name || ""]}
      />
      <div className="table-reports-div">
        <table className="table-reports">
          <thead>
            <tr>
              <th>ФИО сотрудника</th>
              <th>Средняя оценка по тестам</th>
            </tr>
          </thead>
          <tbody>
            {data.length > 0
              ? data.map((row, idx) => {
                  const isLast = idx === data.length - 1;
                  const userName = row.user?.full_name || "";
                  const tests = row.ServiceQuality?.[0]?.tests ?? "";

                  return (
                    <tr
                      key={row.ID}
                      ref={isLast && !isSearching ? lastRowRef : null}
                      className={highlightedId === row.ID ? "row-updated" : ""}
                    >
                      <td>{userName}</td>
                      <td onDoubleClick={() => handleDoubleClick(row)}>
                        {editId === row.ID ? (
                          <input
                            type="number"
                            value={editedTests}
                            onChange={(e) => setEditedTests(e.target.value)}
                            onBlur={() => saveTests(row)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveTests(row);
                              else if (e.key === "Escape") setEditId(null);
                            }}
                            autoFocus
                            className="editable-input"
                          />
                        ) : (
                          tests
                        )}
                      </td>
                    </tr>
                  );
                })
              : !loading && (
                  <tr>
                    <td colSpan={2} style={{ textAlign: "center" }}>
                      Нет данных за выбранный период
                    </td>
                  </tr>
                )}
          </tbody>
        </table>
      </div>  

      {loading && (
        <div className="spinner-container">
          <Spinner />
        </div>
      )}

      {loadingMore && (
        <div style={{ textAlign: "center", padding: "1rem" }}>
          <Spinner />
        </div>
      )}
    </div>
  );
};

export default TableReportsTest;
