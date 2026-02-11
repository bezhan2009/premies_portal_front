import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import "../../../styles/components/ProcessingIntegration.scss";
import "../../../styles/components/BlockInfo.scss";
import "../../../styles/components/DashboardOperatorProcessingTransactions.scss";
import useSidebar from "../../../hooks/useSideBar.js";
import Sidebar from "../../general/DynamicMenu.jsx";
import AlertMessage from "../../../components/general/AlertMessage.jsx";
import { useExcelExport } from "../../../hooks/useExcelExport.js";
import { useTableSort } from "../../../hooks/useTableSort.js";
import SortIcon from "../../../components/general/SortIcon.jsx";

export default function DashboardAccountOperations() {
    const [displayAccountNumber, setDisplayAccountNumber] = useState("");
    const { isSidebarOpen, toggleSidebar } = useSidebar();
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

    const { exportToExcel } = useExcelExport();
    const {
        items: sortedTransactions,
        requestSort,
        sortConfig,
    } = useTableSort(transactions);

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

    const handleAccountNumberSearch = useCallback(
        async (accNum) => {
            const targetAccount = accNum || accountNumber;
            if (targetAccount.trim()) {
                // Проверяем корректность дат
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
                    const response = await fetch(url, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });
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
        },
        [accountNumber, fromDate, toDate],
    );

    useEffect(() => {
        if (initialAccount) {
            setAccountNumber(initialAccount);
            setDisplayAccountNumber(initialAccount);
            handleAccountNumberSearch(initialAccount);
        }
    }, [initialAccount, handleAccountNumberSearch]);

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

    // Функция для отправки OTP
    const sendOtp = async () => {
        if (!accountNumber.trim()) {
            showAlert("Введите номер счета", "warning");
            return;
        }

        try {
            const baseUrl = import.meta.env.VITE_BACKEND_URL;
            const token = localStorage.getItem("access_token");
            const response = await fetch(
                `${baseUrl}/otp/send/${accountNumber.trim()}`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            if (!response.ok) {
                throw new Error("Ошибка при отправке OTP");
            }

            showAlert("Код отправлен на ваш номер телефона", "success");
            setShowOtpModal(true);
            setOtpCode("");
        } catch (error) {
            showAlert("Ошибка при отправке OTP: " + error.message, "error");
        }
    };

    // Функция для проверки OTP и экспорта
    const verifyOtpAndExport = async () => {
        if (!otpCode.trim()) {
            showAlert("Введите код подтверждения", "warning");
            return;
        }

        setIsVerifyingOtp(true);
        try {
            const baseUrl = import.meta.env.VITE_BACKEND_URL;
            const token = localStorage.getItem("access_token");
            const response = await fetch(`${baseUrl}/otp/check`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    otp_code: otpCode.trim(),
                    account: accountNumber.trim(),
                }),
            });

            if (!response.ok) {
                throw new Error("Неверный код подтверждения");
            }

            showAlert("Код подтвержден, начинаем экспорт", "success");
            setShowOtpModal(false);
            setOtpCode("");

            // Выполняем экспорт
            handleExport();
        } catch (error) {
            showAlert("Ошибка при проверке кода: " + error.message, "error");
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    // Функция экспорта в Excel
    const handleExport = () => {
        const columns = [
            { key: "DOCDOPER", label: "Дата документа" },
            { key: "EXECDT", label: "Время" },
            { key: "TXTDSCR", label: "Назначение" },
            { key: "MOVD", label: "Дебет" },
            { key: "MOVC", label: "Кредит" },
            { key: "CLIENTCOR", label: "Клиент корреспондент" },
            { key: "ACCCOR", label: "Счет корреспондент" },
            { key: "NAMEBCR", label: "Банк корреспондент" },
            { key: "MOVDN", label: "Оборот по дебету" },
            { key: "MOVCN", label: "Оборот по кредиту" },
            { key: "doper", label: "Дата операции" },
        ];
        exportToExcel(
            sortedTransactions,
            columns,
            `Операции_${accountNumber}_${fromDate}_${toDate}`,
        );
    };

    // Обработчик для кнопки экспорта
    const handleExportClick = () => {
        sendOtp();
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

            {/* OTP Modal */}
            {showOtpModal && (
                <div className="modal-overlay" onClick={() => setShowOtpModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>Подтверждение экспорта</h3>
                        <p>Введите код подтверждения из SMS</p>
                        <input
                            type="text"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value)}
                            placeholder="Введите код"
                            className="otp-input"
                            maxLength={6}
                            onKeyPress={(e) => {
                                if (e.key === "Enter") {
                                    verifyOtpAndExport();
                                }
                            }}
                        />
                        <div className="modal-buttons">
                            <button
                                onClick={verifyOtpAndExport}
                                disabled={isVerifyingOtp || !otpCode.trim()}
                                className="btn-confirm"
                            >
                                {isVerifyingOtp ? "Проверка..." : "Подтвердить"}
                            </button>
                            <button
                                onClick={() => {
                                    setShowOtpModal(false);
                                    setOtpCode("");
                                }}
                                disabled={isVerifyingOtp}
                                className="btn-cancel"
                            >
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div
                className={`dashboard-container ${
                    isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"
                }`}
                style={{ userSelect: "none", WebkitUserSelect: "none", MozUserSelect: "none" }}
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
                                                disabled={isLoading || !!initialAccount}
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
                                                onClick={() => handleAccountNumberSearch()}
                                                disabled={
                                                    (!accountNumber.trim() && !initialAccount) ||
                                                    isLoading ||
                                                    !!initialAccount
                                                }
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
                                            {transactions.length > 0 && (
                                                <button
                                                    onClick={handleExportClick}
                                                    disabled={isLoading}
                                                    className="search-card__button search-card__button--export"
                                                >
                                                    Экспорт в Excel
                                                </button>
                                            )}
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
                                                    <th
                                                        className="limits-table__th sortable-header"
                                                        onClick={() => requestSort("DOCDOPER")}
                                                    >
                                                        Дата документа{" "}
                                                        <SortIcon
                                                            sortConfig={sortConfig}
                                                            sortKey="DOCDOPER"
                                                        />
                                                    </th>
                                                    <th
                                                        className="limits-table__th sortable-header"
                                                        onClick={() => requestSort("TXTDSCR")}
                                                    >
                                                        Назначение{" "}
                                                        <SortIcon
                                                            sortConfig={sortConfig}
                                                            sortKey="TXTDSCR"
                                                        />
                                                    </th>
                                                    <th
                                                        className="limits-table__th sortable-header"
                                                        onClick={() => requestSort("MOVD")}
                                                    >
                                                        Дебет{" "}
                                                        <SortIcon sortConfig={sortConfig} sortKey="MOVD" />
                                                    </th>
                                                    <th
                                                        className="limits-table__th sortable-header"
                                                        onClick={() => requestSort("MOVC")}
                                                    >
                                                        Кредит{" "}
                                                        <SortIcon sortConfig={sortConfig} sortKey="MOVC" />
                                                    </th>
                                                    <th
                                                        className="limits-table__th sortable-header"
                                                        onClick={() => requestSort("CLIENTCOR")}
                                                    >
                                                        Клиент корреспондент{" "}
                                                        <SortIcon
                                                            sortConfig={sortConfig}
                                                            sortKey="CLIENTCOR"
                                                        />
                                                    </th>
                                                    <th
                                                        className="limits-table__th sortable-header"
                                                        onClick={() => requestSort("ACCCOR")}
                                                    >
                                                        Счет корреспондент{" "}
                                                        <SortIcon
                                                            sortConfig={sortConfig}
                                                            sortKey="ACCCOR"
                                                        />
                                                    </th>
                                                    <th
                                                        className="limits-table__th sortable-header"
                                                        onClick={() => requestSort("NAMEBCR")}
                                                    >
                                                        Банк корреспондент{" "}
                                                        <SortIcon
                                                            sortConfig={sortConfig}
                                                            sortKey="NAMEBCR"
                                                        />
                                                    </th>
                                                    <th
                                                        className="limits-table__th sortable-header"
                                                        onClick={() => requestSort("MOVDN")}
                                                    >
                                                        Оборот по дебету{" "}
                                                        <SortIcon
                                                            sortConfig={sortConfig}
                                                            sortKey="MOVDN"
                                                        />
                                                    </th>
                                                    <th
                                                        className="limits-table__th sortable-header"
                                                        onClick={() => requestSort("MOVCN")}
                                                    >
                                                        Оборот по кредиту{" "}
                                                        <SortIcon
                                                            sortConfig={sortConfig}
                                                            sortKey="MOVCN"
                                                        />
                                                    </th>
                                                    <th
                                                        className="limits-table__th sortable-header"
                                                        onClick={() => requestSort("doper")}
                                                    >
                                                        Дата операции{" "}
                                                        <SortIcon
                                                            sortConfig={sortConfig}
                                                            sortKey="doper"
                                                        />
                                                    </th>
                                                </tr>
                                                </thead>
                                                <tbody className="limits-table__body">
                                                {sortedTransactions.map((transaction, index) => (
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
                          Показано: {sortedTransactions.length}
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

            <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          padding: 30px;
          border-radius: 8px;
          min-width: 400px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .modal-content h3 {
          margin-top: 0;
          margin-bottom: 10px;
          color: #333;
        }

        .modal-content p {
          margin-bottom: 20px;
          color: #666;
        }

        .otp-input {
          width: 100%;
          padding: 12px;
          font-size: 18px;
          text-align: center;
          border: 2px solid #ddd;
          border-radius: 4px;
          margin-bottom: 20px;
          letter-spacing: 4px;
        }

        .otp-input:focus {
          outline: none;
          border-color: #4CAF50;
        }

        .modal-buttons {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        .btn-confirm,
        .btn-cancel {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.3s;
        }

        .btn-confirm {
          background-color: #4CAF50;
          color: white;
        }

        .btn-confirm:hover:not(:disabled) {
          background-color: #45a049;
        }

        .btn-confirm:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }

        .btn-cancel {
          background-color: #f44336;
          color: white;
        }

        .btn-cancel:hover:not(:disabled) {
          background-color: #da190b;
        }

        .btn-cancel:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }

        .search-card__button--export {
          background-color: #2196F3;
        }

        .search-card__button--export:hover:not(:disabled) {
          background-color: #0b7dda;
        }

        .sortable-header {
          cursor: pointer;
          user-select: none;
        }

        .sortable-header:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }
      `}</style>
        </>
    );
}
