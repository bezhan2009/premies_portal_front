import React, { useEffect, useMemo, useRef, useState } from "react";
import Input from "../../components/elements/Input.jsx";
import Select from "../../components/elements/Select.jsx";
import { useFormStore } from "../../hooks/useFormState.js";
import { FcCancel, FcHighPriority, FcOk, FcProcess } from "react-icons/fc";
import { BsArrowUp, BsArrowDown, BsArrowDownUp } from "react-icons/bs";
import { MdPayment, MdCheckCircle } from "react-icons/md";
import AlertMessage from "../../components/general/AlertMessage.jsx";
import { toast } from "react-toastify";
import { tableDataDef } from "../../const/defConst.js";
import { exportEqmsTransactions } from "../../utils/eqmsExcelExport.js";
import { paginateRows, togglePageSelection } from "../../utils/eqmsPagination.js";
import EqmsPagination from "../../components/table/EqmsPagination.jsx";
import { matchesEqmsSearch } from "../../utils/eqmsGlobalSearch.js";
import "../../styles/components/EqmsPage.scss";

export default function EQMSList() {
  const [tableData, setTableData] = useState([]);
  const { data, setData } = useFormStore();
  const [sortField, setSortField] = useState("id");
  const [sortDirection, setSortDirection] = useState("desc");
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({});
  const [globalSearch, setGlobalSearch] = useState("");
  const [alert, setAlert] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [statementPageNumber, setStatementPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const tableScrollRef = useRef(null);
  const fetchSequence = useRef(0);
  const [payingIds, setPayingIds] = useState(new Set());
  const backendMain = import.meta.env.VITE_BACKEND_URL;
  const backendABS = import.meta.env.VITE_BACKEND_ABS_SERVICE_URL;
  const token = localStorage.getItem("access_token");
  const [showPayConfirmation, setShowPayConfirmation] = useState(false);
  const [paymentsToProcess, setPaymentsToProcess] = useState([]);
  const [showStatement, setShowStatement] = useState(false);
  const [statementData, setStatementData] = useState([]);
  const [statementLoading, setStatementLoading] = useState(false);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const accountNumber = "26202972381810638175";
  const [showSinglePayConfirmation, setShowSinglePayConfirmation] =
    useState(false);
  const [singlePaymentData, setSinglePaymentData] = useState(null);
  const [balance, setBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const fetchBalance = async () => {
    try {
      setBalanceLoading(true);
      const url = `${backendMain}/eqms/balance`;
      const resp = await fetch(url, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!resp.ok) throw new Error(`Ошибка HTTP ${resp.status}`);
      const json = await resp.json();
      setBalance(json.bal);
    } catch (err) {
      console.error("Ошибка загрузки баланса:", err);
    } finally {
      setBalanceLoading(false);
    }
  };

  const showAlert = (message, type = "success") => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 3500);
  };

  const isWorkingHours = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    return currentHour < 17 || (currentHour === 17 && currentMinute <= 10);
  };

  const isPaidCustoms = (row) => {
    if (row.isPayed !== undefined && row.isPayed !== null) {
      return Boolean(row.isPayed);
    }

    if (!row.payedAt) return false;
    if (row.payedAt.includes("0001-01-01")) return false;
    try {
      const date = new Date(row.payedAt);
      return date.getFullYear() >= 2000;
    } catch {
      return false;
    }
  };

  const getPaymentStatus = (row) => {
    if (row.status === "Paid" || row.status === "Success") return "paid";
    if (isPaidCustoms(row)) return "already_paid";
    return "pending";
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return "";
    try {
      const d = new Date(dateString);
      if (isNaN(d)) return dateString;
      if (dateString.includes("0001-01-01")) {
        return "Не оплачено";
      }
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

  const fetchData = async () => {
    const sequence = ++fetchSequence.current;
    try {
      setLoading(true);
      const start =
        data?.eqms_start_date || new Date().toISOString().split("T")[0];
      const end = data?.eqms_end_date || new Date().toISOString().split("T")[0];
      const url = `${backendMain}/eqms?start_date=${start}&end_date=${end}`;
      const resp = await fetch(url, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!resp.ok) throw new Error(`Ошибка HTTP ${resp.status}`);
      const json = await resp.json();
      if (sequence !== fetchSequence.current) return;
      setTableData(json || []);
      showAlert(`Загружено ${json.length} записей`, "success");
    } catch (err) {
      if (sequence !== fetchSequence.current) return;
      console.error("Ошибка загрузки данных:", err);
      showAlert("Ошибка загрузки данных. Проверьте сервер.", "error");
      setTableData([]);
    } finally {
      if (sequence === fetchSequence.current) setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    if (!Array.isArray(tableData)) return [];
    return tableData.filter((row) => matchesEqmsSearch(row,globalSearch,[formatDateForDisplay(row.payedAt), getPaymentStatus(row)==='pending'?'Не оплачено':getPaymentStatus(row)==='already_paid'?'Оплачено в таможне':'Оплачено']) &&
      Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        const rowValue = row[key];

        if (key === "payedAt" && value === "paid") {
          return isPaidCustoms(row);
        }
        if (key === "payedAt" && value === "not_paid") {
          return !isPaidCustoms(row);
        }

        if (rowValue == null) return false;

        if (typeof rowValue === "number")
          return String(rowValue).includes(value);
        if (typeof rowValue === "boolean")
          return String(rowValue).toLowerCase() === value.toLowerCase();
        if (typeof rowValue === "string")
          return rowValue.toLowerCase().includes(String(value).toLowerCase());
        return false;
      }),
    );
  }, [tableData, filters, globalSearch]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedData = useMemo(() => {
    const arr = [...filteredData];
    arr.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp =
        typeof aVal === "number" && typeof bVal === "number"
          ? aVal - bVal
          : String(aVal).localeCompare(String(bVal), "ru", { numeric: true });
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filteredData, sortField, sortDirection]);

  const page = useMemo(() => paginateRows(sortedData, pageNumber, pageSize), [sortedData, pageNumber, pageSize]);
  const selectAll = sortedData.length > 0 && sortedData.every((row) => selectedRows.includes(row.id));
  const pageSelected = page.rows.length > 0 && page.rows.every((row) => selectedRows.includes(row.id));
  const pagePartlySelected = !pageSelected && page.rows.some((row) => selectedRows.includes(row.id));

  useEffect(() => {
    setPageNumber(1);
  }, [filters, globalSearch, sortField, sortDirection, data?.eqms_start_date, data?.eqms_end_date]);

  useEffect(() => {
    setSelectedRows((previous) => previous.filter((id) => filteredData.some((row) => row.id === id)));
  }, [filteredData]);

  useEffect(() => {
    setPageNumber(page.current);
    if (tableScrollRef.current) tableScrollRef.current.scrollTop = 0;
  }, [page.current]);

  const paySingle = async (transaction) => {
    const resp = await fetch(`${backendMain}/eqms/pay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(transaction),
    });
    const result = await resp.json();
    if (!resp.ok) {
      throw new Error(result.error || `Ошибка сервера: ${resp.status}`);
    }
    if (result.error) {
      throw new Error(result.error);
    }
    return result;
  };

  const handlePayWithRetry = async (transaction, retryCount = 0) => {
    const maxRetries = 3;
    const retryDelay = 2000;

    try {
      const result = await paySingle(transaction);
      return result;
    } catch (err) {
      if (retryCount >= maxRetries || !isWorkingHours()) {
        throw err;
      }

      showAlert(
        `Платеж с ID ${transaction.id} завершился с ошибкой: "${
          err.message
        }". Повторная попытка ${retryCount + 1} из ${maxRetries}...`,
        "warning",
      );

      await new Promise((resolve) => setTimeout(resolve, retryDelay));

      return await handlePayWithRetry(transaction, retryCount + 1);
    }
  };

  const handlePay = async (transaction) => {
    const paymentStatus = getPaymentStatus(transaction);
    const absStatus = transaction.statusABS || "Ожидает проверки";

    if (absStatus === "Оплачено в АБС") {
      if (paymentStatus === "already_paid") {
        showAlert("Таможня уже оплачена ранее", "warning");
        return;
      }
      if (paymentStatus === "paid") {
        showAlert("Оплата уже была отправлена (статус Success)", "info");
        return;
      }
    }

    if (absStatus === "Ожидает проверки" && paymentStatus === "already_paid") {
      showAlert("Оплата уже отправлена и ожидает подтверждения от АБС. Пожалуйста, подождите.", "warning");
      return;
    }

    setSinglePaymentData(transaction);
    setShowSinglePayConfirmation(true);
  };

  const performSinglePayment = async () => {
    if (!singlePaymentData) return;

    setShowSinglePayConfirmation(false);
    const transaction = singlePaymentData;
    setSinglePaymentData(null);

    setPayingIds((prev) => new Set([...prev, transaction.id]));

    try {
      if (isWorkingHours()) {
        await handlePayWithRetry(transaction, 0);
        showAlert(
          "Оплата успешно отправлена! Ожидаем подтверждения...",
          "success",
        );
      } else {
        await paySingle(transaction);
        showAlert(
          "Оплата успешно отправлена! Ожидаем подтверждения...",
          "success",
        );
      }

      setTimeout(() => fetchData(), 1000);
    } catch (err) {
      console.error("Ошибка оплаты:", err);

      const errMsg = err?.message || "";
      const isAlreadyPaid =
        errMsg.toLowerCase().includes("уже оплачена") ||
        errMsg.toLowerCase().includes("already_paid") ||
        errMsg.toLowerCase().includes("already paid");

      if (isAlreadyPaid) {
        showAlert("Оплата уже была проведена или находится в обработке. Обновите страницу для проверки статуса.", "warning");
        setTimeout(() => fetchData(), 1500);
      } else if (isWorkingHours()) {
        showAlert(
          `Платеж с ID ${transaction.id} завершился с ошибкой после нескольких попыток: ${errMsg}`,
          "error",
        );
      } else {
        showAlert(errMsg || "Не удалось отправить оплату", "error");
      }
    } finally {
      setPayingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(transaction.id);
        return newSet;
      });
    }
  };

  const handleCancelSinglePayment = () => {
    setShowSinglePayConfirmation(false);
    setSinglePaymentData(null);
  };

  const handlePayAll = async () => {
    const toPay = sortedData.filter(
      (row) =>
        selectedRows.includes(row.id) &&
        (getPaymentStatus(row) === "pending" || row.statusABS !== "Оплачено в АБС"),
    );

    if (toPay.length === 0) {
      showAlert("Нет выбранных неоплаченных записей для оплаты", "warning");
      return;
    }

    setPaymentsToProcess(toPay);
    setShowPayConfirmation(true);
  };

  const performPayment = async (toPay) => {
    setPayingIds((prev) => new Set([...prev, ...toPay.map((r) => r.id)]));

    let successes = 0;
    let fails = [];
    const batchSize = 150;
    const delayMs = 10000;

    try {
      for (let i = 0; i < toPay.length; i += batchSize) {
        const batch = toPay.slice(i, i + batchSize);
        const promises = batch.map(async (transaction) => {
          try {
            if (isWorkingHours()) {
              await handlePayWithRetry(transaction, 0);
            } else {
              await paySingle(transaction);
            }
            successes++;
          } catch (err) {
            fails.push({ id: transaction.id, error: err.message });
          }
        });

        await Promise.all(promises);

        if (i + batchSize < toPay.length) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      const message = `Успешно оплачено: ${successes}. Ошибок: ${fails.length}.`;
      showAlert(message, fails.length === 0 ? "success" : "warning");

      if (fails.length > 0) {
        console.error("Ошибки оплаты:", fails);
      }

      setTimeout(() => fetchData(), 1000);
    } catch (err) {
      showAlert("Критическая ошибка во время массовой оплаты", "error");
    } finally {
      setPayingIds((prev) => {
        const newSet = new Set(prev);
        toPay.forEach((r) => newSet.delete(r.id));
        return newSet;
      });
    }
  };

  const handleConfirmPayment = () => {
    setShowPayConfirmation(false);
    performPayment(paymentsToProcess);
    setPaymentsToProcess([]);
  };

  const handleCancelPayment = () => {
    setShowPayConfirmation(false);
    setPaymentsToProcess([]);
  };

  const handleExport = () => {
    try {
      const selectedTransactions = sortedData.filter((row) =>
        selectedRows.includes(row.id),
      );

      if (selectedTransactions.length === 0) {
        showAlert("Выберите хотя бы одну запись для выгрузки", "error");
        return;
      }

      const allSelected =
        selectedRows.length === sortedData.length && sortedData.length > 0;
      const start = data?.eqms_start_date || "";
      const end = data?.eqms_end_date || "";
      const todayFormatted = new Date()
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "");

      const filename = allSelected
        ? `EQMS_Report_${start}_to_${end}.xlsx`
        : `EQMS_Report_${todayFormatted}.xlsx`;

      exportEqmsTransactions(selectedTransactions, filename);

      showAlert(
        `Файл успешно выгружен (${selectedTransactions.length} записей)`,
        "success",
      );
      setSelectedRows([]);
    } catch (err) {
      console.error("Ошибка выгрузки:", err);
      showAlert(`Ошибка выгрузки: ${err.message}`, "error");
    }
  };

  const handleCheckboxToggle = (id, checked) => {
    if (checked) {
      setSelectedRows((prev) => [...new Set([...prev, id])]);
    } else {
      setSelectedRows((prev) => prev.filter((p) => p !== id));
    }
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedRows([]);
    } else {
      const ids = sortedData.map((r) => r.id);
      setSelectedRows(ids);
    }
  };

  const selectAllUnpaid = () => {
    const ids = sortedData
      .filter(
        (row) =>
          (getPaymentStatus(row) === "pending" || row.statusABS !== "Оплачено в АБС") &&
          (row.status || "").toLowerCase() === "success",
      )
      .map((r) => r.id);
    setSelectedRows(ids);
  };

  const selectAllPaid = () => {
    const ids = sortedData
      .filter(
        (row) =>
          (getPaymentStatus(row) !== "pending" && row.statusABS === "Оплачено в АБС") &&
          (row.status || "").toLowerCase() === "success",
      )
      .map((r) => r.id);
    setSelectedRows(ids);
  };

  const columnNames = {
    id: "ID",
    status: "Статус платежа",
    amount: "Сумма",
    docId: "Номер документа",
    transactionId: "Номер транзакций",
    date: "Дата",
    type_id: "Тип",
    emailToBeNotified: "Почта",
    meanOfPayment: "Тип платежа",
    bankCode: "БИК",
    payerINN: "ИНН плательщика",
    payerName: "Имя плательщика",
    payerBankName: "Банк плательщика",
    payerBankCode: "БИК банка плательщика",
    payerAcc: "Номер счета",
    recINN: "ИНН получателя",
    recName: "Имя получателя",
    recBankName: "Банк получателя",
    recBankCode: "Код банка получателя",
    recAcc: "recAcc",
    statusABS: "Статус в АБС",
  };

  const tableHeaders = useMemo(() => {
    if (sortedData.length === 0) return [];
    const firstRow = sortedData[0];
    const excludedHeaders = ["payedAt", "isPayed", "errorMsg"];
    const allKeys = Object.keys(firstRow).filter(
      (header) => !excludedHeaders.includes(header),
    );

    const orderedKeys = [];
    if (allKeys.includes("id")) orderedKeys.push("id");
    if (allKeys.includes("amount")) orderedKeys.push("amount");
    if (allKeys.includes("status")) orderedKeys.push("status");
    if (allKeys.includes("statusABS")) orderedKeys.push("statusABS");
    allKeys.forEach((key) => {
      if (key !== "id" && key !== "amount" && key !== "status" && key !== "statusABS") {
        orderedKeys.push(key);
      }
    });

    return orderedKeys;
  }, [sortedData]);

  const totalSelected = sortedData.filter((row) => selectedRows.includes(row.id)).length;
  const totalPaid = useMemo(
    () =>
      sortedData.filter((row) => getPaymentStatus(row) !== "pending").length,
    [sortedData],
  );
  const totalAmountSelected = useMemo(() => {
    return sortedData
      .filter((row) => selectedRows.includes(row.id))
      .reduce((sum, row) => sum + (row.amount || 0), 0);
  }, [sortedData, selectedRows]);

  useEffect(() => {
    if (!data?.eqms_start_date || !data?.eqms_end_date) {
      const today = new Date().toISOString().split("T")[0];
      setData("eqms_start_date", today);
      setData("eqms_end_date", today);
    }
  }, []);

  useEffect(() => {
    if (data?.eqms_start_date && data?.eqms_end_date) {
      fetchData();
      fetchBalance();
    }
  }, [data?.eqms_start_date, data?.eqms_end_date]);


  const formatDateForQuery = (dateStr) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}.${m}.${y}`;
  };

  const handleFetchStatement = async () => {
    setStatementLoading(true);
    const sd = formatDateForQuery(startDate);
    const ed = formatDateForQuery(endDate);
    const url = `${backendABS}/account/operations?startDate=${sd}&endDate=${ed}&accountNumber=${accountNumber}`;
    try {
      const resp = await fetch(url, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!resp.ok) throw new Error(`Ошибка HTTP ${resp.status}`);
      const json = await resp.json();
      setStatementData(json || []);
      setStatementPageNumber(1);
      setShowStatement(true);
      showAlert(`Загружено ${json.length} дней с транзакциями`, "success");
    } catch (err) {
      console.error("Ошибка загрузки выписки:", err);
      showAlert("Ошибка загрузки выписки. Проверьте сервер.", "error");
      setStatementData([]);
    } finally {
      setStatementLoading(false);
    }
  };

  const flatStatementData = useMemo(() => {
    return statementData.flatMap((day) =>
      day.Transactions.map((tx) => ({
        ...tx,
        doper: day.DOPER,
        kurs: day.Kurs,
        sumBalOut: day.SumBalOut,
        sumMovD: day.SumMovD,
        sumMovC: day.SumMovC,
        sumMovDN: day.SumMovDN,
        sumMovCN: day.SumMovCN,
        transactionsCount: day.TransactionsCount,
      })),
    );
  }, [statementData]);

  const statementPage = paginateRows(flatStatementData, statementPageNumber, pageSize);

  return (
    <>
      <div className="page-content-wrapper content-page eqms-page">
        <div
          className="applications-list"
          style={{ flexDirection: "column", gap: "20px", height: "auto" }}
        >
          <main>
            <div className="eqms-title"><h1>Платежи EQMS</h1><span>Таможенные платежи и статусы АБС</span></div>
            <div className="my-applications-header eqms-toolbar">
              <div className="eqms-toolbar__actions">
                {!showStatement && (
                  <button
                    className={!showFilters ? "filter-toggle" : "Unloading"}
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    Фильтры
                  </button>
                )}
                {!showStatement && (
                  <>
                    <button
                      className="Unloading"
                      onClick={handleExport}
                      disabled={loading || totalSelected === 0}
                    >
                      Выгрузка EQMS
                    </button>
                    <button
                      className="save"
                      onClick={handlePayAll}
                      disabled={loading || totalSelected === 0 || payingIds.size > 0}
                    >
                      Оплатить выбранные
                    </button>
                    <button
                      className={selectAll ? "selectAll-toggle" : ""}
                      onClick={toggleSelectAll}
                      disabled={loading || sortedData.length === 0}
                      title="Выбор всех записей по текущим фильтрам на всех страницах"
                    >
                      {selectAll ? "Снять выделение" : "Выбрать все записи"}
                    </button>
                    <button className="edit" onClick={selectAllUnpaid} disabled={loading}>
                      Выбрать все неоплаченные
                    </button>
                    <button className="save" onClick={selectAllPaid} disabled={loading}>
                      Выбрать все оплаченные
                    </button>
                  </>
                )}
                <button
                  className="Unloading"
                  onClick={handleFetchStatement}
                  disabled={statementLoading}
                >
                  Просмотреть выписку с АБС
                </button>
              </div>
              <div className="eqms-toolbar__summary">
                {!showStatement && (
                  <div className="selection-stats-card">
                    <div className="stat">
                      <span className="label">Выбрано</span>
                      <strong className="value">{totalSelected}</strong>
                    </div>
                    <div className="divider" />
                    <div className="stat">
                      <span className="label">Оплачено всего</span>
                      <strong className="value paid">{totalPaid}</strong>
                    </div>
                    <div className="divider" />
                    <div className="stat highlight">
                      <span className="label">Сумма выбранных</span>
                      <strong className="value amount">
                        {totalAmountSelected.toLocaleString("ru-RU")} С
                      </strong>
                    </div>
                  </div>
                )}
              {/* Customs Balance Card */}
              <div className="customs-balance-card" style={{
                background: "var(--bg-card, #ffffff)",
                color: "var(--text-color, #111827)",
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid var(--border-color, #e5e7eb)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                minWidth: "200px"
              }}>
                <span style={{ fontSize: "11px", color: "var(--text-muted, #6b7280)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Баланс счета таможни</span>
                <strong style={{ fontSize: "18px", fontWeight: "600", marginTop: "2px", color: "#10b981" }}>
                  {balanceLoading ? "Загрузка..." : balance !== null ? `${Number(balance).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TJS` : "—"}
                </strong>
              </div>
              </div>
            </div>
            {showFilters && !showStatement && (
              <div className="filters animate-slideIn">
                <input
                  placeholder="ID"
                  value={filters.id || ""}
                  onChange={(e) =>
                    setFilters((p) => ({
                      ...p,
                      id: e.target.value,
                    }))
                  }
                />
                <input
                  placeholder="Номер документа"
                  value={filters.docId || ""}
                  onChange={(e) =>
                    setFilters((p) => ({
                      ...p,
                      docId: e.target.value,
                    }))
                  }
                />
                <input
                  placeholder="Номер транзакции"
                  value={filters.transactionId || ""}
                  onChange={(e) =>
                    setFilters((p) => ({
                      ...p,
                      transactionId: e.target.value,
                    }))
                  }
                />
                <input
                  placeholder="Имя плательщика"
                  value={filters.payerName || ""}
                  onChange={(e) =>
                    setFilters((p) => ({
                      ...p,
                      payerName: e.target.value,
                    }))
                  }
                />
                <input
                  placeholder="Имя получателя"
                  value={filters.recName || ""}
                  onChange={(e) =>
                    setFilters((p) => ({
                      ...p,
                      recName: e.target.value,
                    }))
                  }
                />
                <Select
                  onChange={(val) => setFilters((p) => ({ ...p, status: val }))}
                  value={filters.status}
                  options={[
                    { value: "", label: "Статус" },
                    { value: "Pending", label: "Pending" },
                    { value: "Success", label: "Success" },
                    { value: "Failed", label: "Failed" },
                  ]}
                />
                <Select
                  onChange={(val) =>
                    setFilters((p) => ({ ...p, payedAt: val }))
                  }
                  value={filters.payedAt}
                  options={[
                    { value: "", label: "Статус оплаты" },
                    { value: "paid", label: "Оплачено" },
                    { value: "not_paid", label: "Не оплачено" },
                  ]}
                />
                <input
                  placeholder="Сумма"
                  value={filters.amount || ""}
                  type="number"
                  onChange={(e) =>
                    setFilters((p) => ({ ...p, amount: e.target.value }))
                  }
                />
              </div>
            )}
            <div className="my-applications-sub-header">
              {!showStatement && (
                <>
                  <div>
                    С{" "}
                    <Input
                      type="date"
                      onChange={(e) => setData("eqms_start_date", e)}
                      value={data?.eqms_start_date || ""}
                      style={{ width: "150px" }}
                      id="eqms_start_date"
                    />
                  </div>
                  <div>
                    По{" "}
                    <Input
                      type="date"
                      onChange={(e) => setData("eqms_end_date", e)}
                      value={data?.eqms_end_date || ""}
                      style={{ width: "150px" }}
                      id="eqms_end_date"
                    />
                  </div>
                  <label className="eqms-global-search">Поиск по всем полям
                    <input type="search" value={globalSearch} onChange={event=>setGlobalSearch(event.target.value)} placeholder="Все значения за выбранные даты" />
                  </label>
                </>
              )}
              {showStatement && (
                <>
                  <div>
                    Начальная дата для выписки:{" "}
                    <Input
                      type="date"
                      onChange={(e) => setStartDate(e)}
                      value={startDate}
                      style={{ width: "150px" }}
                    />
                  </div>
                  <div>
                    Конечная дата для выписки:{" "}
                    <Input
                      type="date"
                      onChange={(e) => setEndDate(e)}
                      value={endDate}
                      style={{ width: "150px" }}
                    />
                  </div>
                </>
              )}
            </div>
            <div
              className="my-applications-content eqms-table-scroll"
              ref={tableScrollRef}
              tabIndex={0}
              role="region"
              aria-label="Таблица платежей — прокрутка по горизонтали"
              style={{ position: "relative" }}
            >
              {showStatement ? (
                <>
                  <button
                    style={{
                      backgroundColor: "#2566e8",
                      color: "#fff",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "10px",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                    onClick={() => setShowStatement(false)}
                  >
                    Назад к списку EQMS
                  </button>
                  {statementLoading ? (
                    <div style={{ textAlign: "center", padding: "2rem" }}>
                      Загрузка выписки...
                    </div>
                  ) : flatStatementData.length === 0 ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "2rem",
                        color: "gray",
                      }}
                    >
                      Нет данных для отображения в выписке
                    </div>
                  ) : (
                    <table data-flex-ignore="true">
                      <thead>
                        <tr>
                          <th>Дата операции (DOPER)</th>
                          <th>Дата документа (DOCDOPER)</th>
                          <th>Время (EXECDT)</th>
                          <th>Описание (TXTDSCR)</th>
                          <th>Дебет (MOVD)</th>
                          <th>Кредит (MOVC)</th>
                          <th>Баланс на конец (SumBalOut)</th>
                          <th>Валютная дата (DVAL)</th>
                          <th>Референс (REFER)</th>
                          <th>Номер документа (NUMDOC)</th>
                          <th>Клиент корреспондент (CLIENTCOR)</th>
                          <th>Счет корреспондент (ACCCOR)</th>
                          <th>Банк корреспондент (NAMEBCR)</th>
                          <th>Курс (kurs)</th>
                          <th>PDepID</th>
                          <th>PID</th>
                          <th>KSOCODE</th>
                          <th>BNKKOR</th>
                          <th>JCODEBE</th>
                          <th>JRNNCR</th>
                          <th>MOVDN</th>
                          <th>MOVCN</th>
                          <th>CODEBCR</th>
                          <th>KNP</th>
                          <th>CODEBC</th>
                          <th>TXT_HEAD</th>
                          <th>TXT_BUCH</th>
                          <th>CMSFL</th>
                          <th>PARENT_REFER</th>
                          <th>KURS_ISP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statementPage.rows.map((tx, index) => (
                          <tr key={index}>
                            <td>{tx.doper || "N/A"}</td>
                            <td>{tx.DOCDOPER || "N/A"}</td>
                            <td>{tx.EXECDT || "N/A"}</td>
                            <td>{tx.TXTDSCR || "N/A"}</td>
                            <td>{tx.MOVD || "N/A"}</td>
                            <td>{tx.MOVC || "N/A"}</td>
                            <td>{tx.sumBalOut || "N/A"}</td>
                            <td>{tx.DVAL || "N/A"}</td>
                            <td>{tx.REFER || "N/A"}</td>
                            <td>{tx.NUMDOC || "N/A"}</td>
                            <td>{tx.CLIENTCOR || "N/A"}</td>
                            <td>{tx.ACCCOR || "N/A"}</td>
                            <td>{tx.NAMEBCR || "N/A"}</td>
                            <td>{tx.kurs || "N/A"}</td>
                            <td>{tx.PDepID || "N/A"}</td>
                            <td>{tx.PID || "N/A"}</td>
                            <td>{tx.KSOCODE || "N/A"}</td>
                            <td>{tx.BNKKOR || "N/A"}</td>
                            <td>{tx.JCODEBE || "N/A"}</td>
                            <td>{tx.JRNNCR || "N/A"}</td>
                            <td>{tx.MOVDN || "N/A"}</td>
                            <td>{tx.MOVCN || "N/A"}</td>
                            <td>{tx.CODEBCR || "N/A"}</td>
                            <td>{tx.KNP || "N/A"}</td>
                            <td>{tx.CODEBC || "N/A"}</td>
                            <td>{tx.TXT_HEAD || "N/A"}</td>
                            <td>{tx.TXT_BUCH || "N/A"}</td>
                            <td>{tx.CMSFL || "N/A"}</td>
                            <td>{tx.PARENT_REFER || "N/A"}</td>
                            <td>{tx.KURS_ISP || "N/A"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              ) : loading ? (
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
                <table className="eqms-table" data-flex-ignore="true">
                  <thead>
                    <tr>
                      <th className="eqms-th eqms-th--checkbox">
                        <input
                          type="checkbox"
                          className="custom-checkbox"
                          aria-label="Выбрать все записи на текущей странице"
                          checked={pageSelected}
                          ref={(input) => { if (input) input.indeterminate = pagePartlySelected; }}
                          onChange={() => setSelectedRows((previous) => togglePageSelection(previous, page.rows))}
                        />
                      </th>
                      {tableHeaders.map((header) => (
                        <th
                          key={header}
                          className={`eqms-th eqms-th--sortable${sortField === header ? " eqms-th--active" : ""}`}
                          onClick={() => handleSort(header)}
                          aria-sort={sortField === header ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                          tabIndex={0}
                          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); handleSort(header); } }}
                        >
                          <span className="eqms-th__label">
                            {columnNames[header] || header}
                          </span>
                          <span className="eqms-th__icon">
                            {sortField === header ? (
                              sortDirection === "asc" ? (
                                <BsArrowUp />
                              ) : (
                                <BsArrowDown />
                              )
                            ) : (
                              <BsArrowDownUp className="eqms-th__icon--idle" />
                            )}
                          </span>
                        </th>
                      ))}
                      <th className="eqms-th">Оплачено в</th>
                      <th className="eqms-th active-table">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {page.rows.map((row) => {
                      const paymentStatus = getPaymentStatus(row);
                      const isPaid =
                        paymentStatus === "already_paid" ||
                        paymentStatus === "paid";
                      const isPaying = payingIds.has(row.id);
                      const absStatus = row.statusABS || "Ожидает проверки";
                      const rowBg = absStatus === "Оплачено в АБС"
                        ? "rgba(39, 174, 96, 0.15)"
                        : absStatus === "Ожидает проверки" && isPaid
                          ? "rgba(245, 158, 11, 0.05)"
                          : "transparent";

                      return (
                        <tr
                          key={row.id}
                          style={{
                            backgroundColor: rowBg,
                          }}
                        >
                          <td>
                            <input
                              type="checkbox"
                              className="custom-checkbox"
                              aria-label={`Выбрать запись ${row.id}`}
                              checked={selectedRows.includes(row.id)}
                              onChange={(e) =>
                                handleCheckboxToggle(row.id, e.target.checked)
                              }
                            />
                          </td>
                          {tableHeaders.map((header) => {
                            let value = row[header];
                            if (
                              header.includes("date") ||
                              header.includes("Date") ||
                              header === "date" ||
                              header === "docDate" ||
                              header === "dateVal" ||
                              header === "dataOpr"
                            ) {
                              value = formatDateForDisplay(value);
                            } else if (header === "resiFlg") {
                              value = value ? "Да" : "Нет";
                            } else if (header === "statusABS") {
                              const absStatusVal = row.statusABS || "Ожидает проверки";
                              const errorMsg = row.errorMsg;
                              let statusColor = "orange";
                              let statusIcon = <FcProcess style={{ fontSize: 22 }} />;

                              if (absStatusVal === "Оплачено в АБС") {
                                statusColor = "green";
                                statusIcon = <FcOk style={{ fontSize: 22 }} />;
                              } else if (absStatusVal === "Ошибка АБС") {
                                statusColor = "red";
                                statusIcon = <FcCancel style={{ fontSize: 22 }} />;
                              }

                              return (
                                <td key={header}>
                                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                      {statusIcon}
                                      <span style={{ color: statusColor, fontWeight: "500" }}>{absStatusVal}</span>
                                    </div>
                                    {errorMsg && absStatusVal === "Ошибка АБС" && (
                                      <small style={{
                                        color: "red",
                                        display: "block",
                                        marginTop: "2px",
                                        maxWidth: "200px",
                                        wordBreak: "break-word",
                                        fontSize: "11px",
                                        opacity: 0.9
                                      }}>
                                        Ошибка: {errorMsg}
                                      </small>
                                    )}
                                  </div>
                                </td>
                              );
                            } else if (header === "status") {
                              return (
                                <td key={header}>
                                  {row.status === "pending" ? (
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "10px",
                                      }}
                                    >
                                      <FcProcess style={{ fontSize: 22 }} />
                                      <span style={{ color: "orange" }}>
                                        Pending
                                      </span>
                                    </div>
                                  ) : row.status === "success" ? (
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "10px",
                                      }}
                                    >
                                      <FcOk style={{ fontSize: 22 }} />
                                      <span style={{ color: "green" }}>
                                        Success
                                      </span>
                                    </div>
                                  ) : row.status === "failed" ? (
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "10px",
                                      }}
                                    >
                                      <FcCancel style={{ fontSize: 22 }} />
                                      <span style={{ color: "red" }}>
                                        Failed
                                      </span>
                                    </div>
                                  ) : (
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "10px",
                                      }}
                                    >
                                      <FcHighPriority
                                        style={{ fontSize: 22 }}
                                      />
                                      <span>{row.status}</span>
                                    </div>
                                  )}
                                </td>
                              );
                            }
                            return <td key={header}>{value}</td>;
                          })}
                          <td>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                color: isPaid ? "green" : "gray",
                                fontWeight: isPaid ? "500" : "normal",
                              }}
                            >
                              {isPaid && <FcOk style={{ fontSize: 22 }} />}
                              <br />
                              <small style={{ opacity: 0.7 }}>
                                {formatDateForDisplay(row.payedAt)}
                              </small>
                            </div>
                          </td>
                          <td className="active-table">
                            <button
                              className={`pay-button ${isPaid && absStatus === "Оплачено в АБС" ? "paid" : ""}`}
                              onClick={() =>
                                row.status === "success"
                                  ? handlePay(row)
                                  : toast.error("Таможня не оплачена")
                              }
                              disabled={isPaying || (isPaid && absStatus === "Оплачено в АБС") || (isPaid && absStatus === "Ожидает проверки")}
                              title={isPaid && absStatus === "Ожидает проверки" ? "Оплата уже отправлена, ожидаем подтверждения АБС" : undefined}
                              style={{
                                padding: "8px 12px",
                                borderRadius: "6px",
                                border: "none",
                                cursor:
                                  row.status !== "success"
                                    ? "not-allowed"
                                    : (isPaid && (absStatus === "Оплачено в АБС" || absStatus === "Ожидает проверки")) || isPaying
                                      ? "not-allowed"
                                      : "pointer",
                                opacity:
                                  isPaying || (isPaid && (absStatus === "Оплачено в АБС" || absStatus === "Ожидает проверки"))
                                    ? 0.6
                                    : 1,
                                color: "var(--text-color)",
                                fontWeight: "500",
                                transition: "all 0.2s",
                                minWidth: "120px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "8px",
                              }}
                            >
                              {isPaying ? (
                                <>Оплачивается...</>
                              ) : (isPaid && absStatus === "Оплачено в АБС") ? (
                                <>
                                  <MdCheckCircle
                                    size={24}
                                    color="green"
                                  />
                                  Оплачено
                                </>
                              ) : (isPaid && absStatus === "Ожидает проверки") ? (
                                <>
                                  <MdPayment size={24} color="orange" />
                                  Ожидает АБС...
                                </>
                              ) : (
                                <>
                                  <MdPayment
                                    size={24}
                                  />
                                  Оплатить
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <EqmsPagination page={showStatement ? statementPage : page} pageSize={pageSize}
              disabled={loading || statementLoading}
              onPageChange={(next) => {
                if (showStatement) setStatementPageNumber(next); else setPageNumber(next);
                if (tableScrollRef.current) tableScrollRef.current.scrollTop = 0;
              }}
              onPageSizeChange={(size) => { setPageSize(size); setPageNumber(1); setStatementPageNumber(1); }} />
            {!showStatement && <p className="eqms-selection-hint">Флажок в заголовке выбирает текущую страницу. Кнопки выбора и выгрузка работают по всем отфильтрованным записям. Выбрано: {totalSelected}.</p>}
          </main>
        </div>
        {alert && (
          <AlertMessage
            message={alert.message}
            type={alert.type}
            onClose={() => setAlert(null)}
          />
        )}
        {showPayConfirmation && (
          <div className="logout-confirmation">
            <div className="confirmation-box">
              <div>
                <h1>Подтверждение оплаты</h1>
                <p>
                  Вы уверены, что хотите оплатить все выбранные таможни?
                  <br />
                  Количество: {paymentsToProcess.length}
                  <br />
                  <br />
                  После подтверждения начнется процесс оплаты. Отменить операцию
                  будет невозможно.
                </p>
              </div>
              <div className="confirmation-buttons">
                <button className="confirm-btn" onClick={handleConfirmPayment}>
                  Да, оплатить
                </button>
                <button className="cancel-btn" onClick={handleCancelPayment}>
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
        {showSinglePayConfirmation && (
          <div className="logout-confirmation">
            <div className="confirmation-box">
              <div>
                <h1>Подтверждение оплаты</h1>
                <p>
                  Вы точно уверены, что хотите оплатить эту таможню?
                  <br />
                  <br />
                  После подтверждения начнется процесс оплаты. Отменить операцию
                  будет невозможно.
                </p>
              </div>
              <div className="confirmation-buttons">
                <button className="confirm-btn" onClick={performSinglePayment}>
                  Да, оплатить
                </button>
                <button
                  className="cancel-btn"
                  onClick={handleCancelSinglePayment}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
