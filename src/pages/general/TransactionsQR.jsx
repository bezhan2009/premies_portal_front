import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Table } from "../../components/table/FlexibleAntTable.jsx";
import Input from "../../components/elements/Input.jsx";
import Select from "../../components/elements/Select.jsx";
import { useFormStore } from "../../hooks/useFormState.js";
import { FcCancel, FcHighPriority, FcOk, FcProcess } from "react-icons/fc";
import AlertMessage from "../../components/general/AlertMessage.jsx";
import Spinner from "../../components/Spinner.jsx";
import QRStatistics from "./QRStatistics.jsx";
import { Button, Drawer, Space } from "antd";
import { EyeOutlined, ReloadOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";

// New imports for loan integration
import RepayModal from "../../components/dashboard/dashboard_frontovik/RepayModal.jsx";
import CreditDetailsModal from "../../components/dashboard/dashboard_frontovik/CreditDetailsModal.jsx";
import GraphModal from "../../components/dashboard/dashboard_frontovik/GraphModal.jsx";
import {
  fetchLoanDetails,
  repayLoanSoap,
} from "../../api/ABS_frotavik/getLoanDetails";
import { getUserCredits } from "../../api/ABS_frotavik/getUserCredits";
import { TYPE_SEARCH_CLIENT } from "../../const/defConst.js";
import { useTableSort } from "../../hooks/useTableSort.js";
import SortIcon from "../../components/general/SortIcon.jsx";
import { normalizeClientData } from "../../components/dashboard/dashboard_frontovik/absSearchUtils.js";
import {
  buildUsOnUsStatementUrl,
  normalizeUsOnUsTransactions,
  US_ON_US_ACCOUNT_PREFIXES,
  usOnUsDateTimestamp,
  usOnUsExcelRows,
} from "./usOnUsTransactions.js";

const DEFAULT_QR_BACKEND_URL = "http://10.64.20.101:8080";
const normalizeBaseUrl = (value, fallback = "") => String(value || fallback).replace(/\/+$/, "");
const currentDateTimeRange = () => {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
  return { start: `${date}T00:00`, end: `${date}T23:59` };
};

export default function TransactionsQR() {
  const { data, setData } = useFormStore();
  const [activeBankLimit, setActiveBankLimit] = useState(null);

  const [banks, setBanks] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const PAGE_SIZE = 50;
  const [showFilters, setShowFilters] = useState(false);

  const [isUsOnThem, setIsUsOnThem] = useState(false);
  const [isThemOnUs, setIsThemOnUs] = useState(true);
  const [isUsOnUs, setIsUsOnUs] = useState(false);
  const [isLoans, setIsLoans] = useState(false);
  const [usOnUsStartDate, setUsOnUsStartDate] = useState(
    () => currentDateTimeRange().start,
  );
  const [usOnUsEndDate, setUsOnUsEndDate] = useState(
    () => currentDateTimeRange().end,
  );
  const [selectedUsOnUsTransaction, setSelectedUsOnUsTransaction] =
    useState(null);
  const fetchRequestId = useRef(0);

  // States for loans functionality
  const [loanSearchValue, setLoanSearchValue] = useState("");
  const [selectTypeSearchLoan, setSelectTypeSearchLoan] = useState(
    TYPE_SEARCH_CLIENT?.[0]?.value || "",
  );
  const [creditsData, setCreditsData] = useState([]);
  const [isLoanSearching, setIsLoanSearching] = useState(false);

  const {
    items: sortedCredits,
    requestSort: requestSortCredits,
    sortConfig: sortCreditsConfig,
  } = useTableSort(creditsData);

  // Modal states
  const [repayModalOpen, setRepayModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [graphModalOpen, setGraphModalOpen] = useState(false);
  const [detailsData, setDetailsData] = useState(null);
  const [graphData, setGraphData] = useState([]);
  const [selectedReferenceId, setSelectedReferenceId] = useState("");
  const [selectedCreditForRepay, setSelectedCreditForRepay] = useState(null);
  const [isRepayLoading, setIsRepayLoading] = useState(false);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [isGraphLoading, setIsGraphLoading] = useState(false);

  const [filters, setFilters] = useState({});
  const [alert, setAlert] = useState(null);

  const sortOrder = "desc";
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [showMerchantTranslator, setShowMerchantTranslator] = useState(false);
  const [merchantSearch, setMerchantSearch] = useState("");

  const backendQR = normalizeBaseUrl(import.meta.env.VITE_BACKEND_QR_URL, DEFAULT_QR_BACKEND_URL);
  const backendMain = normalizeBaseUrl(import.meta.env.VITE_BACKEND_URL);
  const token = localStorage.getItem("access_token");

  const getActiveBankLimit = useCallback(async () => {
    try {
      const resp = await fetch(`${backendQR}/limit`);
      if (!resp.ok) throw new Error("Ошибка загрузки лимита");
      const json = await resp.json();
      setActiveBankLimit(json?.limit ?? 0);
    } catch (e) {
      console.error("Ошибка лимита:", e);
      setActiveBankLimit(null);
    }
  }, [backendQR]);

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
      } else if (isUsOnUs) {
        return `${row.id || 0}-${row.trn_acc_code || 0}`;
      } else {
        return `${row.id || 0}-${row.tx_id || row.partner_trn_id || ""}`;
      }
    },
    [isUsOnThem, isUsOnUs],
  );

  const fetchData = useCallback(
    async (type = "themOnUs", pageNum = 1) => {
      const requestId = ++fetchRequestId.current;
      try {
        setLoading(true);
        const startDate =
          type === "usOnUs"
            ? usOnUsStartDate
            : data?.start_date || currentDateTimeRange().start;
        const endDate =
          type === "usOnUs"
            ? usOnUsEndDate
            : data?.end_date || currentDateTimeRange().end;

        if (type === "usOnUs") {
          const responses = await Promise.all(
            US_ON_US_ACCOUNT_PREFIXES.map(async (accountPrefix) => {
              const resp = await fetch(
                buildUsOnUsStatementUrl(startDate, endDate, accountPrefix),
                { headers: token ? { Authorization: `Bearer ${token}` } : {} },
              );
              if (!resp.ok) {
                throw new Error(
                  `Ошибка выписки ${accountPrefix}: HTTP ${resp.status}`,
                );
              }
              return resp.json();
            }),
          );

          if (requestId !== fetchRequestId.current) return;
          const formattedTransactions = normalizeUsOnUsTransactions(responses);
          setTableData(formattedTransactions);
          setSelectedUsOnUsTransaction(null);
          showAlert(
            `Загружено ${formattedTransactions.length} записей (Us on Us)`,
            "success",
          );
          return;
        }

        const endpoint = type === "usOnThem" ? "transactions" : "incoming_tx";
        const url = `${backendQR}/${endpoint}?start_date=${startDate}&end_date=${endDate}&page=${pageNum}&limit=${PAGE_SIZE}`;

        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Ошибка HTTP ${resp.status}`);
        let json = await resp.json();

        if (requestId !== fetchRequestId.current) return;
        if (Array.isArray(json)) {
            if (pageNum === 1) {
                setTableData(json);
            } else {
                setTableData(prev => [...prev, ...json]);
            }
            showAlert(`Загружено ${json.length} записей`, "success");
        }
      } catch (err) {
        if (requestId !== fetchRequestId.current) return;
        console.error("Ошибка загрузки данных:", err);
        showAlert("Ошибка загрузки данных. Проверьте сервер.", "error");
        if (pageNum === 1) setTableData([]);
      } finally {
        if (requestId === fetchRequestId.current) setLoading(false);
      }
    },
    [
      backendQR,
      data.end_date,
      data.start_date,
      token,
      usOnUsEndDate,
      usOnUsStartDate,
    ],
  );

  const getBanks = useCallback(async () => {
    try {
      // Пользователь указал этот URL как верный для базы банков
      const resp = await fetch("http://10.64.20.101:8080/banks", {
        method: "GET",
      });
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
      // Пользователь указал этот URL как верный для базы мерчантов
      const resp = await fetch("http://10.65.10.20:7575/merchants", {
        method: "GET",
      });
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
      const da = isUsOnUs
        ? usOnUsDateTimestamp(a.doper)
        : new Date(a.created_at || a.creation_datetime || 0).getTime();
      const db = isUsOnUs
        ? usOnUsDateTimestamp(b.doper)
        : new Date(b.created_at || b.creation_datetime || 0).getTime();
      
      if (da !== db) {
        return sortOrder === "asc" ? da - db : db - da;
      }

      const ka = Number(a.id ?? a.tx_id ?? a.trnId ?? 0);
      const kb = Number(b.id ?? b.tx_id ?? b.trnId ?? 0);
      return sortOrder === "asc" ? ka - kb : kb - ka;
    });
    return arr;
  }, [filteredData, isUsOnUs, sortOrder]);

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
    // Если даты ещё не заданы, устанавливаем сегодняшний день (начало и конец)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isUsOnUs && (!data?.start_date || !data?.end_date)) return;
    if (isUsOnThem) fetchData("usOnThem", 1);
    else if (isThemOnUs) fetchData("themOnUs", 1);
    else if (isUsOnUs) fetchData("usOnUs", 1);
  }, [data?.end_date, data?.start_date, fetchData, isThemOnUs, isUsOnThem, isUsOnUs]);

  // Handle loan search
  const handleSearchLoans = async () => {
    if (!loanSearchValue) {
      showAlert("Пожалуйста, введите данные для поиска", "error");
      return;
    }

    try {
      setIsLoanSearching(true);
      const token = localStorage.getItem("access_token");

      const apiUrl = `${import.meta.env.VITE_BACKEND_ABS_SERVICE_URL}/${selectTypeSearchLoan}${loanSearchValue}`;

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          showAlert("Клиент не найден", "error");
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        setCreditsData([]);
        return;
      }

      const rawData = await response.json();

      // Normalize client data to extract clientCode correctly
      let normalizedClient = null;
      if (selectTypeSearchLoan === TYPE_SEARCH_CLIENT[0].value) {
        // Phone search - already in correct format
        normalizedClient = Array.isArray(rawData) ? rawData[0] : rawData;
      } else {
        // INN or Client Code search - need normalization
        const dataToNormalize = Array.isArray(rawData) ? rawData[0] : rawData;
        normalizedClient = normalizeClientData(
          dataToNormalize,
          selectTypeSearchLoan,
        );
      }

      const clientCode = normalizedClient?.client_code;

      if (!clientCode) {
        showAlert("Код клиента не найден", "error");
        setCreditsData([]);
        return;
      }

      const resCredits = await getUserCredits(clientCode);
      setCreditsData(resCredits || []);
      showAlert(`Найдено кредитов: ${resCredits?.length || 0}`, "success");
    } catch (err) {
      console.error("Ошибка при поиске кредитов:", err);
      showAlert("Ошибка при поиске кредитов", "error");
      setCreditsData([]);
    } finally {
      setIsLoanSearching(false);
    }
  };

  const handleOpenRepayModal = (credit) => {
    setSelectedCreditForRepay(credit);
    setRepayModalOpen(true);
  };

  const handleRepaySubmit = async (repayData) => {
    try {
      setIsRepayLoading(true);
      await repayLoanSoap(repayData);
      showAlert("Запрос на погашение кредита успешно отправлен", "success");
      setRepayModalOpen(false);
      if (loanSearchValue) handleSearchLoans();
    } catch (error) {
      console.error("Ошибка при погашении кредита:", error);
      showAlert("Ошибка при погашении кредита", "error");
    } finally {
      setIsRepayLoading(false);
    }
  };

  const handleOpenDetails = async (referenceId) => {
    setDetailsModalOpen(true);
    setIsDetailsLoading(true);
    try {
      const data = await fetchLoanDetails(referenceId);
      if (data) {
        setDetailsData(data);
      } else {
        showAlert("Не удалось получить детали кредита", "error");
      }
    } catch (error) {
      console.error("Ошибка при загрузке деталей кредита:", error);
      showAlert("Ошибка при загрузке деталей кредита", "error");
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const handleOpenGraph = async (referenceId) => {
    setSelectedReferenceId(referenceId);
    setGraphModalOpen(true);
    setIsGraphLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const resp = await fetch(
        `${import.meta.env.VITE_BACKEND_ABS_SERVICE_URL}/credits/graphs?referenceId=${referenceId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!resp.ok) throw new Error("Ошибка загрузки графика");
      const data = await resp.json();
      setGraphData(data);
    } catch (error) {
      console.error("Ошибка при загрузке графика:", error);
      showAlert("Ошибка при загрузке графика", "error");
    } finally {
      setIsGraphLoading(false);
    }
  };

  useEffect(() => {
    if (selectAll) {
      const keys = sortedData.map((r) => getRowKey(r));
      setSelectedRows(keys);
    } else {
      setSelectedRows([]);
    }
  }, [selectAll, sortedData, getRowKey]);

  const [isLoading, setIsLoading] = useState(false);
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

      if (isUsOnUs) {
        const worksheet = XLSX.utils.json_to_sheet(
          usOnUsExcelRows(selectedTransactions),
        );
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Us on Us");
        XLSX.writeFile(
          workbook,
          `Us-on-Us_${usOnUsStartDate.slice(0, 10)}_to_${usOnUsEndDate.slice(0, 10)}.xlsx`,
        );
        showAlert(
          `Файл успешно выгружен (${selectedTransactions.length} записей)`,
          "success",
        );
        setSelectedRows([]);
        setSelectAll(false);
        return;
      }

      setIsLoading(true);
      setLoadingCount(selectedTransactions.length);

      const route = isUsOnThem
        ? "/automation/qr/us-on-them"
        : "/automation/qr/them-on-us";

      // Подготавливаем данные с правильным форматом времени
      const dataToSend = selectedTransactions.map((transaction) => {
        const formattedTransaction = { ...transaction };

        // Форматируем время для backend
        if (isUsOnThem && transaction.created_at) {
          formattedTransaction.created_at = formatTimeForBackend(
            transaction.created_at,
          );
        } else if (isThemOnUs && transaction.creation_datetime) {
          formattedTransaction.creation_datetime = formatTimeForBackend(
            transaction.creation_datetime,
          );
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

      const allSelected =
        selectedRows.length === sortedData.length && sortedData.length > 0;
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

      showAlert(
        `Файл успешно выгружен (${selectedTransactions.length} записей)`,
        "success",
      );
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
        className="transactions-qr-container content-page"
        style={{ flexDirection: "column", gap: "20px", height: "auto", width: "100%", maxWidth: "100%", padding: "10px" }}
      >
        <main>
          {showChart && !isUsOnUs && (
            <QRStatistics
              startDate={data?.start_date}
              endDate={data?.end_date}
            />
          )}
        </main>
        <main className="transactions-main-content">
          <div className="header-with-balance">
            <button
              className={`button ${!showFilters ? "" : "active"}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              Фильтры
            </button>
            <button
              className={`button ${isUsOnThem ? "active" : ""}`}
              onClick={() => {
                setIsUsOnThem(true);
                setIsThemOnUs(false);
                setIsUsOnUs(false);
                setIsLoans(false);
                setSelectedRows([]);
                setSelectAll(false);
                setTableData([]);
                setFilters({});
                setSelectedUsOnUsTransaction(null);
              }}
            >
              Наш клиент — чужой QR
            </button>

            <button
              className={`button ${isUsOnUs ? "active" : ""}`}
              onClick={() => {
                setIsUsOnUs(true);
                setIsThemOnUs(false);
                setIsUsOnThem(false);
                setIsLoans(false);
                setSelectedRows([]);
                setSelectAll(false);
                setTableData([]);
                setFilters({});
                setSelectedUsOnUsTransaction(null);
              }}
            >
              Наш клиент — Наш QR (Us on Us)
            </button>

            <button
              className={`button ${isThemOnUs ? "active" : ""}`}
              onClick={() => {
                setIsThemOnUs(true);
                setIsUsOnThem(false);
                setIsUsOnUs(false);
                setIsLoans(false);
                setSelectedRows([]);
                setSelectAll(false);
                setFilters({});
                setSelectedUsOnUsTransaction(null);
              }}
            >
              Наш QR — чужой клиент
            </button>

            <button
              className={`button ${isLoans ? "active" : ""}`}
              onClick={() => {
                setIsLoans(true);
                setIsUsOnThem(false);
                setIsThemOnUs(false);
                setIsUsOnUs(false);
                setSelectedRows([]);
                setSelectAll(false);
                setFilters({});
                setSelectedUsOnUsTransaction(null);
              }}
            >
              Кредиты
            </button>

            <button
              className={`button ${showMerchantTranslator ? "active" : ""}`}
              onClick={() => setShowMerchantTranslator(!showMerchantTranslator)}
            >
              Поиск мерчантов
            </button>

            <button
              className="button button-success"
              onClick={handleExport}
              disabled={selectedRows.length === 0 || isLoading}
            >
              {isLoading ? `Выгрузка... (${loadingCount})` : "Выгрузка QR"}
            </button>

            <button
              className={`button ${selectAll ? "active" : ""}`}
              onClick={toggleSelectAll}
            >
              {selectAll ? "Снять выделение" : "Выбрать все"}
            </button>
            {!isUsOnUs && (
              <button className="button" onClick={() => setShowChart(!showChart)}>
                {showChart ? "Скрыть график" : "Показать график"}
              </button>
            )}

            <div className="activebank-balance">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  width: "100%",
                  gap: "10px"
                }}
              >
                <span className="label">Баланс Активбанк:</span>
                <span className="value">
                  {activeBankLimit !== null
                    ? `${activeBankLimit.toLocaleString("ru-RU")} с.`
                    : "—"}
                </span>
              </div>
              {selectedRows.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    width: "100%",
                    color: "var(--primary-color)",
                    marginTop: "4px"
                  }}
                >
                  <span className="label">Выбрано:</span>
                  <span className="value">
                    {selectedSum.toLocaleString("ru-RU")} с.
                  </span>
                </div>
              )}
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
              {isUsOnUs && (
                <>
                  <input
                    placeholder="Отправитель"
                    value={filters.txt_pay || ""}
                    onChange={(e) =>
                      setFilters((previous) => ({
                        ...previous,
                        txt_pay: e.target.value,
                      }))
                    }
                  />
                  <input
                    placeholder="Получатель"
                    value={filters.txt_ben || ""}
                    onChange={(e) =>
                      setFilters((previous) => ({
                        ...previous,
                        txt_ben: e.target.value,
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
              {isLoans && (
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    width: "100%",
                    alignItems: "center",
                  }}
                >
                  <div style={{ width: "250px" }}>
                    <Select
                      value={selectTypeSearchLoan}
                      onChange={(val) => setSelectTypeSearchLoan(val)}
                      options={(TYPE_SEARCH_CLIENT || [])
                        .filter((t) => t.apiType === "ABS")
                        .map((t) => ({
                          value: t.value,
                          label: t.label,
                        }))}
                    />
                  </div>
                  <input
                    placeholder="Введите данные для поиска"
                    value={loanSearchValue}
                    onChange={(e) => setLoanSearchValue(e.target.value)}
                    style={{ flex: 1 }}
                    onKeyPress={(e) => e.key === "Enter" && handleSearchLoans()}
                  />
                  <button
                    className="button"
                    onClick={handleSearchLoans}
                    disabled={isLoanSearching}
                    style={{ height: "45px", padding: "0 20px" }}
                  >
                    {isLoanSearching ? "Поиск..." : "Найти"}
                  </button>
                </div>
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

              <input
                placeholder="Сумма"
                onChange={(e) =>
                  setFilters((p) => ({ ...p, amount: e.target.value }))
                }
              />
            </div>
          )}

          {showMerchantTranslator && (
            <div className="filters animate-slideIn" style={{ flexDirection: "column", alignItems: "flex-start" }}>
               <h3 style={{ marginBottom: "10px" }}>Поиск мерчант кодов</h3>
               <div style={{ display: "flex", gap: "10px", width: "100%" }}>
                  <input 
                    placeholder="Введите код или название мерчанта..." 
                    value={merchantSearch}
                    onChange={(e) => setMerchantSearch(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button className="button" onClick={() => setMerchantSearch("")}>Очистить</button>
               </div>
               {merchantSearch && (
                 <div style={{ marginTop: "10px", width: "100%", maxHeight: "200px", overflowY: "auto", background: "white", borderRadius: "8px", border: "1px solid #ddd" }}>
                   <table className="limits-table" style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th>Код</th>
                          <th>Название</th>
                        </tr>
                      </thead>
                      <tbody>
                        {merchants
                          .filter(m => 
                            String(m.code).includes(merchantSearch) || 
                            m.title.toLowerCase().includes(merchantSearch.toLowerCase())
                          )
                          .map(m => (
                            <tr key={m.ID}>
                              <td>{m.code}</td>
                              <td>{m.title}</td>
                            </tr>
                          ))
                        }
                      </tbody>
                   </table>
                 </div>
               )}
            </div>
          )}

          <div className="my-applications-sub-header">
            <div>
              от{" "}
              <Input
                type="datetime-local"
                onChange={(value) =>
                  isUsOnUs
                    ? setUsOnUsStartDate(value)
                    : setData("start_date", value)
                }
                value={isUsOnUs ? usOnUsStartDate : data?.start_date}
                style={{ width: "200px" }}
                id="start_date"
              />
            </div>
            <div>
              до{" "}
              <Input
                type="datetime-local"
                onChange={(value) =>
                  isUsOnUs
                    ? setUsOnUsEndDate(value)
                    : setData("end_date", value)
                }
                value={isUsOnUs ? usOnUsEndDate : data?.end_date}
                style={{ width: "200px" }}
                id="end_date"
              />
            </div>
            <div className="total-sum-badge">
              <span className="total-sum-label">Сумма всех операций:</span>
              <span className="total-sum-value">
                {totalSum.toLocaleString("ru-RU")} с.
              </span>
            </div>
          </div>

          <div
            className="my-applications-content"
            style={{ position: "relative" }}
          >
            {loading || isLoanSearching ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <Spinner center label="Загружаем информацию" />
                Загрузка...
              </div>
            ) : isLoans ? (
              sortedCredits.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "2rem",
                    color: "gray",
                  }}
                >
                  Кредиты не найдены. Воспользуйтесь поиском в фильтрах.
                </div>
              ) : (
                <div
                  className="limits-table__wrapper"
                  style={{ overflowX: "auto" }}
                >
                  <table className="limits-table">
                    <thead className="limits-table__head">
                      <tr>
                        <th
                          onClick={() => requestSortCredits("contractNumber")}
                          className="sortable-header"
                        >
                          Номер договора{" "}
                          <SortIcon
                            sortConfig={sortCreditsConfig}
                            sortKey="contractNumber"
                          />
                        </th>
                        <th
                          onClick={() => requestSortCredits("referenceId")}
                          className="sortable-header"
                        >
                          Идентификатор ссылки{" "}
                          <SortIcon
                            sortConfig={sortCreditsConfig}
                            sortKey="referenceId"
                          />
                        </th>
                        <th
                          onClick={() => requestSortCredits("statusName")}
                          className="sortable-header"
                        >
                          Статус{" "}
                          <SortIcon
                            sortConfig={sortCreditsConfig}
                            sortKey="statusName"
                          />
                        </th>
                        <th
                          onClick={() => requestSortCredits("amount")}
                          className="sortable-header"
                        >
                          Сумма{" "}
                          <SortIcon
                            sortConfig={sortCreditsConfig}
                            sortKey="amount"
                          />
                        </th>
                        <th
                          onClick={() => requestSortCredits("documentDate")}
                          className="sortable-header"
                        >
                          Дата документа{" "}
                          <SortIcon
                            sortConfig={sortCreditsConfig}
                            sortKey="documentDate"
                          />
                        </th>
                        <th
                          onClick={() => requestSortCredits("clientCode")}
                          className="sortable-header"
                        >
                          КлиентКод{" "}
                          <SortIcon
                            sortConfig={sortCreditsConfig}
                            sortKey="clientCode"
                          />
                        </th>
                        <th
                          onClick={() => requestSortCredits("productCode")}
                          className="sortable-header"
                        >
                          Код продукта{" "}
                          <SortIcon
                            sortConfig={sortCreditsConfig}
                            sortKey="productCode"
                          />
                        </th>
                        <th
                          onClick={() => requestSortCredits("productName")}
                          className="sortable-header"
                        >
                          Название продукта{" "}
                          <SortIcon
                            sortConfig={sortCreditsConfig}
                            sortKey="productName"
                          />
                        </th>
                        <th
                          onClick={() => requestSortCredits("department")}
                          className="sortable-header"
                        >
                          Отдел{" "}
                          <SortIcon
                            sortConfig={sortCreditsConfig}
                            sortKey="department"
                          />
                        </th>
                        <th className="limits-table__th">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="limits-table__body">
                      {sortedCredits.map((credit, idx) => (
                        <tr key={idx} className="limits-table__row">
                          <td className="limits-table__td">
                            {credit.contractNumber}
                          </td>
                          <td className="limits-table__td">
                            {credit.referenceId}
                          </td>
                          <td className="limits-table__td">
                            {credit.statusName}
                          </td>
                          <td className="limits-table__td">
                            {credit.amount} {credit.currency}
                          </td>
                          <td className="limits-table__td">
                            {credit.documentDate}
                          </td>
                          <td className="limits-table__td">
                            {credit.clientCode}
                          </td>
                          <td className="limits-table__td">
                            {credit.productCode}
                          </td>
                          <td className="limits-table__td">
                            {credit.productName}
                          </td>
                          <td className="limits-table__td">
                            {credit.department || "-"}
                          </td>
                          <td
                            className="limits-table__td"
                            style={{ display: "flex", gap: "8px" }}
                          >
                             <button
                               className="button"
                               style={{ padding: "5px 10px", fontSize: "12px" }}
                               onClick={() =>
                                 handleOpenGraph(credit.referenceId)
                               }
                               disabled={!credit.referenceId}
                             >
                               График
                             </button>
                             <button
                               className="button"
                               style={{
                                 background: "#2980b9",
                                 color: "white",
                                 padding: "5px 10px",
                                 fontSize: "12px",
                               }}
                               onClick={() =>
                                 handleOpenDetails(credit.referenceId)
                               }
                               disabled={!credit.referenceId}
                             >
                               Детали
                             </button>
                             <button
                               className="button"
                               style={{
                                 background: "#27ae60",
                                 color: "white",
                                 padding: "5px 10px",
                                 fontSize: "12px",
                               }}
                               onClick={() => handleOpenRepayModal(credit)}
                             >
                               Погасить
                             </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              <>
              {!isLoans && (
                <div className="table-header-actions" style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                   <div>
                     <Button
                       icon={<ReloadOutlined />}
                       onClick={() => fetchData(isUsOnThem ? "usOnThem" : isUsOnUs ? "usOnUs" : "themOnUs", 1)}
                       loading={loading}
                       className="mr-2"
                     >
                       Обновить
                     </Button>
                   </div>
                   <Space>
                     <Button className="export-excel-btn" onClick={handleExport}>
                       Экспорт в Excel
                     </Button>
                     <span style={{ marginLeft: "10px", fontSize: "14px", color: "gray" }}>
                       (Всего: {sortedData.length})
                     </span>
                   </Space>
                </div>
              )}
              {sortedData.length === 0 ? (
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
              <Table
                tableId="qr-transactions-table"
                dataSource={sortedData}
                rowKey={getRowKey}
                pagination={{ pageSize: 20, showSizeChanger: true }}
                loading={loading}
                scroll={{ x: "max-content" }}
              >
                <Table.Column
                  title={
                    <input
                      type="checkbox"
                      className="custom-checkbox"
                      checked={selectAll}
                      onChange={toggleSelectAll}
                    />
                  }
                  key="selection"
                  width={60}
                  render={(_, row) => {
                    const key = getRowKey(row);
                    return (
                      <input
                        type="checkbox"
                        className="custom-checkbox"
                        checked={selectedRows.includes(key)}
                        onChange={(e) => handleCheckboxToggle(key, e.target.checked)}
                      />
                    );
                  }}
                />
                {!isUsOnUs && (
                  <Table.Column
                    title="ID"
                    key="id"
                    width={100}
                    render={(_, row) => row.id || "-"}
                  />
                )}

                {isUsOnUs && (
                  <Table.Column
                    title="Дата операции"
                    dataIndex="doper"
                    key="doper"
                    render={(value) => value || "-"}
                    sortValue={(row) => usOnUsDateTimestamp(row.doper)}
                  />
                )}
                {isUsOnUs && (
                  <Table.Column
                    title="Сумма"
                    key="amount_us"
                    render={(_, row) => (
                      <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                        {Number(row.sdok || 0).toLocaleString("ru-RU", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        {row.val_code || "TJS"}
                      </span>
                    )}
                    sortValue={(row) => Number(row.sdok || 0)}
                  />
                )}
                {isUsOnUs && (
                  <Table.Column
                    title="Отправитель"
                    dataIndex="txt_pay"
                    key="txt_pay"
                    render={(value) => value || "-"}
                  />
                )}
                {isUsOnUs && (
                  <Table.Column
                    title="Получатель"
                    dataIndex="txt_ben"
                    key="txt_ben"
                    render={(value) => value || "-"}
                  />
                )}
                {isUsOnUs && (
                  <Table.Column
                    title="Статус"
                    key="status_us"
                    render={() => (
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <FcOk style={{ fontSize: 22 }} />
                        <span style={{ color: "green" }}>Успешно</span>
                      </div>
                    )}
                  />
                )}
                {isUsOnUs && (
                  <Table.Column
                    title=""
                    key="details_us"
                    width={130}
                    render={(_, row) => (
                      <Button
                        icon={<EyeOutlined />}
                        onClick={() => setSelectedUsOnUsTransaction(row)}
                      >
                        Подробнее
                      </Button>
                    )}
                  />
                )}
                {isUsOnThem && (
                  <Table.Column
                    title="ФИО"
                    dataIndex="sender_name"
                    key="sender_name"
                    render={(val) => val || "-"}
                  />
                )}
                {isUsOnThem && (
                  <Table.Column
                    title="Телефон"
                    dataIndex="sender_phone"
                    key="sender_phone"
                    render={(val) => val || "-"}
                  />
                )}

                {isThemOnUs && (
                  <Table.Column
                    title="Мерчант"
                    key="merchant"
                    render={(_, row) => {
                      const code = row.merchant_code || row.merchant_id;
                      if (!code) return "—";
                      return merchants.find((m) => String(m.code) === String(code))?.title ?? code;
                    }}
                  />
                )}
                {isThemOnUs && (
                  <Table.Column title="TX ID" dataIndex="tx_id" key="tx_id" render={(val) => val || "-"} />
                )}
                {isThemOnUs && (
                  <Table.Column title="Partner TRN ID" dataIndex="partner_trn_id" key="partner_trn_id" render={(val) => val || "-"} />
                )}

                {!isUsOnUs && (
                  <Table.Column title="Описание" dataIndex="description" key="description" render={(val) => val || "-"} />
                )}
                {(!isUsOnUs && isThemOnUs) && (
                  <Table.Column title="Код терминала" dataIndex="terminal_code" key="terminal_code" render={(val) => val || "-"} />
                )}
                {(!isThemOnUs && !isUsOnUs) && (
                  <Table.Column title="Номер в АРМ" dataIndex="trnId" key="trnId" render={(val) => val || "-"} />
                )}
                {(!isThemOnUs && !isUsOnUs) && (
                  <Table.Column title="qrId" dataIndex="qrId" key="qrId" render={(val) => val || "-"} />
                )}
                {!isUsOnUs && (
                  <Table.Column
                    title="Статус"
                    dataIndex="status"
                    key="status"
                    render={(status) => {
                      if (status === "success") {
                        return (
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <FcOk style={{ fontSize: 22 }} />
                            <span style={{ color: "green" }}>Успешно</span>
                          </div>
                        );
                      } else if (status === "process") {
                        return (
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <FcProcess style={{ fontSize: 22 }} />
                            <span style={{ color: "orange" }}>В процессе</span>
                          </div>
                        );
                      } else if (status === "cancel") {
                        return (
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <FcCancel style={{ fontSize: 22 }} />
                            <span style={{ color: "red" }}>Отменено</span>
                          </div>
                        );
                      }
                      return (
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <FcHighPriority style={{ fontSize: 22 }} />
                          <span style={{ color: "red" }}>Ошибка</span>
                        </div>
                      );
                    }}
                />
                )}
                {!isUsOnUs && (
                  <Table.Column
                    title="Банк отправителя"
                    key="bank_sender"
                    render={(_, row) => {
                      const bankId = isUsOnThem ? row.sender_bank : row.sender;
                      const bank = banks.find((b) => b.bankId === bankId || b.id === bankId);
                      return bank ? `${bank.bankName} (${bankId})` : `ID: ${bankId}`;
                    }}
                  />
                )}
                {!isUsOnUs && (
                  <Table.Column
                    title="Банк получателя"
                    key="bank_receiver"
                    render={(_, row) => {
                      const bankId = row.receiver;
                      const bank = banks.find((b) => b.bankId === bankId || b.id === bankId);
                      return bank ? `${bank.bankName} (${bankId})` : `ID: ${bankId}`;
                    }}
                  />
                )}
                {!isUsOnUs && (
                  <Table.Column
                    title="Сумма"
                    key="amount"
                    render={(_, row) => (
                      <span style={{ fontWeight: "600" }}>
                        {Number(row.amount).toLocaleString("ru-RU")} с.
                      </span>
                    )}
                    sortValue={(row) => Number(row.amount)}
                  />
                )}
                {!isUsOnUs && (
                  <Table.Column
                    title="Дата создания"
                    key="date"
                    render={(_, row) => {
                      const date = isUsOnThem
                        ? row.created_at
                        : row.creation_datetime;
                      return formatDateForDisplay(date);
                    }}
                    sortValue={(row) => {
                      const date = isUsOnThem
                        ? row.created_at
                        : row.creation_datetime;
                      return new Date(date).getTime();
                    }}
                  />
                )}
              </Table>
              )}
              </>
            )}
          </div>
        </main>
      </div>

      <Drawer
        title="Детали операции Us on Us"
        placement="right"
        width={520}
        open={Boolean(selectedUsOnUsTransaction)}
        onClose={() => setSelectedUsOnUsTransaction(null)}
      >
        {selectedUsOnUsTransaction && (
          <div className="us-on-us-details">
            <div className="us-on-us-details__status">
              <FcOk style={{ fontSize: 24 }} />
              <div>
                <span>Статус операции</span>
                <strong>Успешно</strong>
              </div>
            </div>
            <dl className="us-on-us-details__grid">
              <div>
                <dt>Дата операции</dt>
                <dd>{selectedUsOnUsTransaction.doper || "—"}</dd>
              </div>
              <div>
                <dt>Сумма</dt>
                <dd>
                  {Number(selectedUsOnUsTransaction.sdok || 0).toLocaleString(
                    "ru-RU",
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                  )}{" "}
                  {selectedUsOnUsTransaction.val_code || "TJS"}
                </dd>
              </div>
              <div className="us-on-us-details__wide">
                <dt>Отправитель</dt>
                <dd>{selectedUsOnUsTransaction.txt_pay || "—"}</dd>
              </div>
              <div className="us-on-us-details__wide">
                <dt>Получатель</dt>
                <dd>{selectedUsOnUsTransaction.txt_ben || "—"}</dd>
              </div>
              <div className="us-on-us-details__wide">
                <dt>Номер счета получателя</dt>
                <dd className="us-on-us-details__account">
                  {selectedUsOnUsTransaction.trn_acc_code || "—"}
                </dd>
              </div>
              <div>
                <dt>ID операции</dt>
                <dd>{selectedUsOnUsTransaction.id || "—"}</dd>
              </div>
              <div>
                <dt>Номер документа</dt>
                <dd>{selectedUsOnUsTransaction.ord_code || "—"}</dd>
              </div>
              <div className="us-on-us-details__wide">
                <dt>Назначение платежа</dt>
                <dd>{selectedUsOnUsTransaction.dscr || "—"}</dd>
              </div>
            </dl>
          </div>
        )}
      </Drawer>

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

      {/* Loan Modals */}
      <RepayModal
        isOpen={repayModalOpen}
        onClose={() => setRepayModalOpen(false)}
        onSubmit={handleRepaySubmit}
        isLoading={isRepayLoading}
        creditInfo={selectedCreditForRepay}
      />

      <CreditDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        data={detailsData}
        isLoading={isDetailsLoading}
      />

      <GraphModal
        isOpen={graphModalOpen}
        onClose={() => {
          setGraphModalOpen(false);
          setGraphData([]);
          setSelectedReferenceId("");
        }}
        graphData={graphData}
        isLoading={isGraphLoading}
        referenceId={selectedReferenceId}
      />
    </>
  );
}
