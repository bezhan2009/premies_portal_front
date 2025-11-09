import React, { useEffect, useMemo, useState } from "react";
import Input from "../../components/elements/Input.jsx";
import { useFormStore } from "../../hooks/useFormState.js";
import HeaderAgentQR from "../../components/dashboard/dashboard_agent_qr/MenuAgentQR.jsx";
import { FcHighPriority, FcOk } from "react-icons/fc";
import AlertMessage from "../../components/general/AlertMessage.jsx";
import "../../styles/checkbox.scss";
import QRStatistics from "./QRStatistics.jsx";

const result = [
  {
    id: 6822,
    trnId: 20225850,
    sender_phone: "992904411010",
    receiver: 3,
    amount: 90,
    description: "",
    sender_name: "САИДЗОДА Фарзоди",
    sender_bank: 27,
    qrId: "4a6df3da29a146ece322a75b3e6c27d6",
    status: "success",
    created_at: "2025-10-01T21:30:28",
  },
  {
    id: 6822,
    trnId: 20225850,
    sender_phone: "992904411010",
    receiver: 3,
    amount: 90,
    description: "",
    sender_name: "САИДЗОДА Фарзоди",
    sender_bank: 27,
    qrId: "4a6df3da29a146ece322a75b3e6c27d6",
    status: "success",
    created_at: "2025-10-01T21:30:28",
  },

  {
    id: 6822,
    trnId: 20225850,
    sender_phone: "992904411010",
    receiver: 3,
    amount: 90,
    description: "",
    sender_name: "САИДЗОДА Фарзоди",
    sender_bank: 27,
    qrId: "4a6df3da29a146ece322a75b3e6c27d6",
    status: "success",
    created_at: "2025-10-01T21:30:28",
  },
  {
    id: 6822,
    trnId: 20225850,
    sender_phone: "992904411010",
    receiver: 3,
    amount: 90,
    description: "",
    sender_name: "САИДЗОДА Фарзоди",
    sender_bank: 27,
    qrId: "4a6df3da29a146ece322a75b3e6c27d6",
    status: "success",
    created_at: "2025-10-01T21:30:28",
  },
  {
    id: 6822,
    trnId: 20225850,
    sender_phone: "992904411010",
    receiver: 3,
    amount: 90,
    description: "",
    sender_name: "САИДЗОДА Фарзоди",
    sender_bank: 27,
    qrId: "4a6df3da29a146ece322a75b3e6c27d6",
    status: "success",
    created_at: "2025-10-01T21:30:28",
  },
  {
    id: 6822,
    trnId: 20225850,
    sender_phone: "992904411010",
    receiver: 3,
    amount: 90,
    description: "",
    sender_name: "САИДЗОДА Фарзоди",
    sender_bank: 27,
    qrId: "4a6df3da29a146ece322a75b3e6c27d6",
    status: "success",
    created_at: "2025-10-01T21:30:28",
  },
  {
    id: 6822,
    trnId: 20225850,
    sender_phone: "992904411010",
    receiver: 3,
    amount: 90,
    description: "",
    sender_name: "САИДЗОДА Фарзоди",
    sender_bank: 27,
    qrId: "4a6df3da29a146ece322a75b3e6c27d6",
    status: "success",
    created_at: "2025-10-01T21:30:28",
  },
  {
    id: 6822,
    trnId: 20225850,
    sender_phone: "992904411010",
    receiver: 3,
    amount: 90,
    description: "",
    sender_name: "САИДЗОДА Фарзоди",
    sender_bank: 27,
    qrId: "4a6df3da29a146ece322a75b3e6c27d6",
    status: "success",
    created_at: "2025-10-01T21:30:28",
  },
  {
    id: 6822,
    trnId: 20225850,
    sender_phone: "992904411010",
    receiver: 3,
    amount: 90,
    description: "",
    sender_name: "САИДЗОДА Фарзоди",
    sender_bank: 27,
    qrId: "4a6df3da29a146ece322a75b3e6c27d6",
    status: "success",
    created_at: "2025-10-02T21:30:28",
  },
  {
    id: 6822,
    trnId: 20225850,
    sender_phone: "992904411010",
    receiver: 3,
    amount: 90,
    description: "",
    sender_name: "САИДЗОДА Фарзоди",
    sender_bank: 27,
    qrId: "4a6df3da29a146ece322a75b3e6c27d6",
    status: "success",
    created_at: "2025-10-02T21:30:28",
  },
  {
    id: 6822,
    trnId: 20225850,
    sender_phone: "992904411010",
    receiver: 3,
    amount: 90,
    description: "",
    sender_name: "САИДЗОДА Фарзоди",
    sender_bank: 27,
    qrId: "4a6df3da29a146ece322a75b3e6c27d6",
    status: "success",
    created_at: "2025-10-02T21:30:28",
  },
  {
    id: 6822,
    trnId: 20225850,
    sender_phone: "992904411010",
    receiver: 3,
    amount: 90,
    description: "",
    sender_name: "САИДЗОДА Фарзоди",
    sender_bank: 27,
    qrId: "4a6df3da29a146ece322a75b3e6c27d6",
    status: "success",
    created_at: "2025-10-02T21:30:28",
  },
  {
    id: 6822,
    trnId: 20225850,
    sender_phone: "992904411010",
    receiver: 3,
    amount: 90,
    description: "",
    sender_name: "САИДЗОДА Фарзоди",
    sender_bank: 27,
    qrId: "4a6df3da29a146ece322a75b3e6c27d6",
    status: "success",
    created_at: "2025-10-05T21:30:28",
  },
  {
    id: 6822,
    trnId: 20225850,
    sender_phone: "992904411010",
    receiver: 3,
    amount: 90,
    description: "",
    sender_name: "САИДЗОДА Фарзоди",
    sender_bank: 27,
    qrId: "4a6df3da29a146ece322a75b3e6c27d6",
    status: "success",
    created_at: "2025-10-05T21:30:28",
  },
  {
    id: 6822,
    trnId: 20225850,
    sender_phone: "992904411010",
    receiver: 3,
    amount: 90,
    description: "",
    sender_name: "САИДЗОДА Фарзоди",
    sender_bank: 27,
    qrId: "4a6df3da29a146ece322a75b3e6c27d6",
    status: "success",
    created_at: "2025-10-05T21:30:28",
  },
  {
    id: 6822,
    trnId: 20225850,
    sender_phone: "992904411010",
    receiver: 3,
    amount: 90,
    description: "",
    sender_name: "САИДЗОДА Фарзоди",
    sender_bank: 27,
    qrId: "4a6df3da29a146ece322a75b3e6c27d6",
    status: "success",
    created_at: "2025-10-05T21:30:28",
  },
  {
    id: 6822,
    trnId: 20225850,
    sender_phone: "992904411010",
    receiver: 3,
    amount: 90,
    description: "",
    sender_name: "САИДЗОДА Фарзоди",
    sender_bank: 27,
    qrId: "4a6df3da29a146ece322a75b3e6c27d6",
    status: "success",
    created_at: "2025-10-05T21:30:28",
  },
];

export default function TransactionsQR() {
  const { data, setData } = useFormStore();

  const [banks, setBanks] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [tableData, setTableData] = useState(result);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [isUsOnThem, setIsUsOnThem] = useState(false);
  const [isThemOnUs, setIsThemOnUs] = useState(true);

  const [filters, setFilters] = useState({});
  const [alert, setAlert] = useState(null);

  const [sortOrder, setSortOrder] = useState("asc");
  const [selectedRows, setSelectedRows] = useState([]); // хранит строковые ключи
  const [selectAll, setSelectAll] = useState(false);

  const backendQR = import.meta.env.VITE_BACKEND_QR_URL; // для QR API (transactions, incoming_tx, banks)
  const backendMain = import.meta.env.VITE_BACKEND_URL; // для /merchants и основных выгрузок
  const token = localStorage.getItem("access_token");

  const showAlert = (message, type = "success") => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 3500);
  };

  // --- вспомогательные функции ---
  const formatDate = (dateString) => {
    if (!dateString) return "";
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
  };

  // возвращаем единый строковый ключ для строки (устойчивый)
  const getRowKey = (row) =>
    (
      row.id ??
      row.tx_id ??
      row.trnId ??
      row.partner_trn_id ??
      `${row.merchant_code || ""}-${row.terminal_code || ""}-${
        row.amount || ""
      }`
    ).toString();

  // --- загрузчики данных ---
  const fetchData = async (type = "themOnUs") => {
    try {
      setLoading(true);
      const endpoint = type === "usOnThem" ? "transactions" : "incoming_tx";

      const url = `${backendQR}${endpoint}?start_date=${
        data?.start_date ?? "2025-09-25"
      }&end_date=${
        data?.end_date
          ? new Date(data.end_date).setDate(
              new Date(data.end_date).getDate() + 1
            ) &&
            new Date(
              new Date(data.end_date).setDate(
                new Date(data.end_date).getDate() + 1
              )
            )
              .toISOString()
              .slice(0, 10)
          : "2025-10-01"
      }`;

      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Ошибка HTTP ${resp.status}`);
      const json = await resp.json();
      setTableData(json);
      showAlert(`Загружено ${json.length} записей`, "success");
    } catch (err) {
      console.error("Ошибка загрузки данных:", err);
      showAlert("Ошибка загрузки данных. Проверьте сервер.", "error");
      setTableData([]); // на случай ошибки - очищаем
    } finally {
      setLoading(false);
    }
  };

  const getBanks = async () => {
    try {
      const resp = await fetch(`${backendQR}banks`);
      if (!resp.ok) throw new Error(`Ошибка HTTP ${resp.status}`);
      const json = await resp.json();
      setBanks(json);
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

  // --- фильтрация и сортировка (мемоизируем) ---
  const filteredData = useMemo(() => {
    if (!Array.isArray(tableData)) return [];
    return tableData.filter((row) =>
      Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        const rowValue = row[key];
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
      // используем ключ id или tx/trn для сортировки: fallback to numeric id if present
      const ka = Number(a.id ?? a.tx_id ?? a.trnId ?? 0);
      const kb = Number(b.id ?? b.tx_id ?? b.trnId ?? 0);
      return sortOrder === "asc" ? ka - kb : kb - ka;
    });
    return arr;
  }, [filteredData, sortOrder]);

  // --- эффекты (инициализация) ---
  useEffect(() => {
    // начальные даты и загрузка справочников
    setData("start_date", data?.start_date ?? "2025-09-25");
    setData("end_date", data?.end_date ?? "2025-10-01");
    getBanks();
    getMerchants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // один раз

  // загрузка транзакций при переключении режима
  useEffect(() => {
    if (isUsOnThem) fetchData("usOnThem");
    else if (isThemOnUs) fetchData("themOnUs");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUsOnThem, isThemOnUs]);

  // загрузка при смене дат
  useEffect(() => {
    if (data?.start_date && data?.end_date) {
      if (isUsOnThem) fetchData("usOnThem");
      else if (isThemOnUs) fetchData("themOnUs");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.start_date, data?.end_date]);

  // selectAll — устанавливаем массив ключей только когда selectAll меняется (и используем мемоизированный sortedData)
  useEffect(() => {
    if (selectAll) {
      const keys = sortedData.map((r) => getRowKey(r).toString());
      setSelectedRows(keys);
    } else {
      setSelectedRows([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectAll, sortedData.length]); // depend on length to avoid deep array equality issues

  // --- экспорт/выгрузка ---
  const [isLoading, setIsLoading] = useState(false);
  const [loadingCount, setLoadingCount] = useState(0);

  const handleExport = async () => {
    try {
      // формируем ids в зависимости от режима
      let ids = [];
      if (isUsOnThem) {
        ids = sortedData
          .filter((row) => selectedRows.includes(getRowKey(row).toString()))
          .map((row) => Number(row.trnId))
          .filter((n) => !isNaN(n));
      } else {
        ids = sortedData
          .filter((row) => selectedRows.includes(getRowKey(row).toString()))
          .map((row) => Number(row.tx_id ?? row.partner_trn_id))
          .filter((n) => !isNaN(n));
      }

      if (!ids.length) {
        showAlert("Выберите хотя бы одну запись для выгрузки", "error");
        return;
      }

      setIsLoading(true);
      setLoadingCount(ids.length);

      const route = isUsOnThem
        ? "/automation/qr/us-on-them"
        : "/automation/qr/them-on-us";
      const resp = await fetch(`${backendMain}${route}`, {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ qr_ids: ids }),
      });

      if (!resp.ok) throw new Error(`Ошибка выгрузки: ${resp.status}`);

      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");

      const allSelected =
        selectedRows.length === sortedData.length && sortedData.length > 0;
      const typeName = isUsOnThem ? "Us-on-Them" : "Them-on-Us";
      a.download =
        allSelected && data?.start_date && data?.end_date
          ? `${typeName}_${data.start_date}_to_${data.end_date}.xlsx`
          : `${typeName}_QR_Report.xlsx`;

      a.href = url;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      showAlert(`Файл успешно выгружен (${ids.length} записей)`, "success");
      setSelectedRows([]);
      setSelectAll(false);
    } catch (err) {
      console.error("Ошибка выгрузки QR:", err);
      showAlert("Ошибка выгрузки QR", "error");
    } finally {
      setIsLoading(false);
      setLoadingCount(0);
    }
  };

  // --- UI handlers ---
  const handleCheckboxToggle = (key, checked) => {
    const k = key.toString();
    if (checked) {
      setSelectedRows((prev) => (prev.includes(k) ? prev : [...prev, k]));
    } else {
      setSelectedRows((prev) => prev.filter((p) => p !== k));
      setSelectAll(false);
    }
  };

  // --- render ---
  return (
    <>
      <HeaderAgentQR activeLink="list" />
      <div
        className="applications-list"
        style={{ flexDirection: "column", gap: "20px", height: "auto" }}
      >
        <main>
          {" "}
          <QRStatistics />
        </main>
        <main>
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

            <button className="Unloading" onClick={handleExport}>
              Выгрузка QR
            </button>

            <button
              className={selectAll && "selectAll-toggle"}
              onClick={() => setSelectAll((s) => !s)}
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
                      setFilters((p) => ({ ...p, sender_name: e.target.value }))
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
                <option value="processing">Обработка</option>
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
            {!loading ? (
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
                    <th>Комментарий</th>
                    <th>Банк отправителя</th>
                    <th>Банк получателя</th>
                    <th>Сумма</th>
                    <th>Дата создания</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map((row) => {
                    const key = getRowKey(row).toString();
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

                        {/* show key in ID column to reflect actual used key */}
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
                            <FcOk style={{ fontSize: 22 }} />
                          ) : (
                            <FcHighPriority style={{ fontSize: 22 }} />
                          )}
                        </td>
                        <td>{row.description || "-"}</td>

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
                            ? formatDate(row.created_at)
                            : formatDate(row.creation_datetime)}
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
    </>
  );
}
