import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import AlertMessage from "../../../components/general/AlertMessage.jsx";
import { useExcelExport } from "../../../hooks/useExcelExport.js";
import { Table } from "../../../components/table/FlexibleAntTable.jsx";
import { Input as AntInput, Space, Button } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import CustomDateInput from "../../../components/elements/CustomDateInput.jsx";
import { logAuditAction } from "../../../utils/auditLogger.js";

export default function DashboardAccountOperations() {
  const [displayAccountNumber, setDisplayAccountNumber] = useState("");
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialAccount = queryParams.get("account");
  const [accountNumber, setAccountNumber] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [initialSearchAccount, setInitialSearchAccount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [alert, setAlert] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const { exportToExcel } = useExcelExport();

  const formatDateInputValue = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

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
    setFromDate(formatDateInputValue(thirtyDaysAgo));
    setToDate(formatDateInputValue(today));
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

        // Log audit action
        logAuditAction({
          action: "Просмотр операций по счету",
          account_number: targetAccount,
          details: `Просмотр выписки по счету ${targetAccount} за период с ${fromDate} по ${toDate}`
        });

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
    if (initialAccount && fromDate && toDate && initialSearchAccount !== initialAccount) {
      setAccountNumber(initialAccount);
      setDisplayAccountNumber(initialAccount);
      setInitialSearchAccount(initialAccount);
      handleAccountNumberSearch(initialAccount);
    }
  }, [initialAccount, fromDate, toDate, initialSearchAccount, handleAccountNumberSearch]);

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
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    setFromDate(formatDateInputValue(thirtyDaysAgo));
    setToDate(formatDateInputValue(today));
  };

  // Функция экспорта в Excel
  const handleExport = () => {
    // Log audit action
    logAuditAction({
      action: "Экспорт операций в Excel",
      account_number: accountNumber,
      details: `Экспорт выписки по счету ${accountNumber} в Excel за период с ${fromDate} по ${toDate}`
    });

    const columnsToExport = [
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
      transactions,
      columnsToExport,
      `Операции_${accountNumber}_${fromDate}_${toDate}`,
    );
  };

  // Обработчик для кнопки экспорта - теперь экспортирует сразу без СМС OTP
  const handleExportClick = () => {
    handleExport();
  };

  const getColumnSearchProps = (dataIndex, label) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }}>
        <AntInput
          placeholder={`Поиск ${label}`}
          value={selectedKeys[0]}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => confirm()}
          style={{ marginBottom: 8, display: "block" }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => confirm()}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Поиск
          </Button>
          <Button onClick={() => clearFilters()} size="small" style={{ width: 90 }}>
            Сброс
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered) => <SearchOutlined style={{ color: filtered ? "#1890ff" : undefined }} />,
    onFilter: (value, record) =>
      record[dataIndex]
        ? record[dataIndex].toString().toLowerCase().includes(value.toLowerCase())
        : false,
  });

  const columns = React.useMemo(() => [
    {
      title: "Дата документа",
      key: "docDate",
      width: 180,
      render: (_, tx) => (
        <span className="default-value">
          {tx.DOCDOPER || "N/A"} {tx.EXECDT || "N/A"}
        </span>
      ),
      ...getColumnSearchProps("DOCDOPER", "даты документа"),
    },
    {
      title: "Назначение",
      dataIndex: "TXTDSCR",
      key: "TXTDSCR",
      width: 250,
      render: (value) => value || "N/A",
      ...getColumnSearchProps("TXTDSCR", "назначения"),
    },
    {
      title: "Дебет",
      dataIndex: "MOVD",
      key: "MOVD",
      width: 130,
      render: (value) => formatAmount(value),
    },
    {
      title: "Кредит",
      dataIndex: "MOVC",
      key: "MOVC",
      width: 130,
      render: (value) => formatAmount(value),
    },
    {
      title: "Клиент корреспондент",
      dataIndex: "CLIENTCOR",
      key: "CLIENTCOR",
      width: 200,
      render: (value) => value || "N/A",
      ...getColumnSearchProps("CLIENTCOR", "клиента"),
    },
    {
      title: "Счет корреспондент",
      dataIndex: "ACCCOR",
      key: "ACCCOR",
      width: 180,
      render: (value) => value || "N/A",
      ...getColumnSearchProps("ACCCOR", "счета"),
    },
    {
      title: "Банк корреспондент",
      dataIndex: "NAMEBCR",
      key: "NAMEBCR",
      width: 180,
      render: (value) => value || "N/A",
      ...getColumnSearchProps("NAMEBCR", "банка"),
    },
    {
      title: "Оборот по дебету",
      dataIndex: "MOVDN",
      key: "MOVDN",
      width: 150,
      render: (value) => formatAmount(value),
    },
    {
      title: "Оборот по кредиту",
      dataIndex: "MOVCN",
      key: "MOVCN",
      width: 150,
      render: (value) => formatAmount(value),
    },
    {
      title: "Дата операции",
      dataIndex: "doper",
      key: "doper",
      width: 130,
      render: (value) => value || "N/A",
    },
  ], []);

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
                      <CustomDateInput
                        id="fromDate"
                        type="date"
                        value={fromDate}
                        onChange={(value) =>
                          handleDateChange({
                            target: { name: "fromDate", value },
                          })
                        }
                        disabled={isLoading}
                      />
                    </div>
                    <div className="date-separator">—</div>
                    <div className="date-input-group">
                      <label htmlFor="toDate" className="search-card__label">
                        По дату
                      </label>
                      <CustomDateInput
                        id="toDate"
                        type="date"
                        value={toDate}
                        onChange={(value) =>
                          handleDateChange({
                            target: { name: "toDate", value },
                          })
                        }
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
                    <Table
                      tableId="account-operations-table"
                      rowKey={(record, index) => `${record.PID || record.DOCDOPER}-${index}`}
                      columns={columns}
                      dataSource={transactions}
                      pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (total) => `Всего ${total} записей` }}
                      sticky
                      bordered
                      scroll={{ x: "max-content" }}
                    />
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

      <style jsx>{`
        .search-card__button--export {
          background-color: #2196f3;
        }

        .search-card__button--export:hover:not(:disabled) {
          background-color: #0b7dda;
        }
      `}</style>
    </>
  );
}
