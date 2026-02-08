import React, { useEffect, useState, useCallback } from "react";
import "../../../styles/ABSSearch.scss";
import "../../../styles/components/BlockInfo.scss";
import "../../../styles/components/ProcessingIntegration.scss";
import AlertMessage from "../../general/AlertMessage.jsx";
import Modal from "../../general/Modal.jsx";
import {
  getUserAccounts,
  getUserCards,
  getUserCredits,
  getUserDeposits,
  getUserInfoPhone,
} from "../../../api/ABS_frotavik/getUserCredits.js";
import { useNavigate } from "react-router-dom";
import {
  MdOutlinePhonelinkErase,
  MdOutlinePhonelinkRing,
  MdOutlineSmartphone,
} from "react-icons/md";
import { TYPE_SEARCH_CLIENT } from "../../../const/defConst.js";
import { useExcelExport } from "../../../hooks/useExcelExport.js";
import { useTableSort } from "../../../hooks/useTableSort.js";
import SortIcon from "../../general/SortIcon.jsx";

const API_BASE_URL = import.meta.env.VITE_BACKEND_ABS_SERVICE_URL;
const API_ATM_URL = import.meta.env.VITE_BACKEND_ATM_SERVICE_URL;

// Функция для нормализации данных клиента
const normalizeClientData = (client, searchType) => {
  // Если это поиск по телефону - данные уже в нужном формате
  if (searchType === TYPE_SEARCH_CLIENT[0].value) {
    return client;
  }

  // Для поиска по ИНН и коду клиента - преобразуем формат
  return {
    phone: client.ContactData?.[0]?.Value || "",
    arc_flag: "",
    client_type_name: client.TypeExt?.Name || "",
    ban_acc_open_flag: "",
    dep_code: client.Department?.Code || "",
    client_code: client.Code || "",
    surname: client.LastName || "",
    name: client.FirstName || "",
    patronymic: client.MiddleName || "",
    ltn_surname: client.LatinLastName || "",
    ltn_name: client.LatinFirstName || "",
    ltn_patronymic: client.LatinMiddleName || "",
    tax_code: client.TaxIdentificationNumber?.Code || "",
    identdoc_name: client.IdentDocs?.[0]?.Type?.Name || "",
    identdoc_series: client.IdentDocs?.[0]?.Series || "",
    identdoc_num: client.IdentDocs?.[0]?.Number || "",
    identdoc_date: client.IdentDocs?.[0]?.IssueDate || "",
    identdoc_orgname: client.IdentDocs?.[0]?.IssueOrganization || "",
    sv_id:
      client.ExternalSystemCodes?.ExternalCode?.find(
        (c) => c.System?.Code === "SVPC",
      )?.Code || "",
  };
};

// Компонент модального окна для графика платежей
const GraphModal = ({ isOpen, onClose, referenceId, graphData, isLoading }) => {
  const { exportToExcel } = useExcelExport();
  const {
    items: sortedData,
    requestSort,
    sortConfig,
  } = useTableSort(graphData);

  const handleExport = () => {
    const columns = [
      { key: "ID", label: "ID" },
      { key: "Code", label: "Code" },
      { key: "LongName", label: "LongName" },
      { key: "PaymentDate", label: "PaymentDate" },
      { key: "Amount", label: "Amount" },
      { key: "CalculatingAmount", label: "CalculatingAmount" },
      { key: "Type", label: "Type" },
      { key: "Status", label: "Status" },
      { key: "DateFrom", label: "DateFrom" },
      { key: "DateTo", label: "DateTo" },
      { key: "CalculatingDate", label: "CalculatingDate" },
      { key: "ExpectationDate", label: "ExpectationDate" },
    ];
    exportToExcel(
      sortedData,
      columns,
      `График_платежей_${referenceId || "export"}`,
    );
  };
  return (
    <div
      className={`graph-modal-overlay ${isOpen ? "graph-modal-overlay--open" : ""}`}
    >
      <div className="graph-modal-container">
        <div className="graph-modal-header">
          <h2 className="graph-modal-title">
            График платежей
            {referenceId && (
              <span className="graph-modal-subtitle">
                {" "}
                (Reference ID: {referenceId})
              </span>
            )}
          </h2>
          <div className="graph-modal-header-actions">
            {sortedData?.length > 0 && !isLoading && (
              <button className="export-excel-btn" onClick={handleExport}>
                Экспорт в Excel
              </button>
            )}
            <button className="graph-modal-close" onClick={onClose}>
              &times;
            </button>
          </div>
        </div>

        <div className="graph-modal-content">
          {isLoading ? (
            <div className="graph-modal-loading">
              <div className="graph-modal-spinner"></div>
              <p>Загрузка графика платежей...</p>
            </div>
          ) : (
            <>
              <div className="graph-data-table-container">
                <div className="graph-data-table-wrapper">
                  <table className="graph-data-table">
                    <thead>
                      <tr>
                        <th
                          onClick={() => requestSort("ID")}
                          className="sortable-header"
                        >
                          ID <SortIcon sortConfig={sortConfig} sortKey="ID" />
                        </th>
                        <th
                          onClick={() => requestSort("Code")}
                          className="sortable-header"
                        >
                          Code{" "}
                          <SortIcon sortConfig={sortConfig} sortKey="Code" />
                        </th>
                        <th
                          onClick={() => requestSort("LongName")}
                          className="sortable-header"
                        >
                          LongName{" "}
                          <SortIcon
                            sortConfig={sortConfig}
                            sortKey="LongName"
                          />
                        </th>
                        <th
                          onClick={() => requestSort("PaymentDate")}
                          className="sortable-header"
                        >
                          PaymentDate{" "}
                          <SortIcon
                            sortConfig={sortConfig}
                            sortKey="PaymentDate"
                          />
                        </th>
                        <th
                          onClick={() => requestSort("Amount")}
                          className="sortable-header"
                        >
                          Amount{" "}
                          <SortIcon sortConfig={sortConfig} sortKey="Amount" />
                        </th>
                        <th
                          onClick={() => requestSort("CalculatingAmount")}
                          className="sortable-header"
                        >
                          CalculatingAmount{" "}
                          <SortIcon
                            sortConfig={sortConfig}
                            sortKey="CalculatingAmount"
                          />
                        </th>
                        <th
                          onClick={() => requestSort("Type")}
                          className="sortable-header"
                        >
                          Type{" "}
                          <SortIcon sortConfig={sortConfig} sortKey="Type" />
                        </th>
                        <th
                          onClick={() => requestSort("Status")}
                          className="sortable-header"
                        >
                          Status{" "}
                          <SortIcon sortConfig={sortConfig} sortKey="Status" />
                        </th>
                        <th
                          onClick={() => requestSort("DateFrom")}
                          className="sortable-header"
                        >
                          DateFrom{" "}
                          <SortIcon
                            sortConfig={sortConfig}
                            sortKey="DateFrom"
                          />
                        </th>
                        <th
                          onClick={() => requestSort("DateTo")}
                          className="sortable-header"
                        >
                          DateTo{" "}
                          <SortIcon sortConfig={sortConfig} sortKey="DateTo" />
                        </th>
                        <th
                          onClick={() => requestSort("CalculatingDate")}
                          className="sortable-header"
                        >
                          CalculatingDate{" "}
                          <SortIcon
                            sortConfig={sortConfig}
                            sortKey="CalculatingDate"
                          />
                        </th>
                        <th
                          onClick={() => requestSort("ExpectationDate")}
                          className="sortable-header"
                        >
                          ExpectationDate{" "}
                          <SortIcon
                            sortConfig={sortConfig}
                            sortKey="ExpectationDate"
                          />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedData.map((item, index) => (
                        <tr key={index}>
                          <td>{item.ID}</td>
                          <td>{item.Code}</td>
                          <td>{item.LongName}</td>
                          <td>{item.PaymentDate}</td>
                          <td>{item.Amount}</td>
                          <td>{item.CalculatingAmount}</td>
                          <td>{item.Type}</td>
                          <td>{item.Status}</td>
                          <td>{item.DateFrom}</td>
                          <td>{item.DateTo}</td>
                          <td>{item.CalculatingDate}</td>
                          <td>{item.ExpectationDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="graph-modal-footer">
                <div className="graph-summary">
                  <span className="graph-summary-item">
                    Всего записей: <strong>{sortedData.length}</strong>
                  </span>
                  <span className="graph-summary-item">
                    Reference ID: <strong>{referenceId}</strong>
                  </span>
                </div>
                <button className="graph-modal-close-btn" onClick={onClose}>
                  Закрыть
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default function ABSClientSearch() {
  const { exportToExcel } = useExcelExport();
  const [isMobile, setIsMobile] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [displayPhone, setDisplayPhone] = useState("");
  const [clientsData, setClientsData] = useState([]);
  const [selectedClientIndex, setSelectedClientIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [cardsData, setCardsData] = useState([]);
  const [accountsData, setAccountsData] = useState([]);
  const [creditsData, setCreditsData] = useState([]);
  const [depositsData, setDepositsData] = useState([]);
  const [selectTypeSearchClient, setSelectTypeSearchClient] = useState(
    TYPE_SEARCH_CLIENT[0].value,
  );
  const [isSearched, setIsSearched] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    try {
      const roleIdsJson = localStorage.getItem("role_ids");
      if (roleIdsJson) {
        const parsed = JSON.parse(roleIdsJson);
        if (Array.isArray(parsed)) {
          setIsProcessing(parsed.includes(18));
        }
      }
    } catch (err) {
      console.error("Error parsing role_ids:", err);
    }
  }, []);

  const {
    items: sortedCards,
    requestSort: requestSortCards,
    sortConfig: sortCardsConfig,
  } = useTableSort(cardsData);
  const {
    items: sortedAccounts,
    requestSort: requestSortAccounts,
    sortConfig: sortAccountsConfig,
  } = useTableSort(accountsData);
  const {
    items: sortedCredits,
    requestSort: requestSortCredits,
    sortConfig: sortCreditsConfig,
  } = useTableSort(creditsData);
  const {
    items: sortedDeposits,
    requestSort: requestSortDeposits,
    sortConfig: sortDepositsConfig,
  } = useTableSort(depositsData);

  const navigate = useNavigate();
  const [alert, setAlert] = useState({
    show: false,
    message: "",
    type: "success",
  });

  // Состояния для модального окна графика платежей
  const [graphModalOpen, setGraphModalOpen] = useState(false);
  const [graphData, setGraphData] = useState([]);
  const [isGraphLoading, setIsGraphLoading] = useState(false);
  const [selectedReferenceId, setSelectedReferenceId] = useState("");

  const showAlert = useCallback((message, type = "success") => {
    setAlert({
      show: true,
      message,
      type,
    });
  }, []);

  const hideAlert = useCallback(() => {
    setAlert({
      show: false,
      message: "",
      type: "success",
    });
  }, []);

  const formatPhoneNumber = (value) => {
    return value;
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value;

    // Для поиска по коду клиента разрешаем точку
    if (selectTypeSearchClient === TYPE_SEARCH_CLIENT[1].value) {
      setPhoneNumber(value);
      setDisplayPhone(value);
    } else {
      const digitsOnly = value;
      setPhoneNumber(digitsOnly);
      setDisplayPhone(formatPhoneNumber(digitsOnly));
    }
  };

  const handleClear = () => {
    setPhoneNumber("");
    setDisplayPhone("");
    setClientsData([]);
    setSelectedClientIndex(0);
    setCardsData([]);
    setAccountsData([]);
    setCreditsData([]);
    setDepositsData([]);
    setIsMobile(null);
    setIsSearched(false);
    sessionStorage.removeItem("absClientSearchState");
  };

  // Функция для поиска через ATM API (ИСПРАВЛЕНО: параметр acc для номера счета)
  const searchViaATMService = async (searchType, searchValue) => {
    let url = "";

    switch (searchType) {
      case "byCardId": // По ID карты
        url = `${API_ATM_URL}/services/innbyidn.php?cardidn=${searchValue}`;
        break;
      case "byAccount": // По номеру счета - ИСПРАВЛЕНО: используем acc
        url = `${API_ATM_URL}/services/clientcode.php?acc=${searchValue}`;
        break;
      case "byName": // По фамилии и имени
        {
          const [lname, fname] = searchValue.split(" ");
          url = `${API_ATM_URL}/services/clientcode.php?lname=${encodeURIComponent(lname || "")}&fname=${encodeURIComponent(fname || "")}`;
        }
        break;
      case "byLast4": // По последним 4 цифрам карты
        url = `${API_ATM_URL}/services/clientcode.php?last4=${searchValue}`;
        break;
      default:
        throw new Error("Неизвестный тип поиска");
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  };

  // Функция для получения информации о клиенте по client code
  const getClientByCode = async (clientCode, token) => {
    const response = await fetch(
      `${API_BASE_URL}/client/info/client-index?clientIndex=${clientCode}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  };

  const handleSearchClient = async () => {
    if (!phoneNumber) {
      showAlert("Пожалуйста, введите данные для поиска", "error");
      return;
    }

    let formattedPhone = phoneNumber.trim();

    try {
      setIsLoading(true);
      const token = localStorage.getItem("access_token");

      let response;
      let data;

      // Определяем, какой API использовать
      const searchTypeIndex = TYPE_SEARCH_CLIENT.findIndex(
        (t) => t.value === selectTypeSearchClient,
      );

      // Типы поиска, которые используют ATM API (индексы 3, 4, 5, 6 в массиве TYPE_SEARCH_CLIENT)
      if (searchTypeIndex >= 3 && searchTypeIndex <= 6) {
        // Используем ATM API для новых типов поиска
        const atmSearchTypes = {
          3: "byCardId", // По ID карты
          4: "byAccount", // По номеру счета
          5: "byName", // По фамилии и имени
          6: "byLast4", // По последним 4 цифрам
        };

        // Получаем массив client codes
        const clientCodes = await searchViaATMService(
          atmSearchTypes[searchTypeIndex],
          formattedPhone,
        );

        if (!clientCodes || clientCodes.length === 0) {
          showAlert("Клиенты не найдены", "error");
          setClientsData([]);
          setIsSearched(true); // Ensure setIsSearched is called even if no clients are found
          return;
        }

        // Получаем полную информацию для каждого client                // Получаем полную информацию для каждого client code
        const clientsPromises = clientCodes.map((item) =>
          getClientByCode(item.clicode, token),
        );

        const clientsFullData = await Promise.all(clientsPromises);

        // Нормализуем данные
        const normalizedData = clientsFullData.map((client) =>
          normalizeClientData(client, TYPE_SEARCH_CLIENT[1].value),
        );

        setClientsData(normalizedData);
        setSelectedClientIndex(0);
        setIsSearched(true);

        if (normalizedData.length === 0) {
          showAlert("Клиенты не найдены в АБС", "error");
        } else {
          showAlert(`Найдено клиентов: ${normalizedData.length}`, "success");
        }
      } else {
        // Используем стандартный ABS API для поиска по телефону, коду клиента, ИНН
        let apiUrl = "";
        if (selectTypeSearchClient === TYPE_SEARCH_CLIENT[2].value) {
          // Поиск по имени и фамилии
          const [lname, fname] = formattedPhone.split(" ");
          apiUrl = `${API_BASE_URL}${selectTypeSearchClient}${encodeURIComponent(lname || "")}&fname=${encodeURIComponent(fname || "")}`;
        } else {
          apiUrl = `${API_BASE_URL}/${selectTypeSearchClient}${formattedPhone}`;
        }

        response = await fetch(apiUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            showAlert("Клиенты не найдены в АБС", "error");
          } else {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          setClientsData([]);
          return;
        }

        data = await response.json();

        // Нормализуем данные в зависимости от типа поиска
        let normalizedData = [];

        if (selectTypeSearchClient === TYPE_SEARCH_CLIENT[1].value) {
          // Поиск по коду клиента возвращает один объект
          normalizedData = [normalizeClientData(data, selectTypeSearchClient)];
        } else if (selectTypeSearchClient === TYPE_SEARCH_CLIENT[2].value) {
          // Поиск по ИНН возвращает массив
          normalizedData = Array.isArray(data)
            ? data.map((client) =>
                normalizeClientData(client, selectTypeSearchClient),
              )
            : [normalizeClientData(data, selectTypeSearchClient)];
        } else {
          // Поиск по телефону - данные уже в правильном формате
          normalizedData = Array.isArray(data) ? data : [data];
        }

        setClientsData(normalizedData);
        setSelectedClientIndex(0);
        setIsSearched(true);

        if (normalizedData.length === 0) {
          showAlert("Клиенты не найдены в АБС", "error");
        } else {
          showAlert(`Найдено клиентов: ${normalizedData.length}`, "success");
        }
      }
    } catch (error) {
      console.error("Ошибка при поиске клиента в АБС:", error);
      showAlert("Произошла ошибка при поиске клиента в АБС", "error");
      setClientsData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Используем useCallback чтобы функция не пересоздавалась при каждом рендере
  const handleGetDataUser = useCallback(async () => {
    if (!clientsData?.[selectedClientIndex]?.client_code) return;

    try {
      const clientCode = clientsData[selectedClientIndex]?.client_code;
      const [resCards, resAcc, resCredits, resDeposits] = await Promise.all([
        getUserCards(clientCode),
        getUserAccounts(clientCode),
        getUserCredits(clientCode),
        getUserDeposits(clientCode),
      ]);

      let finalCards = resCards || [];
      let finalAcc = resAcc || [];

      // Если у пользователя нет роли процессинга (18), ограничиваем список
      if (!isProcessing) {
        const searchTypeIndex = TYPE_SEARCH_CLIENT.findIndex(
          (t) => t.value === selectTypeSearchClient,
        );
        const searchVal = phoneNumber.trim();

        if (searchTypeIndex === 4) {
          // По ID карты
          finalCards = finalCards.filter((c) => String(c.cardId) === searchVal);
        } else if (searchTypeIndex === 5) {
          // По номеру счета
          finalAcc = finalAcc.filter((a) => String(a.Number) === searchVal);
        }
      }

      setCardsData(finalCards);
      setAccountsData(finalAcc);
      setCreditsData(resCredits || []);
      setDepositsData(resDeposits || []);
    } catch (error) {
      console.error("Error fetching user cards/accounts:", error);
      showAlert("Ошибка при получении данных карт/счетов", "error");
    }
  }, [
    clientsData,
    selectedClientIndex,
    isProcessing,
    phoneNumber,
    selectTypeSearchClient,
    showAlert,
  ]);

  const copyToClipboard = (text) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        showAlert("Скопировано в буфер обмена", "success");
      })
      .catch((err) => {
        console.error("Ошибка копирования: ", err);
        showAlert("Не удалось скопировать", "error");
      });
  };

  const copyAllClientsToClipboard = () => {
    copyToClipboard(JSON.stringify(clientsData, null, 2));
  };

  const copySelectedClientToClipboard = () => {
    if (clientsData[selectedClientIndex]) {
      copyToClipboard(
        JSON.stringify(clientsData[selectedClientIndex], null, 2),
      );
    }
  };

  const handleExportClientInfo = () => {
    const exportData = [
      tableData.reduce((acc, item) => {
        acc[item.label] = item.value || "Не указано";
        return acc;
      }, {}),
    ];
    const exportColumns = tableData.map((item) => ({
      key: item.label,
      label: item.label,
    }));
    exportToExcel(
      exportData,
      exportColumns,
      `Клиент_${selectedClient?.surname}_${selectedClient?.name}`,
    );
  };

  const handleExportCards = () => {
    const columns = [
      { key: "cardId", label: "ID Карты" },
      { key: "type", label: "Тип" },
      { key: "statusName", label: "Статус" },
      { key: "expirationDate", label: "Срок" },
      { key: "currency", label: "Валюта" },
      { key: (row) => row.accounts?.[0]?.state || "-", label: "Остаток" },
    ];
    exportToExcel(sortedCards, columns, `Карты_${selectedClient?.surname}`);
  };

  const handleExportAccounts = () => {
    const columns = [
      { key: "Number", label: "Номер счета" },
      { key: (row) => `${row.Balance} ${row.Currency?.Code}`, label: "Баланс" },
      { key: (row) => row.Status?.Name, label: "Статус" },
      { key: "DateOpened", label: "Дата открытия" },
      { key: (row) => row.Branch?.Name, label: "Филиал" },
    ];
    exportToExcel(sortedAccounts, columns, `Счета_${selectedClient?.surname}`);
  };

  const handleExportCredits = () => {
    const columns = [
      { key: "contractNumber", label: "Номер договора" },
      { key: "referenceId", label: "Идентификатор ссылки" },
      { key: "statusName", label: "Статус" },
      { key: (row) => `${row.amount} ${row.currency}`, label: "Сумма" },
      { key: "documentDate", label: "Дата документа" },
      { key: "clientCode", label: "КлиентКод" },
      { key: "productCode", label: "Код продукта" },
      { key: "productName", label: "Название продукта" },
      { key: "department", label: "Отдел" },
    ];
    exportToExcel(sortedCredits, columns, `Кредиты_${selectedClient?.surname}`);
  };

  const handleExportDeposits = () => {
    const columns = [
      { key: (row) => row.AgreementData?.Code, label: "Номер договора" },
      { key: (row) => row.AgreementData?.ColvirReferenceId, label: "Референс" },
      { key: (row) => row.AgreementData?.Status?.Name, label: "Статус" },
      {
        key: (row) => row.BalanceAccounts?.[0]?.Balance || "-",
        label: "Остаток депозита",
      },
      { key: (row) => row.AgreementData?.DateFrom, label: "Дата начала" },
      { key: (row) => row.AgreementData?.DateTo, label: "Дата окончания" },
      { key: (row) => row.AgreementData?.Product?.Name, label: "Продукт" },
      {
        key: (row) =>
          `${row.AgreementData?.DepoTermTU} ${row.AgreementData?.DepoTermTimeType}`,
        label: "Срок",
      },
      { key: (row) => row.AgreementData?.Department?.Code, label: "Отдел" },
      {
        key: (row) =>
          `${row.AgreementData?.Amount} ${row.AgreementData?.Currency}`,
        label: "Сумма договора",
      },
    ];
    exportToExcel(
      sortedDeposits,
      columns,
      `Депозиты_${selectedClient?.surname}`,
    );
  };

  // Функция для открытия графика платежей
  const handleOpenGraph = async (referenceId) => {
    setSelectedReferenceId(referenceId);
    setGraphModalOpen(true);
    setIsGraphLoading(true);

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `${API_BASE_URL}/credits/graphs?referenceId=${referenceId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setGraphData(data);
    } catch (error) {
      console.error("Ошибка при загрузке графика платежей:", error);
      showAlert("Произошла ошибка при загрузке графика платежей", "error");
    } finally {
      setIsGraphLoading(false);
    }
  };

  // Функция для закрытия модального окна
  const handleCloseGraphModal = () => {
    setGraphModalOpen(false);
    setGraphData([]);
    setSelectedReferenceId("");
  };

  console.log("isMobile", isMobile);

  const selectedClient =
    clientsData.length > 0 ? clientsData[selectedClientIndex] : null;

  const tableData = selectedClient
    ? [
        { label: "Телефон", key: "phone", value: selectedClient.phone },
        {
          label: "Тип клиента",
          key: "client_type_name",
          value: selectedClient.client_type_name,
        },
        {
          label: "Флаг банковского счета",
          key: "ban_acc_open_flag",
          value: selectedClient.ban_acc_open_flag,
        },
        {
          label: "Код департамента",
          key: "dep_code",
          value: selectedClient.dep_code,
        },
        {
          label: "Код клиента в АБС",
          key: "client_code",
          value: selectedClient.client_code,
        },
        { label: "Фамилия", key: "surname", value: selectedClient.surname },
        { label: "Имя", key: "name", value: selectedClient.name },
        {
          label: "Отчество",
          key: "patronymic",
          value: selectedClient.patronymic,
        },
        {
          label: "Фамилия (латиница)",
          key: "ltn_surname",
          value: selectedClient.ltn_surname,
        },
        {
          label: "Имя (латиница)",
          key: "ltn_name",
          value: selectedClient.ltn_name,
        },
        {
          label: "Отчество (латиница)",
          key: "ltn_patronymic",
          value: selectedClient.ltn_patronymic,
        },
        { label: "ИНН", key: "tax_code", value: selectedClient.tax_code },
        {
          label: "Тип документа",
          key: "identdoc_name",
          value: selectedClient.identdoc_name,
        },
        {
          label: "Серия документа",
          key: "identdoc_series",
          value: selectedClient.identdoc_series,
        },
        {
          label: "Номер документа",
          key: "identdoc_num",
          value: selectedClient.identdoc_num,
        },
        {
          label: "Дата выдачи",
          key: "identdoc_date",
          value: selectedClient.identdoc_date,
        },
        {
          label: "Кем выдан",
          key: "identdoc_orgname",
          value: selectedClient.identdoc_orgname,
        },
        { label: "SV ID", key: "sv_id", value: selectedClient.sv_id },
      ]
    : [];

  // useEffect теперь вызывает handleGetDataUser только когда изменяется client_code
  useEffect(() => {
    if (selectedClient?.client_code) {
      handleGetDataUser();
    }
  }, [selectedClient?.client_code, handleGetDataUser]);

  // Восстановление состояния
  useEffect(() => {
    const savedState = sessionStorage.getItem("absClientSearchState");
    if (savedState) {
      const state = JSON.parse(savedState);
      setPhoneNumber(state.phoneNumber || "");
      setDisplayPhone(state.displayPhone || "");
      setClientsData(state.clientsData || []);
      setSelectedClientIndex(state.selectedClientIndex || 0);
      setSelectTypeSearchClient(
        state.selectTypeSearchClient || TYPE_SEARCH_CLIENT[0].value,
      );
      setIsMobile(state.isMobile || null);
      setCardsData(state.cardsData || []);
      setAccountsData(state.accountsData || []);
      setCreditsData(state.creditsData || []);
      setDepositsData(state.depositsData || []);
      setIsSearched(state.isSearched || false);
    }
  }, []);

  const userInfoPhone = async (phone) => {
    try {
      let isMobile = null;

      isMobile = await getUserInfoPhone(phone);

      setIsMobile(isMobile);
    } catch (e) {
      console.error(e);
      setIsMobile(null);
    }
  };

  // Сохранение состояния с useCallback
  const saveState = useCallback(() => {
    const stateToSave = {
      phoneNumber,
      displayPhone,
      clientsData,
      selectedClientIndex,
      selectTypeSearchClient,
      isMobile,
      cardsData,
      accountsData,
      creditsData,
      depositsData,
      isSearched,
    };
    sessionStorage.setItem("absClientSearchState", JSON.stringify(stateToSave));
  }, [
    phoneNumber,
    displayPhone,
    clientsData,
    selectedClientIndex,
    selectTypeSearchClient,
    isMobile,
    cardsData,
    accountsData,
    creditsData,
    depositsData,
    isSearched,
  ]);

  useEffect(() => {
    saveState();
  }, [saveState]);

  useEffect(() => {
    if (selectedClient?.phone) {
      userInfoPhone(selectedClient.phone);
    }
  }, [selectedClient?.phone]);

  return (
    <>
      <div className="block_info_prems content-page" align="center">
        {alert.show && (
          <AlertMessage
            message={alert.message}
            type={alert.type}
            onClose={hideAlert}
            duration={3000}
          />
        )}

        <div className="processing-integration">
          <div className="processing-integration__container">
            {/* Заголовок */}
            <div className="processing-integration__header">
              <h1 className="processing-integration__title">
                Поиск клиента в АБС
              </h1>
            </div>

            {/* Поиск по номеру телефона */}
            <div className="processing-integration__search-card">
              <div className="search-card">
                <div className="search-card__content">
                  <div className="search-card__select-group">
                    <div className="custom-select">
                      <label
                        htmlFor="phoneNumber"
                        className="search-card__label"
                      >
                        Поиск клиента по
                      </label>
                      <select
                        id="searchType"
                        value={selectTypeSearchClient}
                        onChange={(e) => {
                          setSelectTypeSearchClient(e.target.value);
                          setPhoneNumber("");
                          setDisplayPhone("");
                        }}
                        className="search-card__select"
                        disabled={isLoading || (isSearched && !isProcessing)}
                      >
                        {TYPE_SEARCH_CLIENT.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="search-card__mobile-group">
                    {isMobile ? (
                      <>
                        <MdOutlinePhonelinkRing color="#4ee14e" size={"30px"} />
                        счет: {isMobile?.Iban || "000"}
                      </>
                    ) : isMobile !== null ? (
                      <>
                        <MdOutlinePhonelinkErase
                          color="#e21a1c"
                          size={"30px"}
                        />
                        Не подключен к мобильному банку
                      </>
                    ) : (
                      <MdOutlineSmartphone size={"30px"} />
                    )}
                  </div>
                  <div className="search-card__input-group">
                    <label htmlFor="phoneNumber" className="search-card__label">
                      {
                        TYPE_SEARCH_CLIENT.find(
                          (e) => e.value === selectTypeSearchClient,
                        ).inputLabel
                      }
                    </label>
                    <input
                      type="text"
                      id="phoneNumber"
                      value={displayPhone}
                      onChange={handlePhoneChange}
                      placeholder={
                        "Введите " +
                        TYPE_SEARCH_CLIENT.find(
                          (e) => e.value === selectTypeSearchClient,
                        ).inputLabel.toLocaleLowerCase()
                      }
                      className="search-card__input"
                      maxLength={20}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && phoneNumber) {
                          handleSearchClient();
                        }
                      }}
                      disabled={isLoading || (isSearched && !isProcessing)}
                    />
                  </div>
                  <div className="search-card__buttons">
                    <button
                      onClick={handleSearchClient}
                      disabled={
                        !phoneNumber ||
                        isLoading ||
                        (isSearched && !isProcessing)
                      }
                      className={`search-card__button ${
                        isLoading ? "search-card__button--loading" : ""
                      }`}
                    >
                      {isLoading ? "Поиск..." : "Найти клиента"}
                    </button>
                    <button
                      onClick={handleClear}
                      disabled={isLoading}
                      className="search-card__button search-card__button--secondary"
                    >
                      Очистить
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Если найдено несколько клиентов, показываем селектор */}
            {clientsData.length > 1 && (
              <div className="processing-integration__client-selector">
                <div className="client-selector">
                  <h3 className="client-selector__title">
                    Найдено клиентов: {clientsData.length}
                  </h3>
                  <div className="client-selector__controls">
                    <select
                      value={selectedClientIndex}
                      onChange={(e) =>
                        setSelectedClientIndex(parseInt(e.target.value))
                      }
                      className="client-selector__select"
                    >
                      {clientsData.map((client, index) => (
                        <option key={index} value={index}>
                          {index + 1}. {client.surname} {client.name}{" "}
                          {client.patronymic}
                          {client.tax_code && ` (ИНН: ${client.tax_code})`}
                        </option>
                      ))}
                    </select>
                    <div className="client-selector__navigation">
                      <button
                        onClick={() =>
                          setSelectedClientIndex((prev) =>
                            Math.max(0, prev - 1),
                          )
                        }
                        disabled={selectedClientIndex === 0}
                        className="client-selector__nav-btn client-selector__nav-btn--prev"
                      >
                        ← Предыдущий
                      </button>
                      <button
                        onClick={() =>
                          setSelectedClientIndex((prev) =>
                            Math.min(clientsData.length - 1, prev + 1),
                          )
                        }
                        disabled={
                          selectedClientIndex === clientsData.length - 1
                        }
                        className="client-selector__nav-btn client-selector__nav-btn--next"
                      >
                        Следующий →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Таблица с данными клиента */}
            {selectedClient && (
              <div className="processing-integration__limits-table">
                <div className="limits-table">
                  <div className="limits-table__header">
                    <h2 className="limits-table__title">
                      Данные клиента из АБС
                      {clientsData.length > 1 && (
                        <span className="limits-table__client-counter">
                          (Клиент {selectedClientIndex + 1} из{" "}
                          {clientsData.length})
                        </span>
                      )}
                    </h2>
                    <div className="limits-table__actions">
                      <button
                        onClick={handleExportClientInfo}
                        className="export-excel-btn"
                        style={{ marginRight: 10 }}
                      >
                        Экспорт в Excel
                      </button>
                      <button
                        onClick={copySelectedClientToClipboard}
                        className="limits-table__action-btn limits-table__action-btn--secondary"
                      >
                        Скопировать JSON клиента
                      </button>
                      {clientsData.length > 1 && (
                        <button
                          onClick={copyAllClientsToClipboard}
                          className="limits-table__action-btn limits-table__action-btn--secondary"
                        >
                          Скопировать JSON всех клиентов
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="limits-table__wrapper">
                    <table className="limits-table">
                      <thead className="limits-table__head">
                        <tr>
                          {tableData &&
                            tableData.map((item, i) => (
                              <th
                                key={i}
                                className="limits-table__th limits-table__th--field"
                              >
                                {item.label}
                              </th>
                            ))}
                        </tr>
                      </thead>
                      <tbody className="limits-table__body">
                        <tr className="limits-table__row">
                          {tableData.map((item) => (
                            <td
                              key={item.key}
                              className="limits-table__td limits-table__td--value"
                            >
                              <span className="current-value">
                                {item.value ||
                                  (item.value === 0 ? 0 : "Не указано")}
                              </span>
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Сводная информация */}
                  <div className="limits-table__footer">
                    <div className="limits-table__stats">
                      <span className="limits-table__stat">
                        ФИО: {selectedClient.surname} {selectedClient.name}{" "}
                        {selectedClient.patronymic}
                      </span>
                      <span className="limits-table__stat">
                        Телефон: {selectedClient.phone}
                      </span>
                      <span className="limits-table__stat">
                        ИНН: {selectedClient.tax_code}
                      </span>
                      <span className="limits-table__stat">
                        Код клиента: {selectedClient.client_code}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Таблица карт с сортировкой и функциями */}
            {!selectedClient && !cardsData?.length ? (
              ""
            ) : (
              <div className="processing-integration__limits-table">
                <div className="limits-table">
                  <div className="limits-table__header">
                    <h2 className="limits-table__title">Данные карт</h2>
                    <div className="limits-table__actions">
                      {cardsData?.length > 0 && (
                        <button
                          onClick={handleExportCards}
                          className="export-excel-btn"
                        >
                          Экспорт в Excel
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="limits-table__wrapper">
                    <table className="limits-table">
                      <thead className="limits-table__head">
                        <tr>
                          <th
                            onClick={() => requestSortCards("cardId")}
                            className="limits-table__th sortable-header"
                          >
                            ID Карты{" "}
                            <SortIcon
                              sortConfig={sortCardsConfig}
                              sortKey="cardId"
                            />
                          </th>
                          <th
                            onClick={() => requestSortCards("type")}
                            className="limits-table__th sortable-header"
                          >
                            Тип{" "}
                            <SortIcon
                              sortConfig={sortCardsConfig}
                              sortKey="type"
                            />
                          </th>
                          <th
                            onClick={() => requestSortCards("statusName")}
                            className="limits-table__th sortable-header"
                          >
                            Статус{" "}
                            <SortIcon
                              sortConfig={sortCardsConfig}
                              sortKey="statusName"
                            />
                          </th>
                          <th
                            onClick={() => requestSortCards("expirationDate")}
                            className="limits-table__th sortable-header"
                          >
                            Срок{" "}
                            <SortIcon
                              sortConfig={sortCardsConfig}
                              sortKey="expirationDate"
                            />
                          </th>
                          <th
                            onClick={() => requestSortCards("currency")}
                            className="limits-table__th sortable-header"
                          >
                            Валюта{" "}
                            <SortIcon
                              sortConfig={sortCardsConfig}
                              sortKey="currency"
                            />
                          </th>
                          <th
                            onClick={() => requestSortCards("accounts.0.state")}
                            className="limits-table__th sortable-header"
                          >
                            Остаток{" "}
                            <SortIcon
                              sortConfig={sortCardsConfig}
                              sortKey="accounts.0.state"
                            />
                          </th>
                          <th className="limits-table__th">Действия</th>
                        </tr>
                      </thead>
                      <tbody className="limits-table__body">
                        {sortedCards?.map((card, idx) => (
                          <tr key={idx} className="limits-table__row">
                            <td className="limits-table__td">{card.cardId}</td>
                            <td className="limits-table__td">{card.type}</td>
                            <td className="limits-table__td">
                              {card.statusName}
                            </td>
                            <td className="limits-table__td">
                              {card.expirationDate}
                            </td>
                            <td className="limits-table__td">
                              {card.currency}
                            </td>
                            <td className="limits-table__td">
                              {card.accounts?.[0]?.state || "-"}
                            </td>
                            <td className="limits-table__td">
                              <button
                                className="selectAll-toggle"
                                style={{ marginRight: 10 }}
                                onClick={() =>
                                  navigate(
                                    "/processing/transactions/" + card.cardId,
                                  )
                                }
                              >
                                История
                              </button>
                              <button
                                className="selectAll-toggle"
                                style={{ background: "#374151" }}
                                onClick={() =>
                                  (document.location.href =
                                    "http://10.64.1.10/services/tariff_by_idn.php?idn=" +
                                    card.cardId)
                                }
                              >
                                Посмотреть тариф
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Таблица счетов с сортировкой и функциями */}
            {!selectedClient && !accountsData?.length ? (
              ""
            ) : (
              <div className="processing-integration__limits-table">
                <div className="limits-table">
                  <div className="limits-table__header">
                    <h2 className="limits-table__title">Данные счетов</h2>
                    <div className="limits-table__actions">
                      {accountsData?.length > 0 && (
                        <button
                          onClick={handleExportAccounts}
                          className="export-excel-btn"
                        >
                          Экспорт в Excel
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="limits-table__wrapper">
                    <table className="limits-table">
                      <thead className="limits-table__head">
                        <tr>
                          <th
                            onClick={() => requestSortAccounts("Number")}
                            className="limits-table__th sortable-header"
                          >
                            Номер счета{" "}
                            <SortIcon
                              sortConfig={sortAccountsConfig}
                              sortKey="Number"
                            />
                          </th>
                          <th
                            onClick={() => requestSortAccounts("Balance")}
                            className="limits-table__th sortable-header"
                          >
                            Баланс{" "}
                            <SortIcon
                              sortConfig={sortAccountsConfig}
                              sortKey="Balance"
                            />
                          </th>
                          <th
                            onClick={() => requestSortAccounts("Status.Name")}
                            className="limits-table__th sortable-header"
                          >
                            Статус{" "}
                            <SortIcon
                              sortConfig={sortAccountsConfig}
                              sortKey="Status.Name"
                            />
                          </th>
                          <th
                            onClick={() => requestSortAccounts("DateOpened")}
                            className="limits-table__th sortable-header"
                          >
                            Дата открытия{" "}
                            <SortIcon
                              sortConfig={sortAccountsConfig}
                              sortKey="DateOpened"
                            />
                          </th>
                          <th
                            onClick={() => requestSortAccounts("Branch.Name")}
                            className="limits-table__th sortable-header"
                          >
                            Филиал{" "}
                            <SortIcon
                              sortConfig={sortAccountsConfig}
                              sortKey="Branch.Name"
                            />
                          </th>
                          <th className="limits-table__th">Действия</th>
                        </tr>
                      </thead>
                      <tbody className="limits-table__body">
                        {sortedAccounts.map((acc, idx) => (
                          <tr key={idx} className="limits-table__row">
                            <td className="limits-table__td">{acc.Number}</td>
                            <td className="limits-table__td">
                              {acc.Balance} {acc.Currency?.Code}
                            </td>
                            <td className="limits-table__td">
                              {acc.Status?.Name}
                            </td>
                            <td className="limits-table__td">
                              {acc.DateOpened}
                            </td>
                            <td className="limits-table__td">
                              {acc.Branch?.Name}
                            </td>
                            <td className="limits-table__td">
                              <button
                                className="selectAll-toggle"
                                onClick={() =>
                                  navigate(
                                    "/frontovik/account-operations?account=" +
                                      acc.Number,
                                  )
                                }
                              >
                                Выписки счета
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Таблица кредитов с сортировкой и функциями */}
            {!selectedClient && !creditsData?.length ? (
              ""
            ) : (
              <div className="processing-integration__limits-table">
                <div className="limits-table">
                  <div className="limits-table__header">
                    <h2 className="limits-table__title">Данные кредитов</h2>
                    <div className="limits-table__actions">
                      {creditsData?.length > 0 && (
                        <button
                          onClick={handleExportCredits}
                          className="export-excel-btn"
                        >
                          Экспорт в Excel
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="limits-table__wrapper">
                    <table className="limits-table">
                      <thead className="limits-table__head">
                        <tr>
                          <th
                            onClick={() => requestSortCredits("contractNumber")}
                            className="limits-table__th sortable-header"
                          >
                            Номер договора{" "}
                            <SortIcon
                              sortConfig={sortCreditsConfig}
                              sortKey="contractNumber"
                            />
                          </th>
                          <th
                            onClick={() => requestSortCredits("referenceId")}
                            className="limits-table__th sortable-header"
                          >
                            Идентификатор ссылки{" "}
                            <SortIcon
                              sortConfig={sortCreditsConfig}
                              sortKey="referenceId"
                            />
                          </th>
                          <th
                            onClick={() => requestSortCredits("statusName")}
                            className="limits-table__th sortable-header"
                          >
                            Статус{" "}
                            <SortIcon
                              sortConfig={sortCreditsConfig}
                              sortKey="statusName"
                            />
                          </th>
                          <th
                            onClick={() => requestSortCredits("amount")}
                            className="limits-table__th sortable-header"
                          >
                            Сумма{" "}
                            <SortIcon
                              sortConfig={sortCreditsConfig}
                              sortKey="amount"
                            />
                          </th>
                          <th
                            onClick={() => requestSortCredits("documentDate")}
                            className="limits-table__th sortable-header"
                          >
                            Дата документа{" "}
                            <SortIcon
                              sortConfig={sortCreditsConfig}
                              sortKey="documentDate"
                            />
                          </th>
                          <th
                            onClick={() => requestSortCredits("clientCode")}
                            className="limits-table__th sortable-header"
                          >
                            КлиентКод{" "}
                            <SortIcon
                              sortConfig={sortCreditsConfig}
                              sortKey="clientCode"
                            />
                          </th>
                          <th
                            onClick={() => requestSortCredits("productCode")}
                            className="limits-table__th sortable-header"
                          >
                            Код продукта{" "}
                            <SortIcon
                              sortConfig={sortCreditsConfig}
                              sortKey="productCode"
                            />
                          </th>
                          <th
                            onClick={() => requestSortCredits("productName")}
                            className="limits-table__th sortable-header"
                          >
                            Название продукта{" "}
                            <SortIcon
                              sortConfig={sortCreditsConfig}
                              sortKey="productName"
                            />
                          </th>
                          <th
                            onClick={() => requestSortCredits("department")}
                            className="limits-table__th sortable-header"
                          >
                            Отдел{" "}
                            <SortIcon
                              sortConfig={sortCreditsConfig}
                              sortKey="department"
                            />
                          </th>
                          <th className="limits-table__th">Действия</th>
                        </tr>
                      </thead>
                      <tbody className="limits-table__body">
                        {sortedCredits?.map((card, idx) => (
                          <tr key={idx} className="limits-table__row">
                            <td className="limits-table__td">
                              {card.contractNumber}
                            </td>
                            <td className="limits-table__td">
                              {card.referenceId}
                            </td>
                            <td className="limits-table__td">
                              {card.statusName}
                            </td>
                            <td className="limits-table__td">
                              {card.amount} {card.currency}
                            </td>
                            <td className="limits-table__td">
                              {card.documentDate}
                            </td>
                            <td className="limits-table__td">
                              {card.clientCode}
                            </td>
                            <td className="limits-table__td">
                              {card.productCode}
                            </td>
                            <td className="limits-table__td">
                              {card.productName}
                            </td>
                            <td className="limits-table__td">
                              {card.department || "-"}
                            </td>
                            <td className="limits-table__td">
                              <button
                                className="selectAll-toggle"
                                onClick={() =>
                                  handleOpenGraph(card.referenceId)
                                }
                                disabled={!card.referenceId}
                              >
                                График
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Таблица депозитов с сортировкой */}
            {!selectedClient && !depositsData?.length ? (
              ""
            ) : (
              <div className="processing-integration__limits-table">
                <div className="limits-table">
                  <div className="limits-table__header">
                    <h2 className="limits-table__title">Данные депозитов</h2>
                    <div className="limits-table__actions">
                      {depositsData?.length > 0 && (
                        <button
                          onClick={handleExportDeposits}
                          className="export-excel-btn"
                        >
                          Экспорт в Excel
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="limits-table__wrapper">
                    <table className="limits-table">
                      <thead className="limits-table__head">
                        <tr>
                          <th
                            onClick={() =>
                              requestSortDeposits("AgreementData.Code")
                            }
                            className="limits-table__th sortable-header"
                          >
                            Номер договора{" "}
                            <SortIcon
                              sortConfig={sortDepositsConfig}
                              sortKey="AgreementData.Code"
                            />
                          </th>
                          <th
                            onClick={() =>
                              requestSortDeposits(
                                "AgreementData.ColvirReferenceId",
                              )
                            }
                            className="limits-table__th sortable-header"
                          >
                            Референс{" "}
                            <SortIcon
                              sortConfig={sortDepositsConfig}
                              sortKey="AgreementData.ColvirReferenceId"
                            />
                          </th>
                          <th
                            onClick={() =>
                              requestSortDeposits("AgreementData.Status.Name")
                            }
                            className="limits-table__th sortable-header"
                          >
                            Статус{" "}
                            <SortIcon
                              sortConfig={sortDepositsConfig}
                              sortKey="AgreementData.Status.Name"
                            />
                          </th>
                          <th
                            onClick={() =>
                              requestSortDeposits("BalanceAccounts.0.Balance")
                            }
                            className="limits-table__th sortable-header"
                          >
                            Остаток депозита{" "}
                            <SortIcon
                              sortConfig={sortDepositsConfig}
                              sortKey="BalanceAccounts.0.Balance"
                            />
                          </th>
                          <th
                            onClick={() =>
                              requestSortDeposits("AgreementData.DateFrom")
                            }
                            className="limits-table__th sortable-header"
                          >
                            Дата начала{" "}
                            <SortIcon
                              sortConfig={sortDepositsConfig}
                              sortKey="AgreementData.DateFrom"
                            />
                          </th>
                          <th
                            onClick={() =>
                              requestSortDeposits("AgreementData.DateTo")
                            }
                            className="limits-table__th sortable-header"
                          >
                            Дата окончания{" "}
                            <SortIcon
                              sortConfig={sortDepositsConfig}
                              sortKey="AgreementData.DateTo"
                            />
                          </th>
                          <th
                            onClick={() =>
                              requestSortDeposits("AgreementData.Product.Name")
                            }
                            className="limits-table__th sortable-header"
                          >
                            Продукт{" "}
                            <SortIcon
                              sortConfig={sortDepositsConfig}
                              sortKey="AgreementData.Product.Name"
                            />
                          </th>
                          <th
                            onClick={() =>
                              requestSortDeposits("AgreementData.DepoTermTU")
                            }
                            className="limits-table__th sortable-header"
                          >
                            Срок{" "}
                            <SortIcon
                              sortConfig={sortDepositsConfig}
                              sortKey="AgreementData.DepoTermTU"
                            />
                          </th>
                          <th
                            onClick={() =>
                              requestSortDeposits(
                                "AgreementData.Department.Code",
                              )
                            }
                            className="limits-table__th sortable-header"
                          >
                            Отдел{" "}
                            <SortIcon
                              sortConfig={sortDepositsConfig}
                              sortKey="AgreementData.Department.Code"
                            />
                          </th>
                          <th
                            onClick={() =>
                              requestSortDeposits("AgreementData.Amount")
                            }
                            className="limits-table__th sortable-header"
                          >
                            Сумма договора{" "}
                            <SortIcon
                              sortConfig={sortDepositsConfig}
                              sortKey="AgreementData.Amount"
                            />
                          </th>
                        </tr>
                      </thead>
                      <tbody className="limits-table__body">
                        {sortedDeposits?.map((item, idx) => (
                          <tr key={idx} className="limits-table__row">
                            <td className="limits-table__td">
                              {item.AgreementData?.Code}
                            </td>
                            <td className="limits-table__td">
                              {item.AgreementData?.ColvirReferenceId}
                            </td>
                            <td className="limits-table__td">
                              {item.AgreementData?.Status?.Name}
                            </td>
                            <td className="limits-table__td">
                              {item.BalanceAccounts?.[0]?.Balance || "-"}
                            </td>
                            <td className="limits-table__td">
                              {item.AgreementData?.DateFrom}
                            </td>
                            <td className="limits-table__td">
                              {item.AgreementData?.DateTo}
                            </td>
                            <td className="limits-table__td">
                              {item.AgreementData?.Product?.Name}
                            </td>
                            <td className="limits-table__td">
                              {item.AgreementData?.DepoTermTU}{" "}
                              {item.AgreementData?.DepoTermTimeType}
                            </td>
                            <td className="limits-table__td">
                              {item.AgreementData?.Department?.Code}
                            </td>
                            <td className="limits-table__td">
                              {item.AgreementData?.Amount}{" "}
                              {item.AgreementData?.Currency}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Индикатор загрузки */}
            {isLoading && (
              <div className="processing-integration__loading">
                <div className="spinner"></div>
              </div>
            )}

            {/* Сообщение об отсутствии данных */}
            {!isLoading && clientsData.length === 0 && phoneNumber && (
              <div className="processing-integration__no-data">
                <div className="no-data-message">
                  <p>Данные не найдены</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Модальное окно для графика платежей */}
      <GraphModal
        isOpen={graphModalOpen}
        onClose={handleCloseGraphModal}
        referenceId={selectedReferenceId}
        graphData={graphData}
        isLoading={isGraphLoading}
      />
    </>
  );
}
