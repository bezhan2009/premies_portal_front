import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AlertMessage from "../../../general/AlertMessage.jsx";
import { fetchTransactionsSearch } from "../../../../api/processing/transactions.js";
import { getCurrencyCode } from "../../../../api/utils/getCurrencyCode.js";
import { dataTrans } from "../../../../const/defConst.js";
import { useExcelExport } from "../../../../hooks/useExcelExport.js";
import { useTableSort } from "../../../../hooks/useTableSort.js";
import SortIcon from "../../../general/SortIcon.jsx";
import { canAccessTransactions } from "../../../../api/roleHelper.js";
import TransactionsChart from "../../../graph/graph.jsx";
import { fetchConversionRates } from "../../../../api/conversion/conversion.js";
import CustomDateInput from "../../../elements/CustomDateInput.jsx";
import { Table } from "../../../table/FlexibleAntTable.jsx";
import { getTransactions, getTerminalNames } from "../../../../api/transactions/api.js";
import { Select } from "antd";

const getTransactionTypeValue = (transactionType) => {
  if (!dataTrans || !Array.isArray(dataTrans)) return undefined;
  const found = dataTrans.find((e) => e.label === transactionType);
  return found?.value;
};

const getExchangeRate = (conCurrency, exchangeRates) => {
  if (conCurrency === 840) {
    return exchangeRates.USD;
  }

  if (conCurrency === 978) {
    return exchangeRates.EUR;
  }

  return 1;
};

const getNationalAmount = (transaction, exchangeRates) =>
  Math.abs(
    Math.round((Number(transaction?.conamt || 0) || 0) * getExchangeRate(transaction?.conCurrency, exchangeRates)),
  );

// ── TagInput ──────────────────────────────────────────────────────────────────
const TagInput = ({ tags, onChange, disabled, placeholder }) => {
  const [inputVal, setInputVal] = useState("");

  const addTags = (raw) => {
    const newTags = raw
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!newTags.length) return;
    onChange([...new Set([...tags, ...newTags])]);
    setInputVal("");
  };

  const removeTag = (idx) => onChange(tags.filter((_, i) => i !== idx));

  const handleKeyDown = (e) => {
    if (["Enter", ","].includes(e.key)) {
      e.preventDefault();
      addTags(inputVal);
    } else if (e.key === "Backspace" && !inputVal && tags.length)
      removeTag(tags.length - 1);
  };

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "4px",
        padding: "4px 8px",
        border: "1px solid var(--border-color)",
        borderRadius: "6px",
        minHeight: "36px",
        alignItems: "center",
        background: disabled ? "var(--bg-secondary)" : "var(--bg-color)",
        cursor: disabled ? "not-allowed" : "text",
        transition: "all 0.2s ease",
      }}
    >
      {tags.map((tag, i) => (
        <span
          key={i}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "3px",
            background: "rgba(235, 37, 37, 0.15)",
            color: "#eb2525",
            border: "1px solid rgba(235, 37, 37, 0.2)",
            borderRadius: "4px",
            padding: "2px 7px",
            fontSize: "12px",
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          {tag}
          {!disabled && (
            <button
              type="button"
              onClick={() => removeTag(i)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#eb2525",
                fontSize: "14px",
                lineHeight: 1,
                padding: 0,
                marginLeft: "2px",
              }}
            >
              ×
            </button>
          )}
        </span>
      ))}
      {!disabled && (
        <input
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => inputVal.trim() && addTags(inputVal)}
          placeholder={tags.length ? "" : placeholder}
          style={{
            border: "none",
            outline: "none",
            fontSize: "13px",
            flex: 1,
            minWidth: "100px",
            background: "transparent",
            color: "var(--text-color)",
            padding: "2px 0",
          }}
        />
      )}
    </div>
  );
};

export default function DashboardOperatorTransactionSearch() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { exportToExcel } = useExcelExport();

  const hasAccess = canAccessTransactions();
  const [isLimitedAccess, setIsLimitedAccess] = useState(false);
  const [allowedCardId, setAllowedCardId] = useState(null);

  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState({
    show: false,
    message: "",
    type: "success",
  });

  // Фильтры
  const [cardNumber, setCardNumber] = useState("");
  const [cardId, setCardId] = useState("");
  const [responseCode, setResponseCode] = useState("");
  const [reqamt, setReqamt] = useState("");
  const [amount, setAmount] = useState("");
  const [conamt, setConamt] = useState("");
  const [acctbal, setAcctbal] = useState("");
  const [netbal, setNetbal] = useState("");
  const [utrnno, setUtrnno] = useState("");
  const [currency, setCurrency] = useState("");
  const [conCurrency, setConCurrency] = useState("");
  const [reversal, setReversal] = useState("");
  const [payId, setPayId] = useState("");
  // transactionTypes — массив строк
  const [transactionTypes, setTransactionTypes] = useState([]);
  const [atmId, setAtmId] = useState("");
  const [mcc, setMcc] = useState("");
  const [account, setAccount] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");

  const [exchangeRates, setExchangeRates] = useState({ USD: 1, EUR: 1 });

  // Исключения
  const [excludeTransactionTypes, setExcludeTransactionTypes] = useState("");
  const [excludeAtmIds, setExcludeAtmIds] = useState("");
  const [excludeMcc, setExcludeMcc] = useState("");
  const [excludeAccounts, setExcludeAccounts] = useState("");

  const [displayCardNumber, setDisplayCardNumber] = useState("");
  const [terminalOptions, setTerminalOptions] = useState([]);
  const [transactionOptions, setTransactionOptions] = useState([]);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const terminalsData = await getTerminalNames();
        if (terminalsData && Array.isArray(terminalsData)) {
          setTerminalOptions(terminalsData.map(t => ({ label: `${t.atmId} - ${t.atmDescription}`, value: t.atmId })));
        }
      } catch (e) {
        console.error("Error fetching terminal options", e);
      }
      try {
        const txData = await getTransactions();
        if (txData && Array.isArray(txData)) {
          setTransactionOptions(txData.map(t => ({ label: `${t.type} - ${t.name}`, value: t.type.toString() })));
        }
      } catch (e) {
        console.error("Error fetching transaction options", e);
      }
    };
    fetchOptions();
  }, []);


  const {
    items: sortedTransactions,
    requestSort,
    sortConfig,
  } = useTableSort(transactions);

  const showAlert = useCallback((message, type = "success") => {
    setAlert({ show: true, message, type });
  }, []);

  const hideAlert = useCallback(() => {
    setAlert({ show: false, message: "", type: "success" });
  }, []);

  const formatCardNumber = (value) =>
    value
      .replace(/\s/g, "")
      .replace(/(\d{4})/g, "$1 ")
      .trim();

  const handleCardNumberChange = (e) => {
    const raw = e.target.value;
    setDisplayCardNumber(raw);
    setCardNumber(raw.replace(/\s/g, ""));
  };

  const formatAmount = (amount) => {
    if (amount === null || amount === undefined || amount === "") return "N/A";
    const absAmount = Math.abs(Number(amount));
    const amountStr = absAmount.toString();
    let formattedAmount;
    if (amountStr.length <= 2) {
      formattedAmount = `0,${amountStr.padStart(2, "0")}`;
    } else {
      const integerPart = amountStr.slice(0, -2);
      const decimalPart = amountStr.slice(-2);
      formattedAmount = `${integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ")},${decimalPart}`;
    }
    return formattedAmount;
  };

  const getStatusBadge = (responseCode, reversal, message) => {
    if (reversal)
      return (
        <span className="status-badge status-badge--reversed">Возврат</span>
      );
    switch (responseCode) {
      case "-1":
        return (
          <span className="status-badge status-badge--success">{message}</span>
        );
      case "01":
        return (
          <span className="status-badge status-badge--warning">{message}</span>
        );
      case "02":
        return (
          <span className="status-badge status-badge--error">{message}</span>
        );
      default:
        return (
          <span className="status-badge status-badge--warning">{message}</span>
        );
    }
  };

  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    setFromDate(thirtyDaysAgo.toISOString().split("T")[0]);
    setToDate(today.toISOString().split("T")[0]);

    const loadRates = async () => {
      try {
        const rates = await fetchConversionRates();
        const usdRate =
          rates.find(
            (r) =>
              r.currencyFrom === "USD" &&
              r.currencyTo === "TJS" &&
              r.type === "from",
          )?.amountTo || 1;
        const eurRate =
          rates.find(
            (r) =>
              r.currencyFrom === "EUR" &&
              r.currencyTo === "TJS" &&
              r.type === "from",
          )?.amountTo || 1;
        setExchangeRates({ USD: usdRate, EUR: eurRate });
      } catch (err) {
        console.error("Ошибка при загрузке курсов:", err);
      }
    };
    loadRates();
  }, []);

  useEffect(() => {
    if (!hasAccess) {
      const storedCardId = sessionStorage.getItem("allowedCardId");
      if (storedCardId && id && storedCardId === id) {
        setIsLimitedAccess(true);
        setAllowedCardId(storedCardId);
        setCardId(storedCardId);
      } else if (storedCardId && !id) {
        setIsLimitedAccess(true);
        setAllowedCardId(storedCardId);
        navigate("/processing/transactions/" + storedCardId, { replace: true });
      } else {
        setIsLimitedAccess(true);
        setAllowedCardId(null);
      }
    }
  }, [hasAccess, id, navigate]);

  useEffect(() => {
    if (isLimitedAccess) {
      showAlert("Вы можете просматривать историю только этой карты", "info");
    }
  }, [isLimitedAccess, showAlert]);

  const validateSearch = useCallback(() => {
    if (isLimitedAccess && allowedCardId && cardId !== allowedCardId) {
      showAlert("У вас есть доступ только к истории конкретной карты", "error");
      return false;
    }
    if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
      showAlert('Дата "С" не может быть больше даты "По"', "error");
      return false;
    }
    if (fromTime && toTime) {
      const from = new Date(`1970-01-01T${fromTime}:00`);
      const to = new Date(`1970-01-01T${toTime}:00`);
      if (from > to) {
        showAlert('Время "С" не может быть больше времени "По"', "error");
        return false;
      }
    }
    return true;
  }, [
    isLimitedAccess,
    allowedCardId,
    cardId,
    fromDate,
    toDate,
    fromTime,
    toTime,
    showAlert,
  ]);

  const handleSearch = useCallback(async () => {
    if (!validateSearch()) return;

    setIsLoading(true);
    try {
      const params = {};
      if (cardNumber) params.cardNumber = cardNumber;
      if (cardId) params.cardId = cardId;
      if (responseCode) params.responseCode = responseCode;
      if (reqamt) params.reqamt = parseFloat(reqamt);
      if (amount) params.amount = parseFloat(amount);
      if (conamt) params.conamt = parseFloat(conamt);
      if (acctbal) params.acctbal = parseFloat(acctbal);
      if (netbal) params.netbal = parseFloat(netbal);
      if (utrnno) params.utrnno = parseInt(utrnno, 10);
      if (currency) params.currency = parseInt(currency, 10);
      if (conCurrency) params.conCurrency = parseInt(conCurrency, 10);
      if (reversal) params.reversal = parseInt(reversal, 10);
      if (payId) params.payId = payId;
      // transactionTypes — передаём как массив, каждый элемент отдельным ключом
      if (transactionTypes.length > 0)
        params.transactionTypes = transactionTypes;
      if (atmId) params.atmId = atmId;
      if (mcc) params.mcc = parseInt(mcc, 10);
      if (account) params.account = account;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      if (fromTime) params.fromTime = fromTime;
      if (toTime) params.toTime = toTime;
      if (excludeTransactionTypes)
        params.excludeTransactionTypes = excludeTransactionTypes;
      if (excludeAtmIds) params.excludeAtmIds = excludeAtmIds;
      if (excludeMcc) params.excludeMcc = excludeMcc;
      if (excludeAccounts) params.excludeAccounts = excludeAccounts;

      const transactionsData = await fetchTransactionsSearch(params);

      if (transactionsData && Array.isArray(transactionsData)) {
        setTransactions(transactionsData);
        showAlert(`Загружено ${transactionsData.length} транзакций`, "success");
      } else {
        setTransactions([]);
        showAlert("Транзакции не найдены", "warning");
      }
    } catch (error) {
      showAlert("Ошибка при загрузке данных: " + error.message, "error");
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    cardNumber,
    cardId,
    responseCode,
    reqamt,
    amount,
    conamt,
    acctbal,
    netbal,
    utrnno,
    currency,
    conCurrency,
    reversal,
    payId,
    transactionTypes,
    atmId,
    mcc,
    account,
    fromDate,
    toDate,
    fromTime,
    toTime,
    excludeTransactionTypes,
    excludeAtmIds,
    excludeMcc,
    excludeAccounts,
    validateSearch,
    showAlert,
  ]);

  useEffect(() => {
    if (id?.length) {
      setCardId(id);
      handleSearch();
    }
  }, [id, handleSearch]);

  const clearFilters = () => {
    setCardNumber("");
    setDisplayCardNumber("");
    if (!isLimitedAccess) setCardId("");
    setResponseCode("");
    setReqamt("");
    setAmount("");
    setConamt("");
    setAcctbal("");
    setNetbal("");
    setUtrnno("");
    setCurrency("");
    setConCurrency("");
    setReversal("");
    setPayId("");
    setTransactionTypes([]);
    setAtmId("");
    setMcc("");
    setAccount("");
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    setFromDate(thirtyDaysAgo.toISOString().split("T")[0]);
    setToDate(today.toISOString().split("T")[0]);
    setFromTime("");
    setToTime("");
    setExcludeTransactionTypes("");
    setExcludeAtmIds("");
    setExcludeMcc("");
    setExcludeAccounts("");
    setTransactions([]);
  };

  const transactionTableData = React.useMemo(
    () =>
      transactions.map((transaction) => ({
        ...transaction,
        nationalAmount: getNationalAmount(transaction, exchangeRates),
      })),
    [transactions, exchangeRates],
  );

  const { totalAmount, totalNationalAmount, totalCountByResponse } = React.useMemo(() => {
    let total = 0;
    let totalTJS = 0;
    const counts = { success: 0, error: 0, warning: 0, reversal: 0 };
    transactions.forEach((tx) => {
      const val = parseFloat(tx.conamt || 0);
      const nationalValue = getNationalAmount(tx, exchangeRates);
      const type =
        getTransactionTypeValue(tx.transactionType) || tx.transactionTypeNumber;
      if (type === 2) {
        total -= val;
        totalTJS -= nationalValue;
      } else {
        total += val;
        totalTJS += nationalValue;
      }
      if (tx.reversal) {
        counts.reversal++;
      } else {
        switch (tx.responseCode) {
          case "-1":
            counts.success++;
            break;
          case "02":
            counts.error++;
            break;
          default:
            counts.warning++;
            break;
        }
      }
    });
    return {
      totalAmount: total,
      totalNationalAmount: totalTJS,
      totalCountByResponse: counts,
    };
  }, [transactions, exchangeRates]);

  const transactionColumns = React.useMemo(
    () => [
      {
        title: "Дата",
        key: "localTransactionDate",
        width: 190,
        render: (_, transaction) => (
          <span className="default-value">
            {transaction.localTransactionDate || "N/A"}{" "}
            {transaction.localTransactionTime || "N/A"}
          </span>
        ),
        sortValue: (transaction) =>
          `${transaction.localTransactionDate || ""} ${transaction.localTransactionTime || ""}`,
      },
      {
        title: "Статус",
        key: "responseDescription",
        width: 190,
        render: (_, transaction) =>
          getStatusBadge(
            transaction.responseCode,
            transaction.reversal,
            transaction.responseDescription,
          ),
        sortValue: (transaction) => transaction.responseDescription || "",
      },
      {
        title: "Номер карты",
        dataIndex: "cardNumber",
        key: "cardNumber",
        width: 180,
        render: (value) => (value ? formatCardNumber(value) : "N/A"),
      },
      {
        title: "ID карты",
        dataIndex: "cardId",
        key: "cardId",
        width: 150,
        render: (value) => value || "N/A",
      },
      {
        title: "Тип операции",
        dataIndex: "transactionTypeName",
        key: "transactionTypeName",
        width: 220,
        render: (value) => value || "N/A",
      },
      {
        title: "Сумма (валюта)",
        dataIndex: "amount",
        key: "amount",
        width: 180,
        render: (_, transaction) => (
          <span className="amount-value">
            {formatAmount(transaction.amount)} {getCurrencyCode(transaction.currency)}
          </span>
        ),
      },
      {
        title: "Сумма в валюте карты",
        dataIndex: "conamt",
        key: "conamt",
        width: 220,
        render: (_, transaction) => (
          <span className="amount-value">
            {formatAmount(transaction.conamt)}{" "}
            {getCurrencyCode(transaction.conCurrency)}
          </span>
        ),
      },
      {
        title: "Доступный баланс",
        dataIndex: "acctbal",
        key: "acctbal",
        width: 180,
        render: (value) => <span className="amount-value">{formatAmount(value)}</span>,
      },
      {
        title: "UTRNNO",
        dataIndex: "utrnno",
        key: "utrnno",
        width: 160,
        render: (value) => value || "N/A",
      },
      {
        title: "ID терминала",
        dataIndex: "terminalId",
        key: "terminalId",
        width: 170,
        render: (value) => value || "N/A",
      },
      {
        title: "ID ATM",
        dataIndex: "atmId",
        key: "atmId",
        width: 150,
        render: (value) => value || "N/A",
      },
      {
        title: "Запрошенная сумма",
        dataIndex: "reqamt",
        key: "reqamt",
        width: 190,
        render: (value) => <span className="amount-value">{formatAmount(value)}</span>,
      },
      {
        title: "Адрес терминала",
        dataIndex: "terminalAddress",
        key: "terminalAddress",
        width: 260,
        render: (value) => value || "N/A",
      },
      {
        title: "MCC",
        dataIndex: "mcc",
        key: "mcc",
        width: 130,
        render: (value) => value || "N/A",
      },
      {
        title: "Счет",
        dataIndex: "account",
        key: "account",
        width: 200,
        render: (value) => value || "N/A",
      },
      {
        title: "Сумма в нац. валюте",
        dataIndex: "nationalAmount",
        key: "nationalAmount",
        width: 190,
        render: (value) => (
          <span className="amount-value" style={{ fontWeight: "bold" }}>
            {formatAmount(value)}
          </span>
        ),
      },
      {
        title: "ID транзакции",
        dataIndex: "id",
        key: "id",
        width: 150,
      },
    ],
    [],
  );

  const handleExport = () => {
    const columns = [
      { key: "localTransactionDate", label: "Дата" },
      { key: "localTransactionTime", label: "Время" },
      { key: "responseDescription", label: "Статус" },
      { key: "cardNumber", label: "Номер карты" },
      { key: "cardId", label: "ID карты" },
      { key: "transactionTypeName", label: "Тип операции" },
      {
        key: (row) => {
          const amountFormatted = formatAmount(row.amount);
          return `${amountFormatted} ${getCurrencyCode(row.currency)}`;
        },
        label: "Сумма (валюта)",
      },
      {
        key: (row) => {
          const conamtFormatted = formatAmount(row.conamt);
          return `${conamtFormatted} ${getCurrencyCode(row.conCurrency)}`;
        },
        label: "Сумма в валюте карты (валюта)",
      },
      { key: (row) => formatAmount(row.acctbal), label: "Доступный баланс" },
      { key: "utrnno", label: "Номер операции в ПЦ" },
      { key: "terminalId", label: "ID терминала" },
      { key: "atmId", label: "ID АТМ" },
      {
        key: (row) => formatAmount(row.reqamt),
        label: "Запрошенная сумма",
      },
      { key: "terminalAddress", label: "Адрес терминала" },
      { key: "mcc", label: "MCC код" },
      { key: "account", label: "Счет" },
      {
        key: (row) => {
          const rate =
            row.conCurrency === 840
              ? exchangeRates.USD
              : row.conCurrency === 978
                ? exchangeRates.EUR
                : 1;
          const amountTJS = Math.round((row.conamt || 0) * rate);
          return formatAmount(amountTJS);
        },
        label: "Сумма в нац. валюте (TJS)",
      },
      { key: "id", label: "ID транзакции" },
    ];
    exportToExcel(
      transactionTableData,
      columns,
      `Транзакции_${new Date().toISOString().split("T")[0]}`,
    );
  };

  return (
    <>
      {alert.show && (
        <AlertMessage
          message={alert.message}
          type={alert.type}
          onClose={hideAlert}
          duration={3000}
        />
      )}
      <div className="block_info_prems content-page" align="center">
        <div className="processing-integration">
          {/* ---------- Форма фильтров ---------- */}
          <div className="txn-filter">
            <div className="txn-filter__card">
              <div className="txn-filter__body">
                {/* Идентификаторы */}
                <div className="txn-filter__section">
                  <div className="txn-filter__section-label">
                    <span className="txn-filter__section-icon">🔍</span>
                    Идентификаторы
                  </div>
                  <div className="txn-filter__fields">
                    <div className="txn-filter__field">
                      <label htmlFor="cardNumber" className="txn-filter__label">
                        Номер карты
                      </label>
                      <input
                        type="text"
                        id="cardNumber"
                        value={displayCardNumber}
                        onChange={handleCardNumberChange}
                        className="txn-filter__input"
                        disabled={isLoading}
                        placeholder="**** **** **** ****"
                      />
                    </div>
                    <div className="txn-filter__field">
                      <label htmlFor="cardId" className="txn-filter__label">
                        ID карты
                      </label>
                      <input
                        type="text"
                        id="cardId"
                        value={cardId}
                        onChange={(e) => setCardId(e.target.value)}
                        className="txn-filter__input"
                        disabled={isLoading || isLimitedAccess}
                        placeholder="Идентификатор карты"
                      />
                    </div>
                    <div className="txn-filter__field">
                      <label htmlFor="atmId" className="txn-filter__label">
                        ATM ID
                      </label>
                      <Select
                        mode="multiple"
                        style={{ width: '100%', minWidth: '150px' }}
                        placeholder="Выберите терминалы"
                        value={atmId ? atmId.split(',') : []}
                        onChange={(val) => setAtmId(val.join(','))}
                        disabled={isLoading}
                        options={terminalOptions}
                        filterOption={(input, option) =>
                          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Параметры операции */}
                <div className="txn-filter__section">
                  <div className="txn-filter__section-label">
                    <span className="txn-filter__section-icon">⚙️</span>
                    Параметры операции
                  </div>
                  <div className="txn-filter__fields">
                    <div className="txn-filter__field">
                      <label htmlFor="utrnno" className="txn-filter__label">
                        UTRNNO
                      </label>
                      <input
                        type="text"
                        id="utrnno"
                        value={utrnno}
                        onChange={(e) => setUtrnno(e.target.value)}
                        className="txn-filter__input"
                        disabled={isLoading}
                        placeholder="Номер операции"
                      />
                    </div>
                    {/* Типы транзакций — тег-инпут */}
                    <div
                      className="txn-filter__field"
                      style={{ minWidth: "220px" }}
                    >
                      <label className="txn-filter__label">
                        Типы транзакций
                      </label>
                      <Select
                        mode="multiple"
                        style={{ width: '100%', minWidth: '150px' }}
                        placeholder="Выберите типы транзакций"
                        value={transactionTypes}
                        onChange={setTransactionTypes}
                        disabled={isLoading}
                        options={transactionOptions}
                        filterOption={(input, option) =>
                          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                      />
                    </div>
                    <div className="txn-filter__field">
                      <label htmlFor="mcc" className="txn-filter__label">
                        MCC
                      </label>
                      <Select
                        showSearch
                        style={{ width: '100%', minWidth: '150px' }}
                        placeholder="Выберите MCC"
                        value={mcc}
                        onChange={setMcc}
                        disabled={isLoading}
                        options={[{"value": "0742", "label": "0742 - Ветеринарные услуги"}, {"value": "0763", "label": "0763 - Сельхозкооперативы"}, {"value": "0780", "label": "0780 - Ландшафтные услуги"}, {"value": "1520", "label": "1520 - Строительство жилья"}, {"value": "1711", "label": "1711 - Сантехнические работы"}, {"value": "1731", "label": "1731 - Электромонтаж"}, {"value": "1740", "label": "1740 - Подрядчики"}, {"value": "1750", "label": "1750 - Столярные работы"}, {"value": "1761", "label": "1761 - Кровельные работы"}, {"value": "1771", "label": "1771 - Бетонные работы"}, {"value": "1799", "label": "1799 - Строительные услуги"}, {"value": "2741", "label": "2741 - Типографии"}, {"value": "2791", "label": "2791 - Гравировка"}, {"value": "2842", "label": "2842 - Химия и чистящие средства"}, {"value": "3000", "label": "3000 - United Airlines"}, {"value": "3001", "label": "3001 - American Airlines"}, {"value": "3007", "label": "3007 - Air France"}, {"value": "3008", "label": "3008 - Lufthansa"}, {"value": "3009", "label": "3009 - Air Canada"}, {"value": "3012", "label": "3012 - Qantas"}, {"value": "3058", "label": "3058 - Delta"}, {"value": "3066", "label": "3066 - Southwest"}, {"value": "3075", "label": "3075 - Singapore Airlines"}, {"value": "3351", "label": "3351 - Hertz"}, {"value": "3355", "label": "3355 - Avis"}, {"value": "3366", "label": "3366 - Budget"}, {"value": "3501", "label": "3501 - Holiday Inn"}, {"value": "3502", "label": "3502 - Best Western"}, {"value": "3503", "label": "3503 - Sheraton"}, {"value": "3504", "label": "3504 - Hilton"}, {"value": "3509", "label": "3509 - Marriott"}, {"value": "3513", "label": "3513 - Westin"}, {"value": "3530", "label": "3530 - Embassy Suites"}, {"value": "3543", "label": "3543 - Four Seasons"}, {"value": "4011", "label": "4011 - Железные дороги"}, {"value": "4111", "label": "4111 - Локальный транспорт"}, {"value": "4112", "label": "4112 - Пассажирские поезда"}, {"value": "4121", "label": "4121 - Такси"}, {"value": "4131", "label": "4131 - Автобусы"}, {"value": "4214", "label": "4214 - Грузоперевозки"}, {"value": "4411", "label": "4411 - Круизы"}, {"value": "4457", "label": "4457 - Аренда лодок"}, {"value": "4468", "label": "4468 - Марины"}, {"value": "4511", "label": "4511 - Авиалинии"}, {"value": "4582", "label": "4582 - Аэропорты"}, {"value": "4722", "label": "4722 - Туроператоры"}, {"value": "4784", "label": "4784 - Платные дороги"}, {"value": "4789", "label": "4789 - Транспортные услуги"}, {"value": "4812", "label": "4812 - Телеком"}, {"value": "4814", "label": "4814 - Мобильная связь"}, {"value": "4816", "label": "4816 - Компьютерные сети"}, {"value": "4821", "label": "4821 - Денежные переводы"}, {"value": "4899", "label": "4899 - Кабельное ТВ"}, {"value": "4900", "label": "4900 - ЖКХ"}, {"value": "5013", "label": "5013 - Автозапчасти"}, {"value": "5021", "label": "5021 - Офисная мебель"}, {"value": "5039", "label": "5039 - Стройматериалы"}, {"value": "5045", "label": "5045 - Компьютеры"}, {"value": "5047", "label": "5047 - Медоборудование"}, {"value": "5051", "label": "5051 - Металлы"}, {"value": "5065", "label": "5065 - Электротовары"}, {"value": "5072", "label": "5072 - Скобяные изделия"}, {"value": "5074", "label": "5074 - Сантехника"}, {"value": "5085", "label": "5085 - Промтовары"}, {"value": "5094", "label": "5094 - Ювелирные часы"}, {"value": "5111", "label": "5111 - Канцтовары"}, {"value": "5122", "label": "5122 - Фармацевтика"}, {"value": "5131", "label": "5131 - Текстиль"}, {"value": "5137", "label": "5137 - Униформа"}, {"value": "5139", "label": "5139 - Обувь оптом"}, {"value": "5169", "label": "5169 - Химикаты"}, {"value": "5192", "label": "5192 - Книги и газеты"}, {"value": "5193", "label": "5193 - Цветы"}, {"value": "5198", "label": "5198 - Краски"}, {"value": "5200", "label": "5200 - DIY магазины"}, {"value": "5211", "label": "5211 - Строймагазины"}, {"value": "5231", "label": "5231 - Стекло и краска"}, {"value": "5251", "label": "5251 - Скобяные магазины"}, {"value": "5261", "label": "5261 - Садовые товары"}, {"value": "5271", "label": "5271 - Мобильные дома"}, {"value": "5300", "label": "5300 - Wholesale clubs"}, {"value": "5309", "label": "5309 - Duty Free"}, {"value": "5310", "label": "5310 - Дисконт-магазины"}, {"value": "5311", "label": "5311 - Универмаги"}, {"value": "5331", "label": "5331 - Магазины общего назначения"}, {"value": "5399", "label": "5399 - Разная розница"}, {"value": "5411", "label": "5411 - Супермаркеты"}, {"value": "5422", "label": "5422 - Морепродукты"}, {"value": "5441", "label": "5441 - Кондитерские"}, {"value": "5451", "label": "5451 - Молочные магазины"}, {"value": "5462", "label": "5462 - Пекарни"}, {"value": "5499", "label": "5499 - Продукты specialty"}, {"value": "5511", "label": "5511 - Продажа авто"}, {"value": "5521", "label": "5521 - Подержанные авто"}, {"value": "5531", "label": "5531 - Автотовары"}, {"value": "5532", "label": "5532 - Шины"}, {"value": "5533", "label": "5533 - Автозапчасти"}, {"value": "5541", "label": "5541 - АЗС"}, {"value": "5542", "label": "5542 - Автоматические АЗС"}, {"value": "5551", "label": "5551 - Продажа лодок"}, {"value": "5561", "label": "5561 - Продажа трейлеров"}, {"value": "5571", "label": "5571 - Продажа мотоциклов"}, {"value": "5592", "label": "5592 - Продажа домов на колесах"}, {"value": "5598", "label": "5598 - Снегоходы"}, {"value": "5599", "label": "5599 - Прочий транспорт"}, {"value": "5611", "label": "5611 - Мужская одежда"}, {"value": "5621", "label": "5621 - Женская одежда"}, {"value": "5631", "label": "5631 - Аксессуары"}, {"value": "5641", "label": "5641 - Детская одежда"}, {"value": "5651", "label": "5651 - Семейная одежда"}, {"value": "5655", "label": "5655 - Спортивная одежда"}, {"value": "5661", "label": "5661 - Обувь"}, {"value": "5681", "label": "5681 - Меха"}, {"value": "5691", "label": "5691 - Одежда"}, {"value": "5697", "label": "5697 - Ателье"}, {"value": "5698", "label": "5698 - Парики"}, {"value": "5699", "label": "5699 - Разная одежда"}, {"value": "5712", "label": "5712 - Мебель"}, {"value": "5713", "label": "5713 - Напольные покрытия"}, {"value": "5714", "label": "5714 - Обои"}, {"value": "5718", "label": "5718 - Камины"}, {"value": "5719", "label": "5719 - Домашняя утварь"}, {"value": "5722", "label": "5722 - Бытовая техника"}, {"value": "5732", "label": "5732 - Электроника"}, {"value": "5733", "label": "5733 - Музыкальные магазины"}, {"value": "5734", "label": "5734 - Компьютеры"}, {"value": "5735", "label": "5735 - Записи и диски"}, {"value": "5811", "label": "5811 - Кейтеринг"}, {"value": "5812", "label": "5812 - Рестораны"}, {"value": "5813", "label": "5813 - Бары"}, {"value": "5814", "label": "5814 - Фастфуд"}, {"value": "5815", "label": "5815 - Цифровой контент"}, {"value": "5816", "label": "5816 - Онлайн-игры"}, {"value": "5912", "label": "5912 - Аптеки"}, {"value": "5921", "label": "5921 - Алкоголь"}, {"value": "5931", "label": "5931 - Секонд-хенд"}, {"value": "5932", "label": "5932 - Антиквариат"}, {"value": "5933", "label": "5933 - Ломбарды"}, {"value": "5935", "label": "5935 - Металлолом"}, {"value": "5937", "label": "5937 - Магазины сувениров"}, {"value": "5940", "label": "5940 - Велосипеды"}, {"value": "5941", "label": "5941 - Спорттовары"}, {"value": "5942", "label": "5942 - Книжные"}, {"value": "5943", "label": "5943 - Канцтовары"}, {"value": "5944", "label": "5944 - Ювелирные"}, {"value": "5945", "label": "5945 - Игрушки"}, {"value": "5946", "label": "5946 - Фототовары"}, {"value": "5947", "label": "5947 - Подарки"}, {"value": "5948", "label": "5948 - Кожгалантерея"}, {"value": "5949", "label": "5949 - Ткани"}, {"value": "5950", "label": "5950 - Стекло"}, {"value": "5960", "label": "5960 - Direct marketing"}, {"value": "5962", "label": "5962 - Телемаркетинг"}, {"value": "5964", "label": "5964 - Каталоги"}, {"value": "5965", "label": "5965 - Подписки"}, {"value": "5966", "label": "5966 - Исходящие звонки"}, {"value": "5967", "label": "5967 - Онлайн-подписки"}, {"value": "5968", "label": "5968 - Continuity programs"}, {"value": "5969", "label": "5969 - Прямые продажи"}, {"value": "5970", "label": "5970 - Товары для художников"}, {"value": "5971", "label": "5971 - Галереи"}, {"value": "5972", "label": "5972 - Марки и монеты"}, {"value": "5973", "label": "5973 - Религиозные товары"}, {"value": "5975", "label": "5975 - Слуховые аппараты"}, {"value": "5976", "label": "5976 - Ортопедия"}, {"value": "5977", "label": "5977 - Косметика"}, {"value": "5978", "label": "5978 - Пишущие машинки"}, {"value": "5983", "label": "5983 - Топливо"}, {"value": "5992", "label": "5992 - Флористы"}, {"value": "5993", "label": "5993 - Табачные магазины"}, {"value": "5994", "label": "5994 - Газеты"}, {"value": "5995", "label": "5995 - Зоотовары"}, {"value": "5996", "label": "5996 - Бассейны"}, {"value": "5997", "label": "5997 - Электробритвы"}, {"value": "5998", "label": "5998 - Палатки и кемпинг"}, {"value": "5999", "label": "5999 - Прочая розница"}, {"value": "6010", "label": "6010 - Cash advance"}, {"value": "6011", "label": "6011 - Банкоматы"}, {"value": "6012", "label": "6012 - Финансовые учреждения"}, {"value": "6050", "label": "6050 - Квазикэш"}, {"value": "6051", "label": "6051 - Крипта и обмен"}, {"value": "6211", "label": "6211 - Брокеры"}, {"value": "6300", "label": "6300 - Страхование"}, {"value": "6513", "label": "6513 - Аренда недвижимости"}, {"value": "6532", "label": "6532 - Платежные сервисы"}, {"value": "6533", "label": "6533 - Денежные переводы"}, {"value": "6536", "label": "6536 - Card-to-card"}, {"value": "6537", "label": "6537 - Wallet funding"}, {"value": "6538", "label": "6538 - Wallet top-up"}, {"value": "6540", "label": "6540 - Stored value"}, {"value": "7011", "label": "7011 - Отели"}, {"value": "7012", "label": "7012 - Таймшер"}, {"value": "7032", "label": "7032 - Кемпинги"}, {"value": "7033", "label": "7033 - Трейлер-парки"}, {"value": "7210", "label": "7210 - Прачечные"}, {"value": "7211", "label": "7211 - Химчистка"}, {"value": "7216", "label": "7216 - Услуги похорон"}, {"value": "7217", "label": "7217 - Уборка"}, {"value": "7221", "label": "7221 - Фотоуслуги"}, {"value": "7230", "label": "7230 - Парикмахерские"}, {"value": "7251", "label": "7251 - Ремонт обуви"}, {"value": "7261", "label": "7261 - Похоронные бюро"}, {"value": "7273", "label": "7273 - Знакомства"}, {"value": "7276", "label": "7276 - Астрологи"}, {"value": "7277", "label": "7277 - Консультации"}, {"value": "7296", "label": "7296 - Аренда одежды"}, {"value": "7297", "label": "7297 - Массаж"}, {"value": "7298", "label": "7298 - SPA"}, {"value": "7299", "label": "7299 - Прочие услуги"}, {"value": "7311", "label": "7311 - Реклама"}, {"value": "7321", "label": "7321 - Кредитные бюро"}, {"value": "7333", "label": "7333 - Коммерческая фотография"}, {"value": "7338", "label": "7338 - Копицентры"}, {"value": "7342", "label": "7342 - Дезинфекция"}, {"value": "7349", "label": "7349 - Cleaning services"}, {"value": "7361", "label": "7361 - Агентства занятости"}, {"value": "7372", "label": "7372 - IT и программирование"}, {"value": "7375", "label": "7375 - Информационные услуги"}, {"value": "7379", "label": "7379 - Компьютерный сервис"}, {"value": "7392", "label": "7392 - Консалтинг"}, {"value": "7393", "label": "7393 - Детективы"}, {"value": "7394", "label": "7394 - Аренда оборудования"}, {"value": "7395", "label": "7395 - Фотолаборатории"}, {"value": "7399", "label": "7399 - Бизнес-услуги"}, {"value": "7512", "label": "7512 - Прокат авто"}, {"value": "7513", "label": "7513 - Прокат грузовиков"}, {"value": "7519", "label": "7519 - Автодома"}, {"value": "7523", "label": "7523 - Парковки"}, {"value": "7531", "label": "7531 - Кузовной ремонт"}, {"value": "7534", "label": "7534 - Шиномонтаж"}, {"value": "7535", "label": "7535 - Автосервис"}, {"value": "7538", "label": "7538 - Общий ремонт авто"}, {"value": "7542", "label": "7542 - Автомойки"}, {"value": "7549", "label": "7549 - Буксировка"}, {"value": "7622", "label": "7622 - Ремонт техники"}, {"value": "7623", "label": "7623 - Кондиционеры"}, {"value": "7629", "label": "7629 - Ремонт электроники"}, {"value": "7631", "label": "7631 - Ремонт часов"}, {"value": "7641", "label": "7641 - Ремонт мебели"}, {"value": "7692", "label": "7692 - Сварка"}, {"value": "7699", "label": "7699 - Разный ремонт"}, {"value": "7800", "label": "7800 - Казино"}, {"value": "7801", "label": "7801 - Онлайн gambling"}, {"value": "7802", "label": "7802 - Лотереи"}, {"value": "7829", "label": "7829 - Кинотеатры"}, {"value": "7832", "label": "7832 - Театры"}, {"value": "7841", "label": "7841 - Видеопрокат"}, {"value": "7911", "label": "7911 - Танцевальные школы"}, {"value": "7922", "label": "7922 - Театральные продюсеры"}, {"value": "7929", "label": "7929 - Оркестры"}, {"value": "7932", "label": "7932 - Бильярд"}, {"value": "7933", "label": "7933 - Боулинг"}, {"value": "7941", "label": "7941 - Спортклубы"}, {"value": "7991", "label": "7991 - Туризм"}, {"value": "7992", "label": "7992 - Гольф"}, {"value": "7993", "label": "7993 - Видео-игры"}, {"value": "7994", "label": "7994 - Видеоигры/аркады"}, {"value": "7995", "label": "7995 - Азартные игры"}, {"value": "7996", "label": "7996 - Парки развлечений"}, {"value": "7997", "label": "7997 - Клубы"}, {"value": "7998", "label": "7998 - Аквариумы/зоопарки"}, {"value": "7999", "label": "7999 - Развлечения"}, {"value": "8011", "label": "8011 - Врачи"}, {"value": "8021", "label": "8021 - Стоматологи"}, {"value": "8031", "label": "8031 - Остеопаты"}, {"value": "8041", "label": "8041 - Хиропрактики"}, {"value": "8042", "label": "8042 - Оптометристы"}, {"value": "8043", "label": "8043 - Оптики"}, {"value": "8049", "label": "8049 - Медуслуги"}, {"value": "8050", "label": "8050 - Медицинские учреждения"}, {"value": "8062", "label": "8062 - Больницы"}, {"value": "8071", "label": "8071 - Лаборатории"}, {"value": "8099", "label": "8099 - Медицинские услуги"}, {"value": "8111", "label": "8111 - Юристы"}, {"value": "8211", "label": "8211 - Школы"}, {"value": "8220", "label": "8220 - Университеты"}, {"value": "8241", "label": "8241 - Дистанционное обучение"}, {"value": "8244", "label": "8244 - Бизнес-школы"}, {"value": "8249", "label": "8249 - Профобучение"}, {"value": "8299", "label": "8299 - Образование"}, {"value": "8351", "label": "8351 - Детские сады"}, {"value": "8398", "label": "8398 - Благотворительность"}, {"value": "8641", "label": "8641 - Ассоциации"}, {"value": "8651", "label": "8651 - Политические организации"}, {"value": "8661", "label": "8661 - Религиозные организации"}, {"value": "8699", "label": "8699 - Членские организации"}, {"value": "8734", "label": "8734 - Тестовые лаборатории"}, {"value": "8911", "label": "8911 - Архитекторы"}, {"value": "8931", "label": "8931 - Бухгалтеры"}, {"value": "8999", "label": "8999 - Профессиональные услуги"}, {"value": "9211", "label": "9211 - Судебные пошлины"}, {"value": "9222", "label": "9222 - Штрафы"}, {"value": "9311", "label": "9311 - Налоги"}, {"value": "9399", "label": "9399 - Госуслуги"}, {"value": "9402", "label": "9402 - Почта"}, {"value": "9405", "label": "9405 - Гослотереи"}, {"value": "9700", "label": "9700 - Автоматизированные платежи"}]}
                        filterOption={(input, option) =>
                          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        allowClear
                      />
                    </div>
                    <div className="txn-filter__field">
                      <label
                        htmlFor="responseCode"
                        className="txn-filter__label"
                      >
                        Response code
                      </label>
                      <Select
                        showSearch
                        style={{ width: '100%', minWidth: '150px' }}
                        placeholder="Выберите Response Code"
                        value={responseCode}
                        onChange={setResponseCode}
                        disabled={isLoading}
                        options={[{"value": "-1", "label": "-1 Успешно"}, {"value": "803", "label": "803 Обратитесь в свой банк"}, {"value": "941", "label": "941 Ошибка: терминал не зарегистрирован"}, {"value": "909", "label": "909 Карта заблокирована или повреждена"}, {"value": "827", "label": "827 Операция отклонена банком"}, {"value": "826", "label": "826 Введите повторно ПИН"}, {"value": "807", "label": "807 Неверная операция. Попробуйте снова!"}, {"value": "913", "label": "913 Неверный тип операции"}, {"value": "903", "label": "903 Неверно указана сумма"}, {"value": "914", "label": "914 Карта не найдена"}, {"value": "934", "label": "934 Карта не найдена в системе"}, {"value": "883", "label": "883 Карта уже активирована"}, {"value": "812", "label": "812 Ошибка в формате данных"}, {"value": "802", "label": "802 Система банка недоступна"}, {"value": "840", "label": "840 Система сейчас недоступна"}, {"value": "819", "label": "819 Срок действия карты истёк"}, {"value": "818", "label": "818 Карта с ограничениями"}, {"value": "824", "label": "824 Карта под подозрением, обратитесь в банк"}, {"value": "822", "label": "822 Карта утерена и заблокирована банком"}, {"value": "823", "label": "823 Карта украдена и заблокирована банком"}, {"value": "915", "label": "915 Недостаточно денежный средств на счете"}, {"value": "901", "label": "901 Неверный ПИН"}, {"value": "804", "label": "804 Операция запрещена"}, {"value": "806", "label": "806 Операция запрещена законом"}, {"value": "928", "label": "928 Счет ограничен"}, {"value": "817", "label": "817 Превышен лимит авторизаций"}, {"value": "917", "label": "917 Превышен установленный лимит по карте"}, {"value": "938", "label": "938 Превышен установленный лимит по счету"}, {"value": "905", "label": "905 Карта ограничена для определенных операций"}, {"value": "814", "label": "814 Превышено общее количество транзакций"}, {"value": "801", "label": "801 Время ожидания истекло. Операция не выполнена."}, {"value": "820", "label": "820 Много попыток ввода ПИН. Карта может быть заблокирована!"}, {"value": "821", "label": "821 Неверный PIN, превышено число попыток"}, {"value": "884", "label": "884 Карта не найдена"}, {"value": "940", "label": "940 Карта неактивна"}, {"value": "292", "label": "292 Неизвестный статус ответа"}, {"value": "988", "label": "988 Услуга недоступна"}, {"value": "965", "label": "965 Неверный параметр платежа"}, {"value": "977", "label": "977 Услуга заблокирована"}, {"value": "811", "label": "811 Не допускается повторная передача"}, {"value": "813", "label": "813 Несоответствие суммы отмены и оригинала/ Ошибка возврата"}, {"value": "805", "label": "805 Ошибка (обычно в расшифровке PIN-блока) / Сбой системы"}, {"value": "902", "label": "902 Не удаётся обработать транзакцию / Сбой системы"}, {"value": "932", "label": "932 Принудительное проведение: счёт не найден / Сбой системы"}, {"value": "959", "label": "959 Сбой системы"}, {"value": "997", "label": "997 Услуга недоступна"}, {"value": "998", "label": "998 Неверный номер страхования/ Ответ не получен"}, {"value": "308", "label": "308 Сервис уже привязан"}, {"value": "277", "label": "277 Сервис не привязан"}, {"value": "307", "label": "307 Неверные данные сервиса"}, {"value": "858", "label": "858 Ошибка безопасности (MAC-ошибка)"}, {"value": "895", "label": "895 Отсутствие долгов"}, {"value": "287", "label": "287 Неверные данные платежа"}, {"value": "253", "label": "253 Требуется дополнительная информация"}, {"value": "251", "label": "251 Объект не найден"}, {"value": "250", "label": "250 Объект не создан в системе"}, {"value": "249", "label": "249 Объект уже создан в системе"}, {"value": "871", "label": "871 Неверный CVV2"}, {"value": "100", "label": "100 Неверный пароль"}, {"value": "953", "label": "953 Карта заблокирована системой"}]}
                        filterOption={(input, option) =>
                          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        allowClear
                      />
                    </div>
                  </div>
                </div>

                {/* Суммы */}
                <div className="txn-filter__section">
                  <div className="txn-filter__section-label">
                    <span className="txn-filter__section-icon">💰</span>
                    Суммы
                  </div>
                  <div className="txn-filter__fields">
                    <div className="txn-filter__field">
                      <label htmlFor="reqamt" className="txn-filter__label">
                        Запрош. сумма
                      </label>
                      <input
                        type="number"
                        id="reqamt"
                        value={reqamt}
                        onChange={(e) => setReqamt(e.target.value)}
                        className="txn-filter__input"
                        disabled={isLoading}
                        placeholder="reqamt"
                        min="0"
                      />
                    </div>
                    <div className="txn-filter__field">
                      <label htmlFor="amount" className="txn-filter__label">
                        Сумма опер.
                      </label>
                      <input
                        type="number"
                        id="amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="txn-filter__input"
                        disabled={isLoading}
                        placeholder="amount"
                        min="0"
                      />
                    </div>
                    <div className="txn-filter__field">
                      <label htmlFor="conamt" className="txn-filter__label">
                        Сумма в валюте
                      </label>
                      <input
                        type="number"
                        id="conamt"
                        value={conamt}
                        onChange={(e) => setConamt(e.target.value)}
                        className="txn-filter__input"
                        disabled={isLoading}
                        placeholder="conamt"
                        min="0"
                      />
                    </div>
                    <div className="txn-filter__field">
                      <label htmlFor="acctbal" className="txn-filter__label">
                        Доступ. баланс
                      </label>
                      <input
                        type="number"
                        id="acctbal"
                        value={acctbal}
                        onChange={(e) => setAcctbal(e.target.value)}
                        className="txn-filter__input"
                        disabled={isLoading}
                        placeholder="acctbal"
                        min="0"
                      />
                    </div>
                    <div className="txn-filter__field">
                      <label htmlFor="netbal" className="txn-filter__label">
                        Баланс карты
                      </label>
                      <input
                        type="number"
                        id="netbal"
                        value={netbal}
                        onChange={(e) => setNetbal(e.target.value)}
                        className="txn-filter__input"
                        disabled={isLoading}
                        placeholder="netbal"
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Валюты и прочее */}
                <div className="txn-filter__section">
                  <div className="txn-filter__section-label">
                    <span className="txn-filter__section-icon">🌐</span>
                    Валюты и прочее
                  </div>
                  <div className="txn-filter__fields">
                    <div className="txn-filter__field">
                      <label htmlFor="currency" className="txn-filter__label">
                        Валюта (код)
                      </label>
                      <Select
                        showSearch
                        style={{ width: '100%', minWidth: '150px' }}
                        placeholder="Выберите Валюту"
                        value={currency}
                        onChange={setCurrency}
                        disabled={isLoading}
                        options={[{"value": "8", "label": "8 Albanian Lek"}, {"value": "32", "label": "32 Argentine Peso"}, {"value": "36", "label": "36 Australian Dollar"}, {"value": "51", "label": "51 Armenian Dram"}, {"value": "124", "label": "124 Canadian Dollar"}, {"value": "156", "label": "156 Chinese Yuan"}, {"value": "203", "label": "203 Czech Koruna"}, {"value": "208", "label": "208 Danish Krone"}, {"value": "344", "label": "344 Hong Kong Dollar"}, {"value": "356", "label": "356 Indian Rupee"}, {"value": "360", "label": "360 Indonesian Rupiah"}, {"value": "376", "label": "376 Israeli New Shekel"}, {"value": "392", "label": "392 Japanese Yen"}, {"value": "398", "label": "398 Kazakhstani Tenge"}, {"value": "417", "label": "417 Kyrgyzstani Som"}, {"value": "498", "label": "498 Moldovan Leu"}, {"value": "643", "label": "643 Russian Ruble"}, {"value": "682", "label": "682 Saudi Riyal"}, {"value": "704", "label": "704 Vietnamese Dong"}, {"value": "710", "label": "710 South African Rand"}, {"value": "752", "label": "752 Swedish Krona"}, {"value": "756", "label": "756 Swiss Franc"}, {"value": "764", "label": "764 Thai Baht"}, {"value": "784", "label": "784 UAE Dirham"}, {"value": "826", "label": "826 British Pound"}, {"value": "840", "label": "840 US Dollar"}, {"value": "933", "label": "933 Belarusian Ruble"}, {"value": "944", "label": "944 Azerbaijani Manat"}, {"value": "946", "label": "946 Romanian Leu"}, {"value": "949", "label": "949 Turkish Lira"}, {"value": "960", "label": "960 IMF Special Drawing Rights"}, {"value": "971", "label": "971 Afghan Afghani"}, {"value": "972", "label": "972 Tajikistani Somoni"}, {"value": "975", "label": "975 Bulgarian Lev"}, {"value": "980", "label": "980 Ukrainian Hryvnia"}, {"value": "985", "label": "985 Polish Zloty"}, {"value": "986", "label": "986 Brazilian Real"}]}
                        filterOption={(input, option) =>
                          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        allowClear
                      />
                    </div>
                    <div className="txn-filter__field">
                      <label
                        htmlFor="conCurrency"
                        className="txn-filter__label"
                      >
                        Валюта конверс.
                      </label>
                      <Select
                        showSearch
                        style={{ width: '100%', minWidth: '150px' }}
                        placeholder="Выберите Валюту Конверсии"
                        value={conCurrency}
                        onChange={setConCurrency}
                        disabled={isLoading}
                        options={[{"value": "8", "label": "8 Albanian Lek"}, {"value": "32", "label": "32 Argentine Peso"}, {"value": "36", "label": "36 Australian Dollar"}, {"value": "51", "label": "51 Armenian Dram"}, {"value": "124", "label": "124 Canadian Dollar"}, {"value": "156", "label": "156 Chinese Yuan"}, {"value": "203", "label": "203 Czech Koruna"}, {"value": "208", "label": "208 Danish Krone"}, {"value": "344", "label": "344 Hong Kong Dollar"}, {"value": "356", "label": "356 Indian Rupee"}, {"value": "360", "label": "360 Indonesian Rupiah"}, {"value": "376", "label": "376 Israeli New Shekel"}, {"value": "392", "label": "392 Japanese Yen"}, {"value": "398", "label": "398 Kazakhstani Tenge"}, {"value": "417", "label": "417 Kyrgyzstani Som"}, {"value": "498", "label": "498 Moldovan Leu"}, {"value": "643", "label": "643 Russian Ruble"}, {"value": "682", "label": "682 Saudi Riyal"}, {"value": "704", "label": "704 Vietnamese Dong"}, {"value": "710", "label": "710 South African Rand"}, {"value": "752", "label": "752 Swedish Krona"}, {"value": "756", "label": "756 Swiss Franc"}, {"value": "764", "label": "764 Thai Baht"}, {"value": "784", "label": "784 UAE Dirham"}, {"value": "826", "label": "826 British Pound"}, {"value": "840", "label": "840 US Dollar"}, {"value": "933", "label": "933 Belarusian Ruble"}, {"value": "944", "label": "944 Azerbaijani Manat"}, {"value": "946", "label": "946 Romanian Leu"}, {"value": "949", "label": "949 Turkish Lira"}, {"value": "960", "label": "960 IMF Special Drawing Rights"}, {"value": "971", "label": "971 Afghan Afghani"}, {"value": "972", "label": "972 Tajikistani Somoni"}, {"value": "975", "label": "975 Bulgarian Lev"}, {"value": "980", "label": "980 Ukrainian Hryvnia"}, {"value": "985", "label": "985 Polish Zloty"}, {"value": "986", "label": "986 Brazilian Real"}]}
                        filterOption={(input, option) =>
                          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        allowClear
                      />
                    </div>
                    <div className="txn-filter__field">
                      <label htmlFor="reversal" className="txn-filter__label">
                        Reversal (0/1)
                      </label>
                      <Select
                        style={{ width: '100%' }}
                        value={reversal}
                        onChange={(val) => setReversal(val)}
                        disabled={isLoading}
                        options={[
                          { label: "ПУСТО", value: "" },
                          { label: "ДА (1)", value: "1" },
                          { label: "НЕТ (0)", value: "0" }
                        ]}
                      />
                    </div>
                    <div className="txn-filter__field">
                      <label htmlFor="account" className="txn-filter__label">
                        Счет
                      </label>
                      <input
                        type="text"
                        id="account"
                        value={account}
                        onChange={(e) => setAccount(e.target.value)}
                        className="txn-filter__input"
                        disabled={isLoading}
                        placeholder="Номер счета"
                      />
                    </div>
                  </div>
                </div>

                {/* Исключения */}
                <div className="txn-filter__field">
                      <label htmlFor="payId" className="txn-filter__label">
                        Оплата телефоном
                      </label>
                      <input
                        type="text"
                        id="payId"
                        value={payId}
                        onChange={(e) => setPayId(e.target.value)}
                        className="txn-filter__input"
                        disabled={isLoading}
                        placeholder="216 (GooglePay)"
                      />
                    </div>

                <div className="txn-filter__section txn-filter__section--exclude">
                  <div className="txn-filter__section-label">
                    <span className="txn-filter__section-icon">🚫</span>
                    Исключения
                  </div>
                  <div className="txn-filter__fields">
                    <div className="txn-filter__field">
                      <label
                        htmlFor="excludeTransactionTypes"
                        className="txn-filter__label"
                      >
                        Искл. типы транз.
                      </label>
                      <Select
                        mode="multiple"
                        style={{ width: '100%', minWidth: '150px' }}
                        placeholder="Выберите типы транзакций"
                        value={excludeTransactionTypes ? excludeTransactionTypes.split(',') : []}
                        onChange={(val) => setExcludeTransactionTypes(val.join(','))}
                        disabled={isLoading}
                        options={transactionOptions}
                        filterOption={(input, option) =>
                          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                      />
                    </div>
                    <div className="txn-filter__field">
                      <label
                        htmlFor="excludeAtmIds"
                        className="txn-filter__label"
                      >
                        Искл. ATM ID
                      </label>
                      <Select
                        mode="multiple"
                        style={{ width: '100%', minWidth: '150px' }}
                        placeholder="Выберите терминалы"
                        value={excludeAtmIds ? excludeAtmIds.split(',') : []}
                        onChange={(val) => setExcludeAtmIds(val.join(','))}
                        disabled={isLoading}
                        options={terminalOptions}
                        filterOption={(input, option) =>
                          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                      />
                    </div>
                    <div className="txn-filter__field">
                      <label htmlFor="excludeMcc" className="txn-filter__label">
                        Искл. MCC
                      </label>
                      <input
                        type="text"
                        id="excludeMcc"
                        value={excludeMcc}
                        onChange={(e) => setExcludeMcc(e.target.value)}
                        className="txn-filter__input txn-filter__input--exclude"
                        disabled={isLoading}
                        placeholder="6011, 5411..."
                      />
                    </div>
                    <div className="txn-filter__field">
                      <label
                        htmlFor="excludeAccounts"
                        className="txn-filter__label"
                      >
                        Искл. счета
                      </label>
                      <input
                        type="text"
                        id="excludeAccounts"
                        value={excludeAccounts}
                        onChange={(e) => setExcludeAccounts(e.target.value)}
                        className="txn-filter__input txn-filter__input--exclude"
                        disabled={isLoading}
                        placeholder="Номера счетов"
                      />
                    </div>
                  </div>
                </div>

                {/* Период */}
                <div className="txn-filter__section">
                  <div className="txn-filter__section-label">
                    <span className="txn-filter__section-icon">📅</span>
                    Период
                  </div>
                  <div className="txn-filter__fields">
                    <div className="txn-filter__field">
                      <label htmlFor="fromDate" className="txn-filter__label">
                        Дата с
                      </label>
                      <CustomDateInput
                        id="fromDate"
                        type="date"
                        value={fromDate}
                        onChange={setFromDate}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="txn-filter__field">
                      <label htmlFor="toDate" className="txn-filter__label">
                        Дата по
                      </label>
                      <CustomDateInput
                        id="toDate"
                        type="date"
                        value={toDate}
                        onChange={setToDate}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="txn-filter__field">
                      <label htmlFor="fromTime" className="txn-filter__label">
                        Время с
                      </label>
                      <CustomDateInput
                        id="fromTime"
                        type="time"
                        value={fromTime}
                        onChange={setFromTime}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="txn-filter__field">
                      <label htmlFor="toTime" className="txn-filter__label">
                        Время по
                      </label>
                      <CustomDateInput
                        id="toTime"
                        type="time"
                        value={toTime}
                        onChange={setToTime}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>

                {/* Действия */}
                <div className="txn-filter__actions">
                  <button
                    onClick={handleSearch}
                    disabled={isLoading}
                    className={`txn-filter__btn txn-filter__btn--primary ${isLoading ? "txn-filter__btn--loading" : ""}`}
                  >
                    {isLoading ? "Поиск..." : "Найти транзакции"}
                  </button>
                  <button
                    onClick={clearFilters}
                    disabled={isLoading}
                    className="txn-filter__btn txn-filter__btn--secondary"
                  >
                    Очистить
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Статистика и График */}
          {transactions.length > 0 && (
            <div className="txn-stats">
              <div className="txn-stats__grid">
                <div className="txn-stats__card txn-stats__card--total">
                  <div className="txn-stats__label">Общая сумма (успешно)</div>
                  <div className="txn-stats__value">
                    {formatAmount(totalAmount)}
                  </div>
                </div>
                <div className="txn-stats__card txn-stats__card--total">
                  <div className="txn-stats__label">Сумма в TJS</div>
                  <div className="txn-stats__value">
                    {formatAmount(totalNationalAmount)}
                  </div>
                </div>
                <div className="txn-stats__card txn-stats__card--success">
                  <div className="txn-stats__label">Успешных операций</div>
                  <div className="txn-stats__value">
                    {totalCountByResponse.success}
                  </div>
                </div>
                <div className="txn-stats__card txn-stats__card--warning">
                  <div className="txn-stats__label">Ожидающих/Предупр.</div>
                  <div className="txn-stats__value">
                    {totalCountByResponse.warning}
                  </div>
                </div>
                <div className="txn-stats__card txn-stats__card--error">
                  <div className="txn-stats__label">Ошибочных операций</div>
                  <div className="txn-stats__value">
                    {totalCountByResponse.error}
                  </div>
                </div>
                <div className="txn-stats__card txn-stats__card--reversal">
                  <div className="txn-stats__label">Отмененных (Reversal)</div>
                  <div className="txn-stats__value">
                    {totalCountByResponse.reversal}
                  </div>
                </div>
              </div>
              <div className="txn-stats__chart">
                <TransactionsChart transactions={transactionTableData} />
              </div>
            </div>
          )}

          {/* Таблица результатов */}
          {transactions.length > 0 && (
            <div className="processing-integration__limits-table">
              <div className="limits-table">
                <div className="limits-table__header">
                  <h2 className="limits-table__title">
                    Найденные транзакции
                    {fromDate && toDate && (
                      <span className="date-range">
                        {" "}
                        ({fromDate} — {toDate})
                      </span>
                    )}
                  </h2>
                  <div className="table-header-actions">
                    <button onClick={handleExport} className="export-excel-btn">
                      Экспорт в Excel
                    </button>
                  </div>
                </div>

                <div className="limits-table__container">
                  <div className="limits-table__wrapper">
                    <Table
                      tableId="processing-search-transactions"
                      rowKey="id"
                      columns={transactionColumns}
                      dataSource={transactionTableData}
                      pagination={{ pageSize: 20 }}
                      sticky
                      scroll={{ y: 620 }}
                    />
                    {false && (
                    <table className="limits-table__content">
                      <thead className="limits-table__head">
                        <tr>
                          {[
                            ["localTransactionDate", "Дата"],
                            ["responseDescription", "Статус"],
                            ["cardNumber", "Номер карты"],
                            ["cardId", "ID карты"],
                            ["transactionTypeName", "Тип операции"],
                            ["amount", "Сумма (валюта)"],
                            ["conamt", "Сумма в валюте карты (валюта)"],
                            ["acctbal", "Доступный баланс"],
                            ["utrnno", "Номер операции в ПЦ"],
                            ["terminalId", "ID терминала"],
                            ["atmId", "ID АТМ"],
                            ["reqamt", "Запрошенная сумма"],
                            ["terminalAddress", "Адрес терминала"],
                            ["mcc", "MCC код"],
                            ["account", "Счет"],
                            ["nationalAmount", "Сумма в нац. валуте"],
                            ["id", "ID транзакции"],
                          ].map(([key, label]) => (
                            <th
                              key={key}
                              onClick={() => requestSort(key)}
                              className="limits-table__th sortable-header"
                            >
                              {label}{" "}
                              <SortIcon sortConfig={sortConfig} sortKey={key} />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="limits-table__body">
                        {sortedTransactions.map((transaction) => {
                          return (
                            <tr
                              key={transaction.id}
                              className="limits-table__row transaction-row"
                            >
                              <td className="limits-table__td limits-table__td--value">
                                <span className="default-value">
                                  {transaction.localTransactionDate || "N/A"}{" "}
                                  {transaction.localTransactionTime || "N/A"}
                                </span>
                              </td>
                              <td className="limits-table__td limits-table__td--value">
                                {getStatusBadge(
                                  transaction.responseCode,
                                  transaction.reversal,
                                  transaction.responseDescription,
                                )}
                              </td>
                              <td
                                className="limits-table__td limits-table__td--info"
                                style={{ minWidth: "150px" }}
                              >
                                {transaction.cardNumber
                                  ? formatCardNumber(transaction.cardNumber)
                                  : "N/A"}
                              </td>
                              <td className="limits-table__td limits-table__td--info">
                                {transaction.cardId || "N/A"}
                              </td>
                              <td className="limits-table__td limits-table__td--value">
                                <span className="default-value">
                                  {transaction.transactionTypeName || "N/A"}
                                </span>
                              </td>
                              <td className="limits-table__td limits-table__td--value">
                                <span className="amount-value">
                                  {formatAmount(transaction.amount)}{" "}
                                  {getCurrencyCode(transaction.currency)}
                                </span>
                              </td>
                              <td className="limits-table__td limits-table__td--value">
                                <span className="amount-value">
                                  {formatAmount(transaction.conamt)}{" "}
                                  {getCurrencyCode(transaction.conCurrency)}
                                </span>
                              </td>
                              <td className="limits-table__td limits-table__td--value">
                                <span className="amount-value">
                                  {formatAmount(transaction.acctbal)}
                                </span>
                              </td>
                              <td className="limits-table__td limits-table__td--value">
                                <span className="default-value">
                                  {transaction.utrnno || "N/A"}
                                </span>
                              </td>
                              <td className="limits-table__td limits-table__td--value">
                                <span className="default-value">
                                  {transaction.terminalId || "N/A"}
                                </span>
                              </td>
                              <td className="limits-table__td limits-table__td--value">
                                <span className="default-value">
                                  {transaction.atmId || "N/A"}
                                </span>
                              </td>
                              <td className="limits-table__td limits-table__td--value">
                                <span className="amount-value">
                                  {formatAmount(transaction.reqamt)}
                                </span>
                              </td>
                              <td className="limits-table__td limits-table__td--value">
                                <span className="default-value">
                                  {transaction.terminalAddress || "N/A"}
                                </span>
                              </td>
                              <td className="limits-table__td limits-table__td--value">
                                <span className="default-value">
                                  {transaction.mcc || "N/A"}
                                </span>
                              </td>
                              <td className="limits-table__td limits-table__td--value">
                                <span className="default-value">
                                  {transaction.account || "N/A"}
                                </span>
                              </td>
                              <td className="limits-table__td limits-table__td--value">
                                <span
                                  className="amount-value"
                                  style={{ fontWeight: "bold" }}
                                >
                                  {(() => {
                                    const rate =
                                      transaction.conCurrency === 840
                                        ? exchangeRates.USD
                                        : transaction.conCurrency === 978
                                          ? exchangeRates.EUR
                                          : 1;
                                    const amountTJS = Math.round(
                                      (transaction.conamt || 0) * rate,
                                    );
                                    return formatAmount(amountTJS);
                                  })()}
                                </span>
                              </td>
                              <td className="limits-table__td limits-table__td--info">
                                {transaction.id}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    )}
                  </div>

                  <div className="limits-table__footer">
                    <div className="limits-table__stats">
                      <span className="limits-table__stat">
                        Всего записей: {sortedTransactions.length}
                      </span>
                      <span className="limits-table__stat">
                        Показано: {sortedTransactions.length}
                      </span>
                      {fromDate && toDate && (
                        <span className="limits-table__stat">
                          Период: {fromDate} — {toDate}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="processing-integration__loading">
              <div className="spinner"></div>
            </div>
          )}

          {!isLoading && transactions.length === 0 && (
            <div className="processing-integration__no-data">
              <div className="no-data">
                <h3>Данные не найдены</h3>
                <p>По заданным критериям не найдено транзакций.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
