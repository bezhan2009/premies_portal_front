import React, { useState, useEffect, useMemo, useCallback } from "react";
import Select from "../../../elements/Select";
import { Table } from "../../../table/FlexibleAntTable.jsx";
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
import { useParams, useNavigate } from "react-router-dom";
import { dataTrans } from "../../../../const/defConst.js";
import { useExcelExport } from "../../../../hooks/useExcelExport.js";
import { canAccessTransactions } from "../../../../api/roleHelper.js";
import { fetchConversionRates } from "../../../../api/conversion/conversion.js";
import CustomDateInput from "../../../elements/CustomDateInput.jsx";

const getTransactionTypeValue = (transactionType) => {
  if (!dataTrans || !Array.isArray(dataTrans)) return undefined;
  const found = dataTrans.find((e) => e.label === transactionType);
  return found?.value;
};

export default function DashboardOperatorProcessingTransactions() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { exportToExcel } = useExcelExport();

  const hasAccess = canAccessTransactions();
  const [isLimitedAccess, setIsLimitedAccess] = useState(false);
  const [allowedCardId, setAllowedCardId] = useState(null);
  const [transactions, setTransactions] = useState([]);

  const [searchType, setSearchType] = useState("cardId");
  const [displayCardId, setDisplayCardId] = useState("");
  const [cardId, setCardId] = useState("");
  const [atmId, setAtmId] = useState("");
  const [utrnno, setUtrnno] = useState("");
  const [transactionType, setTransactionType] = useState("");
  const [amountFrom, setAmountFrom] = useState("");
  const [amountTo, setAmountTo] = useState("");
  const [reversal, setReversal] = useState("");
  const [mcc, setMcc] = useState("");
  const [cardBin, setCardBin] = useState("");
  const [searchTransactionType, setSearchTransactionType] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [exchangeRates, setExchangeRates] = useState({ USD: 1, EUR: 1 });
  const [alert, setAlert] = useState({ show: false, message: "", type: "success" });

  const searchOptions = [
    { value: "cardId", label: "Поиск по идентификатору карты" },
    { value: "atmId", label: "Поиск по номеру терминала" },
    { value: "utrnno", label: "Поиск по номеру операции (UTRNNO)" },
    { value: "transactionType", label: "Поиск по типу транзакции" },
    { value: "amount", label: "Поиск по сумме операции" },
    { value: "reversal", label: "Поиск по статусу отмены" },
    { value: "mcc", label: "Поиск по MCC коду" },
    { value: "cardBinSearch", label: "Поиск по BIN карты и типу транзакции" },
  ];

  useEffect(() => {
    if (!hasAccess) {
      const storedCardId = sessionStorage.getItem("allowedCardId");
      if (storedCardId && id && storedCardId === id) {
        setIsLimitedAccess(true);
        setAllowedCardId(storedCardId);
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

  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const formatDate = (date) => date.toISOString().split("T")[0];
    setFromDate(formatDate(thirtyDaysAgo));
    setToDate(formatDate(today));
    setSearchDate(formatDate(today));
    const loadRates = async () => {
      try {
        const rates = await fetchConversionRates();
        const usdRate = rates.find(r => r.currencyFrom === "USD" && r.currencyTo === "TJS" && r.type === "from")?.amountTo || 1;
        const eurRate = rates.find(r => r.currencyFrom === "EUR" && r.currencyTo === "TJS" && r.type === "from")?.amountTo || 1;
        setExchangeRates({ USD: usdRate, EUR: eurRate });
      } catch (err) {
        console.error("Ошибка при загрузке курсов:", err);
      }
    };
    loadRates();
  }, []);

  const showAlert = useCallback((message, type = "success") => {
    setAlert({ show: true, message, type });
  }, []);

  const hideAlert = useCallback(() => {
    setAlert({ show: false, message: "", type: "success" });
  }, []);

  const handleCardIdChange = (e) => {
    const value = e.target.value;
    setDisplayCardId(value);
    setCardId(value.replace(/\s/g, ""));
  };

  const handleSearchTypeChange = (valueOrEvent) => {
    if (isLimitedAccess) {
      showAlert("У вас ограниченный доступ.", "warning");
      return;
    }
    const value = typeof valueOrEvent === "string" ? valueOrEvent : valueOrEvent?.target?.value;
    setSearchType(value);
    setDisplayCardId(""); setCardId(""); setAtmId(""); setUtrnno(""); setTransactionType("");
    setAmountFrom(""); setAmountTo(""); setReversal(""); setMcc(""); setCardBin("");
    setSearchTransactionType(""); setSearchDate(""); setFromTime(""); setToTime("");
    setTransactions([]);
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    if (name === "fromDate") setFromDate(value);
    else setToDate(value);
  };

  const validateSearch = useCallback(() => {
    if (isLimitedAccess && allowedCardId && cardId !== allowedCardId) {
      showAlert("У вас есть доступ только к просмотру истории конкретной карты", "error");
      return false;
    }
    if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
      showAlert('Дата "С" не может быть больше даты "По"', "error");
      return false;
    }
    if (isLimitedAccess && fromDate && toDate) {
      const diffDays = Math.ceil(Math.abs(new Date(toDate) - new Date(fromDate)) / (1000 * 60 * 60 * 24));
      if (diffDays > 31) {
        showAlert("Максимальный период для поиска: 31 день", "error");
        return false;
      }
    }
    // ... other validations (abbreviated for brevity but keeping core logic)
    return true;
  }, [searchType, cardId, fromDate, toDate, isLimitedAccess, allowedCardId, showAlert]);

  const handleSearch = useCallback(async (id) => {
    if (!id && !validateSearch()) return;
    setIsLoading(true);
    try {
      let transactionsData = [];
      const fDate = fromDate || undefined;
      const tDate = toDate || undefined;

      switch (searchType) {
        case "cardId": transactionsData = await fetchTransactionsByCardId(cardId || id, fDate, tDate); break;
        case "atmId": transactionsData = await fetchTransactionsByATM(atmId, fDate, tDate); break;
        case "utrnno": transactionsData = await fetchTransactionsByUTRNNO(utrnno); break;
        case "transactionType": transactionsData = await fetchTransactionsByType(transactionType, fDate, tDate); break;
        case "amount": transactionsData = await fetchTransactionsByAmount(amountFrom, amountTo, fDate, tDate); break;
        case "reversal": transactionsData = await fetchTransactionsByReversal(reversal, fDate, tDate); break;
        case "mcc": transactionsData = await fetchTransactionsByMCC(mcc, fDate, tDate); break;
        case "cardBinSearch": transactionsData = await fetchTransactionsByCardBinAndType(cardBin, searchTransactionType, searchDate, fromTime || undefined, toTime || undefined); break;
        default: throw new Error("Неизвестный тип поиска");
      }

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
  }, [searchType, cardId, fromDate, toDate, atmId, utrnno, transactionType, amountFrom, amountTo, reversal, mcc, cardBin, searchTransactionType, searchDate, fromTime, toTime, validateSearch, showAlert]);

  const handleExport = () => {
    const columns = [
      { key: "localTransactionDate", label: "Дата" },
      { key: "localTransactionTime", label: "Время" },
      { key: "responseDescription", label: "Статус" },
      { key: "cardNumber", label: "Номер карты" },
      { key: "cardId", label: "ID карты" },
      { key: "transactionTypeName", label: "Тип операции" },
      { key: (row) => `${formatAmount(row.amount, getTransactionTypeValue(row.transactionType) || row.transactionTypeNumber)} ${getCurrencyCode(row.currency)}`, label: "Сумма (валюта)" },
      { key: (row) => `${formatAmount(row.conamt, getTransactionTypeValue(row.transactionType) || row.transactionTypeNumber)} ${getCurrencyCode(row.conCurrency)}`, label: "Сумма в валюте карты (валюта)" },
      { key: (row) => formatAmount(row.acctbal), label: "Доступный баланс" },
      { key: "utrnno", label: "Номер операции в ПЦ" },
      { key: "terminalId", label: "ID терминала" },
      { key: "atmId", label: "ID АТМ" },
      { key: (row) => formatAmount(row.reqamt, getTransactionTypeValue(row.transactionType) || row.transactionTypeNumber), label: "Запрошенная сумма" },
      { key: "terminalAddress", label: "Адрес терминала" },
      { key: "mcc", label: "MCC код" },
      { key: "account", label: "Счет" },
      { key: (row) => {
          const rate = row.conCurrency === 840 ? exchangeRates.USD : row.conCurrency === 978 ? exchangeRates.EUR : 1;
          return formatAmount(Math.round((row.conamt || 0) * rate), getTransactionTypeValue(row.transactionType) || row.transactionTypeNumber);
        }, label: "Сумма в нац. валюте (TJS)" },
      { key: "id", label: "ID транзакции" },
    ];
    exportToExcel(transactions, columns, `Транзакции_${searchType}_${new Date().toISOString().split("T")[0]}`);
  };

  const formatCardNumber = (value) => value.replace(/\s/g, "").replace(/(\d{4})/g, "$1 ").trim();

  const getStatusBadge = (responseCode, reversal, message) => {
    if (reversal) return <span className="status-badge status-badge--reversed">Возврат</span>;
    switch (responseCode) {
      case "-1": return <span className="status-badge status-badge--success">{message}</span>;
      case "01": return <span className="status-badge status-badge--warning">{message}</span>;
      case "02": return <span className="status-badge status-badge--error">{message}</span>;
      default: return <span className="status-badge status-badge--warning">{message}</span>;
    }
  };

  const clearFilters = () => {
    const today = new Date().toISOString().split("T")[0];
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (searchType === "cardBinSearch") { setSearchDate(today); setFromTime(""); setToTime(""); }
    else { setFromDate(thirtyDaysAgo.toISOString().split("T")[0]); setToDate(today); }
    // ... clear specific fields
    setTransactions([]);
  };

  const getTableTitle = () => {
    const baseTitle = "Найденные транзакции";
    let searchInfo = "";
    switch (searchType) {
      case "cardId": searchInfo = `по карте с id ${displayCardId}`; break;
      case "atmId": searchInfo = `по терминалу ${atmId}`; break;
      case "utrnno": searchInfo = `по операции ${utrnno}`; break;
      case "transactionType": searchInfo = `по типу транзакции ${transactionType}`; break;
      default: break;
    }
    return `${baseTitle} ${searchInfo}`;
  };

  const needsDateBlock = searchType !== "utrnno" && searchType !== "cardBinSearch";

  useEffect(() => { if (id?.length) { handleSearch(id); setDisplayCardId(id); setCardId(id); } }, [id, handleSearch]);

  const renderSearchFields = () => {
    switch (searchType) {
      case "cardId": return (
        <div className="search-card__input-group">
          <label htmlFor="cardNumber" className="search-card__label">Идентификатор карты</label>
          <input type="text" id="cardNumber" value={displayCardId} onChange={handleCardIdChange} onKeyPress={(e) => e.key === "Enter" && handleSearch()} className="search-card__input" disabled={isLoading || !!id || isLimitedAccess} placeholder="Введите идентификатор карты" maxLength={19} />
        </div>
      );
      case "atmId": return (
        <div className="search-card__input-group">
          <label htmlFor="atmId" className="search-card__label">Номер терминала (ATM ID)</label>
          <input type="text" id="atmId" value={atmId} onChange={(e) => setAtmId(e.target.value)} onKeyPress={(e) => e.key === "Enter" && handleSearch()} className="search-card__input" disabled={isLoading || !!id} placeholder="Например: 00000014" />
        </div>
      );
      // ... (other cases simplified for implementation plan)
      default: return null;
    }
  };

  return (
    <>
      {alert.show && <AlertMessage message={alert.message} type={alert.type} onClose={hideAlert} duration={3000} />}
      <div className="block_info_prems content-page" align="center">
        <div className="processing-integration">
          <div className="processing-integration__container">
            <div className="processing-integration__search-card">
              <div className="search-card">
                <div className="search-card__content">
                  <div className="search-card__input-group search-card__select-group">
                    <label htmlFor="searchType" className="search-card__label">Тип поиска</label>
                    <Select id="searchType" value={searchType} onChange={handleSearchTypeChange} options={searchOptions} disabled={isLoading || !!id || isLimitedAccess} />
                  </div>
                  {renderSearchFields()}
                  {needsDateBlock && (
                    <div className="search-card__date-group">
                      <div className="date-input-group">
                        <label htmlFor="fromDate" className="search-card__label">С даты</label>
                        <CustomDateInput id="fromDate" type="date" value={fromDate} onChange={(value) => handleDateChange({ target: { name: "fromDate", value } })} disabled={isLoading} />
                      </div>
                      <div className="date-separator">-</div>
                      <div className="date-input-group">
                        <label htmlFor="toDate" className="search-card__label">По дату</label>
                        <CustomDateInput id="toDate" type="date" value={toDate} onChange={(value) => handleDateChange({ target: { name: "toDate", value } })} disabled={isLoading} />
                      </div>
                    </div>
                  )}
                  <div className="search-card__buttons">
                    <button onClick={() => handleSearch()} disabled={isLoading} className={`search-card__button ${isLoading ? "search-card__button--loading" : ""}`}>
                      {isLoading ? "Поиск..." : "Найти транзакции"}
                    </button>
                    <button onClick={clearFilters} disabled={isLoading} className="search-card__button search-card__button--secondary">Очистить</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {transactions.length > 0 && (
            <div className="processing-integration__limits-table">
              <div className="limits-table">
                <div className="limits-table__header">
                  <h2 className="limits-table__title">
                    {getTableTitle()}
                    {needsDateBlock && fromDate && toDate && <span className="date-range">({fromDate} — {toDate})</span>}
                  </h2>
                  <div className="table-header-actions">
                    <button onClick={handleExport} className="export-excel-btn">Экспорт в Excel</button>
                  </div>
                </div>
                <Table
                  dataSource={transactions}
                  rowKey="id"
                  pagination={{ pageSize: 15 }}
                  bordered
                  scroll={{ x: "max-content" }}
                >
                  <Table.Column title="Дата и время" key="dateTime" render={(_, row) => `${row.localTransactionDate || "N/A"} ${row.localTransactionTime || "N/A"}`} sortable />
                  <Table.Column title="Статус" key="status" render={(_, row) => getStatusBadge(row.responseCode, row.reversal, row.responseDescription)} />
                  <Table.Column title="Номер карты" key="cardNumber" render={(_, row) => row.cardNumber ? formatCardNumber(row.cardNumber) : "N/A"} sortable />
                  <Table.Column title="ID карты" dataIndex="cardId" key="cardId" sortable />
                  <Table.Column title="Тип операции" dataIndex="transactionTypeName" key="transactionTypeName" sortable />
                  <Table.Column title="Сумма (валюта)" key="amount" render={(_, row) => `${formatAmount(row.amount, getTransactionTypeValue(row.transactionType) || row.transactionTypeNumber)} ${getCurrencyCode(row.currency)}`} sortable />
                  <Table.Column title="Сумма в валюте карты" key="conamt" render={(_, row) => `${formatAmount(row.conamt, getTransactionTypeValue(row.transactionType) || row.transactionTypeNumber)} ${getCurrencyCode(row.conCurrency)}`} sortable />
                  <Table.Column title="Доступный баланс" key="acctbal" render={(_, row) => formatAmount(row.acctbal)} sortable />
                  <Table.Column title="UTRNNO" dataIndex="utrnno" key="utrnno" sortable />
                  <Table.Column title="ID терминала" dataIndex="terminalId" key="terminalId" sortable />
                  <Table.Column title="ID АТМ" dataIndex="atmId" key="atmId" sortable />
                  <Table.Column title="Запрошенная сумма" key="reqamt" render={(_, row) => formatAmount(row.reqamt, getTransactionTypeValue(row.transactionType) || row.transactionTypeNumber)} sortable />
                  <Table.Column title="Адрес терминала" dataIndex="terminalAddress" key="terminalAddress" />
                  <Table.Column title="MCC" dataIndex="mcc" key="mcc" />
                  <Table.Column title="Счет" dataIndex="account" key="account" />
                  <Table.Column title="ID транзакции" dataIndex="id" key="id" />
                  <Table.Column title="Сумма (TJS)" key="amountTjs" render={(_, row) => {
                      const rate = row.conCurrency === 840 ? exchangeRates.USD : row.conCurrency === 978 ? exchangeRates.EUR : 1;
                      return formatAmount(Math.round((row.conamt || 0) * rate), getTransactionTypeValue(row.transactionType) || row.transactionTypeNumber);
                    }} />
                </Table>
              </div>
            </div>
          )}

          {isLoading && <div className="processing-integration__loading"><div className="spinner"></div></div>}
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
