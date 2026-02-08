import React, { useState, useEffect } from "react";
import "../../../styles/components/ProcessingIntegration.scss";
import "../../../styles/components/BlockInfo.scss";
import "../../../styles/components/DashboardOperatorProcessingTransactions.scss";
import useSidebar from "../../../hooks/useSideBar.js";
import Sidebar from "../../general/DynamicMenu.jsx";
import AlertMessage from "../../../components/general/AlertMessage.jsx";

export default function DashboardAccountOperations() {
  const [displayAccountNumber, setDisplayAccountNumber] = useState("");
  const { isSidebarOpen, toggleSidebar } = useSidebar();
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

  // Функция для форматирования суммы
  const formatAmount = (amount) => {
    if (!amount) return "";
    const num = parseFloat(amount.replace(",", "."));
    if (isNaN(num)) return "";
    const formatted = num
      .toFixed(2)
      .replace(".", ",")
      .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return formatted;
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

  const handleAccountNumberChange = (e) => {
    const value = e.target.value;
    setDisplayAccountNumber(value);
    setAccountNumber(value.replace(/\s/g, ""));
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    if (name === "fromDate") {
      setFromDate(value);
    } else {
      setToDate(value);
    }
  };

  const formatToDDMMYYYY = (dateStr) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}.${m}.${y}`;
  };

  const handleAccountNumberSearch = async () => {
    if (accountNumber.trim()) {
      // Проверяем корректность дат
      if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
        showAlert('Дата "С" не может быть больше даты "По"', "error");
        return;
      }
      setIsLoading(true);
      try {
        const baseUrl = import.meta.env.VITE_BACKEND_ABS_SERVICE_URL;
        const params = new URLSearchParams();
        if (fromDate) params.append("startDate", formatToDDMMYYYY(fromDate));
        if (toDate) params.append("endDate", formatToDDMMYYYY(toDate));
        params.append("accountNumber", accountNumber);
        const url = `${baseUrl}/account/operations?${params.toString()}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Ошибка при загрузке данных");
        }
        const data = await response.json();
        if (data && Array.isArray(data)) {
          const formattedTransactions = data.flatMap((day) =>
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
          setTransactions(formattedTransactions);
          showAlert(
            `Загружено ${formattedTransactions.length} операций`,
            "success",
          );
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
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleAccountNumberSearch();
    }
  };

  const formatAccountNumber = (value) => {
    return value
      .replace(/\s/g, "")
      .replace(/(\d{4})/g, "$1 ")
      .trim();
  };

  const clearFilters = () => {
    const today = new Date().toISOString().split("T")[0];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    setFromDate(thirtyDaysAgo.toISOString().split("T")[0]);
    setToDate(today);
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
      <div
        className={`dashboard-container ${
          isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"
        }`}
      >
        <Sidebar
          activeLink="account_operations"
          isOpen={isSidebarOpen}
          toggle={toggleSidebar}
        />
        <div className="block_info_prems content-page" align="center">
          <div className="processing-integration">
            <div className="processing-integration__container">
              <div className="processing-integration__header">
                <h1 className="processing-integration__title">
                  Мониторинг операций по счету
                </h1>
                <p className="processing-integration__subtitle">
                  Поиск операций без ограничений
                </p>
              </div>
              {/* Блок поиска с датами */}
              <div className="processing-integration__search-card">
                <div className="search-card">
                  <div className="search-card__content">
                    {/* Номер счета */}
                    <div className="search-card__input-group">
                      <label
                        htmlFor="accountNumber"
                        className="search-card__label"
                      >
                        Номер счета
                      </label>
                      <input
                        type="text"
                        id="accountNumber"
                        value={displayAccountNumber}
                        onChange={handleAccountNumberChange}
                        onKeyPress={handleKeyPress}
                        className="search-card__input"
                        disabled={isLoading}
                        placeholder="Введите номер счета"
                      />
                    </div>
                    {/* Блок дат */}
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
                    {/* Кнопки */}
                    <div className="search-card__buttons">
                      <button
                        onClick={handleAccountNumberSearch}
                        disabled={!accountNumber.trim() || isLoading}
                        className={`search-card__button ${isLoading ? "search-card__button--loading" : ""}`}
                      >
                        {isLoading ? "Поиск..." : "Найти"}
                      </button>
                      <button
                        onClick={clearFilters}
                        disabled={isLoading}
                        className="search-card__button search-card__button--secondary"
                      >
                        Очистить даты
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Таблица операций */}
            {transactions.length > 0 && (
              <div className="processing-integration__limits-table">
                <div className="limits-table">
                  <div className="limits-table__header">
                    <h2 className="limits-table__title">
                      Операции по счету{" "}
                      {formatAccountNumber(displayAccountNumber)}
                      {fromDate && toDate && (
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
                            <th className="limits-table__th">Дата документа</th>
                            {/* <th className="limits-table__th">Время </th> */}
                            <th className="limits-table__th">Назначение</th>
                            <th className="limits-table__th">Дебет</th>
                            <th className="limits-table__th">Кредит</th>

                            {/* <th className="limits-table__th">
                              Валютная дата
                            </th>
                            <th className="limits-table__th">
                              Референс (REFER)
                            </th> */}
                            {/* <th className="limits-table__th">
                              Номер документа (NUMDOC)
                            </th> */}
                            <th className="limits-table__th">
                              Клиент корреспондент
                            </th>
                            <th className="limits-table__th">
                              Счет корреспондент
                            </th>
                            <th className="limits-table__th">
                              Банк корреспондент
                            </th>
                            {/* <th className="limits-table__th">Курс (kurs)</th> */}
                            {/* <th className="limits-table__th">PDepID</th> */}
                            {/* <th className="limits-table__th">PID</th> */}
                            {/* <th className="limits-table__th">KSOCODE</th> */}
                            {/* <th className="limits-table__th">BNKKOR</th> */}
                            {/* <th className="limits-table__th">JCODEBE</th> */}
                            {/* <th className="limits-table__th">JRNNCR</th> */}
                            <th className="limits-table__th">
                              Оборот по дебету
                            </th>
                            <th className="limits-table__th">
                              Оборот по кредиту
                            </th>
                            {/* <th className="limits-table__th">CODEBCR</th> */}
                            {/* <th className="limits-table__th">KNP</th> */}
                            {/* <th className="limits-table__th">CODEBC</th> */}
                            {/* <th className="limits-table__th">TXT_HEAD</th> */}
                            {/* <th className="limits-table__th">TXT_BUCH</th> */}
                            {/* <th className="limits-table__th">CMSFL</th>
                            <th className="limits-table__th">PARENT_REFER</th>
                            <th className="limits-table__th">KURS_ISP</th> */}

                            <th className="limits-table__th">Дата операции</th>
                          </tr>
                        </thead>
                        <tbody className="limits-table__body">
                          {transactions.map((transaction, index) => (
                            <tr
                              key={`${transaction.PID}-${index}`}
                              className="limits-table__row transaction-row"
                            >
                              <td className="limits-table__td limits-table__td--value">
                                <span className="default-value">
                                  {transaction.DOCDOPER || "N/A"}{" "}
                                  {transaction.EXECDT || "N/A"}
                                </span>
                              </td>
                              {/* <td className="limits-table__td limits-table__td--value">
                                <span className="default-value">
                                  {transaction.EXECDT || "N/A"}
                                </span>
                              </td> */}
                              <td className="limits-table__td limits-table__td--value">
                                <span className="default-value">
                                  {transaction.TXTDSCR || "N/A"}
                                </span>
                              </td>
                              <td className="limits-table__td limits-table__td--value">
                                <span className="amount-value">
                                  {formatAmount(transaction.MOVD)}
                                </span>
                              </td>
                              <td className="limits-table__td limits-table__td--value">
                                <span className="amount-value">
                                  {formatAmount(transaction.MOVC)}
                                </span>
                              </td>
                              {/* <td className="limits-table__td limits-table__td--value">
                                <span className="amount-value">
                                  {formatAmount(transaction.sumBalOut)}
                                </span>
                              </td> */}
                              {/* <td className="limits-table__td limits-table__td--value">
                                <span className="default-value">
                                  {transaction.DVAL || "N/A"}
                                </span>
                              </td>
                              <td className="limits-table__td limits-table__td--value">
                                <span className="default-value">
                                  {transaction.REFER || "N/A"}
                                </span>
                              </td> */}
                              {/* <td className="limits-table__td limits-table__td--value">
                                <span className="default-value">
                                  {transaction.NUMDOC || "N/A"}
                                </span>
                              </td> */}
                              <td className="limits-table__td limits-table__td--value">
                                <span className="default-value">
                                  {transaction.CLIENTCOR || "N/A"}
                                </span>
                              </td>
                              <td className="limits-table__td limits-table__td--value">
                                <span className="default-value">
                                  {transaction.ACCCOR || "N/A"}
                                </span>
                              </td>
                              <td className="limits-table__td limits-table__td--value">
                                <span className="default-value">
                                  {transaction.NAMEBCR || "N/A"}
                                </span>
                              </td>
                              {/* <td className="limits-table__td limits-table__td--value">
                                <span className="default-value">
                                  {transaction.kurs || "N/A"}
                                </span>
                              </td> */}
                              {/* <td className="limits-table__td limits-table__td--value">
                                <span className="default-value">
                                  {transaction.PDepID || "N/A"}
                                </span>
                              </td> */}
                              {/* <td className="limits-table__td limits-table__td--value">
                                <span className="default-value">
                                  {transaction.PID || "N/A"}
                                </span>
                              </td>
                              <td className="limits-table__td limits-table__td--value">
                                <span className="default-value">
                                  {transaction.KSOCODE || "N/A"}
                                </span>
                              </td>
                              <td className="limits-table__td limits-table__td--value">
                                <span className="default-value">
                                  {transaction.BNKKOR || "N/A"}
                                </span>
                              </td>
                              <td className="limits-table__td limits-table__td--value">
                                <span className="default-value">
                                  {transaction.JCODEBE || "N/A"}
                                </span>
                              </td>
                              <td className="limits-table__td limits-table__td--value">
                                <span className="default-value">
                                  {transaction.JRNNCR || "N/A"}
                                </span>
                              </td> */}
                              <td className="limits-table__td limits-table__td--value">
                                <span className="amount-value">
                                  {formatAmount(transaction.MOVDN)}
                                </span>
                              </td>
                              <td className="limits-table__td limits-table__td--value">
                                <span className="amount-value">
                                  {formatAmount(transaction.MOVCN)}
                                </span>
                              </td>
                              {/* <td className="limits-table__td limits-table__td--value">
                                <span className="default-value">
                                  {transaction.CODEBCR || "N/A"}
                                </span>
                              </td>
                              <td className="limits-table__td limits-table__td--value">
                                <span className="default-value">
                                  {transaction.KNP || "N/A"}
                                </span>
                              </td>
                              <td className="limits-table__td limits-table__td--value">
                                <span className="default-value">
                                  {transaction.CODEBC || "N/A"}
                                </span>
                              </td>
                              <td className="limits-table__td limits-table__td--value">
                                <span className="default-value">
                                  {transaction.TXT_HEAD || "N/A"}
                                </span>
                              </td>
                              <td className="limits-table__td limits-table__td--value">
                                <span className="default-value">
                                  {transaction.TXT_BUCH || "N/A"}
                                </span>
                              </td>
                              <td className="limits-table__td limits-table__td--value">
                                <span className="default-value">
                                  {transaction.CMSFL || "N/A"}
                                </span>
                              </td>
                              <td className="limits-table__td limits-table__td--value">
                                <span className="default-value">
                                  {transaction.PARENT_REFER || "N/A"}
                                </span>
                              </td>
                              <td className="limits-table__td limits-table__td--value">
                                <span className="default-value">
                                  {transaction.KURS_ISP || "N/A"}
                                </span>
                              </td> */}
                              <td className="limits-table__td limits-table__td--value">
                                <span className="default-value">
                                  {transaction.doper || "N/A"}
                                </span>
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
                        <span className="limits-table__stat">
                          Счет: {formatAccountNumber(displayAccountNumber)}
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
            {!isLoading &&
              transactions.length === 0 &&
              accountNumber.length > 0 && (
                <div className="processing-integration__no-data">
                  <div className="no-data">
                    <h3>Данные не найдены</h3>
                    <p>
                      Для счета {formatAccountNumber(displayAccountNumber)} не
                      найдено операций за выбранный период.
                    </p>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>
    </>
  );
}
