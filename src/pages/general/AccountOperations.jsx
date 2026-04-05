import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../../../styles/components/ProcessingIntegration.scss";
import "../../../styles/components/BlockInfo.scss";
import "../../../styles/components/DashboardOperatorProcessingTransactions.scss";
import AlertMessage from "../../../components/general/AlertMessage.jsx";
import CustomDateInput from "../../components/elements/CustomDateInput.jsx";
import { canAccessAccountOperations } from "../../api/roleHelper.js";
import { Table } from "../../../components/table/FlexibleAntTable.jsx";

export default function DashboardAccountOperations() {
  const [displayAccountNumber, setDisplayAccountNumber] = useState("");
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

  const hasAccess = canAccessAccountOperations();
  const [isLimitedAccess, setIsLimitedAccess] = useState(false);
  const [allowedAccountNumber, setAllowedAccountNumber] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!hasAccess) {
      const storedAccountNumber = sessionStorage.getItem('allowedAccountNumber');
      const urlParams = new URLSearchParams(location.search);
      const urlAccount = urlParams.get('account');

      if (storedAccountNumber && urlAccount && storedAccountNumber === urlAccount) {
        setIsLimitedAccess(true);
        setAllowedAccountNumber(storedAccountNumber);
      } else if (storedAccountNumber && !urlAccount) {
        setIsLimitedAccess(true);
        setAllowedAccountNumber(storedAccountNumber);
        navigate(`/accounts/account-operations?account=${storedAccountNumber}`, { replace: true });
      } else {
        setIsLimitedAccess(true);
        setAllowedAccountNumber(null);
      }
    }
  }, [hasAccess, location.search, navigate]);

  const formatAmount = (amount) => {
    if (!amount) return "";
    const num = parseFloat(String(amount).replace(",", "."));
    if (isNaN(num)) return "";
    return num
      .toFixed(2)
      .replace(".", ",")
      .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  const checkUrlParams = useCallback(() => {
    const searchParams = new URLSearchParams(location.search);
    const urlAccount = searchParams.get("account");

    if (urlAccount && urlAccount.trim() !== "") {
      const cleanedAccount = urlAccount.replace(/\s/g, "");
      setAccountNumber(cleanedAccount);
      setDisplayAccountNumber(
        cleanedAccount
          .replace(/\s/g, "")
          .replace(/(\d{4})/g, "$1 ")
          .trim()
      );
      return cleanedAccount;
    }
    return null;
  }, [location.search]);

  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const formatDate = (date) => date.toISOString().split("T")[0];
    setFromDate(formatDate(thirtyDaysAgo));
    setToDate(formatDate(today));
  }, []);

  useEffect(() => {
    if (fromDate && toDate) {
      const urlAccount = checkUrlParams();
      if (urlAccount) {
        const timer = setTimeout(() => {
          handleAccountNumberSearch(urlAccount);
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [fromDate, toDate, checkUrlParams]);

  const showAlert = (message, type = "success") => {
    setAlert({ show: true, message, type });
  };

  const hideAlert = () => {
    setAlert({ show: false, message: "", type: "success" });
  };

  const handleAccountNumberChange = (e) => {
    const value = e.target.value;
    setDisplayAccountNumber(value);
    const cleanedValue = value.replace(/\s/g, "");
    setAccountNumber(cleanedValue);

    const searchParams = new URLSearchParams(location.search);
    if (cleanedValue.trim() !== "") searchParams.set("account", cleanedValue);
    else searchParams.delete("account");
    navigate({ search: searchParams.toString() }, { replace: true });
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

  const handleAccountNumberSearch = async (externalAccountNumber = null) => {
    const accNumber = externalAccountNumber || accountNumber;

    if (isLimitedAccess && accNumber !== allowedAccountNumber) {
      showAlert("У вас есть доступ только к просмотру выписки конкретного счета", "error");
      return;
    }

    if (accNumber.trim()) {
      if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
        showAlert('Дата "С" не может быть больше даты "По"', "error");
        return;
      }

      if (isLimitedAccess && fromDate && toDate) {
        const from = new Date(fromDate);
        const to = new Date(toDate);
        const diffDays = Math.ceil(Math.abs(to - from) / (1000 * 60 * 60 * 24));
        if (diffDays > 31) {
          showAlert('Максимальный период для поиска: 31 день', "error");
          return;
        }
      }

      setIsLoading(true);
      try {
        const baseUrl = import.meta.env.VITE_BACKEND_ABS_SERVICE_URL;
        const params = new URLSearchParams();
        const token = localStorage.getItem("access_token");
        if (fromDate) params.append("startDate", formatToDDMMYYYY(fromDate));
        if (toDate) params.append("endDate", formatToDDMMYYYY(toDate));
        params.append("accountNumber", accNumber);
        const url = `${baseUrl}/account/operations?${params.toString()}`;
        const response = await fetch(url, {
          headers: { Authorization: "Bearer " + token }
        });

        if (!response.ok) throw new Error("Ошибка при загрузке данных");
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
          showAlert(`Загружено ${formattedTransactions.length} операций`, "success");
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

    const searchParams = new URLSearchParams(location.search);
    searchParams.delete("account");
    navigate({ search: searchParams.toString() }, { replace: true });
  };

  useEffect(() => {
    if (isLimitedAccess) {
      showAlert("Вы можете просматривать выписки только этого счета. Максимальный период: 31 день", "info");
    }
  }, [isLimitedAccess]);

  return (
    <>
      {alert.show && (
        <AlertMessage message={alert.message} type={alert.type} onClose={hideAlert} duration={3000} />
      )}
      <div className="block_info_prems content-page" align="center">
        <div className="processing-integration">
          <div className="processing-integration__container">
            <div className="processing-integration__header">
              <h1 className="processing-integration__title">
                Мониторинг операций по счету
                {isLimitedAccess && (
                  <span style={{ color: '#ffa500', fontSize: '0.8em', marginLeft: '10px' }}>(Ограниченный доступ)</span>
                )}
              </h1>
              <p className="processing-integration__subtitle">
                {isLimitedAccess ? "Просмотр выписки одного счета (макс. 31 день)" : "Поиск операций без ограничений"}
              </p>
            </div>
            <div className="processing-integration__search-card">
              <div className="search-card">
                <div className="search-card__content">
                  <div className="search-card__input-group">
                    <label htmlFor="accountNumber" className="search-card__label">Номер счета</label>
                    <input
                      type="text"
                      id="accountNumber"
                      value={displayAccountNumber}
                      onChange={handleAccountNumberChange}
                      onKeyPress={handleKeyPress}
                      className="search-card__input"
                      disabled={isLoading || isLimitedAccess}
                      placeholder="Введите номер счета"
                    />
                  </div>
                  <div className="search-card__date-group">
                    <div className="date-input-group">
                      <label htmlFor="fromDate" className="search-card__label">С даты</label>
                      <CustomDateInput
                        id="fromDate"
                        type="date"
                        value={fromDate}
                        onChange={(value) => handleDateChange({ target: { name: "fromDate", value } })}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="date-separator">—</div>
                    <div className="date-input-group">
                      <label htmlFor="toDate" className="search-card__label">По дату</label>
                      <CustomDateInput
                        id="toDate"
                        type="date"
                        value={toDate}
                        onChange={(value) => handleDateChange({ target: { name: "toDate", value } })}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <div className="search-card__buttons">
                    <button
                      onClick={() => handleAccountNumberSearch()}
                      disabled={!accountNumber.trim() || isLoading}
                      className={`search-card__button ${isLoading ? "search-card__button--loading" : ""}`}
                    >
                      {isLoading ? "Поиск..." : "Найти"}
                    </button>
                    <button onClick={clearFilters} disabled={isLoading} className="search-card__button search-card__button--secondary">Очистить фильтры</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {(transactions.length > 0 || isLoading) && (
            <div className="processing-integration__limits-table">
              <div className="limits-table">
                <div className="limits-table__header">
                  <h2 className="limits-table__title">
                    Операции по счету {formatAccountNumber(displayAccountNumber)}
                    {fromDate && toDate && <span className="date-range"> ({fromDate} — {toDate})</span>}
                  </h2>
                </div>
                <div className="limits-table__container">
                  <Table
                    dataSource={transactions}
                    rowKey={(record, index) => `${record.PID}-${index}`}
                    bordered
                    loading={isLoading}
                    scroll={{ x: 3500 }}
                    pagination={{ pageSize: 15 }}
                  >
                    <Table.Column title="Дата операции (DOPER)" dataIndex="doper" key="doper" sortable />
                    <Table.Column title="Дата документа (DOCDOPER)" dataIndex="DOCDOPER" key="DOCDOPER" sortable />
                    <Table.Column title="Время (EXECDT)" dataIndex="EXECDT" key="EXECDT" sortable />
                    <Table.Column title="Описание (TXTDSCR)" dataIndex="TXTDSCR" key="TXTDSCR" width={300} />
                    <Table.Column title="Дебет (MOVD)" key="MOVD" render={(val) => formatAmount(val)} sortable align="right" />
                    <Table.Column title="Кредит (MOVC)" key="MOVC" render={(val) => formatAmount(val)} sortable align="right" />
                    <Table.Column title="Баланс на конец (SumBalOut)" key="sumBalOut" render={(val) => formatAmount(val)} sortable align="right" />
                    <Table.Column title="Валютная дата (DVAL)" dataIndex="DVAL" key="DVAL" />
                    <Table.Column title="Референс (REFER)" dataIndex="REFER" key="REFER" sortable />
                    <Table.Column title="Номер документа (NUMDOC)" dataIndex="NUMDOC" key="NUMDOC" sortable />
                    <Table.Column title="Клиент корреспондент (CLIENTCOR)" dataIndex="CLIENTCOR" key="CLIENTCOR" width={250} />
                    <Table.Column title="Счет корреспондент (ACCCOR)" dataIndex="ACCCOR" key="ACCCOR" />
                    <Table.Column title="Банк корреспондент (NAMEBCR)" dataIndex="NAMEBCR" key="NAMEBCR" width={250} />
                    <Table.Column title="Курс (kurs)" dataIndex="kurs" key="kurs" />
                    <Table.Column title="PDepID" dataIndex="PDepID" key="PDepID" />
                    <Table.Column title="PID" dataIndex="PID" key="PID" />
                    <Table.Column title="KSOCODE" dataIndex="KSOCODE" key="KSOCODE" />
                    <Table.Column title="BNKKOR" dataIndex="BNKKOR" key="BNKKOR" />
                    <Table.Column title="JCODEBE" dataIndex="JCODEBE" key="JCODEBE" />
                    <Table.Column title="JRNNCR" dataIndex="JRNNCR" key="JRNNCR" />
                    <Table.Column title="MOVDN" key="MOVDN" render={(val) => formatAmount(val)} align="right" />
                    <Table.Column title="MOVCN" key="MOVCN" render={(val) => formatAmount(val)} align="right" />
                    <Table.Column title="CODEBCR" dataIndex="CODEBCR" key="CODEBCR" />
                    <Table.Column title="KNP" dataIndex="KNP" key="KNP" />
                    <Table.Column title="CODEBC" dataIndex="CODEBC" key="CODEBC" />
                    <Table.Column title="TXT_HEAD" dataIndex="TXT_HEAD" key="TXT_HEAD" width={200} />
                    <Table.Column title="TXT_BUCH" dataIndex="TXT_BUCH" key="TXT_BUCH" width={200} />
                    <Table.Column title="CMSFL" dataIndex="CMSFL" key="CMSFL" />
                    <Table.Column title="PARENT_REFER" dataIndex="PARENT_REFER" key="PARENT_REFER" />
                    <Table.Column title="KURS_ISP" dataIndex="KURS_ISP" key="KURS_ISP" />
                  </Table>
                  {transactions.length > 0 && (
                    <div className="limits-table__footer">
                      <div className="limits-table__stats">
                        <span className="limits-table__stat">Всего записей: {transactions.length}</span>
                        <span className="limits-table__stat">Счет: {formatAccountNumber(displayAccountNumber)}</span>
                        {fromDate && toDate && <span className="limits-table__stat">Период: {fromDate} — {toDate}</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {!isLoading && transactions.length === 0 && accountNumber.length > 0 && (
            <div className="processing-integration__no-data">
              <div className="no-data">
                <h3>Данные не найдены</h3>
                <p>Для счета {formatAccountNumber(displayAccountNumber)} не найдено операций за выбранный период.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
