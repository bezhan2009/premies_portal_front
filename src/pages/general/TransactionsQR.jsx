// ApplicationsList.jsx
import React, { useEffect, useState } from "react";
import Input from "../../components/elements/Input.jsx";
import { useFormStore } from "../../hooks/useFormState.js";
import fileLogo from "../../assets/file_logo.png";
import Select from "../../components/elements/Select.jsx";
import HeaderAgent from "../../components/dashboard/dashboard_agent/MenuAgent.jsx";
import Spinner from "../../components/Spinner.jsx";
import "../../styles/checkbox.scss";
import { AiFillDelete, AiFillEdit } from "react-icons/ai";
import { deleteApplicationById } from "../../api/application/deleteApplicationById.js";
// import { b, s } from "framer-motion/client";
import HeaderAgentQR from "../../components/dashboard/dashboard_agent_qr/MenuAgentQR.jsx";
import { FcHighPriority, FcOk } from "react-icons/fc";

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

  const fetchData = async (res = true) => {
    try {
      setLoading(true);
      const backendUrl = import.meta.env.VITE_BACKEND_QR_URL;
      const response = await fetch(
        `${backendUrl}${archive ? "transactions" : "incoming_tx"}?start_date=${
          data?.start_date || "2025-9-25"
        }&end_date=${data?.end_date || "2025-10-01"}`
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
    if (!Array.isArray(data)) return [];

    return data.filter((row) => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true;

        const rowValue = row[key];
        if (key === "status") {
          return String(rowValue).toLowerCase() === String(value).toLowerCase();
        }
        if (typeof rowValue === "number") {
          return String(rowValue).includes(String(value));
        }
        if (typeof rowValue === "string") {
          return rowValue.toLowerCase().includes(value.toLowerCase());
        }
        return false;
      });
    });
  };

  const filteredData = applyFilters(tableData);

  useEffect(() => {
    fetchData(true);
  }, [archive]);

  useEffect(() => {
    if (selectAll) {
      setSelectedRows(filteredData.map((e) => e.id));
    } else {
      setSelectedRows([]);
    }
  }, [selectAll]);

  useEffect(() => {
    if (fetching && nextId !== undefined) {
      fetchData(nextId);
    }
  }, [fetching]);

  useEffect(() => {
    fetchData(null, true);
  }, [data?.start_date, data?.end_date]);

  console.log("filteredData", filteredData);
  console.log("tableData", tableData);

  useEffect(() => {
    setData("start_date", "2025-09-25");
    setData("end_date", "2025-10-01");
  }, []);

  return (
    <>
      <HeaderAgentQR activeLink="applications" />
      <div className="applications-list">
        <main>
          <div className="my-applications-header">
            {/* <button className="Unloading">Выгрузка для карт</button> */}
            <button
              className={!showFilters ? "filter-toggle" : "Unloading"}
              onClick={() => setShowFilters(!showFilters)}
            >
              Фильтры
            </button>
            <button
              className={"archive-toggle"}
              onClick={() => setArchive(!archive)}
            >
              {archive ? "Us on Them" : "Them on Us"}
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
                onChange={(e) =>
                  handleFilterChange("sender_name", e.target.value)
                }
              />
              <input
                placeholder="Телефон"
                onChange={(e) =>
                  handleFilterChange("sender_phone", e.target.value)
                }
              />
              <select
                onChange={(e) => handleFilterChange("status", e.target.value)}
              >
                <option value="">Статус перевода</option>
                <option value="success">успешно</option>
                <option value="failed">неудача</option>
                <option value="processing">обрабатывается</option>
              </select>
              <input
                placeholder="Сумма перевода"
                onChange={(e) => handleFilterChange("amount", e.target.value)}
              />
            </div>
          )}

          <div className="my-applications-sub-header">
            <div>
              от
              <Input
                type="date"
                placeholder={""}
                onChange={(e) => setData("start_date", e)}
                value={data?.start_date}
                // error={errors}
                style={{ width: "150px" }}
                id={"start_date"}
              />{" "}
            </div>
            <div>
              до
              <Input
                type="date"
                placeholder={""}
                onChange={(e) => setData("end_date", e)}
                value={data?.end_date}
                // error={errors}
                style={{ width: "150px" }}
                id={"end_date"}
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
                    <th>Коментарий</th>
                    <th>Банк</th>
                    {/* <th>sender_bank</th> */}
                  </tr>
                </thead>
                <tbody>
                  {filteredData &&
                    filteredData
                      // ?.slice(0, data?.limit || filteredData?.length)
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
                          <td>{`${row.sender_name}`}</td>
                          <td>{row.sender_phone}</td>
                          <td>{row.status === "success" ? <FcOk style={{ fontSize: "24px" }} /> : <FcHighPriority style={{ fontSize: "24px" }} />}</td>
                          <td>{row.description}</td>
                          <td>{row.sender_bank}</td>
                          <th></th>
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
