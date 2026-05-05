import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Table } from "../../components/table/FlexibleAntTable.jsx";
import Input from "../../components/elements/Input.jsx";
import Select from "../../components/elements/Select.jsx";
import { useFormStore } from "../../hooks/useFormState.js";
import { FcCancel, FcHighPriority, FcOk, FcProcess } from "react-icons/fc";
import AlertMessage from "../../components/general/AlertMessage.jsx";
import Spinner from "../../components/Spinner.jsx";
import "../../styles/checkbox.scss";
import "../../styles/components/TransactionsQR.scss";
import QRStatistics from "./QRStatistics.jsx";

export default function TransactionsQR() {
  const { data, setData } = useFormStore();
  const [activeBankLimit, setActiveBankLimit] = useState(null);

  const [banks, setBanks] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 50;
  const [showFilters, setShowFilters] = useState(false);

  const [isUsOnThem, setIsUsOnThem] = useState(false);
  const [isThemOnUs, setIsThemOnUs] = useState(true);

  const [filters, setFilters] = useState({});
  const [alert, setAlert] = useState(null);

  const [sortOrder, setSortOrder] = useState("asc");
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showChart, setShowChart] = useState(true);
  const [showMerchantTranslator, setShowMerchantTranslator] = useState(false);
  const [merchantSearch, setMerchantSearch] = useState("");

  const backendQR = import.meta.env.VITE_BACKEND_QR_URL;
  const backendMain = import.meta.env.VITE_BACKEND_URL;
  const token = localStorage.getItem("access_token");

  const getActiveBankLimit = useCallback(async () => {
    try {
      const resp = await fetch(`${import.meta.env.VITE_BACKEND_QR_URL}limit`);
      if (!resp.ok) throw new Error("Ошибка загрузки лимита");
      const json = await resp.json();
      setActiveBankLimit(json?.limit ?? 0);
    } catch (e) {
      console.error("Ошибка лимита:", e);
      setActiveBankLimit(null);
    }
  }, []);

  const showAlert = (message, type = "success") => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 3500);
  };

  const formatTimeForBackend = (dateString) => {
    if (!dateString) return "";
    try {
      const d = new Date(dateString);
      if (isNaN(d)) return "";
      return d.toISOString().replace(/\.\d{3}Z$/, "Z");
    } catch (e) {
      console.error("Error formatting date:", e, dateString);
      return "";
    }
  };

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
    } catch {
      return dateString;
    }
  };

  const getRowKey = useCallback(
    (row) => {
      if (isUsOnThem) {
        return `${row.id || 0}-${row.trnId || 0}`;
      } else {
        return `${row.id || 0}-${row.tx_id || row.partner_trn_id || ""}`;
      }
    },
    [isUsOnThem],
  );

  const fetchData = useCallback(
    async (type = "themOnUs", pageNum = 1) => {
      try {
        setLoading(true);
        const endpoint = type === "usOnThem" ? "transactions" : "incoming_tx";

        const startDate = data?.start_date ?? "2026-05-05T00:00";
        const endDate = data?.end_date ?? "2026-05-05T23:59";

        const url = `${backendQR}${endpoint}?start_date=${startDate}&end_date=${endDate}&page=${pageNum}&limit=${PAGE_SIZE}`;

        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Ошибка HTTP ${resp.status}`);
        const json = await resp.json();
        
        if (Array.isArray(json)) {
            if (pageNum === 1) {
                setTableData(json);
            } else {
                setTableData(prev => [...prev, ...json]);
            }
            setHasMore(json.length === PAGE_SIZE);
            showAlert(`Загружено ${json.length} записей`, "success");
        } else {
            setHasMore(false);
        }
      } catch (err) {
        console.error("Ошибка загрузки данных:", err);
        showAlert("Ошибка загрузки данных. Проверьте сервер.", "error");
        if (pageNum === 1) setTableData([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [backendQR, data.end_date, data.start_date],
  );

  const getBanks = useCallback(async () => {
    try {
      const resp = await fetch("http://10.64.20.101:8080/banks");
      if (!resp.ok) throw new Error(`Ошибка HTTP ${resp.status}`);
      const json = await resp.json();
      setBanks(Array.isArray(json) ? json : []);
    } catch (err) {
      console.error("Ошибка загрузки банков:", err);
      setBanks([]);
    }
  }, []);

  const getMerchants = useCallback(async () => {
    try {
      const resp = await fetch("http://10.65.10.20:7575/merchants");
      if (!resp.ok) throw new Error(`Ошибка HTTP ${resp.status}`);
      const json = await resp.json();
      setMerchants(Array.isArray(json) ? json : []);
    } catch (err) {
      console.error("Ошибка загрузки мерчантов:", err);
      setMerchants([]);
    }
  }, []);

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
      }),
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

  const selectedSum = useMemo(() => {
    return selectedRows.reduce((acc, key) => {
      const row = sortedData.find((r) => getRowKey(r) === key);
      const isSuccess = row?.status === "success";
      return acc + (row && isSuccess ? Number(row.amount || 0) : 0);
    }, 0);
  }, [selectedRows, sortedData, getRowKey]);

  const totalSum = useMemo(() => {
    return sortedData.reduce((acc, row) => acc + Number(row.amount || 0), 0);
  }, [sortedData]);

  useEffect(() => {
    getBanks();
    getMerchants();
    getActiveBankLimit();
  }, [getBanks, getMerchants, getActiveBankLimit]);

  useEffect(() => {
    if (!data?.start_date || !data?.end_date) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      const start = `${year}-${month}-${day}T00:00`;
      const end = `${year}-${month}-${day}T23:59`;
      if (!data?.start_date) setData("start_date", start);
      if (!data?.end_date) setData("end_date", end);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    if (isUsOnThem) fetchData("usOnThem", 1);
    else if (isThemOnUs) fetchData("themOnUs", 1);
  }, [isUsOnThem, isThemOnUs, fetchData]);

  const [isLoadingExport, setIsLoadingExport] = useState(false);
  const [loadingCount, setLoadingCount] = useState(0);

  const handleExport = async () => {
    try {
      const selectedTransactions = sortedData.filter((row) =>
        selectedRows.includes(getRowKey(row)),
      );
      if (selectedTransactions.length === 0) {
        showAlert("Выберите хотя бы одну запись для выгрузки", "error");
        return;
      }
      setIsLoadingExport(true);
      setLoadingCount(selectedTransactions.length);
      const route = isUsOnThem ? "/automation/qr/us-on-them" : "/automation/qr/them-on-us";
      const dataToSend = selectedTransactions.map((transaction) => {
        const formattedTransaction = { ...transaction };
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
      if (!resp.ok) throw new Error(`Ошибка выгрузки: ${resp.status}`);
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      const typeName = isUsOnThem ? "Us-on-Them" : "Them-on-Us";
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      a.download = `${typeName}_Report_${timestamp}.xlsx`;
      a.href = url;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showAlert(`Файл успешно выгружен`, "success");
      setSelectedRows([]);
      setSelectAll(false);
    } catch (err) {
      console.error("Ошибка выгрузки QR:", err);
      showAlert(`Ошибка выгрузки QR`, "error");
    } finally {
      setIsLoadingExport(false);
      setLoadingCount(0);
    }
  };

  const handleCheckboxToggle = (key, checked) => {
    if (checked) setSelectedRows((prev) => [...prev, key]);
    else {
      setSelectedRows((prev) => prev.filter((p) => p !== key));
      setSelectAll(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectAll) setSelectedRows([]);
    else {
      const keys = sortedData.map((r) => getRowKey(r));
      setSelectedRows(keys);
    }
    setSelectAll(!selectAll);
  };

  return (
    <>
      <div className="applications-list content-page" style={{ flexDirection: "column", gap: "20px", height: "auto" }}>
        <main>
          {showChart && <QRStatistics startDate={data?.start_date} endDate={data?.end_date} />}
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px" }}>
            <button className="button" onClick={() => setShowChart(!showChart)}>
              {showChart ? "Скрыть график" : "Показать график"}
            </button>
          </div>
        </main>
        <main className="transactions-main-content">
          <div className="header-with-balance">
            <button className={`button ${!showFilters ? "" : "active"}`} onClick={() => setShowFilters(!showFilters)}>Фильтры</button>
            <button className={`button ${isUsOnThem ? "active" : ""}`} onClick={() => { setIsUsOnThem(true); setIsThemOnUs(false); setSelectedRows([]); setSelectAll(false); }}>Наш клиент — чужой QR</button>
            <button className={`button ${isThemOnUs ? "active" : ""}`} onClick={() => { setIsThemOnUs(true); setIsUsOnThem(false); setSelectedRows([]); setSelectAll(false); }}>Наш QR — чужой клиент</button>
            <button className={`button ${showMerchantTranslator ? "active" : ""}`} onClick={() => setShowMerchantTranslator(!showMerchantTranslator)}>Поиск мерчантов</button>
            <button className="button button-success" onClick={handleExport} disabled={selectedRows.length === 0 || isLoadingExport}>
              {isLoadingExport ? `Выгрузка... (${loadingCount})` : "Выгрузка QR"}
            </button>
            <button className={`button ${selectAll ? "active" : ""}`} onClick={toggleSelectAll}>{selectAll ? "Снять выделение" : "Выбрать все"}</button>
            
            <div className="activebank-balance">
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%", gap: "10px" }}>
                <span className="label">Баланс Активбанк:</span>
                <span className="value">{activeBankLimit !== null ? `${activeBankLimit.toLocaleString("ru-RU")} с.` : "—"}</span>
              </div>
              {selectedRows.length > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%", color: "var(--primary-color)", marginTop: "4px" }}>
                  <span className="label">Выбрано:</span>
                  <span className="value">{selectedSum.toLocaleString("ru-RU")} с.</span>
                </div>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="filters animate-slideIn">
              {isUsOnThem ? (
                <>
                  <input placeholder="ФИО отправителя" onChange={(e) => setFilters((p) => ({ ...p, sender_name: e.target.value }))} />
                  <input placeholder="Телефон отправителя" onChange={(e) => setFilters((p) => ({ ...p, sender_phone: e.target.value }))} />
                </>
              ) : (
                <>
                  <input placeholder="Код мерчанта" onChange={(e) => setFilters((p) => ({ ...p, merchant_code: e.target.value }))} />
                  <input placeholder="Код терминала" onChange={(e) => setFilters((p) => ({ ...p, terminal_code: e.target.value }))} />
                </>
              )}
              <Select
                onChange={(val) => setFilters((p) => ({ ...p, status: val }))}
                value={filters.status}
                options={[
                  { value: "", label: "Статус" },
                  { value: "success", label: "Успешно" },
                  { value: "cancel", label: "Неудача" },
                  { value: "process", label: "Обработка" },
                ]}
              />
              <input placeholder="Сумма" onChange={(e) => setFilters((p) => ({ ...p, amount: e.target.value }))} />
            </div>
          )}

          {showMerchantTranslator && (
            <div className="filters animate-slideIn" style={{ flexDirection: "column", alignItems: "flex-start" }}>
               <h3 style={{ marginBottom: "10px" }}>Поиск мерчант кодов</h3>
               <div style={{ display: "flex", gap: "10px", width: "100%" }}>
                  <input placeholder="Введите код или название мерчанта..." value={merchantSearch} onChange={(e) => setMerchantSearch(e.target.value)} style={{ flex: 1 }} />
                  <button className="button" onClick={() => setMerchantSearch("")}>Очистить</button>
               </div>
               {merchantSearch && (
                 <div style={{ marginTop: "10px", width: "100%", maxHeight: "200px", overflowY: "auto", background: "white", borderRadius: "8px", border: "1px solid #ddd" }}>
                   <table className="limits-table" style={{ margin: 0 }}>
                      <thead><tr><th>Код</th><th>Название</th></tr></thead>
                      <tbody>
                        {merchants.filter(m => String(m.code).includes(merchantSearch) || m.title.toLowerCase().includes(merchantSearch.toLowerCase())).map(m => (
                            <tr key={m.ID}><td>{m.code}</td><td>{m.title}</td></tr>
                        ))}
                      </tbody>
                   </table>
                 </div>
               )}
            </div>
          )}

          <div className="my-applications-sub-header">
            <div>от <Input type="datetime-local" onChange={(e) => setData("start_date", e)} value={data?.start_date} style={{ width: "200px" }} id="start_date" /></div>
            <div>до <Input type="datetime-local" onChange={(e) => setData("end_date", e)} value={data?.end_date} style={{ width: "200px" }} id="end_date" /></div>
            <div className="total-sum-badge">
              <span className="total-sum-label">Сумма всех операций:</span>
              <span className="total-sum-value">{totalSum.toLocaleString("ru-RU")} с.</span>
            </div>
          </div>

          <div className="my-applications-content" style={{ position: "relative" }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "2rem" }}><Spinner center label="Загружаем информацию" />Загрузка...</div>
            ) : (
              <Table tableId="qr-transactions-table" dataSource={sortedData} rowKey={getRowKey} pagination={{ pageSize: 20 }} loading={loading} scroll={{ x: "max-content", y: 600 }}>
                <Table.Column title={<input type="checkbox" className="custom-checkbox" checked={selectAll} onChange={toggleSelectAll} />} key="selection" width={60} render={(_, row) => {
                    const key = getRowKey(row);
                    return <input type="checkbox" className="custom-checkbox" checked={selectedRows.includes(key)} onChange={(e) => handleCheckboxToggle(key, e.target.checked)} />;
                }} />
                
                <Table.Column title="ID" dataIndex="id" key="id" width={80} render={(val) => val || "-"} />

                {isUsOnThem && (
                   <>
                     <Table.Column title="ФИО отправителя" dataIndex="sender_name" key="sender_name" render={(val) => val || "-"} />
                     <Table.Column title="Телефон отправителя" dataIndex="sender_phone" key="sender_phone" render={(val) => val || "-"} />
                     <Table.Column title="Номер в АРМ (trnId)" dataIndex="trnId" key="trnId" render={(val) => val || "-"} />
                     <Table.Column title="qrId" dataIndex="qrId" key="qrId" render={(val) => val || "-"} />
                     <Table.Column title="Банк отправителя" key="sender_bank" render={(_, row) => {
                          const bank = banks.find((b) => b.bankId === row.sender_bank || b.id === row.sender_bank);
                          return bank ? `${bank.bankName} (${row.sender_bank})` : `ID: ${row.sender_bank}`;
                     }} />
                     <Table.Column title="Банк получателя" key="receiver" render={(_, row) => {
                          const bank = banks.find((b) => b.bankId === row.receiver || b.id === row.receiver);
                          return bank ? `${bank.bankName} (${row.receiver})` : `ID: ${row.receiver}`;
                     }} />
                   </>
                )}

                {isThemOnUs && (
                  <>
                    <Table.Column title="Мерчант" key="merchant" render={(_, row) => {
                        const code = row.merchant_code || row.merchant_id;
                        if (!code) return "—";
                        return merchants.find((m) => String(m.code) === String(code))?.title ?? code;
                    }} />
                    <Table.Column title="Код мерчанта" dataIndex="merchant_code" key="merchant_code" render={(val) => val || "-"} />
                    <Table.Column title="TX ID" dataIndex="tx_id" key="tx_id" render={(val) => val || "-"} />
                    <Table.Column title="Partner TRN ID" dataIndex="partner_trn_id" key="partner_trn_id" render={(val) => val || "-"} />
                    <Table.Column title="Код терминала" dataIndex="terminal_code" key="terminal_code" render={(val) => val || "-"} />
                    <Table.Column title="Банк отправителя" key="sender" render={(_, row) => {
                          const bank = banks.find((b) => b.bankId === row.sender || b.id === row.sender);
                          return bank ? `${bank.bankName} (${row.sender})` : `ID: ${row.sender}`;
                    }} />
                    <Table.Column title="Банк получателя" key="receiver_them" render={(_, row) => {
                          const bank = banks.find((b) => b.bankId === row.receiver || b.id === row.receiver);
                          return bank ? `${bank.bankName} (${row.receiver})` : `ID: ${row.receiver}`;
                    }} />
                  </>
                )}

                <Table.Column title="Описание" dataIndex="description" key="description" render={(val) => val || "-"} />
                
                <Table.Column title="Статус" dataIndex="status" key="status" render={(status) => {
                    if (status === "success") return <div style={{ display: "flex", alignItems: "center", gap: "10px" }}><FcOk style={{ fontSize: 22 }} /><span style={{ color: "green" }}>Успешно</span></div>;
                    if (status === "process") return <div style={{ display: "flex", alignItems: "center", gap: "10px" }}><FcProcess style={{ fontSize: 22 }} /><span style={{ color: "orange" }}>В процессе</span></div>;
                    if (status === "cancel") return <div style={{ display: "flex", alignItems: "center", gap: "10px" }}><FcCancel style={{ fontSize: 22 }} /><span style={{ color: "red" }}>Отменено</span></div>;
                    return <div style={{ display: "flex", alignItems: "center", gap: "10px" }}><FcHighPriority style={{ fontSize: 22 }} /><span style={{ color: "red" }}>Ошибка</span></div>;
                }} />
                
                <Table.Column title="Сумма" key="amount" render={(_, row) => <span style={{ fontWeight: "600" }}>{Number(row.amount).toLocaleString("ru-RU")} с.</span>} sortValue={(row) => Number(row.amount)} />
                <Table.Column title="Дата" key="date" render={(_, row) => formatDateForDisplay(isUsOnThem ? row.created_at : row.creation_datetime)} sortValue={(row) => new Date(isUsOnThem ? row.created_at : row.creation_datetime).getTime()} />
              </Table>
            )}
          </div>
        </main>
      </div>

      {isLoadingExport && (
        <div className="loading-overlay">
          <div className="loading-box"><div className="spinner" /><p>Выгружается {loadingCount} записей...</p></div>
        </div>
      )}

      {alert && (
        <AlertMessage message={alert.message} type={alert.type} onClose={() => setAlert(null)} />
      )}
    </>
  );
}
