// ApplicationsList.jsx
import React, { useEffect, useState, useCallback } from "react";
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
import Sidebar from "./DynamicMenu.jsx";
import useSidebar from "../../hooks/useSideBar.js";
import "../../styles/components/ApplicationsList.scss";

export default function ApplicationsList() {
  const { isSidebarOpen, toggleSidebar } = useSidebar();
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
  const [alert, setAlert] = useState({ show: false, message: "", type: "info" });
  const navigate = useNavigate();

  // WebSocket для новых заявок
  const wsUrl = import.meta.env.VITE_BACKEND_APPLICATION_URL_WS + '/applications/portal';

  const handleNewApplication = useCallback((newApplication) => {
    console.log('Новая заявка получена:', newApplication);
    
    // Показываем уведомление
    setAlert({
      show: true,
      message: `Новая заявка #${newApplication.ID} от ${newApplication.request_сreator}`,
      type: "info"
    });

    // Если не в архиве, ОБНОВЛЯЕМ данные через API вместо прямого добавления
    if (!archive) {
      // Вариант 1: Просто обновляем весь список
      fetchData(null, true);
      
      // ИЛИ Вариант 2: Добавляем только если заявки еще нет в списке
      // setTableData(prev => {
      //   const exists = prev.find(item => item.ID === newApplication.ID);
      //   if (exists) return prev;
      //   return [newApplication, ...prev];
      // });
    }
  }, [archive]);

  useWebSocket(wsUrl, handleNewApplication, [archive]);

  const fetchData = async (nextId = null, reset = false) => {
    try {
      setLoading(true);
      const backendUrl = import.meta.env.VITE_BACKEND_APPLICATION_URL;
      let query = new URLSearchParams();

      if (nextId) query.append("after", nextId);
      if (data?.month) query.append("month", data?.month);
      if (data?.year) query.append("year", data?.year);
      if (!selectedRows.length && data?.status)
        query.append("status_id", data?.status);

      const response = await fetch(
        `${backendUrl}/applications${
          archive ? "/archive" : `?${query.toString()}`
        }`
      );
      const result = await response.json();
      
      if (reset || nextId === null) {
        // Полная замена данных
        setTableData(result);
      } else {
        // Добавление с проверкой на дубликаты
        setTableData(prev => {
          const existingIds = new Set(prev.map(item => item.ID));
          const newItems = result.filter(item => !existingIds.has(item.ID));
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
  };


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
      const response = await fetch(`${backendUrl}/automation/application`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
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

  // ФИКС: передаем filters как параметр в applyFilters
  const applyFilters = (data, currentFilters) => {
    if (!Array.isArray(data)) return [];
    
    return data.filter((row) => {
      const fullName = `${row?.surname || ''} ${row?.name || ''} ${row?.patronymic || ''}`.toLowerCase();
      return (
        fullName?.includes(currentFilters?.fullName?.toLowerCase() || '') &&
        row?.phone_number?.includes(currentFilters?.phone || '') &&
        (!currentFilters?.resident ||
          (currentFilters?.resident === "Да"
            ? row?.is_resident
            : !row?.is_resident)) &&
        (!currentFilters?.card ||
          row?.card_name
            ?.toLowerCase()
            ?.includes(currentFilters?.card?.toLowerCase() || ''))
      );
    });
  };

  const headers = [
    "Телефон",
    "Кодовое слово",
    "Имя на карте",
    "Пол",
    "Резидент",
    "Документ",
    "ИНН",
    "Адрес",
    "Карта",
  ];

  const renderFileIcon = (path) => {
    if (!path) return null;
    const backendUrl = import.meta.env.VITE_BACKEND_APPLICATION_URL;
    const fullUrl = `${backendUrl}/${path.replace(/\\/g, "/")}`;
    return (
      <button
        className="file-icon-button"
        onClick={() => setPreviewImage(fullUrl)}
      >
        <img src={fileLogo} alt="Файл" width={48} height={60} />
      </button>
    );
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

  // ФИКС: передаем filters в applyFilters
  const filteredData = applyFilters(tableData, filters);

  const upDateStatusApplications = async (status) => {
    try {
      await selectedRows.map(async (e) => {
        await apiClientApplication.patch(`/applications/${e}`, {
          application_status_id: +status,
        });
      });

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
  }, [archive]);

  useEffect(() => {
    fetchData(null, true);
  }, [data?.month, data?.year, data?.status]);

  useEffect(() => {
    if (selectAll) {
      setSelectedRows(filteredData.map((e) => e.ID));
    } else {
      setSelectedRows([]);
    }
  }, [selectAll]);

  useEffect(() => {
    if (fetching && nextId !== undefined) {
      fetchData(nextId);
    }
  }, [fetching]);

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
  }, []);
  return (
    <>
      <div className={`dashboard-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
        <Sidebar activeLink="applications" isOpen={isSidebarOpen} toggle={toggleSidebar} />
        <div className="applications-list">
          <main>
            {/* Уведомление о новой заявке */}
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
                style={{ border: selectedRows.length && "4px solid #ff1a1a" }}
                id={"status"}
                value={data?.status}
                onChange={(e) => {
                  if (!selectedRows.length) setData("status", e);
                  else upDateStatusApplications(e);
                }}
                options={status}
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
                className={selectAll ? "selectAll-toggle active" : "selectAll-toggle"}
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
                      <th>Карта</th>
                      <th>Адрес</th>
                      <th>Скан паспорта (лицевая)</th>
                      <th>Скан паспорта (задняя)</th>
                      <th>Скан паспорта (с лицом)</th>
                      {headers.map((e, i) => (
                        <th key={i}>{e}</th>
                      ))}
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
                                      : selectedRows.filter((id) => id !== row.ID)
                                  );
                                }}
                              />
                            </td>
                            <td>{row.ID}</td>
                            <td>{`${row.surname} ${row.name} ${row.patronymic}`}</td>
                            <td>{row.phone_number}</td>
                            <td>{row.card_name}</td>
                            <td>{row.delivery_address}</td>
                            <td>
                              {renderFileIcon(row.front_side_of_the_passport)}
                            </td>
                            <td>
                              {renderFileIcon(row.back_side_of_the_passport)}
                            </td>
                            <td>{renderFileIcon(row.selfie_with_passport)}</td>
                            <td>{row.phone_number}</td>
                            <td>{row.secret_word}</td>
                            <td>{row.card_name}</td>
                            <td>{row.gender}</td>
                            <td>{row.is_resident ? "Да" : "Нет"}</td>
                            <td>{row.type_of_certificate}</td>
                            <td>{row.inn}</td>
                            <td>{row.delivery_address}</td>
                            <td>{row.card_code}</td>
                            <td className="active-table">
                              <AiFillEdit
                                onClick={() => navigate(`/agent/card/${row.ID}`)}
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
      </div>
    </>
  );
}
