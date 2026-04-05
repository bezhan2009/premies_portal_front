import React, { useEffect, useState, useRef, useCallback } from "react";
import { Table } from "../../../table/FlexibleAntTable.jsx";
import Spinner from "../../../Spinner.jsx";
import { fetchReportCards } from "../../../../api/operator/reports/report_cards.js";
import SearchBar from "../../../general/SearchBar.jsx";
import Input from "../../../elements/Input.jsx";
import { cardDetailPatch } from "../../../../api/workers/cardDetailPatch.js";
import Select from "../../../elements/Select.jsx";
import { mcCards, ncCards, visaCards } from "../../../../const/defConst.js";
import { useExcelExport } from "../../../../hooks/useExcelExport.js";

const TableReportsCards = ({ month, year }) => {
  const [data, setData] = useState([]);
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const observer = useRef(null);
  const [edit, setEdit] = useState(null);
  const { exportToExcel } = useExcelExport();

  useEffect(() => {
    const loadAllData = async () => {
      const MAX_PAGES = 10;
      let all = [];
      let after = null;
      let page = 0;
      while (page < MAX_PAGES) {
        const chunk = await fetchReportCards(month, year, after);
        if (!chunk || chunk.length === 0) break;
        all = [...all, ...chunk];
        after = chunk[chunk.length - 1]?.ID;
        page++;
        if (chunk.length < 10) break;
      }
      setAllData(all);
    };
    loadAllData();
  }, [month, year]);

  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      setIsSearching(false);
      setHasMore(true);
      setData([]);
      try {
        const chunk = await fetchReportCards(month, year, null);
        setData(chunk);
        if (chunk.length < 10) setHasMore(false);
      } catch (e) {
        console.error("Ошибка при загрузке данных:", e);
      } finally {
        setLoading(false);
      }
    };
    loadInitial();
  }, [month, year]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || isSearching) return;
    setLoadingMore(true);
    try {
      const lastId = data[data.length - 1]?.ID;
      const chunk = await fetchReportCards(month, year, lastId);
      if (!chunk || chunk.length === 0) {
        setHasMore(false);
        return;
      }
      setData((prev) => [...prev, ...chunk]);
      if (chunk.length < 10) setHasMore(false);
    } catch (e) {
      console.error("Ошибка при догрузки:", e);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, isSearching, data, month, year]);

  const lastRowRef = useCallback(
    (node) => {
      if (loadingMore) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore && !isSearching) {
          loadMore();
        }
      });
      if (node) observer.current.observe(node);
    },
    [loadingMore, hasMore, isSearching, loadMore],
  );

  const handleSearch = async (filtered) => {
    if (!filtered) {
      setIsSearching(false);
      setLoading(true);
      try {
        const chunk = await fetchReportCards(month, year, null);
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

  const handleChange = (key, value) => {
    setEdit((prev) => {
      const keys = key.split(".");
      let newState = { ...prev };
      let current = newState;
      keys.forEach((k, i) => {
        const arrayMatch = k.match(/(\w+)\[(\d+)\]/);
        if (arrayMatch) {
          const [, arrKey, indexStr] = arrayMatch;
          const index = Number(indexStr);
          if (!Array.isArray(current[arrKey])) current[arrKey] = [];
          current[arrKey] = [...current[arrKey]];
          if (!current[arrKey][index]) current[arrKey][index] = {};
          if (i === keys.length - 1) current[arrKey][index] = value;
          else {
            current[arrKey][index] = { ...current[arrKey][index] };
            current = current[arrKey][index];
          }
        } else {
          if (i === keys.length - 1) current[k] = value;
          else {
            current[k] = { ...current[k] };
            current = current[k];
          }
        }
      });
      return newState;
    });
  };

  const saveChange = async (editData) => {
    try {
      await cardDetailPatch({
        ...editData,
        issue_date: editData.issue_date?.split("T")?.[1]
          ? editData.issue_date
          : editData.issue_date + "T00:00:00Z" || null,
      });
      setEdit(null);
      const updatedData = await fetchReportCards(month, year, null);
      setData(updatedData);
      setHasMore(updatedData.length === 10);
    } catch (e) {
      console.error(e);
    }
  };

  const handleExport = () => {
    const columns = [
      { key: (row) => row.worker?.user?.full_name || "", label: "ФИО сотрудника" },
      { key: "card_type", label: "Тип карты" },
      { key: "code", label: "Номер счета" },
      { key: "debt_osd", label: "Оборот по дебету" },
      { key: "out_balance", label: "Остаток" },
      { key: "issue_date", label: "Дата выдачи", format: (val) => val?.split("T")[0] || "" },
    ];
    exportToExcel(allData, columns, `Отчет_Карты_${month}_${year}`);
  };

  const cardOptions = [
    ...visaCards.map((c) => ({ label: c.name, value: c.name })),
    ...ncCards.map((c) => ({ label: c.name, value: c.name })),
    ...mcCards.map((c) => ({ label: c.name, value: c.name })),
  ];

  const renderEditableCell = (record, dataIndex, value, type = "text", options = null) => {
    const isEditing = edit?.ID === record.ID;
    if (isEditing) {
      if (type === "select") {
        return (
          <Select
            onChange={(val) => handleChange(dataIndex, val)}
            value={value || record[dataIndex]}
            onEnter={() => saveChange(edit)}
            options={options}
          />
        );
      }
      return (
        <Input
          defValue={record[dataIndex]}
          type={type}
          value={value}
          onChange={(val) => handleChange(dataIndex, val)}
          onEnter={() => saveChange(edit)}
        />
      );
    }
    if (type === "date") return record[dataIndex]?.split("T")[0] || "";
    return record[dataIndex] || "";
  };

  return (
    <div className="report-table-container">
      <div className="table-header-actions">
        <SearchBar
          allData={allData}
          onSearch={handleSearch}
          placeholder="Поиск по ФИО, номеру карты..."
          searchFields={[
            (item) => item.worker?.user?.Username || "",
            (item) => item.code || "",
            (item) => item.card_type || "",
          ]}
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
          onClick: () => !edit && setEdit(record),
        })}
        scroll={{ y: "calc(100vh - 480px)" }}
      >
        <Table.Column
          title="ФИО сотрудника"
          key="worker.user.full_name"
          render={(_, record) => {
            const isEditing = edit?.ID === record.ID;
            if (isEditing) {
              return (
                <Input
                  defValue={record.worker?.user?.full_name}
                  type="text"
                  value={edit.worker?.user?.full_name}
                  onChange={(val) => handleChange("worker.user.full_name", val)}
                  onEnter={() => saveChange(edit)}
                />
              );
            }
            return record.worker?.user?.full_name || "";
          }}
        />
        <Table.Column
          title="Тип карты"
          key="card_type"
          render={(_, record) => renderEditableCell(record, "card_type", edit?.card_type, "select", cardOptions)}
        />
        <Table.Column
          title="Номер счета"
          key="code"
          render={(_, record) => renderEditableCell(record, "code", edit?.code)}
        />
        <Table.Column
          title="Оборот по дебету"
          key="debt_osd"
          render={(_, record) => renderEditableCell(record, "debt_osd", edit?.debt_osd)}
        />
        <Table.Column
          title="Остаток"
          key="out_balance"
          render={(_, record) => renderEditableCell(record, "out_balance", edit?.out_balance)}
        />
        <Table.Column
          title="Дата выдачи"
          key="issue_date"
          render={(_, record) => renderEditableCell(record, "issue_date", edit?.issue_date, "date")}
        />
      </Table>

      {loading && allData.length === 0 && <div className="spinner-container"><Spinner /></div>}
      {loadingMore && <div style={{ textAlign: "center", padding: "1rem" }}><Spinner /></div>}
    </div>
  );
};

export default TableReportsCards;
