import React, { useEffect, useState, useCallback, useRef } from "react";
import Input from "../../components/elements/Input";
import { useFormStore } from "../../hooks/useFormState";
import { status } from "../../const/defConst";
import Select from "../../components/elements/Select";
import Spinner from "../../components/Spinner.jsx";
import "../../styles/checkbox.scss";
import { AiFillDelete, AiFillEdit } from "react-icons/ai";
import { useNavigate } from "react-router-dom";
import { apiClientApplicationDipozit } from "../../api/utils/apiClientApplicationDipozit.js";
import { Table } from "../../components/table/FlexibleAntTable.jsx";

export default function ApplicationsListDipozit() {
  const { data, errors, setData } = useFormStore();
  const [selectedRows, setSelectedRows] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [archive, setArchive] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [nextId, setNextId] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [filters, setFilters] = useState({
    client_code: "",
    type_of_deposit: "",
    accrued_account: "",
    withdraw_account: "",
    sum_of_deposit: "",
    deposit_currency: "",
    deposit_term_month: "",
  });
  const navigate = useNavigate();
  const lastRowRef = useRef(null);

  const fetchData = useCallback(
    async (afterId = null, reset = false) => {
      try {
        setLoading(true);
        const backendUrl = import.meta.env.VITE_BACKEND_APPLICATION_DIPOZIT_URL;
        let query = new URLSearchParams();

        if (afterId) query.append("after", afterId);
        if (data?.month) query.append("month", data?.month);
        if (data?.year) query.append("year", data?.year);
        if (data?.status) query.append("status_id", data?.status);

        const url = `${backendUrl}deposits${archive ? "/archive" : ""}${query.toString() ? `?${query.toString()}` : ""}`;
        const response = await fetch(url);
        const result = await response.json();

        if (reset) {
          setTableData(result || []);
        } else {
          setTableData((prev) => {
            const existingIds = new Set(prev.map((item) => item.ID));
            const newItems = (result || []).filter((item) => !existingIds.has(item.ID));
            return [...prev, ...newItems];
          });
        }

        setNextId(result?.[result?.length - 1]?.ID);
        setFetching(false);
      } catch (error) {
        console.error("Ошибка загрузки заявок:", error);
      } finally {
        setLoading(false);
        setFetching(false);
      }
    },
    [archive, data?.month, data?.year, data?.status]
  );

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = (dataArr) => {
    if (!Array.isArray(dataArr)) return [];
    return dataArr.filter((row) => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        const rowValue = row[key];
        if (rowValue == null) return false;
        return String(rowValue).toLowerCase().includes(String(value).toLowerCase());
      });
    });
  };

  const deleteApplication = async (id) => {
    const confirmDelete = window.confirm("Вы уверены, что хотите удалить?");
    if (!confirmDelete) return;
    try {
      await apiClientApplicationDipozit.delete(`/deposits/${id}`);
      fetchData(null, true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleExport = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${backendUrl}/automation/deposits`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ deposits_ids: selectedRows }),
      });
      if (!response.ok) throw new Error("Ошибка при получении файла");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Отчет_депозитов.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Ошибка выгрузки:", error);
    }
  };

  const filteredData = applyFilters(tableData);
  const dataToShow = filteredData.slice(0, data?.limit || filteredData.length);

  useEffect(() => {
    fetchData(null, true);
  }, [archive, fetchData]);

  useEffect(() => {
    fetchData(null, true);
  }, [data?.month, data?.year, data?.status, fetchData]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !fetching && !loading && nextId !== undefined) {
          setFetching(true);
          fetchData(nextId);
        }
      },
      { threshold: 1.0 }
    );

    if (lastRowRef.current) {
      observer.observe(lastRowRef.current);
    }

    return () => observer.disconnect();
  }, [fetching, nextId, fetchData, loading, dataToShow]);

  useEffect(() => {
    if (data.month || data.month === "") localStorage.setItem("month", data.month);
    if (data.year || data.year === "") localStorage.setItem("year", data.year);
  }, [data]);

  useEffect(() => {
    const savedMonth = localStorage.getItem("month");
    const savedYear = localStorage.getItem("year");
    if (savedMonth) setData("month", savedMonth);
    if (savedYear) setData("year", savedYear);
  }, [setData]);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const rowSelection = {
    selectedRowKeys: selectedRows,
    onChange: (keys) => {
      setSelectedRows(keys);
      setSelectAll(keys.length === filteredData.length && filteredData.length > 0);
    },
  };

  return (
    <>
      <div className="applications-list content-page">
        <main>
          <div className="my-applications-header">
            <Select
              id="status"
              value={data?.status}
              onChange={(val) => setData("status", val)}
              options={status}
              error={errors}
              style={{ width: "200px" }}
            />
            <button className="Unloading" onClick={handleExport}>Выгрузка</button>
            <button className="filter-toggle" onClick={() => setShowFilters(!showFilters)}>Фильтры</button>
            <button className={archive ? "archive-toggle active" : "archive-toggle"} onClick={() => setArchive(!archive)}>Архив</button>
            <button
              className={selectAll ? "selectAll-toggle active" : "selectAll-toggle"}
              onClick={() => {
                const nextSelectAll = !selectAll;
                setSelectAll(nextSelectAll);
                if (nextSelectAll) setSelectedRows(filteredData.map((item) => item.ID));
                else setSelectedRows([]);
              }}
            >
              Выбрать все
            </button>
          </div>

          {showFilters && (
            <div className="filters animate-slideIn">
              <input placeholder="Код клиента" onChange={(e) => handleFilterChange("client_code", e.target.value)} />
              <input placeholder="Тип депозита" onChange={(e) => handleFilterChange("type_of_deposit", e.target.value)} />
              <input placeholder="Начисленный счет" onChange={(e) => handleFilterChange("accrued_account", e.target.value)} />
              <input placeholder="Выводный счет" onChange={(e) => handleFilterChange("withdraw_account", e.target.value)} />
              <input placeholder="Сумма" onChange={(e) => handleFilterChange("sum_of_deposit", e.target.value)} />
              <input placeholder="Валюта" onChange={(e) => handleFilterChange("deposit_currency", e.target.value)} />
              <input placeholder="Месяцы" onChange={(e) => handleFilterChange("deposit_term_month", e.target.value)} />
            </div>
          )}

          <div className="my-applications-sub-header">
            <div>Поиск по месяцам <Input type="number" onChange={(e) => setData("month", e)} value={data?.month || ""} id="month" /></div>
            <div>Поиск по годам <Input type="number" onChange={(e) => setData("year", e)} value={data?.year || ""} id="year" /></div>
            <div>Показать <Input type="number" onChange={(e) => setData("limit", e)} value={data?.limit || ""} id="limit" /> записей</div>
          </div>

          <div className="my-applications-content" style={{ position: "relative" }}>
            {loading && dataToShow.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem" }}><Spinner /></div>
            ) : dataToShow.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "gray" }}>Нет данных для отображения</div>
            ) : (
              <Table
                dataSource={dataToShow}
                rowKey="ID"
                rowSelection={rowSelection}
                pagination={false}
                bordered
                scroll={{ x: "max-content" }}
                onRow={(record, index) => ({
                  ref: index === dataToShow.length - 1 ? lastRowRef : null,
                })}
              >
                <Table.Column title="ID" dataIndex="ID" key="ID" sortable />
                <Table.Column title="Код клиента" dataIndex="client_code" key="client_code" sortable />
                <Table.Column title="Тип депозита" dataIndex="type_of_deposit" key="type_of_deposit" sortable />
                <Table.Column title="Начисленный счет" dataIndex="accrued_account" key="accrued_account" sortable />
                <Table.Column title="Выводный счет" dataIndex="withdraw_account" key="withdraw_account" sortable />
                <Table.Column title="Сумма" dataIndex="sum_of_deposit" key="sum_of_deposit" sortable />
                <Table.Column title="Валюта" dataIndex="deposit_currency" key="deposit_currency" sortable />
                <Table.Column title="Месяцы" dataIndex="deposit_term_month" key="deposit_term_month" sortable />
                <Table.Column title="Дата создания" key="CreatedAt" render={(_, row) => formatDate(row.CreatedAt)} sortable />
                <Table.Column title="Дата обновления" key="UpdatedAt" render={(_, row) => formatDate(row.UpdatedAt)} sortable />
                <Table.Column
                  title="Действия"
                  key="actions"
                  fixed="right"
                  render={(_, row) => (
                    <div className="active-table">
                      <AiFillEdit onClick={() => navigate(`/agent/dipozit/card/${row.ID}`)} style={{ fontSize: 35, color: "green", cursor: "pointer", marginBottom: "10px" }} />
                      <AiFillDelete onClick={() => deleteApplication(row.ID)} style={{ fontSize: 35, color: "#c31414", cursor: "pointer" }} />
                    </div>
                  )}
                />
              </Table>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
