import React, { useEffect, useState, useCallback, useRef } from "react";
import { Table } from "../../../table/FlexibleAntTable.jsx";
import Spinner from "../../../Spinner.jsx";
import SearchBar from "../../../general/SearchBar.jsx";
import { fetchReportMobileBank } from "../../../../api/operator/reports/report_mb.js";
import { useExcelExport } from "../../../../hooks/useExcelExport.js";

const TableReportsMb = ({ month, year }) => {
  const [data, setData] = useState([]);
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const observer = useRef();
  const { exportToExcel } = useExcelExport();

  const [editId, setEditId] = useState(null);
  const [editedConnects, setEditedConnects] = useState("");
  const [highlightedId, setHighlightedId] = useState(null);

  const backendURL = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    const loadAll = async () => {
      let all = [];
      let after = null;
      while (true) {
        const chunk = await fetchReportMobileBank(month, year, after);
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
        const chunk = await fetchReportMobileBank(month, year, null);
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
      const chunk = await fetchReportMobileBank(month, year, lastId);
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
        const chunk = await fetchReportMobileBank(month, year, null);
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

  const saveConnects = async (row) => {
    const token = localStorage.getItem("access_token");
    const value = Number(editedConnects);
    try {
      const existing = row.MobileBank?.[0];
      if (existing?.ID) {
        const res = await fetch(`${backendURL}/mobile-bank/${existing.ID}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ mobile_bank_connects: value, mobile_bank_prem: value * 10, worker_id: row.ID }),
        });
        if (!res.ok) throw new Error("Ошибка при PATCH");
        setData((prev) => prev.map((item) => item.ID === row.ID ? { ...item, MobileBank: [{ ...existing, mobile_bank_connects: value }] } : item));
      } else {
        const createdAt = new Date(Date.UTC(year, month - 1, 1)).toISOString();
        const res = await fetch(`${backendURL}/mobile-bank`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ mobile_bank_connects: value, mobile_bank_prem: value * 10, worker_id: row.ID, CreatedAt: createdAt, UpdatedAt: createdAt }),
        });
        if (!res.ok) throw new Error("Ошибка при POST");
        const created = await res.json();
        setData((prev) => prev.map((item) => item.ID === row.ID ? { ...item, MobileBank: [{ ID: created.ID, mobile_bank_connects: value }] } : item));
      }
      setHighlightedId(row.ID);
      setTimeout(() => setHighlightedId(null), 1500);
    } catch (err) {
      console.error("Ошибка сохранения:", err);
    } finally {
      setEditId(null);
    }
  };

  const handleExport = () => {
    const columns = [
      { key: (row) => row.user?.full_name || "", label: "ФИО сотрудника" },
      { key: (row) => row.MobileBank?.[0]?.mobile_bank_connects ?? "", label: "Количество подключений" },
    ];
    exportToExcel(allData, columns, `Отчет_МБ_${month}_${year}`);
  };

  return (
    <div className="report-table-container">
      <div className="table-header-actions">
        <SearchBar
          allData={allData}
          onSearch={handleSearch}
          placeholder="Поиск по ФИО"
          searchFields={[(item) => item.user?.full_name || ""]}
        />
        <button className="export-excel-btn" onClick={handleExport}>Экспорт в Excel</button>
      </div>

      <Table
        dataSource={data}
        rowKey="ID"
        pagination={false}
        bordered
        onRow={(record, index) => ({
          ref: index === data.length - 1 && !isSearching ? lastRowRef : null,
          className: highlightedId === record.ID ? "row-updated" : "",
        })}
      >
        <Table.Column title="ФИО сотрудника" key="userName" render={(_, row) => row.user?.full_name || ""} />
        <Table.Column
          title="Количество подключений"
          key="connects"
          render={(_, row) => {
            const isEditing = editId === row.ID;
            const connects = row.MobileBank?.[0]?.mobile_bank_connects ?? "";
            if (isEditing) {
              return (
                <input
                  type="number"
                  value={editedConnects}
                  onChange={(e) => setEditedConnects(e.target.value)}
                  onBlur={() => saveConnects(row)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveConnects(row);
                    else if (e.key === "Escape") setEditId(null);
                  }}
                  autoFocus
                  className="editable-input"
                />
              );
            }
            return (
              <div onDoubleClick={() => {
                setEditId(row.ID);
                setEditedConnects(connects.toString());
              }}>
                {connects}
              </div>
            );
          }}
        />
      </Table>

      {loadingMore && <div style={{ textAlign: "center", padding: "1rem" }}><Spinner /></div>}
      {loading && allData.length === 0 && <div className="spinner-container"><Spinner /></div>}
    </div>
  );
};

export default TableReportsMb;
