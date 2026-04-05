import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import "../../../styles/components/ProcessingIntegration.scss";
import "../../../styles/components/BlockInfo.scss";
import "../../../styles/components/DashboardOperatorProcessingTransactions.scss";
import AlertMessage from "../../../components/general/AlertMessage.jsx";
import { useExcelExport } from "../../../hooks/useExcelExport.js";
import CustomDateInput from "../../../components/elements/CustomDateInput.jsx";
import { Table } from "../../../components/table/FlexibleAntTable.jsx";

export default function DashboardAccountOperations() {
  const [displayAccountNumber, setDisplayAccountNumber] = useState("");
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialAccount = queryParams.get("account");
  const [accountNumber, setAccountNumber] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [alert, setAlert] = useState({
    show: false,
    message: "",
    type: "success",
  });
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState("");

  const { exportToExcel } = useExcelExport();

  // Функция для форматирования суммы
  const formatAmount = (amount) => {
    if (!amount) return "";
    const num = parseFloat(amount.toString().replace(",", "."));
    if (isNaN(num)) return "";
    return num.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Устанавливаем даты по умолчанию (последние 30 дней)
  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const formatDate = (date) => date.toISOString().split("T")[0];
    setFromDate(formatDate(thirtyDaysAgo));
    setToDate(formatDate(today));
  }, []);

  const showAlert = (message, type = "success") => {
    setAlert({ show: true, message, type });
    setTimeout(hideAlert, 3000);
  };

  const hideAlert = () => {
    setAlert({ show: false, message: "", type: "success" });
  };

  const handleAccountNumberChange = (e) => {
    const value = e.target.value;
    setDisplayAccountNumber(value);
    setAccountNumber(value.replace(/\s/g, ""));
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    if (name === "fromDate") setFromDate(value);
    else setToDate(value);
  };

  const formatToDDMMYYYY = (dateStr) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}.${m}.${y}`;
  };

  const handleAccountNumberSearch = useCallback(
    async (accNum) => {
      const targetAccount = accNum || accountNumber;
      if (targetAccount.trim()) {
        if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
          showAlert('Дата "С" не может быть больше даты "По"', "error");
          return;
        }
        setIsLoading(true);
        try {
          const baseUrl = import.meta.env.VITE_BACKEND_ABS_SERVICE_URL;
          const params = new URLSearchParams();
          const token = localStorage.getItem("access_token");
          if (fromDate) params.append("startDate", formatToDDMMYYYY(fromDate));
          if (toDate) params.append("endDate", formatToDDMMYYYY(toDate));
          params.append("accountNumber", targetAccount);
          const url = `${baseUrl}/account/operations?${params.toString()}`;
          const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
          if (!response.ok) throw new Error("Ошибка при загрузке данных");
          const data = await response.json();
          if (data && Array.isArray(data)) {
            const formatted = data.flatMap((day) =>
              day.Transactions.map((tx) => ({ ...tx, doper: day.DOPER, kurs: day.Kurs }))
            );
            setTransactions(formatted);
            showAlert(`Загружено ${formatted.length} операций`, "success");
          } else {
            setTransactions([]);
            showAlert("Операции не найдены", "warning");
          }
        } catch (error) {
          showAlert("Ошибка при загрузке данных: " + error.message, "error");
          setTransactions([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        showAlert("Введите номер счета", "warning");
      }
    },
    [accountNumber, fromDate, toDate]
  );

  useEffect(() => {
    if (initialAccount) {
      setAccountNumber(initialAccount);
      setDisplayAccountNumber(initialAccount);
      handleAccountNumberSearch(initialAccount);
    }
  }, [initialAccount, handleAccountNumberSearch]);

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleAccountNumberSearch();
  };

  const formatAccountNumber = (value) => {
    return value.replace(/\s/g, "").replace(/(\d{4})/g, "$1 ").trim();
  };

  const clearFilters = () => {
    const today = new Date().toISOString().split("T")[0];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    setFromDate(thirtyDaysAgo.toISOString().split("T")[0]);
    setToDate(today);
  };

  const sendOtp = async () => {
    if (!accountNumber.trim()) {
      showAlert("Введите номер счета", "warning");
      return;
    }
    try {
      const baseUrl = import.meta.env.VITE_BACKEND_URL;
      const token = localStorage.getItem("access_token");
      const resp = await fetch(`${baseUrl}/otp/send/${accountNumber.trim()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) throw new Error("Ошибка при отправке OTP");
      showAlert("Код отправлен на ваш номер телефона", "success");
      setShowOtpModal(true);
      setOtpCode("");
      setOtpError("");
    } catch (error) {
      showAlert("Ошибка при отправке OTP: " + error.message, "error");
    }
  };

  const verifyOtpAndExport = async (e) => {
    e.preventDefault();
    if (!otpCode.trim()) { setOtpError("Введите код подтверждения"); return; }
    setIsVerifyingOtp(true);
    setOtpError("");
    try {
      const baseUrl = import.meta.env.VITE_BACKEND_URL;
      const token = localStorage.getItem("access_token");
      const resp = await fetch(`${baseUrl}/otp/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ otp_code: otpCode.trim(), account: accountNumber.trim() })
      });
      if (!resp.ok) throw new Error("Ошибка при проверке кода");
      const data = await resp.json();
      if (data.message === false) throw new Error("Неверный код подтверждения");
      showAlert("Код подтвержден, начинаем экспорт", "success");
      setShowOtpModal(false);
      handleExport();
    } catch (error) {
      setOtpError(error.message || "Неверный код подтверждения");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleExport = () => {
    const columns = [
      { key: "DOCDOPER", label: "Дата документа" }, { key: "EXECDT", label: "Время" },
      { key: "TXTDSCR", label: "Назначение" }, { key: "MOVD", label: "Дебет" },
      { key: "MOVC", label: "Кредит" }, { key: "CLIENTCOR", label: "Клиент корреспондент" },
      { key: "ACCCOR", label: "Счет корреспондент" }, { key: "NAMEBCR", label: "Банк корреспондент" },
      { key: "doper", label: "Дата операции" }
    ];
    exportToExcel(transactions, columns, `Операции_${accountNumber}_${fromDate}_${toDate}`);
  };

  return (
    <>
      {alert.show && <AlertMessage message={alert.message} type={alert.type} onClose={hideAlert} duration={3000} />}

      {showOtpModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Подтверждение экспорта</h3>
            <p style={{ marginBottom: "15px", color: "#666" }}>Введите код подтверждения из SMS</p>
            <form onSubmit={verifyOtpAndExport}>
              <label>Код подтверждения:
                <input type="text" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="Введите код" maxLength={6} required autoFocus />
              </label>
              {otpError && <div className="modal-error">{otpError}</div>}
              <div className="modal-buttons">
                <button type="submit" disabled={isVerifyingOtp}>{isVerifyingOtp ? "Проверка..." : "Подтвердить"}</button>
                <button type="button" onClick={() => setShowOtpModal(false)} disabled={isVerifyingOtp}>Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="block_info_prems content-page" align="center">
        <div className="processing-integration">
          <div className="processing-integration__container">
            <div className="processing-integration__search-card">
              <div className="search-card">
                <div className="search-card__content">
                  <div className="search-card__input-group">
                    <label htmlFor="accountNumber" className="search-card__label">Номер счета</label>
                    <input type="text" id="accountNumber" value={displayAccountNumber} onChange={handleAccountNumberChange} onKeyPress={handleKeyPress} className="search-card__input" disabled={isLoading || !!initialAccount} placeholder="Введите номер счета" />
                  </div>
                  <div className="search-card__date-group">
                    <div className="date-input-group">
                      <label htmlFor="fromDate" className="search-card__label">С даты</label>
                      <CustomDateInput id="fromDate" type="date" value={fromDate} onChange={(val) => handleDateChange({ target: { name: "fromDate", value: val } })} disabled={isLoading} />
                    </div>
                    <div className="date-separator">—</div>
                    <div className="date-input-group">
                      <label htmlFor="toDate" className="search-card__label">По дату</label>
                      <CustomDateInput id="toDate" type="date" value={toDate} onChange={(val) => handleDateChange({ target: { name: "toDate", value: val } })} disabled={isLoading} />
                    </div>
                  </div>
                  <div className="search-card__buttons">
                    <button onClick={() => handleAccountNumberSearch()} disabled={(!accountNumber.trim() && !initialAccount) || isLoading || !!initialAccount} className={`search-card__button ${isLoading ? "search-card__button--loading" : ""}`}>
                      {isLoading ? "Поиск..." : "Найти"}
                    </button>
                    <button onClick={clearFilters} disabled={isLoading} className="search-card__button search-card__button--secondary">Очистить даты</button>
                    {transactions.length > 0 && <button onClick={sendOtp} disabled={isLoading} className="search-card__button search-card__button--export">Экспорт в Excel</button>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {transactions.length > 0 && (
            <div className="processing-integration__limits-table" style={{ marginTop: "20px" }}>
              <div className="limits-table">
                <div className="limits-table__header">
                  <h2 className="limits-table__title">Операции по счету {formatAccountNumber(displayAccountNumber)} {fromDate && toDate && <span className="date-range">({fromDate} — {toDate})</span>}</h2>
                </div>
                <Table dataSource={transactions} rowKey={(r, i) => `${r.PID}-${i}`} bordered loading={isLoading} scroll={{ x: "max-content" }} pagination={{ pageSize: 15 }}>
                  <Table.Column title="Дата документа" key="docdate" sortable render={(_, r) => `${r.DOCDOPER || ""} ${r.EXECDT || ""}`} />
                  <Table.Column title="Назначение" dataIndex="TXTDSCR" sortable />
                  <Table.Column title="Дебет" dataIndex="MOVD" sortable align="right" render={(v) => formatAmount(v)} />
                  <Table.Column title="Кредит" dataIndex="MOVC" sortable align="right" render={(v) => formatAmount(v)} />
                  <Table.Column title="Клиент кор." dataIndex="CLIENTCOR" sortable />
                  <Table.Column title="Счет кор." dataIndex="ACCCOR" sortable />
                  <Table.Column title="Банк кор." dataIndex="NAMEBCR" sortable />
                  <Table.Column title="Дата операции" dataIndex="doper" sortable />
                </Table>
              </div>
            </div>
          )}

          {isLoading && <div className="processing-integration__loading"><div className="spinner"></div></div>}
          {!isLoading && transactions.length === 0 && accountNumber.length > 0 && (
            <div className="processing-integration__no-data"><div className="no-data"><h3>Данные не найдены</h3><p>Для счета {formatAccountNumber(displayAccountNumber)} не найдено операций.</p></div></div>
          )}
        </div>
      </div>
      <style jsx>{` .search-card__button--export { background-color: #2196f3; } .search-card__button--export:hover:not(:disabled) { background-color: #0b7dda; } `}</style>
    </>
  );
}
