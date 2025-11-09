import React, { useEffect, useState } from "react";
import Input from "../../components/elements/Input.jsx";
import { useFormStore } from "../../hooks/useFormState.js";
import HeaderAgentQR from "../../components/dashboard/dashboard_agent_qr/MenuAgentQR.jsx";
import { FcHighPriority, FcOk } from "react-icons/fc";
import AlertMessage from "../../components/general/AlertMessage.jsx";
import "../../styles/checkbox.scss";
import QRStatistics from "./QRStatistics.jsx";

export default function TransactionsQR() {
  const { data, setData } = useFormStore();
  const [banks, setBanks] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isUsOnThem, setIsUsOnThem] = useState(false);
  const [isThemOnUs, setIsThemOnUs] = useState(true);
  const [filters, setFilters] = useState({});
  const [alert, setAlert] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  const backendUrl = import.meta.env.VITE_BACKEND_QR_URL;
  const mainBackendUrl = import.meta.env.VITE_BACKEND_URL;
  const token = localStorage.getItem("access_token");

  const showAlert = (message, type = "success") => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 3500);
  };

  // 🔹 Загрузка данных транзакций
  const fetchData = async (type = "themOnUs") => {
    try {
      setLoading(true);
      const endpoint = type === "usOnThem" ? "transactions" : "incoming_tx";
      const response = await fetch(
        `${backendUrl}${endpoint}?start_date=${
          data?.start_date || "2025-09-25"
        }&end_date=${data?.end_date || "2025-10-01"}`
      );
      if (!response.ok) throw new Error(`Ошибка HTTP ${response.status}`);

      const result = await response.json();
      setTableData(result);
      showAlert(`Загружено ${result.length} записей`, "success");
    } catch (error) {
      console.error("Ошибка загрузки данных:", error);
      showAlert("Ошибка загрузки данных. Проверьте сервер.", "error");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Загрузка банков
  const getBanks = async () => {
    try {
      const response = await fetch(`${backendUrl}banks`);
      const result = await response.json();
      setBanks(result);
    } catch (error) {
      console.error("Ошибка загрузки банков:", error);
    }
  };

  // 🔹 Загрузка мерчантов
  const getMerchants = async () => {
    try {
      const response = await fetch(`${mainBackendUrl}/merchants`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const result = await response.json();
      setMerchants(result);
    } catch (error) {
      console.error("Ошибка загрузки мерчантов:", error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = (data) => {
    if (!Array.isArray(data)) return [];
    return data.filter((row) =>
      Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        const rowValue = row[key];
        if (typeof rowValue === "number") {
          return String(rowValue).includes(value);
        }
        if (typeof rowValue === "string") {
          return rowValue.toLowerCase().includes(value.toLowerCase());
        }
        return false;
      })
    );
  };

  const filteredData = applyFilters(tableData);

  const sortedData = [...filteredData].sort((a, b) =>
    sortOrder === "asc" ? a.id - b.id : b.id - a.id
  );

  const toggleSort = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    if (isNaN(d)) return dateString;
    return d.toISOString().replace("T", " ").substring(0, 19);
  };

  // 🔹 Выгрузка в XLSX
  const handleExport = async () => {
    try {
      let ids = [];

      if (isUsOnThem) {
        ids = sortedData
          .filter((row) => selectedRows.includes(row.id))
          .map((row) => row.trnId)
          .filter((n) => typeof n === "number");
      } else {
        ids = sortedData
          .filter((row) => selectedRows.includes(row.id))
          .map((row) => Number(row.tx_id))
          .filter((n) => !isNaN(n) && typeof n === "number");
      }

      if (!ids.length) {
        showAlert("Выберите хотя бы одну запись для выгрузки", "error");
        return;
      }

      const route = isUsOnThem
        ? "/automation/qr/us-on-them"
        : "/automation/qr/them-on-us";

      const response = await fetch(`${mainBackendUrl}${route}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ qr_ids: ids }),
      });

      if (!response.ok) throw new Error("Ошибка при выгрузке файла");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");

      const allSelected = selectedRows.length === sortedData.length;
      const typeName = isUsOnThem ? "Us-on-Them" : "Them-on-Us";

      if (allSelected && data?.start_date && data?.end_date) {
        a.download = `${typeName}_${data.start_date}_to_${data.end_date}.xlsx`;
      } else {
        a.download = `${typeName}_QR_Report.xlsx`;
      }

      a.href = url;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      showAlert(`Файл успешно выгружен (${ids.length} записей)`, "success");
      setSelectedRows([]);
      setSelectAll(false);
    } catch (error) {
      console.error("Ошибка выгрузки QR:", error);
      showAlert("Ошибка выгрузки QR", "error");
    }
  };

  // 🔹 Эффекты
  useEffect(() => {
    setData("start_date", "2025-09-25");
    setData("end_date", "2025-10-01");
    getBanks();
    getMerchants();
  }, []);

  useEffect(() => {
    if (isUsOnThem) fetchData("usOnThem");
    else if (isThemOnUs) fetchData("themOnUs");
  }, [isUsOnThem, isThemOnUs]);

  useEffect(() => {
    if (data?.start_date && data?.end_date) {
      if (isUsOnThem) fetchData("usOnThem");
      else if (isThemOnUs) fetchData("themOnUs");
    }
  }, [data.start_date, data.end_date]);

  useEffect(() => {
    if (selectAll) setSelectedRows(sortedData.map((e) => e.id));
    else setSelectedRows([]);
  }, [selectAll]);

  return (
    <>
      <HeaderAgentQR activeLink="list" />
      <div className="applications-list">
        <main>
        <QRStatistics />
          <div className="my-applications-header">
            <button
              className={!showFilters ? "filter-toggle" : "Unloading"}
              onClick={() => setShowFilters(!showFilters)}
            >
              Фильтры
            </button>
            <pre> </pre>

            <div style={{ display: "flex", gap: "50px" }}>
              <button
                className={`archive-toggle ${isUsOnThem ? "active" : ""}`}
                onClick={() => {
                  setIsUsOnThem(true);
                  setIsThemOnUs(false);
                }}
              >
                Наш клиент — чужой QR (Us on Them)
              </button>

              <button
                className={`archive-toggle ${isThemOnUs ? "active" : ""}`}
                onClick={() => {
                  setIsThemOnUs(true);
                  setIsUsOnThem(false);
                }}
              >
                Наш QR — чужой клиент (Them on Us)
              </button>
            </div>

            <button className="Unloading" onClick={handleExport}>
              Выгрузка QR
            </button>

            <button
              className={selectAll && "selectAll-toggle"}
              onClick={() => setSelectAll(!selectAll)}
            >
              Выбрать все
            </button>
          </div>

          {showFilters && (
            <div className="filters animate-slideIn">
              {isUsOnThem && (
                <>
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
                </>
              )}

              {isThemOnUs && (
                <>
                  <input
                    placeholder="Код мерчанта"
                    onChange={(e) =>
                      handleFilterChange("merchant_code", e.target.value)
                    }
                  />
                  <input
                    placeholder="Код терминала"
                    onChange={(e) =>
                      handleFilterChange("terminal_code", e.target.value)
                    }
                  />
                </>
              )}

              <select
                onChange={(e) => handleFilterChange("status", e.target.value)}
              >
                <option value="">Статус</option>
                <option value="success">Успешно</option>
                <option value="cancel">Неудача</option>
                <option value="processing">Обработка</option>
              </select>

              <input
                placeholder="Сумма"
                onChange={(e) => handleFilterChange("amount", e.target.value)}
              />
            </div>
          )}

          <div className="my-applications-sub-header">
            <div>
              от{" "}
              <Input
                type="date"
                onChange={(e) => setData("start_date", e)}
                value={data?.start_date}
                style={{ width: "150px" }}
                id="start_date"
              />
            </div>
            <div>
              до{" "}
              <Input
                type="date"
                onChange={(e) => setData("end_date", e)}
                value={data?.end_date}
                style={{ width: "150px" }}
                id="end_date"
              />
            </div>
          </div>

          <div
            className="my-applications-content"
            style={{ position: "relative" }}
          >
            {loading ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                Загрузка...
              </div>
            ) : sortedData.length === 0 ? (
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
                    <th
                      onClick={toggleSort}
                      style={{ cursor: "pointer", userSelect: "none" }}
                    >
                      ID {sortOrder === "asc" ? "▲" : "▼"}
                    </th>
                    {isUsOnThem && (
                      <>
                        <th>ФИО</th>
                        <th>Телефон</th>
                      </>
                    )}
                    {isThemOnUs ? (
                      <>
                        <th>Мерчант</th>
                        <th>Код терминала</th>
                        <th>partner_trn_id</th>
                      </>
                    ) : (
                      <>
                        <th>trnId</th>
                        <th>qrId</th>
                      </>
                    )}
                    <th>Статус</th>
                    <th>Комментарий</th>
                    <th>Банк отправителя</th>
                    <th>Банк получателя</th>
                    <th>Сумма</th>
                    <th>Дата создания</th>
                  </tr>
                </thead>

                <tbody>
                  {sortedData.map((row, i) => (
                    <tr key={i}>
                      <td>
                        <input
                          type="checkbox"
                          className="custom-checkbox"
                          checked={selectedRows.includes(row.id)}
                          onChange={(e) => {
                            setSelectedRows(
                              e.target.checked
                                ? [...selectedRows, row.id]
                                : selectedRows.filter((id) => id !== row.id)
                            );
                          }}
                        />
                      </td>
                      <td>{row.id}</td>

                      {isUsOnThem && (
                        <>
                          <td>{row.sender_name || "-"}</td>
                          <td>{row.sender_phone || "-"}</td>
                        </>
                      )}

                      {isThemOnUs ? (
                        <>
                          <td>
                            {merchants.find((m) => m.code === row.merchant_code)
                              ?.title ||
                              row.merchant_code ||
                              "-"}
                          </td>
                          <td>{row.terminal_code || "-"}</td>
                          <td>{row.partner_trn_id || "-"}</td>
                        </>
                      ) : (
                        <>
                          <td>{row.trnId || "-"}</td>
                          <td>{row.qrId || "-"}</td>
                        </>
                      )}

                      <td>
                        {row.status === "success" ? (
                          <FcOk style={{ fontSize: "22px" }} />
                        ) : (
                          <FcHighPriority style={{ fontSize: "22px" }} />
                        )}
                      </td>

                      <td>{row.description || "-"}</td>

                      <td>
                        {banks.find(
                          (e) =>
                            e.id === row?.sender_bank ||
                            e.bankId === row?.sender
                        )?.bankName || "-"}
                      </td>
                      <td>
                        {banks.find((e) => e.id === row?.receiver)?.bankName ||
                          "-"}
                      </td>

                      <td>{row.amount} с.</td>

                      <td>
                        {isUsOnThem
                          ? formatDate(row.created_at)
                          : formatDate(row.creation_datetime)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>

      {alert && (
        <AlertMessage
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert(null)}
        />
      )}
    </>
  );
}
