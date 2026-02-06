import React, { useState, useEffect, useMemo } from "react";
import "../../../../styles/components/ProcessingIntegration.scss";
import "../../../../styles/components/BlockInfo.scss";
import "../../../../styles/components/DashboardOperatorProcessingTransactions.scss";
import AlertMessage from "../../../general/AlertMessage.jsx";
import {
  fetchTransactionsByCardId,
  fetchTransactionsByATM,
  fetchTransactionsByUTRNNO,
  fetchTransactionsByType,
  fetchTransactionsByAmount,
  fetchTransactionsByReversal,
  fetchTransactionsByMCC,
  fetchTransactionsByCardBinAndType,
} from "../../../../api/processing/transactions.js";
import { getCurrencyCode } from "../../../../api/utils/getCurrencyCode.js";
import { useParams } from "react-router-dom";
import { dataTrans } from "../../../../const/defConst.js";

export default function DashboardOperatorProcessingTransactions() {
  const { id } = useParams();
  const [searchType, setSearchType] = useState("cardId"); // По умолчанию поиск по карте
  const [displayCardId, setDisplayCardId] = useState("");
  const [cardId, setCardId] = useState("");
  const [atmId, setAtmId] = useState("");
  const [utrnno, setUtrnno] = useState("");
  const [transactionType, setTransactionType] = useState("");
  const [amountFrom, setAmountFrom] = useState("");
  const [amountTo, setAmountTo] = useState("");
  const [reversal, setReversal] = useState("");
  const [mcc, setMcc] = useState("");
  // Новые поля для поиска по BIN и типу
  const [cardBin, setCardBin] = useState("");
  const [searchTransactionType, setSearchTransactionType] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [alert, setAlert] = useState({
    show: false,
    message: "",
    type: "success",
  });

  // Опции для выбора типа поиска
  const searchOptions = [
    { value: "cardId", label: "Поиск по идентификатору карты" },
    { value: "atmId", label: "Поиск по номеру терминала" },
    { value: "utrnno", label: "Поиск по номеру операции (UTRNNO)" },
    { value: "transactionType", label: "Поиск по типу транзакции" },
    { value: "amount", label: "Поиск по сумме операции" },
    { value: "reversal", label: "Поиск по статусу отмены" },
    { value: "mcc", label: "Поиск по MCC коду" },
    { value: "cardBinSearch", label: "Поиск по BIN карты и типу транзакции" }, // Новая опция
  ];

  // Функция для форматирования суммы
  const formatAmount = (amount, transactionTypeNumber) => {
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

    // Добавляем минус для красных операций (transactionTypeNumber 2)
    if (transactionTypeNumber === 2) {
      return `-${formattedAmount}`;
    }

    return formattedAmount;
  };

  // Устанавливаем даты по умолчанию (последние 30 дней)
  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const formatDate = (date) => date.toISOString().split("T")[0];

    setFromDate(formatDate(thirtyDaysAgo));
    setToDate(formatDate(today));
    // Устанавливаем текущую дату для поиска по BIN
    setSearchDate(formatDate(today));
  }, []);

  // Получаем класс для строки в зависимости от типа транзакции
  // const getRowClass = (transactionTypeNumber) => {
  //   switch (transactionTypeNumber) {
  //     case 1:
  //       return "transaction-row--type-1";
  //     case 2:
  //       return "transaction-row--type-2";
  //     case 3:
  //       return "transaction-row--type-3";
  //     case 4:
  //       return "transaction-row--type-4";
  //     default:
  //       return "";
  //   }
  // };

  const showAlert = (message, type = "success") => {
    setAlert({
      show: true,
      message,
      type,
    });
  };

  const hideAlert = () => {
    setAlert({
      show: false,
      message: "",
      type: "success",
    });
  };

  const handleCardIdChange = (e) => {
    const value = e.target.value;
    setDisplayCardId(value);
    setCardId(value.replace(/\s/g, ""));
  };

  const handleSearchTypeChange = (e) => {
    const value = e.target.value;
    setSearchType(value);
    setDisplayCardId("");
    setCardId("");
    setAtmId("");
    setUtrnno("");
    setTransactionType("");
    setAmountFrom("");
    setAmountTo("");
    setReversal("");
    setMcc("");
    setCardBin("");
    setSearchTransactionType("");
    setSearchDate("");
    setFromTime("");
    setToTime("");
    setTransactions([]);
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    if (name === "fromDate") {
      setFromDate(value);
    } else {
      setToDate(value);
    }
  };

  const validateSearch = () => {
    // Проверяем корректность дат (для типов, где нужен диапазон дат)
    if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
      showAlert('Дата "С" не может быть больше даты "По"', "error");
      return false;
    }

    // Проверяем корректность времени (для поиска по BIN)
    if (searchType === "cardBinSearch" && fromTime && toTime) {
      const fromTimeObj = new Date(`1970-01-01T${fromTime}:00`);
      const toTimeObj = new Date(`1970-01-01T${toTime}:00`);
      if (fromTimeObj > toTimeObj) {
        showAlert('Время "С" не может быть больше времени "По"', "error");
        return false;
      }
    }

    // Валидация в зависимости от типа поиска
    switch (searchType) {
      case "cardId":
        if (!cardId.trim()) {
          showAlert("Введите идентификатор карты", "warning");
          return false;
        }
        break;
      case "atmId":
        if (!atmId.trim()) {
          showAlert("Введите номер терминала", "warning");
          return false;
        }
        break;
      case "utrnno":
        if (!utrnno.trim()) {
          showAlert("Введите номер операции", "warning");
          return false;
        }
        break;
      case "transactionType":
        if (!transactionType.trim()) {
          showAlert("Введите тип транзакции", "warning");
          return false;
        }
        break;
      case "amount":
        if (!amountFrom.trim() || !amountTo.trim()) {
          showAlert("Введите диапазон сумм", "warning");
          return false;
        }
        break;
      case "reversal":
        if (!reversal.trim()) {
          showAlert("Введите статус отмены (0 или 1)", "warning");
          return false;
        }
        break;
      case "mcc":
        if (!mcc.trim()) {
          showAlert("Введите MCC код", "warning");
          return false;
        }
        break;
      case "cardBinSearch":
        if (!cardBin.trim()) {
          showAlert("Введите BIN карты (первые 6 цифр)", "warning");
          return false;
        }
        if (cardBin.length !== 6) {
          showAlert("BIN карты должен содержать 6 цифр", "warning");
          return false;
        }
        if (!searchTransactionType.trim()) {
          showAlert("Введите тип транзакции", "warning");
          return false;
        }
        if (!searchDate.trim()) {
          showAlert("Выберите дату", "warning");
          return false;
        }
        break;
      default:
        showAlert("Выберите тип поиска", "warning");
        return false;
    }
    return true;
  };

  const handleSearch = async (id) => {
    if (!id) if (!validateSearch()) return;

    setIsLoading(true);
    try {
      let transactionsData = [];

      switch (searchType) {
        case "cardId":
          transactionsData = await fetchTransactionsByCardId(
            cardId || id,
            fromDate || undefined,
            toDate || undefined,
          );
          break;
        case "atmId":
          transactionsData = await fetchTransactionsByATM(
            atmId,
            fromDate || undefined,
            toDate || undefined,
          );
          break;
        case "utrnno":
          transactionsData = await fetchTransactionsByUTRNNO(utrnno);
          break;
        case "transactionType":
          transactionsData = await fetchTransactionsByType(
            transactionType,
            fromDate || undefined,
            toDate || undefined,
          );
          break;
        case "amount":
          transactionsData = await fetchTransactionsByAmount(
            amountFrom,
            amountTo,
            fromDate || undefined,
            toDate || undefined,
          );
          break;
        case "reversal":
          transactionsData = await fetchTransactionsByReversal(
            reversal,
            fromDate || undefined,
            toDate || undefined,
          );
          break;
        case "mcc":
          transactionsData = await fetchTransactionsByMCC(
            mcc,
            fromDate || undefined,
            toDate || undefined,
          );
          break;
        case "cardBinSearch":
          transactionsData = await fetchTransactionsByCardBinAndType(
            cardBin,
            searchTransactionType,
            searchDate,
            fromTime || undefined,
            toTime || undefined,
          );
          break;
        default:
          throw new Error("Неизвестный тип поиска");
      }

      if (transactionsData && Array.isArray(transactionsData)) {
        const formattedTransactions = transactionsData.map((transaction) => ({
          id: transaction.id,
          cardNumber: transaction.cardNumber,
          cardId: transaction.cardId,
          responseCode: transaction.responseCode,
          responseDescription: transaction.responseDescription,
          reqamt: transaction.reqamt,
          amount: transaction.amount,
          conamt: transaction.conamt,
          acctbal: transaction.acctbal,
          netbal: transaction.netbal,
          utrnno: transaction.utrnno,
          currency: transaction.currency,
          conCurrency: transaction.conCurrency,
          terminalId: transaction.terminalId,
          reversal: transaction.reversal,
          transactionType: transaction.transactionType,
          transactionTypeName: transaction.transactionTypeName,
          transactionTypeNumber: transaction.transactionTypeNumber,
          atmId: transaction.atmId,
          terminalAddress: transaction.terminalAddress,
          localTransactionDate: transaction.localTransactionDate,
          localTransactionTime: transaction.localTransactionTime,
          mcc: transaction.mcc,
          account: transaction.account,
        }));

        setTransactions(formattedTransactions);
        showAlert(
          `Загружено ${formattedTransactions.length} транзакций`,
          "success",
        );
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
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const formatCardNumber = (value) => {
    return value
      .replace(/\s/g, "")
      .replace(/(\d{4})/g, "$1 ")
      .trim();
  };

  const getStatusBadge = (responseCode, reversal, message) => {
    if (reversal) {
      return (
        <span className="status-badge status-badge--reversed">{message}</span>
      );
    }

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

  const clearFilters = () => {
    const today = new Date().toISOString().split("T")[0];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Сбрасываем все поля в зависимости от типа поиска
    if (searchType === "cardBinSearch") {
      setSearchDate(today);
      setFromTime("");
      setToTime("");
    } else {
      setFromDate(thirtyDaysAgo.toISOString().split("T")[0]);
      setToDate(today);
    }

    // Очищаем все поля поиска в зависимости от выбранного типа
    switch (searchType) {
      case "cardId":
        setDisplayCardId("");
        setCardId("");
        break;
      case "atmId":
        setAtmId("");
        break;
      case "utrnno":
        setUtrnno("");
        break;
      case "transactionType":
        setTransactionType("");
        break;
      case "amount":
        setAmountFrom("");
        setAmountTo("");
        break;
      case "reversal":
        setReversal("");
        break;
      case "mcc":
        setMcc("");
        break;
      case "cardBinSearch":
        setCardBin("");
        setSearchTransactionType("");
        break;
    }
    setTransactions([]);
  };

  useEffect(() => {
    if (id?.length) {
      handleSearch(id);
      setDisplayCardId(id);
      setCardId(id);
    }
  }, [id]);

  // Визуализация полей ввода в зависимости от типа поиска
  const renderSearchFields = () => {
    switch (searchType) {
      case "cardId":
        return (
          <div className="search-card__input-group">
            <label htmlFor="cardNumber" className="search-card__label">
              Идентификатор карты
            </label>
            <input
              type="text"
              id="cardNumber"
              value={displayCardId}
              onChange={handleCardIdChange}
              onKeyPress={handleKeyPress}
              className="search-card__input"
              disabled={isLoading}
              placeholder="Введите идентификатор карты"
              maxLength={19}
            />
          </div>
        );
      case "atmId":
        return (
          <div className="search-card__input-group">
            <label htmlFor="atmId" className="search-card__label">
              Номер терминала (ATM ID)
            </label>
            <input
              type="text"
              id="atmId"
              value={atmId}
              onChange={(e) => setAtmId(e.target.value)}
              onKeyPress={handleKeyPress}
              className="search-card__input"
              disabled={isLoading}
              placeholder="Например: 00000014"
            />
          </div>
        );
      case "utrnno":
        return (
          <div className="search-card__input-group">
            <label htmlFor="utrnno" className="search-card__label">
              Номер операции (UTRNNO)
            </label>
            <input
              type="text"
              id="utrnno"
              value={utrnno}
              onChange={(e) => setUtrnno(e.target.value)}
              onKeyPress={handleKeyPress}
              className="search-card__input"
              disabled={isLoading}
              placeholder="Например: 353403802"
            />
          </div>
        );
      case "transactionType":
        return (
          <div className="search-card__input-group">
            <label htmlFor="transactionType" className="search-card__label">
              Код типа транзакции
            </label>
            <input
              type="text"
              id="transactionType"
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value)}
              onKeyPress={handleKeyPress}
              className="search-card__input"
              disabled={isLoading}
              placeholder="Например: 774"
            />
          </div>
        );
      case "amount":
        return (
          <>
            <div className="search-card__input-group">
              <label htmlFor="amountFrom" className="search-card__label">
                Сумма от
              </label>
              <input
                type="number"
                id="amountFrom"
                value={amountFrom}
                onChange={(e) => setAmountFrom(e.target.value)}
                onKeyPress={handleKeyPress}
                className="search-card__input"
                disabled={isLoading}
                placeholder="Например: 10"
                min="0"
              />
            </div>
            <div className="search-card__input-group">
              <label htmlFor="amountTo" className="search-card__label">
                Сумма до
              </label>
              <input
                type="number"
                id="amountTo"
                value={amountTo}
                onChange={(e) => setAmountTo(e.target.value)}
                onKeyPress={handleKeyPress}
                className="search-card__input"
                disabled={isLoading}
                placeholder="Например: 1000"
                min="0"
              />
            </div>
          </>
        );
      case "reversal":
        return (
          <div className="search-card__input-group">
            <label htmlFor="reversal" className="search-card__label">
              Статус отмены (0 - нет, 1 - да)
            </label>
            <input
              type="text"
              id="reversal"
              value={reversal}
              onChange={(e) => setReversal(e.target.value)}
              onKeyPress={handleKeyPress}
              className="search-card__input"
              disabled={isLoading}
              placeholder="0 или 1"
              maxLength="1"
            />
          </div>
        );
      case "mcc":
        return (
          <div className="search-card__input-group">
            <label htmlFor="mcc" className="search-card__label">
              MCC код
            </label>
            <input
              type="text"
              id="mcc"
              value={mcc}
              onChange={(e) => setMcc(e.target.value)}
              onKeyPress={handleKeyPress}
              className="search-card__input"
              disabled={isLoading}
              placeholder="Например: 6011"
            />
          </div>
        );
      case "cardBinSearch":
        return (
          <>
            <div className="search-card__input-group">
              <label htmlFor="cardBin" className="search-card__label">
                BIN карты (первые 6 цифр)
              </label>
              <input
                type="text"
                id="cardBin"
                value={cardBin}
                onChange={(e) => setCardBin(e.target.value)}
                onKeyPress={handleKeyPress}
                className="search-card__input"
                disabled={isLoading}
                placeholder="Например: 478687"
                maxLength="6"
              />
            </div>
            <div className="search-card__input-group">
              <label
                htmlFor="searchTransactionType"
                className="search-card__label"
              >
                Тип транзакции
              </label>
              <input
                type="text"
                id="searchTransactionType"
                value={searchTransactionType}
                onChange={(e) => setSearchTransactionType(e.target.value)}
                onKeyPress={handleKeyPress}
                className="search-card__input"
                disabled={isLoading}
                placeholder="Например: 774"
              />
            </div>
            <div className="search-card__input-group">
              <label htmlFor="searchDate" className="search-card__label">
                Дата
              </label>
              <input
                type="date"
                id="searchDate"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="search-card__input"
                disabled={isLoading}
              />
            </div>
            <div className="search-card__time-group">
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
                  placeholder="ЧЧ:ММ"
                />
              </div>
              <div className="date-separator">—</div>
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
                  placeholder="ЧЧ:ММ"
                />
              </div>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  // Получение заголовка для таблицы в зависимости от типа поиска
  const getTableTitle = () => {
    const baseTitle = "Найденные транзакции";
    let searchInfo = "";

    switch (searchType) {
      case "cardId":
        searchInfo = `по карте с id ${displayCardId}`;
        break;
      case "atmId":
        searchInfo = `по терминалу ${atmId}`;
        break;
      case "utrnno":
        searchInfo = `по операции ${utrnno}`;
        break;
      case "transactionType":
        searchInfo = `по типу транзакции ${transactionType}`;
        break;
      case "amount":
        searchInfo = `по сумме от ${amountFrom} до ${amountTo}`;
        break;
      case "reversal":
        searchInfo = `по статусу отмены ${reversal}`;
        break;
      case "mcc":
        searchInfo = `по MCC коду ${mcc}`;
        break;
      case "cardBinSearch":
        searchInfo = `по BIN ${cardBin} и типу ${searchTransactionType} за ${searchDate}`;
        if (fromTime || toTime) {
          searchInfo += ` (${fromTime || "00:00"} - ${toTime || "23:59"})`;
        }
        break;
    }

    return `${baseTitle} ${searchInfo}`;
  };

  // Проверка, нужны ли даты для текущего типа поиска
  const needsDateRange = useMemo(() => {
    return searchType !== "utrnno"; // Для utrnno даты не нужны
  }, [searchType]);

  // Проверка, нужен ли блок дат для текущего типа поиска
  const needsDateBlock = useMemo(() => {
    return needsDateRange && searchType !== "cardBinSearch";
  }, [searchType, needsDateRange]);

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
            <div className="processing-integration__header">
              <h1 className="processing-integration__title">
                Мониторинг транзакций
              </h1>
              <p className="processing-integration__subtitle">
                Поиск транзакций без ограничений
              </p>
            </div>

            {/* Блок поиска с датами */}
            <div className="processing-integration__search-card">
              <div className="search-card">
                <div className="search-card__content">
                  {/* Выбор типа поиска */}
                  <div className="search-card__input-group search-card__select-group">
                    <label htmlFor="searchType" className="search-card__label">
                      Тип поиска
                    </label>
                    <div className="custom-select">
                      <select
                        id="searchType"
                        value={searchType}
                        onChange={handleSearchTypeChange}
                        className="search-card__select"
                        disabled={isLoading}
                      >
                        {searchOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Поля для поиска (зависит от типа) */}
                  {renderSearchFields()}

                  {/* Блок дат (скрываем для поиска по utrnno и cardBinSearch) */}
                  {needsDateBlock && (
                    <div className="search-card__date-group">
                      <div className="date-input-group">
                        <label
                          htmlFor="fromDate"
                          className="search-card__label"
                        >
                          С даты
                        </label>
                        <input
                          type="date"
                          id="fromDate"
                          name="fromDate"
                          value={fromDate}
                          onChange={handleDateChange}
                          className="search-card__date-input"
                          disabled={isLoading}
                        />
                      </div>
                      <div className="date-separator">—</div>
                      <div className="date-input-group">
                        <label htmlFor="toDate" className="search-card__label">
                          По дату
                        </label>
                        <input
                          type="date"
                          id="toDate"
                          name="toDate"
                          value={toDate}
                          onChange={handleDateChange}
                          className="search-card__date-input"
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  )}

                  {/* Кнопки */}
                  <div className="search-card__buttons">
                    <button
                      onClick={handleSearch}
                      disabled={isLoading}
                      className={`search-card__button ${isLoading ? "search-card__button--loading" : ""}`}
                    >
                      {isLoading ? "Поиск..." : "Найти"}
                    </button>
                    <button
                      onClick={clearFilters}
                      disabled={isLoading}
                      className="search-card__button search-card__button--secondary"
                    >
                      Очистить фильтры
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Таблица транзакций */}
          {transactions.length > 0 && (
            <div className="processing-integration__limits-table">
              <div className="limits-table">
                <div className="limits-table__header">
                  <h2 className="limits-table__title">
                    {getTableTitle()}
                    {needsDateBlock && fromDate && toDate && (
                      <span className="date-range">
                        ({fromDate} — {toDate})
                      </span>
                    )}
                  </h2>
                </div>

                <div className="limits-table__container">
                  <div className="limits-table__wrapper">
                    <table className="limits-table__content">
                      <thead className="limits-table__head">
                        <tr>
                          <th className="limits-table__th">Дата</th>
                          {/* <th className="limits-table__th">Время</th> */}
                          <th className="limits-table__th">Статус</th>
                          <th className="limits-table__th">Номер карты</th>
                          <th className="limits-table__th">ID карты</th>
                          <th className="limits-table__th">Тип операции</th>
                          <th className="limits-table__th">Сумма операции</th>
                          <th className="limits-table__th">Валюта</th>
                          <th className="limits-table__th">
                            Сумма в валюте карты
                          </th>
                          <th className="limits-table__th">Доступный баланс</th>
                          <th className="limits-table__th">Баланс карты</th>
                          <th className="limits-table__th">
                            Номер операции в ПЦ
                          </th>
                          <th className="limits-table__th">ID терминала</th>
                          <th className="limits-table__th">ID АТМ</th>
                          <th className="limits-table__th">
                            Запрошенная сумма
                          </th>
                          <th className="limits-table__th">Адрес терминала</th>
                          <th className="limits-table__th">MCC код</th>
                          <th className="limits-table__th">Счет</th>
                          <th className="limits-table__th">ID транзакции</th>
                        </tr>
                      </thead>
                      <tbody className="limits-table__body">
                        {transactions.map((transaction) => (
                          <tr
                            key={transaction.id}
                            className={`limits-table__row transaction-row `}
                          >
                            <td className="limits-table__td limits-table__td--value">
                              <span className="default-value">
                                {transaction.localTransactionDate || "N/A"}{" "}
                                {transaction.localTransactionTime || "N/A"}
                              </span>
                            </td>
                            {/* <td className="limits-table__td limits-table__td--value">
                              <span className="default-value">
                                {transaction.localTransactionTime || "N/A"}
                              </span>
                            </td> */}
                            <td className="limits-table__td limits-table__td--value">
                              {getStatusBadge(
                                transaction.responseCode,
                                transaction.reversal,
                                transaction.responseDescription,
                              )}
                              {/* {transaction.responseDescription} */}
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
                                  // transaction.transactionTypeNumber,
                                  // transaction.currency,
                                  // transaction.transactionType,
                                  dataTrans.find(
                                    (e) =>
                                      e.label === transaction.transactionType,
                                  ).value,
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
                                  // transaction.conCurrency,
                                  dataTrans.find(
                                    (e) =>
                                      e.label === transaction.transactionType,
                                  ).value,
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
                                  dataTrans.find(
                                    (e) =>
                                      e.label === transaction.transactionType,
                                  ).value,
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
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="limits-table__footer">
                    <div className="limits-table__stats">
                      <span className="limits-table__stat">
                        Всего записей: {transactions.length}
                      </span>
                      <span className="limits-table__stat">
                        Показано: {transactions.length}
                      </span>
                      {needsDateBlock && fromDate && toDate && (
                        <span className="limits-table__stat">
                          Период: {fromDate} — {toDate}
                        </span>
                      )}
                      <span className="limits-table__stat">
                        Тип поиска:{" "}
                        {
                          searchOptions.find((opt) => opt.value === searchType)
                            ?.label
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="processing-integration__loading">
              <div className="loading-spinner">
                {/* <div className="spinner"></div> */}
                {/* <p>Загрузка транзакций...</p> */}
              </div>
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
