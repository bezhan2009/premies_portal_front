// ApplicationsList.jsx
import React, { useEffect, useState, useCallback } from "react";
import Input from "../../components/elements/Input";
import { useFormStore } from "../../hooks/useFormState";
import { statusCredit } from "../../const/defConst";

import Select from "../../components/elements/Select";
import HeaderAgent from "../../components/dashboard/dashboard_agent/MenuAgent.jsx";
import Spinner from "../../components/Spinner.jsx";
import "../../styles/checkbox.scss";
import { AiFillDelete, AiFillEdit } from "react-icons/ai";
import { useNavigate } from "react-router-dom";
import { apiClientCredit } from "../../api/utils/apiClientCredit.js";
import HeaderCredit from "../../components/dashboard/dashboard_credit/MenuCredit.jsx";
import { deleteCreditById } from "../../api/application/deleteCreditById.js";

export default function ApplicationsListCredit() {
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
  const [filters, setFilters] = useState({
    fullName: "",
    phone: "",
    resident: "",
    card: "",
  });
  const navigate = useNavigate();

  const fetchData = useCallback(
    async (nextId = null, res = false) => {
      try {
        setLoading(true);
        const backendUrl = import.meta.env.VITE_BACKEND_CREDIT_URL;
        let query = new URLSearchParams();

        if (nextId) query.append("after", nextId);
        if (data?.month) query.append("month", data?.month);
        if (data?.year) query.append("year", data?.year);
        if (!selectedRows.length && data?.status)
          query.append("status_id", data?.status);
        const response = await fetch(
          `${backendUrl}/credits${archive ? "/archive" : `?${query.toString()}`}`,
        );
        const result = await response.json();
        if (res) {
          setTableData(result);
        } else setTableData([...tableData, ...result]);

        setNextId(result?.[result?.length - 1]?.ID);
        setFetching(false);
      } catch (error) {
        console.log("Ошибка загрузки заявок:", error);
      } finally {
        setLoading(false);
        setFetching(false);
      }
    },
    [
      archive,
      data?.month,
      data?.year,
      data?.status,
      selectedRows.length,
      tableData,
    ],
  );

  function ImagePreviewModal({ imageUrl, onClose }) {
    if (!imageUrl) return null;
    return (
      <div className="custom-modal-overlay" onClick={onClose}>
        <div
          className="custom-modal-content animate-scaleIn"
          onClick={(e) => e.stopPropagation()}
        >
          <button className="custom-modal-close" onClick={onClose}>
            ×
          </button>
          <img
            src={imageUrl}
            alt="Предпросмотр"
            className="custom-modal-image"
          />
        </div>
      </div>
    );
  }

  const handleExport = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${backendUrl}/automation/credit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
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

  const scrollHandler = (e) => {
    const target = e.target;
    console.table({
      name: "target",
      scrollHeight: target.scrollHeight,
      scrollTop: target.scrollTop,
      clientHeight: target.clientHeight,
    });

    if (!fetching) {
      if (target.scrollHeight - (target.scrollTop + target.clientHeight) < 1) {
        setFetching(true);
      }
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };
  const applyFilters = (rows) => {
    return (
      Array.isArray(rows) &&
      rows
        ?.filter((row) => {
          const fullName =
            `${row?.surname} ${row?.name} ${row?.patronymic}`?.toLowerCase();
          return (
            fullName?.includes(filters?.fullName?.toLowerCase()) &&
            row?.phone?.includes(filters?.phone) &&
            (!filters?.card ||
              row?.card_name
                ?.toLowerCase()
                ?.includes(filters?.card?.toLowerCase()))
          );
        })
        .filter((row) => {
          if (data?.name_filter) {
            const fullName =
              `${row?.surname} ${row?.name} ${row?.patronymic}`.toLowerCase();
            if (!fullName.includes(data.name_filter.toLowerCase()))
              return false;
          }

          if (data?.phone_filter) {
            if (!row?.phone?.includes(data.phone_filter)) return false;
          }

          return true;
        })
    );
  };

  const deleteApplication = async (id) => {
    try {
      await deleteCreditById(id);
      // if (res) {
      setTimeout(() => fetchData(null, true), 200);
      // }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredData = applyFilters(tableData);

  const upDateStatusApplications = async (status) => {
    try {
      await selectedRows.map(async (e) => {
        await apiClientCredit.patch(`/credits/${e}`, {
          credit_status_id: +status,
        });
      });

      setData("status", "");
      fetchData(null, true);
      setSelectedRows([]);
      setSelectAll(false);
    } catch (e) {
      console.error(e);
    }
    // if (selectedRows.length) {
    //   setData("status", "");
    //   fetchData(null, true);
    //   setSelectedRows([]);
    //   setSelectAll(false);
    // }
  };

  useEffect(() => {
    fetchData(null, true);
  }, [archive, fetchData]);

  useEffect(() => {
    fetchData(null, true);
  }, [data?.month, data?.year, data?.status, fetchData]);

  useEffect(() => {
    if (selectAll) {
      setSelectedRows(filteredData.map((e) => e.ID));
    } else {
      setSelectedRows([]);
    }
  }, [selectAll, filteredData]);

  useEffect(() => {
    if (fetching && nextId !== undefined) {
      fetchData(nextId);
    }
  }, [fetching, nextId, fetchData]);

  console.log("nextId", nextId);

  useEffect(() => {
    if (data.month || data.month === "") {
      localStorage.setItem("month", data.month);
    }
    if (data.year || data.year === "") {
      localStorage.setItem("year", data.year);
    }
  }, [data]);

  useEffect(() => {
    const savedMonth = localStorage.getItem("month");
    const savedYear = localStorage.getItem("year");
    if (savedMonth) {
      setData("month", savedMonth);
    }
    if (savedYear) {
      setData("year", savedYear);
    }
  }, [setData]);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <>
      <div className="applications-list content-page">
        <main>
          <div className="my-applications-header">
            <Select
              style={{ border: selectedRows.length && "4px solid #ff1a1a" }}
              id={"status"}
              value={data?.status}
              onChange={(e) => {
                if (!selectedRows.length) setData("status", e);
                else upDateStatusApplications(e);
              }}
              options={statusCredit}
              error={errors}
            />
            <button className="Unloading" onClick={handleExport}>
              Выгрузка для карт
            </button>
            <button
              className="filter-toggle"
              onClick={() => setShowFilters(!showFilters)}
            >
              Фильтры
            </button>
            <button
              className={archive ? "archive-toggle active" : "archive-toggle"}
              onClick={() => setArchive(!archive)}
            >
              Архив
            </button>
            <button
              className={
                selectAll ? "selectAll-toggle active" : "selectAll-toggle"
              }
              onClick={() => {
                setSelectAll(!selectAll);
              }}
            >
              Выбрать все
            </button>
          </div>

          {showFilters && (
            <div className="filters animate-slideIn">
              <input
                placeholder="ФИО"
                value={filters.fullName}
                onChange={(e) => handleFilterChange("fullName", e.target.value)}
              />
              <input
                placeholder="Телефон"
                value={filters.phone}
                onChange={(e) => handleFilterChange("phone", e.target.value)}
              />
              <select
                value={filters.resident}
                onChange={(e) => handleFilterChange("resident", e.target.value)}
              >
                <option value="">Резидент</option>
                <option value="Да">Да</option>
                <option value="Нет">Нет</option>
              </select>
              <input
                placeholder="Карта"
                value={filters.card}
                onChange={(e) => handleFilterChange("card", e.target.value)}
              />
            </div>
          )}

          <div className="my-applications-sub-header">
            <div>
              Поиск по месяцам
              <Input
                type="number"
                placeholder={""}
                onChange={(e) => setData("month", e)}
                value={data?.month}
                id={"month"}
              />{" "}
            </div>
            <div>
              Поиск по годам
              <Input
                type="number"
                placeholder={""}
                onChange={(e) => setData("year", e)}
                value={data?.year}
                id={"year"}
              />{" "}
            </div>
            {loading ? (
              <Spinner />
            ) : (
              <>
                <div>
                  Показать{" "}
                  <Input
                    type="number"
                    placeholder={""}
                    onChange={(e) => setData("limit", e)}
                    value={data?.limit}
                    id={"limit"}
                  />{" "}
                  записей
                </div>
              </>
            )}
          </div>

          <div
            className="my-applications-content"
            onScroll={scrollHandler}
            style={{ position: "relative" }}
          >
            {filteredData.length === 0 ? (
              <div
                style={{ textAlign: "center", padding: "2rem", color: "gray" }}
              >
                Нет данных для отображения
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Выбрать</th>
                    <th>ID</th>
                    <th>ФИО</th>
                    <th>Телефон</th>
                    <th>Тип Карты</th>
                    <th>Адрес</th>
                    <th>ИНН</th>
                    <th>Дата рождения</th>
                    <th>Пол</th>
                    <th>Резидент</th>
                    <th>Документ</th>
                    <th>Создано в</th>
                    <th>Обновлено в</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData &&
                    filteredData
                      ?.slice(0, data?.limit || filteredData?.length)
                      ?.map((row, index) => (
                        <tr key={index}>
                          <td>
                            <input
                              type="checkbox"
                              className="custom-checkbox"
                              checked={selectedRows.includes(row.ID)}
                              onChange={(e) => {
                                setSelectedRows(
                                  e.target.checked
                                    ? [...selectedRows, row.ID]
                                    : selectedRows.filter(
                                        (id) => id !== row.ID,
                                      ),
                                );
                              }}
                            />
                          </td>
                          <td>{row.ID}</td>
                          <td>{`${row.surname} ${row.name} ${row.patronymic}`}</td>
                          <td>{row.phone_number}</td>
                          <td>{row.card_type}</td>
                          <td>{row.delivery_address}</td>
                          <td>{row.inn}</td>
                          <td>{row.date_of_birth}</td>
                          <td>{row.gender}</td>
                          <td>{row.is_resident ? "Да" : "Нет"}</td>
                          <td>{row.type_of_certificate}</td>
                          <td>{formatDate(row.CreatedAt)}</td>
                          <td>{formatDate(row.UpdatedAt)}</td>
                          <td className="active-table">
                            <AiFillEdit
                              onClick={() =>
                                navigate(`/agent/credit/${row.ID}`)
                              }
                              style={{
                                fontSize: 35,
                                color: "green",
                                cursor: "pointer",
                                marginBottom: "10px",
                              }}
                            />
                            <AiFillDelete
                              onClick={() => deleteApplication(row.ID)}
                              style={{
                                fontSize: 35,
                                color: "#c31414",
                                cursor: "pointer",
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>

      <ImagePreviewModal
        imageUrl={previewImage}
        onClose={() => setPreviewImage(null)}
      />
    </>
  );
}
