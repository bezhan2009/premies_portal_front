// ApplicationsList.jsx
import React, { useEffect, useState } from "react";
import Input from "../../components/elements/Input.jsx";
import { useFormStore } from "../../hooks/useFormState.js";
import { status } from "../../const/defConst.js";
import fileLogo from "../../assets/file_logo.png";
import Select from "../../components/elements/Select.jsx";
import HeaderAgent from "../../components/dashboard/dashboard_agent/MenuAgent.jsx";
import Spinner from "../../components/Spinner.jsx";
import "../../styles/checkbox.scss";
import { AiFillDelete, AiFillEdit } from "react-icons/ai";
import { useNavigate } from "react-router-dom";
import { deleteApplicationById } from "../../api/application/deleteApplicationById.js";
// import { b, s } from "framer-motion/client";
import HeaderAgentQR from "../../components/dashboard/dashboard_agent_qr/MenuAgentQR.jsx";

export default function TransactionsQR() {
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

  const fetchData = async (res = false) => {
    try {
      setLoading(true);
      const backendUrl = import.meta.env.VITE_BACKEND_QR_URL;
      let query = new URLSearchParams();
      if (data?.month) query.append("start_date", data?.month);
      if (data?.year) query.append("end_date", data?.year);
      const response = await fetch(
        `${backendUrl}/applications${
          archive ? "/archive" : `?${query.toString()}`
        }`
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

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = (data) => {
    return (
      Array.isArray(data) &&
      data?.filter((row) => {
        const fullName =
          `${row?.surname} ${row?.name} ${row?.patronymic}`?.toLowerCase();
        return (
          fullName?.includes(filters?.fullName?.toLowerCase()) &&
          row?.phone_number?.includes(filters?.phone) &&
          (!filters?.resident ||
            (filters?.resident === "Да"
              ? row?.is_resident
              : !row?.is_resident)) &&
          (!filters?.card ||
            row?.card_name
              ?.toLowerCase()
              ?.includes(filters?.card?.toLowerCase()))
        );
      })
    );
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
      <HeaderAgentQR activeLink="applications" />
      <div className="applications-list">
        <main>
          <div className="my-applications-header">
            <button className="Unloading">Выгрузка для карт</button>
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
            <div>
              Поиск по месяцам
              <Input
                type="number"
                placeholder={""}
                onChange={(e) => setData("month", e)}
                value={data?.month}
                // error={errors}
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
                // error={errors}
                id={"year"}
              />{" "}
            </div>
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
    </>
  );
}
