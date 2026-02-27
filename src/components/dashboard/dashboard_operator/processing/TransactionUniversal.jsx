import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../../../../styles/components/ProcessingIntegration.scss";
import "../../../../styles/components/BlockInfo.scss";
import "../../../../styles/components/DashboardOperatorProcessingTransactions.scss";
import AlertMessage from "../../../general/AlertMessage.jsx";
import { fetchTransactionsSearch } from "../../../../api/processing/transactions.js";
import { getCurrencyCode } from "../../../../api/utils/getCurrencyCode.js";
import { dataTrans } from "../../../../const/defConst.js";
import { useExcelExport } from "../../../../hooks/useExcelExport.js";
import { useTableSort } from "../../../../hooks/useTableSort.js";
import SortIcon from "../../../general/SortIcon.jsx";
import { canAccessTransactions } from "../../../../api/roleHelper.js";
import TransactionsChart from "../../../graph/graph.jsx";

// Безопасное получение значения типа транзакции для форматирования сумм
const getTransactionTypeValue = (transactionType) => {
  if (!dataTrans || !Array.isArray(dataTrans)) return undefined;
  const found = dataTrans.find((e) => e.label === transactionType);
  return found?.value;
};

export default function DashboardOperatorTransactionSearch() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { exportToExcel } = useExcelExport();

  // Проверка доступа
  const hasAccess = canAccessTransactions();
  const [isLimitedAccess, setIsLimitedAccess] = useState(false);
  const [allowedCardId, setAllowedCardId] = useState(null);

  // Состояние транзакций и загрузки
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState({
    show: false,
    message: "",
    type: "success",
  });

  // ---------- Поля фильтрации ----------
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
  const [transactionType, setTransactionType] = useState("");
  const [atmId, setAtmId] = useState("");
  const [mcc, setMcc] = useState("");
  const [account, setAccount] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");

  // Для красивого отображения cardNumber
  const [displayCardNumber, setDisplayCardNumber] = useState("");

  // Сортировка
  const {
    items: sortedTransactions,
    requestSort,
    sortConfig,
  } = useTableSort(transactions);

  // ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (подняты вверх) ==========
  const showAlert = useCallback((message, type = "success") => {
    setAlert({ show: true, message, type });
  }, []);

  const hideAlert = useCallback(() => {
    setAlert({ show: false, message: "", type: "success" });
  }, []);

  const formatCardNumber = (value) => {
    return value
      .replace(/\s/g, "")
      .replace(/(\d{4})/g, "$1 ")
      .trim();
  };

  const handleCardNumberChange = (e) => {
    const raw = e.target.value;
    setDisplayCardNumber(raw);
    setCardNumber(raw.replace(/\s/g, ""));
  };

  // Форматирование сумм (с учётом знака для дебетовых операций)
  const formatAmount = (amount, transactionTypeValue) => {
    if (amount === null || amount === undefined || amount === "") return "N/A";
    const amountStr = amount.toString();
    let formattedAmount;
    if (amountStr.length <= 2) {
      formattedAmount = `0,${amountStr.padStart(2, "0")}`;
    } else {
      const integerPart = amountStr.slice(0, -2);
      const decimalPart = amountStr.slice(-2);
      formattedAmount = `${integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ")},${decimalPart}`;
    }
    if (transactionTypeValue === 2) return `-${formattedAmount}`;
    return formattedAmount;
  };

  // Статусный бейдж
  const getStatusBadge = (responseCode, reversal, message) => {
    if (reversal)
      return (
        <span className="status-badge status-badge--reversed">{message}</span>
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
  // ========== КОНЕЦ ВСПОМОГАТЕЛЬНЫХ ФУНКЦИЙ ==========

  // ---------- Установка дат по умолчанию (последние 30 дней) ----------
  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    setFromDate(thirtyDaysAgo.toISOString().split("T")[0]);
    setToDate(today.toISOString().split("T")[0]);
  }, []);

  // ---------- Обработка ограниченного доступа ----------
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

  // Предупреждение об ограниченном доступе (теперь showAlert определена выше)
  useEffect(() => {
    if (isLimitedAccess) {
      showAlert("Вы можете просматривать историю только этой карты", "info");
    }
  }, [isLimitedAccess, showAlert]);

  // ---------- Валидация перед поиском ----------
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

  // ---------- Поиск транзакций ----------
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
      if (transactionType)
        params.transactionType = parseInt(transactionType, 10);
      if (atmId) params.atmId = atmId;
      if (mcc) params.mcc = parseInt(mcc, 10);
      if (account) params.account = account;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      if (fromTime) params.fromTime = fromTime;
      if (toTime) params.toTime = toTime;

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
    transactionType,
    atmId,
    mcc,
    account,
    fromDate,
    toDate,
    fromTime,
    toTime,
    validateSearch,
    showAlert,
  ]);

  // Автоматический поиск при наличии id в URL
  useEffect(() => {
    if (id?.length) {
      setCardId(id);
      handleSearch();
    }
  }, [id, handleSearch]);

  // ---------- Очистка фильтров ----------
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
    setTransactionType("");
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
    setTransactions([]);
  };

  // ---------- Статистика ----------
  const { totalAmount, totalCountByResponse } = React.useMemo(() => {
    let total = 0;
    const counts = { success: 0, error: 0, warning: 0, reversal: 0 };

    transactions.forEach((tx) => {
      const val = parseFloat(tx.amount || 0);
      const type =
        getTransactionTypeValue(tx.transactionType) || tx.transactionTypeNumber;

      if (type === 2) {
        total -= val;
      } else {
        total += val;
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
      totalCountByResponse: counts,
    };
  }, [transactions]);

  // ---------- Экспорт в Excel ----------
  const handleExport = () => {
    const columns = [
      { key: "localTransactionDate", label: "Дата" },
      { key: "localTransactionTime", label: "Время" },
      { key: "responseDescription", label: "Статус" },
      { key: "cardNumber", label: "Номер карты" },
      { key: "cardId", label: "ID карты" },
      { key: "transactionTypeName", label: "Тип операции" },
      {
        key: (row) =>
          formatAmount(
            row.amount,
            getTransactionTypeValue(row.transactionType) ||
              row.transactionTypeNumber,
          ),
        label: "Сумма операции",
      },
      { key: (row) => getCurrencyCode(row.currency), label: "Валюта" },
      {
        key: (row) =>
          formatAmount(
            row.conamt,
            getTransactionTypeValue(row.transactionType) ||
              row.transactionTypeNumber,
          ),
        label: "Сумма в валюте карты",
      },
      { key: (row) => formatAmount(row.acctbal), label: "Доступный баланс" },
      { key: (row) => formatAmount(row.netbal), label: "Баланс карты" },
      { key: "utrnno", label: "Номер операции в ПЦ" },
      { key: "terminalId", label: "ID терминала" },
      { key: "atmId", label: "ID АТМ" },
      {
        key: (row) =>
          formatAmount(
            row.reqamt,
            getTransactionTypeValue(row.transactionType) ||
              row.transactionTypeNumber,
          ),
        label: "Запрошенная сумма",
      },
      { key: "terminalAddress", label: "Адрес терминала" },
      { key: "mcc", label: "MCC код" },
      { key: "account", label: "Счет" },
      { key: "id", label: "ID транзакции" },
    ];
    exportToExcel(
      sortedTransactions,
      columns,
      `Транзакции_${new Date().toISOString().split("T")[0]}`,
    );
  };

  // ---------- Render ----------
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
          <div className="processing-integration__container">
            {/* ---------- Форма поиска (один блок, все поля) ---------- */}
            <div className="processing-integration__search-card">
              <div className="search-card">
                <div className="search-card__content">
                  {/* Строка 1: Основные идентификаторы */}
                  <div className="search-card__section-title">
                    Идентификаторы
                  </div>
                  <div className="search-card__row">
                    <div className="search-card__input-group">
                      <label
                        htmlFor="cardNumber"
                        className="search-card__label"
                      >
                        Номер карты
                      </label>
                      <input
                        type="text"
                        id="cardNumber"
                        value={displayCardNumber}
                        onChange={handleCardNumberChange}
                        className="search-card__input"
                        disabled={isLoading}
                        placeholder="**** **** **** ****"
                      />
                    </div>
                    <div className="search-card__input-group">
                      <label htmlFor="cardId" className="search-card__label">
                        ID карты
                      </label>
                      <input
                        type="text"
                        id="cardId"
                        value={cardId}
                        onChange={(e) => setCardId(e.target.value)}
                        className="search-card__input"
                        disabled={isLoading || isLimitedAccess}
                        placeholder="Идентификатор карты"
                      />
                    </div>
                    <div className="search-card__input-group">
                      <label htmlFor="atmId" className="search-card__label">
                        ATM ID
                      </label>
                      <input
                        type="text"
                        id="atmId"
                        value={atmId}
                        onChange={(e) => setAtmId(e.target.value)}
                        className="search-card__input"
                        disabled={isLoading}
                        placeholder="Терминал"
                      />
                    </div>
                  </div>

                  {/* Строка 2: UTRNNO, тип транзакции, MCC, responseCode */}
                  <div className="search-card__section-title">
                    Параметры операции
                  </div>
                  <div className="search-card__row">
                    <div className="search-card__input-group">
                      <label htmlFor="utrnno" className="search-card__label">
                        UTRNNO
                      </label>
                      <input
                        type="text"
                        id="utrnno"
                        value={utrnno}
                        onChange={(e) => setUtrnno(e.target.value)}
                        className="search-card__input"
                        disabled={isLoading}
                        placeholder="Номер операции"
                      />
                    </div>
                    <div className="search-card__input-group">
                      <label
                        htmlFor="transactionType"
                        className="search-card__label"
                      >
                        Тип транзакции
                      </label>
                      <input
                        type="text"
                        id="transactionType"
                        value={transactionType}
                        onChange={(e) => setTransactionType(e.target.value)}
                        className="search-card__input"
                        disabled={isLoading}
                        placeholder="Код (659, 760...)"
                      />
                    </div>
                    <div className="search-card__input-group">
                      <label htmlFor="mcc" className="search-card__label">
                        MCC
                      </label>
                      <input
                        type="text"
                        id="mcc"
                        value={mcc}
                        onChange={(e) => setMcc(e.target.value)}
                        className="search-card__input"
                        disabled={isLoading}
                        placeholder="MCC код"
                      />
                    </div>
                    <div className="search-card__input-group">
                      <label
                        htmlFor="responseCode"
                        className="search-card__label"
                      >
                        Response code
                      </label>
                      <input
                        type="text"
                        id="responseCode"
                        value={responseCode}
                        onChange={(e) => setResponseCode(e.target.value)}
                        className="search-card__input"
                        disabled={isLoading}
                        placeholder="-1, 01, 02..."
                      />
                    </div>
                  </div>

                  {/* Строка 3: Суммы (reqamt, amount, conamt, acctbal, netbal) */}
                  <div className="search-card__section-title">Суммы</div>
                  <div className="search-card__row">
                    <div className="search-card__input-group">
                      <label htmlFor="reqamt" className="search-card__label">
                        Запрош. сумма
                      </label>
                      <input
                        type="number"
                        id="reqamt"
                        value={reqamt}
                        onChange={(e) => setReqamt(e.target.value)}
                        className="search-card__input"
                        disabled={isLoading}
                        placeholder="reqamt"
                        min="0"
                      />
                    </div>
                    <div className="search-card__input-group">
                      <label htmlFor="amount" className="search-card__label">
                        Сумма опер.
                      </label>
                      <input
                        type="number"
                        id="amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="search-card__input"
                        disabled={isLoading}
                        placeholder="amount"
                        min="0"
                      />
                    </div>
                    <div className="search-card__input-group">
                      <label htmlFor="conamt" className="search-card__label">
                        Сумма в валюте
                      </label>
                      <input
                        type="number"
                        id="conamt"
                        value={conamt}
                        onChange={(e) => setConamt(e.target.value)}
                        className="search-card__input"
                        disabled={isLoading}
                        placeholder="conamt"
                        min="0"
                      />
                    </div>
                    <div className="search-card__input-group">
                      <label htmlFor="acctbal" className="search-card__label">
                        Доступ. баланс
                      </label>
                      <input
                        type="number"
                        id="acctbal"
                        value={acctbal}
                        onChange={(e) => setAcctbal(e.target.value)}
                        className="search-card__input"
                        disabled={isLoading}
                        placeholder="acctbal"
                        min="0"
                      />
                    </div>
                    <div className="search-card__input-group">
                      <label htmlFor="netbal" className="search-card__label">
                        Баланс карты
                      </label>
                      <input
                        type="number"
                        id="netbal"
                        value={netbal}
                        onChange={(e) => setNetbal(e.target.value)}
                        className="search-card__input"
                        disabled={isLoading}
                        placeholder="netbal"
                        min="0"
                      />
                    </div>
                  </div>

                  {/* Строка 4: Валюты, reversal, account */}
                  <div className="search-card__section-title">
                    Валюты и прочее
                  </div>
                  <div className="search-card__row">
                    <div className="search-card__input-group">
                      <label htmlFor="currency" className="search-card__label">
                        Валюта (код)
                      </label>
                      <input
                        type="text"
                        id="currency"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="search-card__input"
                        disabled={isLoading}
                        placeholder="972, 840..."
                      />
                    </div>
                    <div className="search-card__input-group">
                      <label
                        htmlFor="conCurrency"
                        className="search-card__label"
                      >
                        Валюта конверс.
                      </label>
                      <input
                        type="text"
                        id="conCurrency"
                        value={conCurrency}
                        onChange={(e) => setConCurrency(e.target.value)}
                        className="search-card__input"
                        disabled={isLoading}
                        placeholder="972, 978..."
                      />
                    </div>
                    <div className="search-card__input-group">
                      <label htmlFor="reversal" className="search-card__label">
                        Reversal (0/1)
                      </label>
                      <input
                        type="text"
                        id="reversal"
                        value={reversal}
                        onChange={(e) => setReversal(e.target.value)}
                        className="search-card__input"
                        disabled={isLoading}
                        placeholder="0 или 1"
                        maxLength="1"
                      />
                    </div>
                    <div className="search-card__input-group">
                      <label htmlFor="account" className="search-card__label">
                        Счет
                      </label>
                      <input
                        type="text"
                        id="account"
                        value={account}
                        onChange={(e) => setAccount(e.target.value)}
                        className="search-card__input"
                        disabled={isLoading}
                        placeholder="Номер счета"
                      />
                    </div>
                  </div>

                  {/* Строка 5: Диапазон дат и времени */}
                  <div className="search-card__section-title">Период</div>
                  <div className="search-card__row">
                    <div className="search-card__input-group">
                      <label htmlFor="fromDate" className="search-card__label">
                        Дата с
                      </label>
                      <input
                        type="date"
                        id="fromDate"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="search-card__date-input"
                        disabled={isLoading}
                      />
                    </div>
                    <div className="search-card__input-group">
                      <label htmlFor="toDate" className="search-card__label">
                        Дата по
                      </label>
                      <input
                        type="date"
                        id="toDate"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="search-card__date-input"
                        disabled={isLoading}
                      />
                    </div>
                    <div className="search-card__input-group">
                      <label htmlFor="fromTime" className="search-card__label">
                        Время с
                      </label>
                      <input
                        type="time"
                        id="fromTime"
                        value={fromTime}
                        onChange={(e) => setFromTime(e.target.value)}
                        className="search-card__input"
                        disabled={isLoading}
                      />
                    </div>
                    <div className="search-card__input-group">
                      <label htmlFor="toTime" className="search-card__label">
                        Время по
                      </label>
                      <input
                        type="time"
                        id="toTime"
                        value={toTime}
                        onChange={(e) => setToTime(e.target.value)}
                        className="search-card__input"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Кнопки */}
                  <div className="search-card__buttons">
                    <button
                      onClick={handleSearch}
                      disabled={isLoading}
                      className={`search-card__button ${
                        isLoading ? "search-card__button--loading" : ""
                      }`}
                    >
                      {isLoading ? "Поиск..." : "Найти транзакции"}
                    </button>
                    <button
                      onClick={clearFilters}
                      disabled={isLoading}
                      className="search-card__button search-card__button--secondary"
                    >
                      Очистить
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ---------- Статистика и График ---------- */}
            {transactions.length > 0 && (
              <div className="processing-integration__stats-section">
                <div className="stats-grid">
                  <div className="stats-card stats-card--total">
                    <div className="stats-card__label">
                      Общая сумма (успешно)
                    </div>
                    <div className="stats-card__value">
                      {formatAmount(totalAmount)}
                    </div>
                  </div>
                  <div className="stats-card stats-card--success">
                    <div className="stats-card__label">Успешных операций</div>
                    <div className="stats-card__value">
                      {totalCountByResponse.success}
                    </div>
                  </div>
                  <div className="stats-card stats-card--warning">
                    <div className="stats-card__label">Ожидающих/Предупр.</div>
                    <div className="stats-card__value">
                      {totalCountByResponse.warning}
                    </div>
                  </div>
                  <div className="stats-card stats-card--error">
                    <div className="stats-card__label">Ошибочных операций</div>
                    <div className="stats-card__value">
                      {totalCountByResponse.error}
                    </div>
                  </div>
                  <div className="stats-card stats-card--reversal">
                    <div className="stats-card__label">
                      Отмененных (Reversal)
                    </div>
                    <div className="stats-card__value">
                      {totalCountByResponse.reversal}
                    </div>
                  </div>
                </div>

                <div className="chart-section">
                  <TransactionsChart transactions={transactions} />
                </div>
              </div>
            )}
          </div>

          {/* ---------- Таблица результатов ---------- */}
          {transactions.length > 0 && (
            <div className="processing-integration__limits-table">
              <div className="limits-table">
                <div className="limits-table__header">
                  <h2 className="limits-table__title">
                    Найденные транзакции
                    {fromDate && toDate && (
                      <span className="date-range">
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
                    <table className="limits-table__content">
                      <thead className="limits-table__head">
                        <tr>
                          {/* ... все заголовки как в оригинале ... */}
                          <th
                            onClick={() => requestSort("localTransactionDate")}
                            className="limits-table__th sortable-header"
                          >
                            Дата{" "}
                            <SortIcon
                              sortConfig={sortConfig}
                              sortKey="localTransactionDate"
                            />
                          </th>
                          <th
                            onClick={() => requestSort("responseDescription")}
                            className="limits-table__th sortable-header"
                          >
                            Статус{" "}
                            <SortIcon
                              sortConfig={sortConfig}
                              sortKey="responseDescription"
                            />
                          </th>
                          <th
                            onClick={() => requestSort("cardNumber")}
                            className="limits-table__th sortable-header"
                          >
                            Номер карты{" "}
                            <SortIcon
                              sortConfig={sortConfig}
                              sortKey="cardNumber"
                            />
                          </th>
                          <th
                            onClick={() => requestSort("cardId")}
                            className="limits-table__th sortable-header"
                          >
                            ID карты{" "}
                            <SortIcon
                              sortConfig={sortConfig}
                              sortKey="cardId"
                            />
                          </th>
                          <th
                            onClick={() => requestSort("transactionTypeName")}
                            className="limits-table__th sortable-header"
                          >
                            Тип операции{" "}
                            <SortIcon
                              sortConfig={sortConfig}
                              sortKey="transactionTypeName"
                            />
                          </th>
                          <th
                            onClick={() => requestSort("amount")}
                            className="limits-table__th sortable-header"
                          >
                            Сумма операции{" "}
                            <SortIcon
                              sortConfig={sortConfig}
                              sortKey="amount"
                            />
                          </th>
                          <th
                            onClick={() => requestSort("currency")}
                            className="limits-table__th sortable-header"
                          >
                            Валюта{" "}
                            <SortIcon
                              sortConfig={sortConfig}
                              sortKey="currency"
                            />
                          </th>
                          <th
                            onClick={() => requestSort("conamt")}
                            className="limits-table__th sortable-header"
                          >
                            Сумма в валюте карты{" "}
                            <SortIcon
                              sortConfig={sortConfig}
                              sortKey="conamt"
                            />
                          </th>
                          <th
                            onClick={() => requestSort("acctbal")}
                            className="limits-table__th sortable-header"
                          >
                            Доступный баланс{" "}
                            <SortIcon
                              sortConfig={sortConfig}
                              sortKey="acctbal"
                            />
                          </th>
                          <th
                            onClick={() => requestSort("netbal")}
                            className="limits-table__th sortable-header"
                          >
                            Баланс карты{" "}
                            <SortIcon
                              sortConfig={sortConfig}
                              sortKey="netbal"
                            />
                          </th>
                          <th
                            onClick={() => requestSort("utrnno")}
                            className="limits-table__th sortable-header"
                          >
                            Номер операции в ПЦ{" "}
                            <SortIcon
                              sortConfig={sortConfig}
                              sortKey="utrnno"
                            />
                          </th>
                          <th
                            onClick={() => requestSort("terminalId")}
                            className="limits-table__th sortable-header"
                          >
                            ID терминала{" "}
                            <SortIcon
                              sortConfig={sortConfig}
                              sortKey="terminalId"
                            />
                          </th>
                          <th
                            onClick={() => requestSort("atmId")}
                            className="limits-table__th sortable-header"
                          >
                            ID АТМ{" "}
                            <SortIcon sortConfig={sortConfig} sortKey="atmId" />
                          </th>
                          <th
                            onClick={() => requestSort("reqamt")}
                            className="limits-table__th sortable-header"
                          >
                            Запрошенная сумма{" "}
                            <SortIcon
                              sortConfig={sortConfig}
                              sortKey="reqamt"
                            />
                          </th>
                          <th
                            onClick={() => requestSort("terminalAddress")}
                            className="limits-table__th sortable-header"
                          >
                            Адрес терминала{" "}
                            <SortIcon
                              sortConfig={sortConfig}
                              sortKey="terminalAddress"
                            />
                          </th>
                          <th
                            onClick={() => requestSort("mcc")}
                            className="limits-table__th sortable-header"
                          >
                            MCC код{" "}
                            <SortIcon sortConfig={sortConfig} sortKey="mcc" />
                          </th>
                          <th
                            onClick={() => requestSort("account")}
                            className="limits-table__th sortable-header"
                          >
                            Счет{" "}
                            <SortIcon
                              sortConfig={sortConfig}
                              sortKey="account"
                            />
                          </th>
                          <th
                            onClick={() => requestSort("id")}
                            className="limits-table__th sortable-header"
                          >
                            ID транзакции{" "}
                            <SortIcon sortConfig={sortConfig} sortKey="id" />
                          </th>
                        </tr>
                      </thead>
                      <tbody className="limits-table__body">
                        {sortedTransactions.map((transaction) => {
                          const transactionTypeValue = getTransactionTypeValue(
                            transaction.transactionType,
                          );
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
                                  {formatAmount(
                                    transaction.amount,
                                    transactionTypeValue ||
                                      transaction.transactionTypeNumber,
                                  )}
                                </span>
                              </td>
                              <td className="limits-table__td limits-table__td--value">
                                <span className="default-value">
                                  {getCurrencyCode(transaction.currency)}
                                </span>
                              </td>
                              <td className="limits-table__td limits-table__td--value">
                                <span className="amount-value">
                                  {formatAmount(
                                    transaction.conamt,
                                    transactionTypeValue ||
                                      transaction.transactionTypeNumber,
                                  )}
                                </span>
                              </td>
                              <td className="limits-table__td limits-table__td--value">
                                <span className="amount-value">
                                  {formatAmount(transaction.acctbal)}
                                </span>
                              </td>
                              <td className="limits-table__td limits-table__td--value">
                                <span className="amount-value">
                                  {formatAmount(transaction.netbal)}
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
                                  {formatAmount(
                                    transaction.reqamt,
                                    transactionTypeValue ||
                                      transaction.transactionTypeNumber,
                                  )}
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
                              <td className="limits-table__td limits-table__td--info">
                                {transaction.id}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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
