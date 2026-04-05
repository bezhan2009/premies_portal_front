import React, { useEffect, useState, useCallback, useRef } from "react";
import Input from "../../components/elements/Input";
import { useFormStore } from "../../hooks/useFormState";
import { status } from "../../const/defConst";
import fileLogo from "../../assets/file_logo.png";
import Select from "../../components/elements/Select";
import HeaderAgent from "../../components/dashboard/dashboard_agent/MenuAgent.jsx";
import Spinner from "../../components/Spinner.jsx";
import "../../styles/checkbox.scss";
import { AiFillDelete, AiFillEdit } from "react-icons/ai";
import { useNavigate } from "react-router-dom";
import { deleteApplicationById } from "../../api/application/deleteApplicationById.js";
import { apiClientApplication } from "../../api/utils/apiClientApplication.js";
import { useWebSocket } from "../../api/application/wsnotifications.js";
import AlertMessage from "../../components/general/AlertMessage.jsx";
import "../../styles/components/ApplicationsList.scss";
import { Table } from "../../components/table/FlexibleAntTable.jsx";

function ImagePreviewModal({ imageUrl, onClose }) {
  if (!imageUrl) return null;
  return (
    <div className="custom-modal-overlay" onClick={onClose}>
      <div className="custom-modal-content animate-scaleIn" onClick={(e) => e.stopPropagation()}>
        <button className="custom-modal-close" onClick={onClose}>×</button>
        <img src={imageUrl} alt="Предпросмотр" className="custom-modal-image" />
      </div>
    </div>
  );
}

export default function ApplicationsList() {
  const { data, errors, setData } = useFormStore();
  const [selectedRows, setSelectedRows] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [archive, setArchive] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [nextId, setNextId] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [filters, setFilters] = useState({ fullName: "", phone: "", resident: "", card: "" });
  const [alert, setAlert] = useState({ show: false, message: "", type: "info" });
  const navigate = useNavigate();
  const lastRowRef = useRef(null);

  const wsUrl = import.meta.env.VITE_BACKEND_APPLICATION_URL_WS + "/applications/portal";

  const fetchData = useCallback(
    async (nextId = null, reset = false) => {
      try {
        setLoading(true);
        const backendUrl = import.meta.env.VITE_BACKEND_APPLICATION_URL;
        let query = new URLSearchParams();

        if (nextId) query.append("after", nextId);
        if (data?.month) query.append("month", data?.month);
        if (data?.year) query.append("year", data?.year);
        if (data?.status) query.append("status_id", data?.status);

        const response = await fetch(`${backendUrl}/applications${archive ? "/archive" : `?${query.toString()}`}`);
        const result = await response.json();

        if (reset || nextId === null) {
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

  const handleNewApplication = useCallback(
    (newApplication) => {
      setAlert({
        show: true,
        message: `Новая заявка #${newApplication.ID} от ${newApplication.request_сreator}`,
        type: "info",
      });
      if (!archive) {
        fetchData(null, true);
      }
    },
    [archive, fetchData],
  );

  useWebSocket(wsUrl, handleNewApplication, [archive]);

  const handleExport = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${backendUrl}/automation/application`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ application_ids: selectedRows }),
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

  const applyFilters = (data, currentFilters) => {
    if (!Array.isArray(data)) return [];

    return data.filter((row) => {
      const fullName = `${row?.surname || ""} ${row?.name || ""} ${row?.patronymic || ""}`.toLowerCase();
      return (
        fullName?.includes(currentFilters?.fullName?.toLowerCase() || "") &&
        (row?.phone_number || "")?.includes(currentFilters?.phone || "") &&
        (!currentFilters?.resident || (currentFilters?.resident === "Да" ? row?.is_resident : !row?.is_resident)) &&
        (!currentFilters?.card || row?.card_name?.toLowerCase()?.includes(currentFilters?.card?.toLowerCase() || ""))
      );
    });
  };

  const renderFileIcon = (path) => {
    if (!path) return null;
    const backendUrl = import.meta.env.VITE_BACKEND_APPLICATION_URL;
    const fullUrl = `${backendUrl}/uploads/${path.replace(/\\/g, "/")}`;
    return (
      <button className="file-icon-button" onClick={() => setPreviewImage(fullUrl)}>
        <img src={fileLogo} alt="Файл" width={48} height={60} />
      </button>
    );
  };

  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d)) return "";
    return d.toISOString().split("T")[0];
  };

  const deleteApplication = async (id) => {
    try {
      const res = await deleteApplicationById(id);
      if (res) {
        setTimeout(() => fetchData(), 200);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredData = applyFilters(tableData, filters);
  const dataToShow = filteredData.slice(0, data?.limit || filteredData?.length);

  const upDateStatusApplications = async (status) => {
    try {
      await Promise.all(selectedRows.map((e) =>
        apiClientApplication.patch(`/applications/${e}`, { application_status_id: +status })
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
          {alert.show && (
            <AlertMessage
              message={alert.message}
              type={alert.type}
              onClose={() => setAlert({ ...alert, show: false })}
              duration={5000}
            />
          )}

          <div className="my-applications-header">
            <Select
              style={{ border: selectedRows.length > 0 ? "4px solid #ff1a1a" : "none" }}
              id={"status"}
              value={data?.status}
              onChange={(e) => {
                if (!selectedRows.length) setData("status", e);
                else upDateStatusApplications(e);
              }}
              options={status}
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
                <Table.Column title="ФИО" key="fullName" render={(_, row) => `${row.surname} ${row.name} ${row.patronymic}`} sortable />
                <Table.Column title="Телефон" dataIndex="phone_number" key="phone_number" sortable />
                <Table.Column title="Карта" dataIndex="card_name" key="card_name" sortable />
                <Table.Column title="Адрес" dataIndex="delivery_address" key="delivery_address" sortable />
                <Table.Column title="Скан паспорта (лицевая)" key="front_scan" render={(_, row) => renderFileIcon(row.front_side_of_the_passport)} />
                <Table.Column title="Скан паспорта (задняя)" key="back_scan" render={(_, row) => renderFileIcon(row.back_side_of_the_passport)} />
                <Table.Column title="Скан паспорта (с лицом)" key="selfie_scan" render={(_, row) => renderFileIcon(row.selfie_with_passport)} />
                <Table.Column title="Получаемый оффис" dataIndex="receiving_office" key="receiving_office" sortable />
                <Table.Column title="Телефон" dataIndex="phone_number" key="phone_number_extra" />
                <Table.Column title="Кодовое слово" dataIndex="secret_word" key="secret_word" />
                <Table.Column title="Имя на карте" dataIndex="card_name" key="card_name_extra" />
                <Table.Column title="Пол" dataIndex="gender" key="gender" />
                <Table.Column title="Резидент" key="is_resident" render={(_, row) => (row.is_resident ? "Да" : "Нет")} />
                <Table.Column title="Документ" dataIndex="type_of_certificate" key="type_of_certificate" />
                <Table.Column title="ИНН" dataIndex="inn" key="inn" sortable />
                <Table.Column title="Адрес" dataIndex="delivery_address" key="delivery_address_extra" />
                <Table.Column title="Карта" dataIndex="card_code" key="card_code" />
                <Table.Column title="Заявка создана в" key="CreatedAt" render={(_, row) => formatDate(row.CreatedAt)} sortable />
                <Table.Column title="Заявка обновлена в" key="UpdatedAt" render={(_, row) => formatDate(row.UpdatedAt)} sortable />
                <Table.Column title="Последние цифры карты" dataIndex="last_card_numbers" key="last_card_numbers" sortable />
                <Table.Column title="Тип карты" dataIndex="card_type" key="card_type" sortable />
                <Table.Column
                  title="Действия"
                  key="actions"
                  fixed="right"
                  render={(_, row) => (
                    <div className="active-table">
                      <AiFillEdit onClick={() => navigate(`/agent/card/${row.ID}`)} style={{ fontSize: 35, color: "green", cursor: "pointer", marginBottom: "10px" }} />
                      <AiFillDelete onClick={() => deleteApplication(row.ID)} style={{ fontSize: 35, color: "#c31414", cursor: "pointer" }} />
                    </div>
                  )}
                />
              </Table>
            )}
          </div>
        </main>
      </div>

      <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />
    </>
  );
}
