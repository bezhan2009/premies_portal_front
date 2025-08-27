// ApplicationsList.jsx
import React, { useEffect, useState } from "react";
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

export default function ApplicationsList() {
  const { data, errors, setData } = useFormStore();
  const [selectedRows, setSelectedRows] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [archive, setArchive] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [filters, setFilters] = useState({
    fullName: "",
    phone: "",
    resident: "",
    card: "",
  });
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      setLoading(true);
      const backendUrl = import.meta.env.VITE_BACKEND_APPLICATION_URL;
      const response = await fetch(
        `${backendUrl}/applications${archive ? "/archive" : ""}`
      );
      const result = await response.json();
      setTableData(result);
    } catch (error) {
      console.error("Ошибка загрузки заявок:", error);
    } finally {
      setLoading(false);
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

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = (data) => {
    return data.filter((row) => {
      const fullName =
        `${row.surname} ${row.name} ${row.patronymic}`.toLowerCase();
      return (
        fullName.includes(filters.fullName.toLowerCase()) &&
        row.phone_number.includes(filters.phone) &&
        (!filters.resident ||
          (filters.resident === "Да" ? row.is_resident : !row.is_resident)) &&
        (!filters.card ||
          row.card_name.toLowerCase().includes(filters.card.toLowerCase()))
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

  const filteredData = applyFilters(tableData);

  useEffect(() => {
    fetchData();
  }, [archive]);

  useEffect(() => {
    if (selectAll) {
      setSelectedRows(filteredData.map((e) => e.ID));
    } else {
      setSelectedRows([]);
    }
  }, [selectAll]);

  return (
    <>
      <HeaderAgent activeLink="applications" />
      <div className="applications-list">
        <main>
          <div className="my-applications-header">
            <Select
              id={"status"}
              value={data?.status}
              onChange={(e) => setData("status", e)}
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
              className={archive && "archive-toggle"}
              onClick={() => setArchive(!archive)}
            >
              Архив
            </button>
            <button
              className={selectAll && "selectAll-toggle"}
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
                onChange={(e) => handleFilterChange("fullName", e.target.value)}
              />
              <input
                placeholder="Телефон"
                onChange={(e) => handleFilterChange("phone", e.target.value)}
              />
              <select
                onChange={(e) => handleFilterChange("resident", e.target.value)}
              >
                <option value="">Резидент</option>
                <option value="Да">Да</option>
                <option value="Нет">Нет</option>
              </select>
              <input
                placeholder="Карта"
                onChange={(e) => handleFilterChange("card", e.target.value)}
              />
            </div>
          )}

          <div className="my-applications-sub-header">
            {loading ? (
              <Spinner />
            ) : (
              <>
                Показать{" "}
                <Input
                  type="number"
                  placeholder={""}
                  onChange={(e) => setData("limit", e)}
                  value={data?.limit}
                  error={errors}
                  id={"limit"}
                />{" "}
                записей
              </>
            )}
          </div>

          <div
            className="my-applications-content"
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
                  {filteredData
                    .slice(0, data?.limit || filteredData.length)
                    .map((row, index) => (
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
                        <td>{renderFileIcon(row.back_side_of_the_passport)}</td>
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
    </>
  );
}
