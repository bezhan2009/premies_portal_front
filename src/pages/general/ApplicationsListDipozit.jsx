// ApplicationsList.jsx
import React, { useEffect, useState } from "react";
import Input from "../../components/elements/Input";
import { useFormStore } from "../../hooks/useFormState";
import { status } from "../../const/defConst";
import Select from "../../components/elements/Select";
import HeaderAgent from "../../components/dashboard/dashboard_agent/MenuAgent.jsx";
import Spinner from "../../components/Spinner.jsx";
import "../../styles/checkbox.scss";
import { AiFillDelete, AiFillEdit } from "react-icons/ai";
import { useNavigate } from "react-router-dom";
import { deleteApplicationById } from "../../api/application/deleteApplicationById.js";
import HeaderDipozit from "../../components/dashboard/dashboard_dipozit/MenuDipozit.jsx";
import { apiClientApplicationDipozit } from "../../api/utils/apiClientApplicationDipozit.js";
import useSidebar from "../../hooks/useSideBar.js";
import Sidebar from "./DynamicMenu.jsx";


export default function ApplicationsListDipozit() {
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
  const navigate = useNavigate();

  const fetchData = async (nextId = null, res = false) => {
    try {
      setLoading(true);
      const backendUrl = import.meta.env.VITE_BACKEND_APPLICATION_DIPOZIT_URL;
      let query = new URLSearchParams();

      if (nextId) query.append("after", nextId);
      if (data?.month) query.append("month", data?.month);
      if (data?.year) query.append("year", data?.year);
      if (!selectedRows.length && data?.status)
        query.append("status_id", data?.status);
      const response = await fetch(
        `${backendUrl}deposits${archive ? "/archive" : `?${query.toString()}`}`
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

  const handleExport = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${backendUrl}/automation/deposits`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ deposits_ids: selectedRows }),
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

  const applyFilters = (data) => {
    if (!Array.isArray(data)) return [];

    return data.filter((row) => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true;

        const rowValue = row[key];
        if (key === "client_code") {
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
  // const renderFileIcon = (path) => {
  //   const backendUrl = import.meta.env.VITE_BACKEND_APPLICATION_DIPOZIT_URL;
  //   const fullUrl = `${backendUrl}/${path.replace(/\\/g, "/")}`;
  //   return (
  //     <button
  //       className="file-icon-button"
  //       onClick={() => setPreviewImage(fullUrl)}
  //     >
  //       <img src={fileLogo} alt="Файл" width={48} height={60} />
  //     </button>
  //   );
  // };

  const deleteApplication = async (id) => {
    try {
      const valid = confirm("Вы уверены, что хотите удалить?");
      if (valid) {
        const res = await apiClientApplicationDipozit.delete(`/deposits/${id}`);
        fetchData(null, true);
        return res.data;
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
      <div className={`dashboard-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
        <Sidebar activeLink="deposits" isOpen={isSidebarOpen} toggle={toggleSidebar} />
        <div className="applications-list content-page">
          <main>
            <div className="my-applications-header">
              <button className="Unloading" onClick={handleExport}>
                Выгрузка
              </button>
              <button
                className="filter-toggle"
                onClick={() => setShowFilters(!showFilters)}
              >
                Фильтры
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
                  placeholder="Код клиента"
                  onChange={(e) =>
                    handleFilterChange("client_code", e.target.value)
                  }
                />
                <input
                  placeholder="Тип депозита"
                  onChange={(e) =>
                    handleFilterChange("type_of_deposit", e.target.value)
                  }
                />
                <input
                  placeholder="Начисленный счет"
                  onChange={(e) =>
                    handleFilterChange("accrued_account", e.target.value)
                  }
                />
                <input
                  placeholder="Выводный счет"
                  onChange={(e) =>
                    handleFilterChange("withdraw_account", e.target.value)
                  }
                />
                <input
                  placeholder="Сумма"
                  onChange={(e) =>
                    handleFilterChange("sum_of_deposit", e.target.value)
                  }
                />
                <input
                  placeholder="Валюта"
                  onChange={(e) =>
                    handleFilterChange("deposit_currency", e.target.value)
                  }
                />
                <input
                  placeholder="Месяцы"
                  onChange={(e) =>
                    handleFilterChange("deposit_term_month", e.target.value)
                  }
                />
              </div>
            )}

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
                      <th>Код клиента</th>
                      <th>Тип депозита</th>
                      <th>Капитал</th>
                      <th>Начисленный счет</th>
                      <th>Выводный счет</th>
                      <th>Сумма</th>
                      <th>Валюта</th>
                      <th>Месяцы</th>
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
                            <td>{row.client_code}</td>
                            <td>{row.type_of_deposit}</td>
                            <td>{row.is_capitalize ? "Да" : "Нет"}</td>
                            <td>{row.accrued_account}</td>
                            <td>{row.withdraw_account}</td>
                            <td>{row.sum_of_deposit}</td>
                            <td>{row.deposit_currency}</td>
                            <td>{row.deposit_term_month}</td>
                            <td className="active-table">
                              <AiFillEdit
                                onClick={() =>
                                  navigate(`/agent/dipozit/card/${row.ID}`)
                                }
                                style={{
                                  fontSize: 35,
                                  color: "green",
                                  cursor: "pointer",
                                  // marginBottom: "10px",
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
