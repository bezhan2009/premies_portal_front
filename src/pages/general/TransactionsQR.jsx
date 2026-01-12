import React, { useEffect, useMemo, useState } from "react";
import Input from "../../components/elements/Input.jsx";
import { useFormStore } from "../../hooks/useFormState.js";
import { FcCancel, FcHighPriority, FcOk, FcProcess } from "react-icons/fc";
import AlertMessage from "../../components/general/AlertMessage.jsx";
import "../../styles/checkbox.scss";
import "../../styles/components/TransactionsQR.scss"
import QRStatistics from "./QRStatistics.jsx";
import useSidebar from "../../hooks/useSideBar.js";
import Sidebar from "./DynamicMenu.jsx";



export default function TransactionsQR() {
  const { data, setData } = useFormStore();
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const [activeBankLimit, setActiveBankLimit] = useState(null);

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

  const backendQR = import.meta.env.VITE_BACKEND_QR_URL;
  const backendMain = import.meta.env.VITE_BACKEND_URL;
  const token = localStorage.getItem("access_token");

    const getActiveBankLimit = async () => {
        try {
            const resp = await fetch(`${import.meta.env.VITE_BACKEND_QR_URL}limit`);
            if (!resp.ok) throw new Error("Ошибка загрузки лимита");
            const json = await resp.json();
            setActiveBankLimit(json?.limit ?? 0);
        } catch (e) {
            console.error("Ошибка лимита:", e);
            setActiveBankLimit(null);
        }
    };


    const showAlert = (message, type = "success") => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 3500);
  };

  // Функция для конвертации времени в ISO формат с Z
  const formatTimeForBackend = (dateString) => {
    if (!dateString) return "";
    try {
      const d = new Date(dateString);
      if (isNaN(d)) return "";
      
      // Преобразуем в ISO строку и добавляем Z (UTC)
      // Убираем миллисекунды если они есть
      return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
    } catch (e) {
      console.error("Error formatting date:", e, dateString);
      return "";
    }
  };

  // Форматирование для отображения в таблице
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return "";
    try {
      const d = new Date(dateString);
      if (isNaN(d)) return dateString;
      const pad = (n) => String(n).padStart(2, "0");
      const yyyy = d.getFullYear();
      const MM = pad(d.getMonth() + 1);
      const dd = pad(d.getDate());
      const hh = pad(d.getHours());
      const mi = pad(d.getMinutes());
      const ss = pad(d.getSeconds());
      return `${yyyy}-${MM}-${dd} ${hh}:${mi}:${ss}`;
    } catch (e) {
      return dateString;
    }
  };

  const getRowKey = (row) => {
    if (isUsOnThem) {
      return `${row.id || 0}-${row.trnId || 0}`;
    } else {
      return `${row.id || 0}-${row.tx_id || row.partner_trn_id || ""}`;
    }
  };

  const fetchData = async (type = "themOnUs") => {
    try {
      setLoading(true);
      const endpoint = type === "usOnThem" ? "transactions" : "incoming_tx";

      const startDate = data?.start_date ?? "2025-09-25";
      const endDate = data?.end_date ?? "2025-10-01";

      const url = `${backendQR}${endpoint}?start_date=${startDate}&end_date=${endDate}`;

      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Ошибка HTTP ${resp.status}`);
      const json = await resp.json();
      setTableData(json || []);
      showAlert(`Загружено ${json.length} записей`, "success");
    } catch (err) {
      console.error("Ошибка загрузки данных:", err);
      showAlert("Ошибка загрузки данных. Проверьте сервер.", "error");
      setTableData([]);
    } finally {
      setLoading(false);
    }
  };

  const getBanks = async () => {
    try {
      const resp = await fetch(`${backendQR}banks`);
      if (!resp.ok) throw new Error(`Ошибка HTTP ${resp.status}`);
      const json = await resp.json();
      setBanks(json || []);
    } catch (err) {
      console.error("Ошибка загрузки банков:", err);
      setBanks([]);
    }
  };

  const getMerchants = async () => {
    try {
      const resp = await fetch(`${backendMain}/merchants`, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!resp.ok) throw new Error(`Ошибка HTTP ${resp.status}`);
      const json = await resp.json();
      setMerchants(Array.isArray(json) ? json : []);
    } catch (err) {
      console.error("Ошибка загрузки мерчантов:", err);
      setMerchants([]);
    }
  };

  const filteredData = useMemo(() => {
    if (!Array.isArray(tableData)) return [];
    return tableData.filter((row) =>
      Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        const rowValue = row[key];
        if (rowValue == null) return false;
        if (typeof rowValue === "number")
          return String(rowValue).includes(value);
        if (typeof rowValue === "string")
          return rowValue.toLowerCase().includes(String(value).toLowerCase());
        return false;
      })
    );
  }, [tableData, filters]);

  const sortedData = useMemo(() => {
    const arr = [...filteredData];
    arr.sort((a, b) => {
      const ka = Number(a.id ?? a.tx_id ?? a.trnId ?? 0);
      const kb = Number(b.id ?? b.tx_id ?? b.trnId ?? 0);
      return sortOrder === "asc" ? ka - kb : kb - ka;
    });
    return arr;
  }, [filteredData, sortOrder]);

  useEffect(() => {
    setData("start_date", data?.start_date ?? "2025-09-25");
    setData("end_date", data?.end_date ?? "2025-10-01");
    getBanks();
    getMerchants();
    getActiveBankLimit();
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
  }, [data?.start_date, data?.end_date]);

  useEffect(() => {
    if (selectAll) {
      const keys = sortedData.map((r) => getRowKey(r));
      setSelectedRows(keys);
    } else {
      setSelectedRows([]);
    }
  }, [selectAll, sortedData]);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingCount, setLoadingCount] = useState(0);

  const handleExport = async () => {
    try {
      const selectedTransactions = sortedData.filter((row) =>
        selectedRows.includes(getRowKey(row))
      );

      if (selectedTransactions.length === 0) {
        showAlert("Выберите хотя бы одну запись для выгрузки", "error");
        return;
      }

      setIsLoading(true);
      setLoadingCount(selectedTransactions.length);

      const route = isUsOnThem
        ? "/automation/qr/us-on-them"
        : "/automation/qr/them-on-us";

      // Подготавливаем данные с правильным форматом времени
      const dataToSend = selectedTransactions.map(transaction => {
        const formattedTransaction = { ...transaction };
        
        // Форматируем время для backend
        if (isUsOnThem && transaction.created_at) {
          formattedTransaction.created_at = formatTimeForBackend(transaction.created_at);
        } else if (isThemOnUs && transaction.creation_datetime) {
          formattedTransaction.creation_datetime = formatTimeForBackend(transaction.creation_datetime);
        }
        
        return formattedTransaction;
      });

      const resp = await fetch(`${backendMain}${route}`, {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        console.error("Ошибка сервера:", errorText);
        throw new Error(`Ошибка выгрузки: ${resp.status} - ${errorText}`);
      }

      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");

      const allSelected = selectedRows.length === sortedData.length && sortedData.length > 0;
      const typeName = isUsOnThem ? "Us-on-Them" : "Them-on-Us";
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      a.download =
        allSelected && data?.start_date && data?.end_date
          ? `${typeName}_${data.start_date}_to_${data.end_date}.xlsx`
          : `${typeName}_Report_${timestamp}.xlsx`;

      a.href = url;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      showAlert(`Файл успешно выгружен (${selectedTransactions.length} записей)`, "success");
      setSelectedRows([]);
      setSelectAll(false);
    } catch (err) {
      console.error("Ошибка выгрузки QR:", err);
      showAlert(`Ошибка выгрузки QR: ${err.message}`, "error");
    } finally {
      setIsLoading(false);
      setLoadingCount(0);
    }
  };

  const handleCheckboxToggle = (key, checked) => {
    if (checked) {
      setSelectedRows((prev) => [...prev, key]);
    } else {
      setSelectedRows((prev) => prev.filter((p) => p !== key));
      setSelectAll(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedRows([]);
    } else {
      const keys = sortedData.map((r) => getRowKey(r));
      setSelectedRows(keys);
    }
    setSelectAll(!selectAll);
  };

  return (
    <>
      <div
        className={`dashboard-container ${
          isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"
        }`}
      >
        <Sidebar
          activeLink="list_qr"
          isOpen={isSidebarOpen}
          toggle={toggleSidebar}
        />
        <div
          className="applications-list"
          style={{ flexDirection: "column", gap: "20px", height: "auto" }}
        >
          <main>
            <QRStatistics />
          </main>
          <main>
            <div className="my-applications-header header-with-balance">
              <button
                className={!showFilters ? "filter-toggle" : "Unloading"}
                onClick={() => setShowFilters(!showFilters)}
              >
                Фильтры
              </button>
              <div style={{ display: "flex", gap: "50px" }}>
                <button
                  className={`archive-toggle-activ ${
                    isUsOnThem ? "active" : ""
                  }`}
                  onClick={() => {
                    setIsUsOnThem(true);
                    setIsThemOnUs(false);
                    setSelectedRows([]);
                    setSelectAll(false);
                  }}
                >
                  Наш клиент — чужой QR (Us on Them)
                </button>

                <button
                  className={`archive-toggle ${isThemOnUs ? "active" : ""}`}
                  onClick={() => {
                    setIsThemOnUs(true);
                    setIsUsOnThem(false);
                    setSelectedRows([]);
                    setSelectAll(false);
                  }}
                >
                  Наш QR — чужой клиент (Them on Us)
                </button>
              </div>

              <button
                className="Unloading"
                onClick={handleExport}
                disabled={selectedRows.length === 0 || isLoading}
              >
                {isLoading ? `Выгрузка... (${loadingCount})` : "Выгрузка QR"}
              </button>

              <button
                className={selectAll ? "selectAll-toggle" : ""}
                onClick={toggleSelectAll}
              >
                {selectAll ? "Снять выделение" : "Выбрать все"}
              </button>

                <div className="activebank-balance">
                    <span className="label">Баланс Активбанк</span>
                    <span className="value">
                        {activeBankLimit !== null
                            ? `${activeBankLimit.toLocaleString("ru-RU")} с.`
                            : "—"}
                        </span>
                </div>
            </div>

            {showFilters && (
              <div className="filters animate-slideIn">
                {isUsOnThem && (
                  <>
                    <input
                      placeholder="ФИО"
                      onChange={(e) =>
                        setFilters((p) => ({
                          ...p,
                          sender_name: e.target.value,
                        }))
                      }
                    />
                    <input
                      placeholder="Телефон"
                      onChange={(e) =>
                        setFilters((p) => ({
                          ...p,
                          sender_phone: e.target.value,
                        }))
                      }
                    />
                  </>
                )}
                {isThemOnUs && (
                  <>
                    <input
                      placeholder="Код мерчанта"
                      onChange={(e) =>
                        setFilters((p) => ({
                          ...p,
                          merchant_code: e.target.value,
                        }))
                      }
                    />
                    <input
                      placeholder="Код терминала"
                      onChange={(e) =>
                        setFilters((p) => ({
                          ...p,
                          terminal_code: e.target.value,
                        }))
                      }
                    />
                  </>
                )}

                <select
                  onChange={(e) =>
                    setFilters((p) => ({ ...p, status: e.target.value }))
                  }
                >
                  <option value="">Статус</option>
                  <option value="success">Успешно</option>
                  <option value="cancel">Неудача</option>
                  <option value="process">Обработка</option>
                </select>

                <input
                  placeholder="Сумма"
                  onChange={(e) =>
                    setFilters((p) => ({ ...p, amount: e.target.value }))
                  }
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
                  style={{
                    textAlign: "center",
                    padding: "2rem",
                    color: "gray",
                  }}
                >
                  Нет данных для отображения
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          className="custom-checkbox"
                          checked={selectAll}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th
                        style={{ cursor: "pointer" }}
                        onClick={() =>
                          setSortOrder((s) => (s === "asc" ? "desc" : "asc"))
                        }
                      >
                        ID {sortOrder === "asc" ? "▲" : "▼"}
                      </th>
                      {isUsOnThem ? (
                        <>
                          <th>ФИО</th>
                          <th>Телефон</th>
                        </>
                      ) : null}
                      {isThemOnUs ? (
                        <>
                          <th>Мерчант</th>
                          <th>Код терминала</th>
                          <th>partner_trn_id</th>
                        </>
                      ) : (
                        <>
                          <th>Номер в АРМ</th>
                          <th>qrId</th>
                        </>
                      )}
                      <th>Статус</th>
                      <th>Банк отправителя</th>
                      <th>Банк получателя</th>
                      <th>Сумма</th>
                      <th>Дата создания</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedData.map((row) => {
                      const key = getRowKey(row);
                      const merchantTitle =
                        merchants.find((m) => m.code === row.merchant_code)
                          ?.title ??
                        row.merchant_code ??
                        "-";
                      return (
                        <tr key={key}>
                          <td>
                            <input
                              type="checkbox"
                              className="custom-checkbox"
                              checked={selectedRows.includes(key)}
                              onChange={(e) =>
                                handleCheckboxToggle(key, e.target.checked)
                              }
                            />
                          </td>

                          <td>{key}</td>

                          {isUsOnThem && (
                            <>
                              <td>{row.sender_name || "-"}</td>
                              <td>{row.sender_phone || "-"}</td>
                            </>
                          )}

                          {isThemOnUs ? (
                            <>
                              <td>{merchantTitle}</td>
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
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                }}
                              >
                                <FcOk style={{ fontSize: 22 }} />
                                <span style={{ color: "green" }}>Успешно</span>
                              </div>
                            ) : row.status === "process" ? (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                }}
                              >
                                <FcProcess style={{ fontSize: 22 }} />
                                <span style={{ color: "orange" }}>В процессе</span>
                              </div>
                            ) : row.status === "cancel" ? (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                }}
                              >
                                <FcCancel style={{ fontSize: 22 }} />
                                <span style={{ color: "red" }}>Отменено</span>
                              </div>
                            ) : (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                }}
                              >
                                <FcHighPriority style={{ fontSize: 22 }} />
                                <span style={{ color: "red" }}>Высокий приоритет</span>
                              </div>
                            )}
                          </td>

                          <td>
                            {banks.find(
                              (b) =>
                                b.id === row?.sender_bank ||
                                b.bankId === row?.sender
                            )?.bankName || "-"}
                          </td>
                          <td>
                            {banks.find((b) => b.id === row?.receiver)
                              ?.bankName || "-"}
                          </td>

                          <td>{row.amount} с.</td>
                          <td>
                            {isUsOnThem
                              ? formatDateForDisplay(row.created_at)
                              : formatDateForDisplay(row.creation_datetime)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </main>
        </div>

        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-box">
              <div className="spinner" />
              <p>Выгружается {loadingCount} записей...</p>
            </div>
          </div>
        )}

        {alert && (
          <AlertMessage
            message={alert.message}
            type={alert.type}
            onClose={() => setAlert(null)}
          />
        )}
      </div>
    </>
  );
}
