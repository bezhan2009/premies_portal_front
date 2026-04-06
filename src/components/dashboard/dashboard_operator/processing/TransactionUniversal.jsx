import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Table } from "../../../table/FlexibleAntTable.jsx";
import "../../../../styles/components/ProcessingIntegration.scss";
import "../../../../styles/components/BlockInfo.scss";
import "../../../../styles/components/DashboardOperatorProcessingTransactions.scss";
import "../../../../styles/components/TxnFilter.scss";
import AlertMessage from "../../../general/AlertMessage.jsx";
import { fetchTransactionsSearch } from "../../../../api/processing/transactions.js";
import { getCurrencyCode } from "../../../../api/utils/getCurrencyCode.js";
import { dataTrans } from "../../../../const/defConst.js";
import { useExcelExport } from "../../../../hooks/useExcelExport.js";
import { canAccessTransactions } from "../../../../api/roleHelper.js";
import TransactionsChart from "../../../graph/graph.jsx";
import { fetchConversionRates } from "../../../../api/conversion/conversion.js";
import CustomDateInput from "../../../elements/CustomDateInput.jsx";

const getTransactionTypeValue = (transactionType) => {
  if (!dataTrans || !Array.isArray(dataTrans)) return undefined;
  const found = dataTrans.find((e) => e.label === transactionType);
  return found?.value;
};

const TagInput = ({ tags, onChange, disabled, placeholder }) => {
  const [inputVal, setInputVal] = useState("");
  const addTags = (raw) => {
    const newTags = raw.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
    if (!newTags.length) return;
    onChange([...new Set([...tags, ...newTags])]);
    setInputVal("");
  };
  const removeTag = (idx) => onChange(tags.filter((_, i) => i !== idx));
  const handleKeyDown = (e) => {
    if (["Enter", ","].includes(e.key)) {
      e.preventDefault();
      addTags(inputVal);
    } else if (e.key === "Backspace" && !inputVal && tags.length) removeTag(tags.length - 1);
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", padding: "4px 8px", border: "1px solid #ced4da", borderRadius: "6px", minHeight: "36px", alignItems: "center", background: disabled ? "#f8f9fa" : "#fff", cursor: disabled ? "not-allowed" : "text" }}>
      {tags.map((tag, i) => (
        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "3px", background: "#ffe7e7", color: "#eb2525", borderRadius: "4px", padding: "2px 7px", fontSize: "12px", fontWeight: 500, whiteSpace: "nowrap" }}>
          {tag}
          {!disabled && <button type="button" onClick={() => removeTag(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#eb2525", fontSize: "14px", lineHeight: 1, padding: 0 }}>×</button>}
        </span>
      ))}
      {!disabled && <input value={inputVal} onChange={(e) => setInputVal(e.target.value)} onKeyDown={handleKeyDown} onBlur={() => inputVal.trim() && addTags(inputVal)} placeholder={tags.length ? "" : placeholder} style={{ border: "none", outline: "none", fontSize: "13px", flex: 1, minWidth: "100px", background: "transparent", padding: "2px 0" }} />}
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
  const [alert, setAlert] = useState({ show: false, message: "", type: "success" });

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
  const [transactionTypes, setTransactionTypes] = useState([]);
  const [atmId, setAtmId] = useState("");
  const [mcc, setMcc] = useState("");
  const [account, setAccount] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [exchangeRates, setExchangeRates] = useState({ USD: 1, EUR: 1 });
  const [excludeTransactionTypes, setExcludeTransactionTypes] = useState("");
  const [excludeAtmIds, setExcludeAtmIds] = useState("");
  const [excludeMcc, setExcludeMcc] = useState("");
  const [excludeAccounts, setExcludeAccounts] = useState("");
  const [displayCardNumber, setDisplayCardNumber] = useState("");

  const showAlert = useCallback((message, type = "success") => setAlert({ show: true, message, type }), []);
  const hideAlert = useCallback(() => setAlert({ show: false, message: "", type: "success" }), []);
  const formatCardNumber = (value) => value.replace(/\s/g, "").replace(/(\d{4})/g, "$1 ").trim();
  const handleCardNumberChange = (e) => { const raw = e.target.value; setDisplayCardNumber(raw); setCardNumber(raw.replace(/\s/g, "")); };

  const formatAmount = (amount) => {
    if (amount === null || amount === undefined || amount === "") return "N/A";
    const absAmount = Math.abs(Number(amount));
    const amountStr = absAmount.toString();
    if (amountStr.length <= 2) return `0,${amountStr.padStart(2, "0")}`;
    const integerPart = amountStr.slice(0, -2);
    const decimalPart = amountStr.slice(-2);
    return `${integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ")},${decimalPart}`;
  };

  const getStatusBadge = (responseCode, reversal, message) => {
    if (reversal) return <span className="status-badge status-badge--reversed">Возврат</span>;
    switch (responseCode) {
      case "-1": return <span className="status-badge status-badge--success">{message}</span>;
      case "01": return <span className="status-badge status-badge--warning">{message}</span>;
      case "02": return <span className="status-badge status-badge--error">{message}</span>;
      default: return <span className="status-badge status-badge--warning">{message}</span>;
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
        const usdRate = rates.find(r => r.currencyFrom === "USD" && r.currencyTo === "TJS" && r.type === "from")?.amountTo || 1;
        const eurRate = rates.find(r => r.currencyFrom === "EUR" && r.currencyTo === "TJS" && r.type === "from")?.amountTo || 1;
        setExchangeRates({ USD: usdRate, EUR: eurRate });
      } catch (err) { console.error("Ошибка при загрузке курсов:", err); }
    };
    loadRates();
  }, []);

  useEffect(() => {
    if (!hasAccess) {
      const storedCardId = sessionStorage.getItem("allowedCardId");
      if (storedCardId && id && storedCardId === id) { setIsLimitedAccess(true); setAllowedCardId(storedCardId); setCardId(storedCardId); }
      else if (storedCardId && !id) { setIsLimitedAccess(true); setAllowedCardId(storedCardId); navigate("/processing/transactions/" + storedCardId, { replace: true }); }
      else { setIsLimitedAccess(true); setAllowedCardId(null); }
    }
  }, [hasAccess, id, navigate]);

  const validateSearch = useCallback(() => {
    if (isLimitedAccess && allowedCardId && cardId !== allowedCardId) { showAlert("У вас есть доступ только к истории конкретной карты", "error"); return false; }
    if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) { showAlert('Дата "С" не может быть больше даты "По"', "error"); return false; }
    return true;
  }, [isLimitedAccess, allowedCardId, cardId, fromDate, toDate, showAlert]);

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
      if (transactionTypes.length > 0) params.transactionTypes = transactionTypes;
      if (atmId) params.atmId = atmId;
      if (mcc) params.mcc = parseInt(mcc, 10);
      if (account) params.account = account;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      if (fromTime) params.fromTime = fromTime;
      if (toTime) params.toTime = toTime;
      if (excludeTransactionTypes) params.excludeTransactionTypes = excludeTransactionTypes;
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
    } catch (error) { showAlert("Ошибка при загрузке данных: " + error.message, "error"); setTransactions([]); }
    finally { setIsLoading(false); }
  }, [cardNumber, cardId, responseCode, reqamt, amount, conamt, acctbal, netbal, utrnno, currency, conCurrency, reversal, transactionTypes, atmId, mcc, account, fromDate, toDate, fromTime, toTime, excludeTransactionTypes, excludeAtmIds, excludeMcc, excludeAccounts, validateSearch, showAlert]);

  useEffect(() => { if (id?.length) { setCardId(id); handleSearch(); } }, [id, handleSearch]);

  const clearFilters = () => {
    setCardNumber(""); setDisplayCardNumber(""); if (!isLimitedAccess) setCardId("");
    setResponseCode(""); setReqamt(""); setAmount(""); setConamt(""); setAcctbal(""); setNetbal(""); setUtrnno(""); setCurrency(""); setConCurrency(""); setReversal(""); setTransactionTypes([]); setAtmId(""); setMcc(""); setAccount("");
    const today = new Date(); const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(today.getDate() - 30);
    setFromDate(thirtyDaysAgo.toISOString().split("T")[0]); setToDate(today.toISOString().split("T")[0]);
    setFromTime(""); setToTime(""); setExcludeTransactionTypes(""); setExcludeAtmIds(""); setExcludeMcc(""); setExcludeAccounts(""); setTransactions([]);
  };

  const { totalAmount, totalCountByResponse } = React.useMemo(() => {
    let total = 0; const counts = { success: 0, error: 0, warning: 0, reversal: 0 };
    transactions.forEach((tx) => {
      const val = parseFloat(tx.conamt || 0);
      const type = getTransactionTypeValue(tx.transactionType) || tx.transactionTypeNumber;
      if (type === 2) total -= val; else total += val;
      if (tx.reversal) counts.reversal++;
      else {
        switch (tx.responseCode) {
          case "-1": counts.success++; break;
          case "02": counts.error++; break;
          default: counts.warning++; break;
        }
      }
    });
    return { totalAmount: total, totalCountByResponse: counts };
  }, [transactions]);

  const handleExport = () => {
    const columns = [
      { key: "localTransactionDate", label: "Дата" },
      { key: "localTransactionTime", label: "Время" },
      { key: "responseDescription", label: "Статус" },
      { key: "cardNumber", label: "Номер карты" },
      { key: "cardId", label: "ID карты" },
      { key: "transactionTypeName", label: "Тип операции" },
      { key: (row) => `${formatAmount(row.amount)} ${getCurrencyCode(row.currency)}`, label: "Сумма" },
      { key: (row) => `${formatAmount(row.conamt)} ${getCurrencyCode(row.conCurrency)}`, label: "Сумма в валюте карты" },
      { key: (row) => formatAmount(row.acctbal), label: "Доступный баланс" },
      { key: "utrnno", label: "UTRNNO" },
      { key: "terminalId", label: "ID терминала" },
      { key: "atmId", label: "ID АТМ" },
      { key: (row) => formatAmount(row.reqamt), label: "Запрошенная сумма" },
      { key: "terminalAddress", label: "Адрес терминала" },
      { key: "mcc", label: "MCC" },
      { key: "account", label: "Счет" },
      { key: (row) => {
          const rate = row.conCurrency === 840 ? exchangeRates.USD : row.conCurrency === 978 ? exchangeRates.EUR : 1;
          return formatAmount(Math.round((row.conamt || 0) * rate));
        }, label: "Сумма (TJS)" },
      { key: "id", label: "ID транзакции" },
    ];
    exportToExcel(transactions, columns, `Транзакции_${new Date().toISOString().split("T")[0]}`);
  };

  return (
    <>
      {alert.show && <AlertMessage message={alert.message} type={alert.type} onClose={hideAlert} duration={3000} />}
      <div className="block_info_prems content-page" align="center">
        <div className="processing-integration">
          <div className="txn-filter">
            <div className="txn-filter__card">
              <div className="txn-filter__body">
                <div className="txn-filter__section">
                  <div className="txn-filter__section-label">🔍 Идентификаторы</div>
                  <div className="txn-filter__fields">
                    <div className="txn-filter__field"><label>Номер карты</label><input type="text" value={displayCardNumber} onChange={handleCardNumberChange} disabled={isLoading} placeholder="**** **** **** ****" /></div>
                    <div className="txn-filter__field"><label>ID карты</label><input type="text" value={cardId} onChange={(e) => setCardId(e.target.value)} disabled={isLoading || isLimitedAccess} /></div>
                    <div className="txn-filter__field"><label>ATM ID</label><input type="text" value={atmId} onChange={(e) => setAtmId(e.target.value)} disabled={isLoading} /></div>
                  </div>
                </div>
                <div className="txn-filter__section">
                  <div className="txn-filter__section-label">⚙️ Параметры</div>
                  <div className="txn-filter__fields">
                    <div className="txn-filter__field"><label>UTRNNO</label><input type="text" value={utrnno} onChange={(e) => setUtrnno(e.target.value)} disabled={isLoading} /></div>
                    <div className="txn-filter__field" style={{ minWidth: "220px" }}><label>Типы транзакций</label><TagInput tags={transactionTypes} onChange={setTransactionTypes} disabled={isLoading} placeholder="313, 760..." /></div>
                    <div className="txn-filter__field"><label>MCC</label><input type="text" value={mcc} onChange={(e) => setMcc(e.target.value)} disabled={isLoading} /></div>
                    <div className="txn-filter__field"><label>Resp Code</label><input type="text" value={responseCode} onChange={(e) => setResponseCode(e.target.value)} disabled={isLoading} /></div>
                  </div>
                </div>
                <div className="txn-filter__section txn-filter__section--exclude">
                  <div className="txn-filter__section-label">🚫 Исключения</div>
                  <div className="txn-filter__fields">
                    <div className="txn-filter__field"><label>Искл. типы</label><input type="text" value={excludeTransactionTypes} onChange={(e) => setExcludeTransactionTypes(e.target.value)} disabled={isLoading} /></div>
                    <div className="txn-filter__field"><label>Искл. ATM</label><input type="text" value={excludeAtmIds} onChange={(e) => setExcludeAtmIds(e.target.value)} disabled={isLoading} /></div>
                    <div className="txn-filter__field"><label>Искл. MCC</label><input type="text" value={excludeMcc} onChange={(e) => setExcludeMcc(e.target.value)} disabled={isLoading} /></div>
                  </div>
                </div>
                <div className="txn-filter__section">
                  <div className="txn-filter__section-label">📅 Период</div>
                  <div className="txn-filter__fields">
                    <div className="txn-filter__field"><label>С даты</label><CustomDateInput type="date" value={fromDate} onChange={setFromDate} disabled={isLoading} /></div>
                    <div className="txn-filter__field"><label>По дату</label><CustomDateInput type="date" value={toDate} onChange={setToDate} disabled={isLoading} /></div>
                  </div>
                </div>
                <div className="txn-filter__actions">
                  <button onClick={handleSearch} disabled={isLoading}>{isLoading ? "Поиск..." : "Найти"}</button>
                  <button onClick={clearFilters} disabled={isLoading} className="txn-filter__btn--secondary">Очистить</button>
                </div>
              </div>
            </div>
          </div>

          {transactions.length > 0 && (
            <div className="txn-stats">
              <div className="txn-stats__grid">
                <div className="txn-stats__card"><div>Общая сумма</div><div className="txn-stats__value">{formatAmount(totalAmount)}</div></div>
                <div className="txn-stats__card txn-stats__card--success"><div>Успешных</div><div className="txn-stats__value">{totalCountByResponse.success}</div></div>
                <div className="txn-stats__card txn-stats__card--error"><div>Ошибочных</div><div className="txn-stats__value">{totalCountByResponse.error}</div></div>
              </div>
              <div className="txn-stats__chart"><TransactionsChart transactions={transactions} /></div>
            </div>
          )}

          {transactions.length > 0 && (
            <div className="processing-integration__limits-table">
              <div className="limits-table">
                <div className="limits-table__header">
                  <h2 className="limits-table__title">Результаты поиска {fromDate && `(${fromDate} — ${toDate})`}</h2>
                  <button onClick={handleExport} className="export-excel-btn">Экспорт в Excel</button>
                </div>
                <Table
                  dataSource={transactions}
                  rowKey="id"
                  pagination={{ pageSize: 20 }}
                  bordered
                  scroll={{ x: "max-content" }}
                >
                  <Table.Column title="Дата" key="date" render={(_, row) => `${row.localTransactionDate} ${row.localTransactionTime}`} sortable />
                  <Table.Column title="Статус" key="status" render={(_, row) => getStatusBadge(row.responseCode, row.reversal, row.responseDescription)} />
                  <Table.Column title="Номер карты" key="card" render={(_, row) => row.cardNumber ? formatCardNumber(row.cardNumber) : "N/A"} sortable />
                  <Table.Column title="ID карты" dataIndex="cardId" key="cardId" sortable />
                  <Table.Column title="Тип операции" dataIndex="transactionTypeName" key="type" sortable />
                  <Table.Column title="Сумма" key="amount" render={(_, row) => `${formatAmount(row.amount)} ${getCurrencyCode(row.currency)}`} sortable />
                  <Table.Column title="Сумма (карты)" key="conamt" render={(_, row) => `${formatAmount(row.conamt)} ${getCurrencyCode(row.conCurrency)}`} sortable />
                  <Table.Column title="Доступ. баланс" key="acctbal" render={(_, row) => formatAmount(row.acctbal)} sortable />
                  <Table.Column title="UTRNNO" dataIndex="utrnno" key="utrnno" />
                  <Table.Column title="ATM ID" dataIndex="atmId" key="atmId" />
                  <Table.Column title="MCC" dataIndex="mcc" key="mcc" />
                  <Table.Column title="Счет" dataIndex="account" key="account" />
                  <Table.Column title="Сумма (TJS)" key="tjs" render={(_, row) => {
                      const rate = row.conCurrency === 840 ? exchangeRates.USD : row.conCurrency === 978 ? exchangeRates.EUR : 1;
                      return formatAmount(Math.round((row.conamt || 0) * rate));
                    }} />
                </Table>
              </div>
            </div>
          )}

          {isLoading && <div className="processing-integration__loading"><div className="spinner"></div></div>}
          {!isLoading && transactions.length === 0 && <div className="no-data"><h3>Данные не найдены</h3></div>}
        </div>
      </div>
    </>
  );
}
