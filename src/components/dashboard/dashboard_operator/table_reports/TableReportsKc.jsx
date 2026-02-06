import React, { useEffect, useState, useCallback, useRef } from "react";
import "../../../../styles/components/Table.scss";
import Spinner from "../../../Spinner.jsx";
import SearchBar from "../../../general/SearchBar.jsx";
import { fetchReportKCAndTests } from "../../../../api/operator/reports/report_kc.js";
import { useExcelExport } from "../../../../hooks/useExcelExport.js";

const TableReportsKc = ({ month, year }) => {
  const [data, setData] = useState([]);
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const observer = useRef();
  const { exportToExcel } = useExcelExport();

  const [editId, setEditId] = useState(null);
  const [editedScore, setEditedScore] = useState("");
  const [highlightedId, setHighlightedId] = useState(null);

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

  const loadMore = useCallback(async () => {
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
  }, [loadingMore, hasMore, isSearching, data, month, year]);

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
    [loadingMore, hasMore, loadMore],
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
    const value = row.ServiceQuality?.[0]?.call_center ?? "";
    setEditId(row.ID);
    setEditedScore(value.toString());
  };

  const saveScore = async (row) => {
    const token = localStorage.getItem("access_token");

    try {
      const existingQuality = row.ServiceQuality?.[0];
      const call_center_value = Number(editedScore);

      if (existingQuality?.ID) {
        // Обновляем
        const response = await fetch(
          `${backendURL}/service-quality/${existingQuality.ID}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              call_center: call_center_value,
            }),
          },
        );

        if (!response.ok) throw new Error("Ошибка при PATCH");

        setData((prev) =>
          prev.map((item) =>
            item.ID === row.ID
              ? {
                  ...item,
                  ServiceQuality: [
                    {
                      ...item.ServiceQuality?.[0],
                      call_center: call_center_value,
                    },
                  ],
                }
              : item,
          ),
        );
      } else {
        const createdAt = new Date(Date.UTC(year, month - 1, 1)).toISOString();

        // Создаём новую
        const response = await fetch(`${backendURL}/service-quality`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            call_center: call_center_value,
            coefficient: 0,
            complaint: 0,
            tests: 0,
            WorkerID: row.ID,
            CreatedAt: createdAt,
            UpdatedAt: createdAt,
          }),
        });

        if (!response.ok) throw new Error("Ошибка при POST");

        const created = await response.json();

        setData((prev) =>
          prev.map((item) =>
            item.ID === row.ID
              ? {
                  ...item,
                  ServiceQuality: [
                    { ID: created.ID, call_center: call_center_value },
                  ],
                }
              : item,
          ),
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

  const handleExport = () => {
    const columns = [
      { key: (row) => row.user?.full_name || "", label: "ФИО сотрудника" },
      {
        key: (row) => row.ServiceQuality?.[0]?.call_center ?? "",
        label: "Средняя оценка",
      },
    ];
    exportToExcel(allData, columns, `Отчет_КЦ_${month}_${year}`);
  };

  return (
    <div className="report-table-container">
      <div className="table-header-actions">
        <SearchBar
          allData={allData}
          onSearch={handleSearch}
          placeholder="Поиск по ФИО"
          searchFields={[(item) => item.user?.Username || ""]}
        />
        <button className="export-excel-btn" onClick={handleExport}>
          Экспорт в Excel
        </button>
      </div>

      <table className="table-reports">
        <thead>
          <tr>
            <th>ФИО сотрудника</th>
            <th>Средняя оценка</th>
          </tr>
        </thead>
        <tbody>
          {data.length > 0
            ? data.map((row, idx) => {
                const isLast = idx === data.length - 1;
                const userName = row.user?.full_name || "";
                const call_center = row.ServiceQuality?.[0]?.call_center ?? "";

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
                          value={editedScore}
                          onChange={(e) => setEditedScore(e.target.value)}
                          onBlur={() => saveScore(row)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveScore(row);
                            else if (e.key === "Escape") setEditId(null);
                          }}
                          autoFocus
                        />
                      ) : (
                        call_center
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

      {loading && (
        <div
          style={{
            transform: "scale(2)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: "100px",
            width: "auto",
          }}
        >
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

export default TableReportsKc;
