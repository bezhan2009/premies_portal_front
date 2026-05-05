import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Input from "../../components/elements/Input.jsx";
import Select from "../../components/elements/Select.jsx";
import { useFormStore } from "../../hooks/useFormState.js";
import { FcCancel, FcHighPriority, FcOk, FcProcess } from "react-icons/fc";
import AlertMessage from "../../components/general/AlertMessage.jsx";
import Spinner from "../../components/Spinner.jsx";
import "../../styles/checkbox.scss";
import "../../styles/components/TransactionsQR.scss";
import QRStatistics from "./QRStatistics.jsx";

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
  const [isLoans, setIsLoans] = useState(false);

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

  const [sortOrder, setSortOrder] = useState("asc");
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showChart, setShowChart] = useState(true);

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

        const startDate = data?.start_date ?? "2025-09-25";
        const endDate = data?.end_date ?? "2025-10-01";

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

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    const type = isUsOnThem ? "usOnThem" : "themOnUs";
    fetchData(type, nextPage);
  };

  const getBanks = useCallback(async () => {
    try {
      const resp = await fetch(`${backendQR}banks`);
      if (!resp.ok) throw new Error(`Ошибка HTTP ${resp.status}`);
      const json = await resp.json();
      setBanks(json || []);
    } catch (err) {
      console.error("Ошибка загрузки банков:", err);
      setBanks([]);
    }
  }, [backendQR]);

  const getMerchants = useCallback(async () => {
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
  }, [backendMain, token]);

  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!hasMore || loading || isLoans) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, isLoans, handleLoadMore]);

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
    setPage(1);
    if (isUsOnThem) fetchData("usOnThem", 1);
    else if (isThemOnUs) fetchData("themOnUs", 1);
  }, [isUsOnThem, isThemOnUs, fetchData]);

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
    if (data?.start_date && data?.end_date) {
      setPage(1);
      if (isUsOnThem) fetchData("usOnThem", 1);
      else if (isThemOnUs) fetchData("themOnUs", 1);
    }
  }, [data.start_date, data.end_date, fetchData, isUsOnThem, isThemOnUs]);

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
        className="applications-list content-page"
        style={{ flexDirection: "column", gap: "20px", height: "auto" }}
      >
        <main>
          {showChart && (
            <QRStatistics
              startDate={data?.start_date}
              endDate={data?.end_date}
            />
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              padding: "10px",
            }}
          >
            <button className="button" onClick={() => setShowChart(!showChart)}>
              {showChart ? "Скрыть график" : "Показать график"}
            </button>
          </div>
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
                setSelectedRows([]);
                setSelectAll(false);
              }}
            >
              Наш клиент — чужой QR
            </button>

            <button
              className={`button ${isThemOnUs ? "active" : ""}`}
              onClick={() => {
                setIsThemOnUs(true);
                setIsUsOnThem(false);
                setIsLoans(false);
                setSelectedRows([]);
                setSelectAll(false);
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
                setSelectedRows([]);
                setSelectAll(false);
              }}
            >
              Кредиты
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

          <div className="my-applications-sub-header">
            <div>
              от{" "}
              <Input
                type="datetime-local"
                onChange={(e) => setData("start_date", e)}
                value={data?.start_date}
                style={{ width: "200px" }}
                id="start_date"
              />
            </div>
            <div>
              до{" "}
              <Input
                type="datetime-local"
                onChange={(e) => setData("end_date", e)}
                value={data?.end_date}
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
                        {/* <th>partner_trn_id</th> */}
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
                            {/* <td>{row.partner_trn_id || "-"}</td> */}
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
                              <span style={{ color: "orange" }}>
                                В процессе
                              </span>
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
                              <span style={{ color: "red" }}>
                                Высокий приоритет
                              </span>
                            </div>
                          )}
                        </td>

                        <td>
                          {banks.find(
                            (b) =>
                              b.id === row?.sender_bank ||
                              b.bankId === row?.sender,
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

            {!isLoans && (
              <div 
                ref={sentinelRef} 
                style={{ 
                  height: "40px", 
                  display: "flex", 
                  justifyContent: "center", 
                  alignItems: "center",
                  padding: "20px" 
                }}
              >
                {loading && page > 1 && <Spinner size="small" />}
                {!hasMore && tableData.length > 0 && (
                  <span style={{ color: "gray", fontSize: "14px", fontStyle: "italic" }}>
                    Все транзакции загружены
                  </span>
                )}
              </div>
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
