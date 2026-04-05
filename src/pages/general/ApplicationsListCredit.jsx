import React, { useEffect, useState, useCallback, useRef } from "react";
import Input from "../../components/elements/Input";
import { useFormStore } from "../../hooks/useFormState";
import { statusCredit } from "../../const/defConst";
import Select from "../../components/elements/Select";
import Spinner from "../../components/Spinner.jsx";
import "../../styles/checkbox.scss";
import { AiFillDelete, AiFillEdit } from "react-icons/ai";
import { useNavigate } from "react-router-dom";
import { apiClientCredit } from "../../api/utils/apiClientCredit.js";
import { deleteCreditById } from "../../api/application/deleteCreditById.js";
import { Table } from "../../components/table/FlexibleAntTable.jsx";

export default function ApplicationsListCredit() {
  const { data, errors, setData } = useFormStore();
  const [selectedRows, setSelectedRows] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [archive, setArchive] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [nextId, setNextId] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [filters, setFilters] = useState({ fullName: "", phone: "", resident: "", card: "" });
  const navigate = useNavigate();
  const lastRowRef = useRef(null);

  const fetchData = useCallback(
    async (nextId = null, res = false) => {
      try {
        setLoading(true);
        const backendUrl = import.meta.env.VITE_BACKEND_CREDIT_URL;
        let query = new URLSearchParams();

        if (nextId) query.append("after", nextId);
        if (data?.month) query.append("month", data?.month);
        if (data?.year) query.append("year", data?.year);
        if (data?.status) query.append("status_id", data?.status);

        const response = await fetch(`${backendUrl}/credits${archive ? "/archive" : `?${query.toString()}`}`);
        const result = await response.json();

        if (res) {
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
        console.log("Ошибка загрузки заявок:", error);
      } finally {
        setLoading(false);
        setFetching(false);
      }
    },
    [archive, data?.month, data?.year, data?.status],
  );

  const handleExport = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${backendUrl}/automation/credit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ credit_ids: selectedRows }),
      });
      if (!response.ok) throw new Error("Ошибка при получении файла");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Отчет заявок.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Ошибка выгрузки:", error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = (rows) => {
    if (!Array.isArray(rows)) return [];
    return rows.filter((row) => {
      const fullName = `${row?.surname || ""} ${row?.name || ""} ${row?.patronymic || ""}`.toLowerCase();
      if (!fullName.includes(filters.fullName.toLowerCase())) return false;
      if (filters.phone && !row?.phone_number?.includes(filters.phone)) return false;
      if (filters.card && !row?.card_name?.toLowerCase().includes(filters.card.toLowerCase())) return false;

      // Additional form filters
      if (data?.name_filter && !fullName.includes(data.name_filter.toLowerCase())) return false;
      if (data?.phone_filter && !row?.phone_number?.includes(data.phone_filter)) return false;

      return true;
    });
  };

  const deleteApplication = async (id) => {
    try {
      await deleteCreditById(id);
      setTimeout(() => fetchData(null, true), 200);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredData = applyFilters(tableData);
  const dataToShow = filteredData.slice(0, data?.limit || filteredData?.length);

  const upDateStatusApplications = async (status) => {
    try {
      await Promise.all(selectedRows.map((e) =>
        apiClientCredit.patch(`/credits/${e}`, { credit_status_id: +status })
      ));

      setData("status", "");
      fetchData(null, true);
      setSelectedRows([]);
      setSelectAll(false);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData(null, true);
  }, [archive, fetchData]);

  useEffect(() => {
    fetchData(null, true);
  }, [data?.month, data?.year, data?.status, fetchData]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !fetching && nextId !== undefined) {
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
  }, [fetching, nextId, fetchData, dataToShow]);

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
              style={{ border: selectedRows.length > 0 ? "4px solid #ff1a1a" : "none" }}
              id={"status"}
              value={data?.status}
              onChange={(e) => {
                if (!selectedRows.length) setData("status", e);
                else upDateStatusApplications(e);
              }}
              options={statusCredit}
              error={errors}
            />
            <button className="Unloading" onClick={handleExport}>Выгрузка для карт</button>
            <button className="filter-toggle" onClick={() => setShowFilters(!showFilters)}>Фильтры</button>
            <button className={archive ? "archive-toggle active" : "archive-toggle"} onClick={() => setArchive(!archive)}>Архив</button>
            <button
              className={selectAll ? "selectAll-toggle active" : "selectAll-toggle"}
              onClick={() => {
                const nextSelectAll = !selectAll;
                setSelectAll(nextSelectAll);
                if (nextSelectAll) setSelectedRows(filteredData.map((e) => e.ID));
                else setSelectedRows([]);
              }}
            >
              Выбрать все
            </button>
          </div>

          {showFilters && (
            <div className="filters animate-slideIn">
              <input placeholder="ФИО" value={filters.fullName} onChange={(e) => handleFilterChange("fullName", e.target.value)} />
              <input placeholder="Телефон" value={filters.phone} onChange={(e) => handleFilterChange("phone", e.target.value)} />
              <Select
                value={filters.resident}
                onChange={(val) => handleFilterChange("resident", val)}
                options={[{ value: "", label: "Резидент" }, { value: "Да", label: "Да" }, { value: "Нет", label: "Нет" }]}
              />
              <input placeholder="Карта" value={filters.card} onChange={(e) => handleFilterChange("card", e.target.value)} />
            </div>
          )}

          <div className="my-applications-sub-header">
            <div>Поиск по месяцам <Input type="number" placeholder={""} onChange={(e) => setData("month", e)} value={data?.month} id={"month"} /></div>
            <div>Поиск по годам <Input type="number" placeholder={""} onChange={(e) => setData("year", e)} value={data?.year} id={"year"} /></div>
            {loading ? <Spinner /> : (
              <div>Показать <Input type="number" placeholder={""} onChange={(e) => setData("limit", e)} value={data?.limit} id={"limit"} /> записей</div>
            )}
          </div>

          <div className="my-applications-content" style={{ position: "relative" }}>
            {dataToShow.length === 0 ? (
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
                <Table.Column title="ФИО" key="fullName" render={(_, row) => `${row.surname || ""} ${row.name || ""} ${row.patronymic || ""}`} sortable />
                <Table.Column title="Телефон" dataIndex="phone_number" key="phone_number" sortable />
                <Table.Column title="Тип Карты" dataIndex="card_type" key="card_type" sortable />
                <Table.Column title="Адрес" dataIndex="delivery_address" key="delivery_address" sortable />
                <Table.Column title="ИНН" dataIndex="inn" key="inn" sortable />
                <Table.Column title="Дата рождения" dataIndex="date_of_birth" key="date_of_birth" sortable />
                <Table.Column title="Пол" dataIndex="gender" key="gender" />
                <Table.Column title="Резидент" key="is_resident" render={(_, row) => (row.is_resident ? "Да" : "Нет")} />
                <Table.Column title="Документ" dataIndex="type_of_certificate" key="type_of_certificate" />
                <Table.Column title="Создано в" key="CreatedAt" render={(_, row) => formatDate(row.CreatedAt)} sortable />
                <Table.Column title="Обновлено в" key="UpdatedAt" render={(_, row) => formatDate(row.UpdatedAt)} sortable />
                <Table.Column
                  title="Действия"
                  key="actions"
                  fixed="right"
                  render={(_, row) => (
                    <div className="active-table">
                      <AiFillEdit onClick={() => navigate(`/agent/credit/${row.ID}`)} style={{ fontSize: 35, color: "green", cursor: "pointer", marginBottom: "10px" }} />
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
