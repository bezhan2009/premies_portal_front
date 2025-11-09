import React, { useEffect, useMemo, useState } from "react";
import Input from "../../components/elements/Input.jsx";
import { useFormStore } from "../../hooks/useFormState.js";
import HeaderAgentQR from "../../components/dashboard/dashboard_agent_qr/MenuAgentQR.jsx";
import { FcHighPriority, FcOk } from "react-icons/fc";
import AlertMessage from "../../components/general/AlertMessage.jsx";
import "../../styles/checkbox.scss";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

function formatNumber(value) {
  if (value == null || isNaN(value)) return "0";
  return Number(value)
    .toFixed(0)
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

const CustomQRTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const totalSum = payload.find(p => p.dataKey === 'sum')?.value || 0;
    const successSum = payload.find(p => p.dataKey === 'successSum')?.value || 0;
    const totalCount = payload.find(p => p.dataKey === 'count')?.value || 0;
    const successCount = payload.find(p => p.dataKey === 'successCount')?.value || 0;
    return (
      <div
        style={{
          background: "rgba(255, 255, 255, 0.75)",
          borderRadius: "12px",
          padding: "10px 14px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          backdropFilter: "blur(6px)",
          fontSize: "14px",
          color: "#333",
          lineHeight: 1.6
        }}
      >
        <div style={{ fontWeight: "600", fontSize: "13px", marginBottom: "4px" }}>{label}</div>
        <div>
          <span style={{color: "#41b8d5"}}>Общая сумма:</span> {formatNumber(totalSum)} с.
        </div>
        <div>
          <span style={{color: "#417cd5"}}>Сумма успешных:</span> {formatNumber(successSum)} с.
        </div>
        <div>
          <span style={{color: "#6ce5e8"}}>Общее количество:</span> {formatNumber(totalCount)}
        </div>
        <div>
          <span style={{color: "#ff7300"}}>Количество успешных:</span> {formatNumber(successCount)}
        </div>
      </div>
    );
  }
  return null;
};

const QRChart = ({ chartData, title }) => {
  if (chartData.length === 0) return (
    <div style={{ padding: '10px', color: '#555', fontSize: '16px', textAlign: 'center', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
      Нет данных для отображения
    </div>
  );
  return (
    <div className="chart-wrapper light-theme" style={{ margin: "20px 0" }}>
      <div style={{ textAlign: 'center' }}>
        <h2>{title}</h2>
        <p>Количество операций, сумма и т.д. по дням</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="totalSumGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#41b8d5" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#41b8d5" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="successSumGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#417cd5" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#417cd5" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis 
            dataKey="date" 
            stroke="#333" 
            tick={{ fill: '#333', fontSize: 12 }} 
            axisLine={false} 
            tickLine={false} 
          />
          <YAxis 
            yAxisId="left" 
            stroke="#333" 
            tick={{ fill: '#333', fontSize: 12 }} 
            axisLine={false} 
            tickLine={false} 
            label={{ value: 'Сумма (с.)', angle: -90, position: 'insideLeft', style: { fill: '#333' } }} 
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            stroke="#333" 
            tick={{ fill: '#333', fontSize: 12 }} 
            axisLine={false} 
            tickLine={false} 
            label={{ value: 'Количество', angle: 90, position: 'insideRight', style: { fill: '#333' } }} 
          />
          <Tooltip content={<CustomQRTooltip />} cursor={{ stroke: '#41b8d5', strokeWidth: 1 }} />
          <Area 
            yAxisId="left" 
            type="monotone" 
            dataKey="sum" 
            name="Общая сумма" 
            stroke="#41b8d5" 
            fill="url(#totalSumGradient)" 
            strokeWidth={3} 
            dot={{ stroke: '#41b8d5', strokeWidth: 2, r: 3 }} 
          />
          <Area 
            yAxisId="left" 
            type="monotone" 
            dataKey="successSum" 
            name="Сумма успешных" 
            stroke="#417cd5" 
            fill="url(#successSumGradient)" 
            strokeWidth={3} 
            dot={{ stroke: '#417cd5', strokeWidth: 2, r: 3 }} 
          />
          <Line 
            yAxisId="right" 
            type="monotone" 
            dataKey="count" 
            name="Общее количество" 
            stroke="#6ce5e8" 
            strokeWidth={3} 
            dot={{ stroke: '#6ce5e8', strokeWidth: 2, r: 3 }} 
          />
          <Line 
            yAxisId="right" 
            type="monotone" 
            dataKey="successCount" 
            name="Количество успешных" 
            stroke="#ff7300" 
            strokeWidth={3} 
            dot={{ stroke: '#ff7300', strokeWidth: 2, r: 3 }} 
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

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
  const backendQR = import.meta.env.VITE_BACKEND_QR_URL;
  const backendMain = import.meta.env.VITE_BACKEND_URL;
  const token = localStorage.getItem("access_token");

  const showAlert = (message, type = "success") => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 3500);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    if (isNaN(d)) return dateString;
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const MM = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    return `${yyyy}-${MM}-${dd} ${hh}:${mi}:${ss}`;
  };

  const getRowKey = (row) =>
    (row.id ?? row.tx_id ?? row.trnId ?? row.partner_trn_id ?? `${row.merchant_code || ""}-${row.terminal_code || ""}-${row.amount || ""}`)
      .toString();

  const fetchData = async (type = "themOnUs") => {
    try {
      setLoading(true);
      const endpoint = type === "usOnThem" ? "transactions" : "incoming_tx";
      const endDate = new Date(data?.end_date || "2025-10-01");
      endDate.setDate(endDate.getDate() + 1);
      const url = `${backendQR}${endpoint}?start_date=${data?.start_date ?? "2025-09-25"}&end_date=${endDate.toISOString().slice(0,10)}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Ошибка HTTP ${resp.status}`);
      const json = await resp.json();
      setTableData(json);
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

  const filteredData = useMemo(() => {
    if (!Array.isArray(tableData)) return [];
    return tableData.filter((row) =>
      Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        const rowValue = row[key];
        if (typeof rowValue === "number") return String(rowValue).includes(value);
        if (typeof rowValue === "string") return rowValue.toLowerCase().includes(String(value).toLowerCase());
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

  const chartData = useMemo(() => {
    if (!filteredData.length || !data?.start_date || !data?.end_date) return [];
    const start = new Date(data.start_date);
    const end = new Date(data.end_date);
    const groups = {};
    filteredData.forEach((row) => {
      const dateStr = new Date(isUsOnThem ? row.created_at : row.creation_datetime).toISOString().slice(0, 10);
      if (!groups[dateStr]) groups[dateStr] = { count: 0, sum: 0, successCount: 0, successSum: 0 };
      groups[dateStr].count += 1;
      groups[dateStr].sum += Number(row.amount) || 0;
      if (row.status === "success") {
        groups[dateStr].successCount += 1;
        groups[dateStr].successSum += Number(row.amount) || 0;
      }
    });
    const cd = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      const vals = groups[dateStr] || { count: 0, sum: 0, successCount: 0, successSum: 0 };
      cd.push({ date: dateStr, ...vals });
    }
    return cd;
  }, [filteredData, data?.start_date, data?.end_date, isUsOnThem]);

  const statsTitle = useMemo(() => {
    if (isThemOnUs && filters.merchant_code) {
      const merch = merchants.find((m) => m.code === filters.merchant_code);
      return `Статистика для мерчанта ${merch?.title || filters.merchant_code}`;
    } else if (isUsOnThem && filters.sender_name) {
      return `Статистика для ${filters.sender_name}`;
    }
    return "Общая статистика по QR";
  }, [filters, isThemOnUs, isUsOnThem, merchants]);

  useEffect(() => {
    setData("start_date", data?.start_date ?? "2025-09-25");
    setData("end_date", data?.end_date ?? "2025-10-01");
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
  }, [data?.start_date, data?.end_date]);

  useEffect(() => {
    if (selectAll) {
      const keys = sortedData.map((r) => getRowKey(r).toString());
      setSelectedRows(keys);
    } else {
      setSelectedRows([]);
    }
  }, [selectAll, sortedData.length]);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingCount, setLoadingCount] = useState(0);

  const handleExport = async () => {
    try {
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
      const route = isUsOnThem ? "/automation/qr/us-on-them" : "/automation/qr/them-on-us";
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
      const allSelected = selectedRows.length === sortedData.length && sortedData.length > 0;
      const typeName = isUsOnThem ? "Us-on-Them" : "Them-on-Us";
      a.download = allSelected && data?.start_date && data?.end_date
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

  const handleCheckboxToggle = (key, checked) => {
    const k = key.toString();
    if (checked) {
      setSelectedRows((prev) => (prev.includes(k) ? prev : [...prev, k]));
    } else {
      setSelectedRows((prev) => prev.filter((p) => p !== k));
      setSelectAll(false);
    }
  };

  const handleRowClick = (row) => {
    if (isThemOnUs) {
      const merchantCode = row.merchant_code;
      if (merchantCode) {
        setFilters((p) => ({ ...p, merchant_code: merchantCode }));
        const merch = merchants.find((m) => m.code === merchantCode);
        showAlert(`Показана статистика для мерчанта ${merch?.title || merchantCode}`, "success");
      }
    } else if (isUsOnThem) {
      const senderName = row.sender_name;
      if (senderName) {
        setFilters((p) => ({ ...p, sender_name: senderName }));
        showAlert(`Показана статистика для ${senderName}`, "success");
      }
    }
  };

  return (
    <>
      <HeaderAgentQR activeLink="list" />
      <div className="applications-list">
        <main>
          <div className="my-applications-header">
            <button className={!showFilters ? "filter-toggle" : "Unloading"} onClick={() => setShowFilters(!showFilters)}>
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
                  setFilters({});
                }}
              >
                Наш клиент — чужой QR (Us on Them)
              </button>
              <button
                className={`archive-toggle-activ ${isThemOnUs ? "active" : ""}`}
                onClick={() => {
                  setIsThemOnUs(true);
                  setIsUsOnThem(false);
                  setSelectedRows([]);
                  setSelectAll(false);
                  setFilters({});
                }}
              >
                Наш QR — чужой клиент (Them on Us)
              </button>
            </div>
            <button className="Unloading" onClick={handleExport}>
              Выгрузка QR
            </button>
            <button className={selectAll && "selectAll-toggle"} onClick={() => setSelectAll((s) => !s)}>
              Выбрать все
            </button>
          </div>

          {showFilters && (
            <div className="filters animate-slideIn">
              {isUsOnThem && (
                <>
                  <input placeholder="ФИО" onChange={(e) => setFilters((p) => ({ ...p, sender_name: e.target.value }))} />
                  <input placeholder="Телефон" onChange={(e) => setFilters((p) => ({ ...p, sender_phone: e.target.value }))} />
                </>
              )}
              {isThemOnUs && (
                <>
                  <input placeholder="Код мерчанта" onChange={(e) => setFilters((p) => ({ ...p, merchant_code: e.target.value }))} />
                  <input placeholder="Код терминала" onChange={(e) => setFilters((p) => ({ ...p, terminal_code: e.target.value }))} />
                </>
              )}
              <select onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}>
                <option value="">Статус</option>
                <option value="success">Успешно</option>
                <option value="cancel">Неудача</option>
                <option value="processing">Обработка</option>
              </select>
              <input placeholder="Сумма" onChange={(e) => setFilters((p) => ({ ...p, amount: e.target.value }))} />
            </div>
          )}

          <QRChart chartData={chartData} title={statsTitle} />

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

          <div className="my-applications-content" style={{ position: "relative" }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>Загрузка...</div>
            ) : sortedData.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "gray" }}>Нет данных для отображения</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Выбрать</th>
                    <th style={{ cursor: "pointer" }} onClick={() => setSortOrder((s) => (s === "asc" ? "desc" : "asc"))}>
                      ID {sortOrder === "asc" ? "Up" : "Down"}
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
                    const merchantTitle = merchants.find((m) => m.code === row.merchant_code)?.title ?? row.merchant_code ?? "-";
                    return (
                      <tr 
                        key={key} 
                        onClick={(e) => { 
                          if (e.target.tagName !== 'INPUT') handleRowClick(row); 
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        <td>
                          <input
                            type="checkbox"
                            className="custom-checkbox"
                            checked={selectedRows.includes(key)}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleCheckboxToggle(key, e.target.checked);
                            }}
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
                        <td>{row.status === "success" ? <FcOk style={{ fontSize: 22 }} /> : <FcHighPriority style={{ fontSize: 22 }} />}</td>
                        <td>{row.description || "-"}</td>
                        <td>
                          {banks.find((b) => b.id === row?.sender_bank || b.bankId === row?.sender)?.bankName || "-"}
                        </td>
                        <td>{banks.find((b) => b.id === row?.receiver)?.bankName || "-"}</td>
                        <td>{row.amount} с.</td>
                        <td>{isUsOnThem ? formatDate(row.created_at) : formatDate(row.creation_datetime)}</td>
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
      {alert && <AlertMessage message={alert.message} type={alert.type} onClose={() => setAlert(null)} />}
    </>
  );
}
