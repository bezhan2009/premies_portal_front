import React, { useEffect, useState, useCallback } from "react";
import "../../../styles/ABSSearch.scss";
import Select from "../../elements/Select";
import "../../../styles/components/BlockInfo.scss";
import "../../../styles/components/ProcessingIntegration.scss";
import AlertMessage from "../../general/AlertMessage.jsx";
import Modal from "../../general/Modal.jsx";
import {
  getUserCards,
  getUserAccounts,
  getUserCredits,
  getUserDeposits,
  getUserInfoPhone,
} from "../../../api/ABS_frotavik/getUserCredits";
import {
  fetchLoanDetails,
  repayLoanSoap,
} from "../../../api/ABS_frotavik/getLoanDetails";
import { useNavigate } from "react-router-dom";
import { TYPE_SEARCH_CLIENT } from "../../../const/defConst.js";
import { useExcelExport } from "../../../hooks/useExcelExport.js";
import { useTableSort } from "../../../hooks/useTableSort.js";
import {
  canAccessTransactions,
  canAccessAccountOperations,
} from "../../../api/roleHelper.js";

// Extracted Components
import GraphModal from "./GraphModal.jsx";
import CreditDetailsModal from "./CreditDetailsModal.jsx";
import RepayModal from "./RepayModal.jsx";
import SearchForm from "./SearchForm.jsx";
import ClientPersonalInfo from "./ClientPersonalInfo.jsx";
import ClientDataTabs from "./ClientDataTabs.jsx";

// Utilities
import {
  normalizeClientData,
  formatPhoneNumber as formatPhoneNumberUtil,
  copyToClipboard as copyToClipboardUtil,
} from "./absSearchUtils.js";

const API_BASE_URL = import.meta.env.VITE_BACKEND_ABS_SERVICE_URL;
const API_ATM_URL = import.meta.env.VITE_BACKEND_ATM_SERVICE_URL;
const API_TELEGRAM_URL = import.meta.env.VITE_BACKEND_TELEGRAM_URL;

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

  // Telegram states
  const [telegramData, setTelegramData] = useState(null);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [telegramDeleteLoading, setTelegramDeleteLoading] = useState(false);

  // Проверка доступа к страницам
  const hasTransactionsAccess = canAccessTransactions();
  const hasAccountOperationsAccess = canAccessAccountOperations();

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

  // Состояния для модального окна досрочного погашения
  const [repayModalOpen, setRepayModalOpen] = useState(false);
  const [isRepayLoading, setIsRepayLoading] = useState(false);
  const [selectedCreditForRepay, setSelectedCreditForRepay] = useState(null);

  // Состояния для модального окна деталей кредита
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsData, setDetailsData] = useState(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);

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

  const copyToClipboard = (text) => {
    if (copyToClipboardUtil(text)) {
      showAlert("Скопировано в буфер обмена", "success");
    } else {
      showAlert("Ошибка при копировании", "error");
    }
  };

  const formatPhoneNumber = (value) => {
    return formatPhoneNumberUtil(value);
  };

  const TYPES_ALLOW_LETTERS = [
    TYPE_SEARCH_CLIENT[1]?.value, // код клиента
    "byName", // поиск по имени (ATM)
  ];

  const handlePhoneChange = (e) => {
    const value = e.target.value;
    const isLetterType = TYPES_ALLOW_LETTERS.includes(selectTypeSearchClient);

    if (isLetterType) {
      // Для кода клиента и имени – сохраняем как есть, без форматирования
      setPhoneNumber(value);
      setDisplayPhone(value);
    } else {
      // Для числовых полей – оставляем только цифры
      const digitsOnly = value.replace(/\D/g, "");
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
    setTelegramData(null);
    sessionStorage.removeItem("absClientSearchState");
  };

  // Функция для поиска через ATM API
  const searchViaATMService = async (searchType, searchValue) => {
    let url = "";

    switch (searchType) {
      case "byCardId": // По ID карты
        url = `${API_ATM_URL}/services/innbyidn.php?cardidn=${searchValue}`;
        break;
      case "byAccount": // По номеру счета
        url = `${API_ATM_URL}/services/clientcode.php?acc=${searchValue}`;
        break;
      case "byName": {
        // По фамилии и имени
        const [lname, fname] = searchValue.split(" ");
        url = `${API_ATM_URL}/services/clientcode.php?lname=${encodeURIComponent(lname || "")}&fname=${encodeURIComponent(fname || "")}`;
        break;
      }
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

      // Определяем, какой API использовать
      const searchTypeIndex = TYPE_SEARCH_CLIENT.findIndex(
        (t) => t.value === selectTypeSearchClient,
      );

      // Проверяем тип API по индексу (0-2: ABS, 3-6: ATM)
      if (searchTypeIndex >= 3 && searchTypeIndex <= 6) {
        // ============ ATM API ПОИСК ============
        // Получаем массив client codes через ATM сервис
        const clientCodes = await searchViaATMService(
          selectTypeSearchClient, // передаем напрямую value (byCardId, byAccount и т.д.)
          formattedPhone,
        );

        if (!clientCodes || clientCodes.length === 0) {
          showAlert("Клиенты не найдены", "error");
          setClientsData([]);
          return;
        }

        // Преобразуем в массив если пришел один объект
        const clientCodesArray = Array.isArray(clientCodes)
          ? clientCodes
          : [clientCodes];

        // Получаем полные данные клиентов по их кодам через ABS API
        const clientsPromises = clientCodesArray.map((item) =>
          getClientByCode(item.clicode, token),
        );

        const clientsFullData = await Promise.all(clientsPromises);

        // Нормализуем данные (используем формат для кода клиента)
        const normalizedData = clientsFullData.map((client) =>
          normalizeClientData(client, TYPE_SEARCH_CLIENT[1].value),
        );

        setClientsData(normalizedData);
        setSelectedClientIndex(0);

        if (normalizedData.length === 0) {
          showAlert("Клиенты не найдены в АБС", "error");
        } else {
          showAlert(`Найдено клиентов: ${normalizedData.length}`, "success");
        }
      } else {
        // ============ ABS API ПОИСК ============
        // Формируем URL для стандартного ABS API
        const apiUrl = `${API_BASE_URL}/${selectTypeSearchClient}${formattedPhone}`;

        const response = await fetch(apiUrl, {
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

        const data = await response.json();

        // Нормализуем данные в зависимости от типа поиска
        let normalizedData = [];

        if (searchTypeIndex === 0) {
          // Поиск по телефону - данные уже в правильном формате
          normalizedData = Array.isArray(data) ? data : [data];
        } else if (searchTypeIndex === 1) {
          // Поиск по коду клиента возвращает один объект
          normalizedData = [normalizeClientData(data, selectTypeSearchClient)];
        } else if (searchTypeIndex === 2) {
          // Поиск по ИНН возвращает массив
          normalizedData = Array.isArray(data)
            ? data.map((client) =>
                normalizeClientData(client, selectTypeSearchClient),
              )
            : [normalizeClientData(data, selectTypeSearchClient)];
        }

        setClientsData(normalizedData);
        setSelectedClientIndex(0);

        if (normalizedData.length === 0) {
          showAlert("Клиенты не найдены в АБС", "error");
        } else {
          showAlert(`Найдено клиентов: ${normalizedData.length}`, "success");
        }
      }
    } catch (error) {
      console.error("Ошибка при поиске клиента:", error);
      showAlert("Произошла ошибка при поиске клиента", "error");
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

      setCardsData(resCards || []);
      setAccountsData(resAcc || []);
      setCreditsData(resCredits || []);
      setDepositsData(resDeposits || []);
    } catch (error) {
      console.error("Error fetching user cards/accounts:", error);
      showAlert("Ошибка при получении данных карт/счетов", "error");
    }
  }, [clientsData, selectedClientIndex]);

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

  // Детали кредита
  const handleOpenDetails = async (referenceId) => {
    setDetailsModalOpen(true);
    setIsDetailsLoading(true);
    try {
      const data = await fetchLoanDetails(referenceId);
      if (data) {
        setDetailsData(data);
      } else {
        showAlert("Не удалось разобрать данные ответа", "error");
      }
    } catch (error) {
      console.error("Ошибка при загрузке деталей кредита:", error);
      showAlert("Произошла ошибка при загрузке деталей кредита", "error");
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const handleCloseDetailsModal = () => {
    setDetailsModalOpen(false);
    setDetailsData(null);
  };

  // Функции для модального окна досрочного погашения
  const handleOpenRepayModal = (credit) => {
    setSelectedCreditForRepay(credit);
    setRepayModalOpen(true);
  };

  const handleCloseRepayModal = () => {
    setRepayModalOpen(false);
    setSelectedCreditForRepay(null);
  };

  const handleRepaySubmit = async (repayData) => {
    try {
      setIsRepayLoading(true);
      await repayLoanSoap(repayData);
      showAlert("Запрос на погашение кредита успешно отправлен", "success");
      handleCloseRepayModal();
      // Обновляем данные пользователя чтобы увидеть изменения (если АБС сразу обновляет)
      handleGetDataUser();
    } catch (error) {
      console.error("Ошибка при погашении кредита:", error);
      showAlert("Произошла ошибка при погашении кредита", "error");
    } finally {
      setIsRepayLoading(false);
    }
  };
  // Обработчик перехода на историю транзакций с проверкой доступа
  const handleNavigateToTransactions = (cardId) => {
    sessionStorage.setItem("allowedCardId", cardId);
    navigate("/processing/transactions/" + cardId);
  };

  const handleNavigateToAllCardsTransactions = (cards) => {
    if (!cards || cards.length === 0) return;
    const cardIds = cards.map((c) => c.cardId).join(",") + ",";
    navigate("/processing/transactions/" + cardIds);
  };

  // Обработчик перехода на выписки счета с проверкой доступа
  const handleNavigateToAccountOperations = (accountNumber) => {
    sessionStorage.setItem("allowedAccountNumber", accountNumber);
    navigate("/accounts/account-operations?account=" + accountNumber);
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
        // {
        //     label: "Флаг банковского счета",
        //     key: "ban_acc_open_flag",
        //     value: selectedClient.ban_acc_open_flag,
        // },
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
  ]);

  useEffect(() => {
    saveState();
  }, [saveState]);

  useEffect(() => {
    if (selectedClient?.phone) {
      userInfoPhone(selectedClient.phone);
      fetchTelegramUser(selectedClient.phone);
    }
  }, [selectedClient]);

  // Telegram user lookup
  const fetchTelegramUser = async (phone) => {
    try {
      setTelegramLoading(true);
      setTelegramData(null);
      const resp = await fetch(
        `${API_TELEGRAM_URL}/api/Users/get-users-by-phone?phone=${phone}`,
      );
      if (!resp.ok) {
        setTelegramData(null);
        return;
      }
      const json = await resp.json();
      const users = json?.data;
      if (Array.isArray(users) && users.length > 0) {
        setTelegramData(users[0]);
      } else {
        setTelegramData(null);
      }
    } catch (e) {
      console.error("Ошибка Telegram поиска:", e);
      setTelegramData(null);
    } finally {
      setTelegramLoading(false);
    }
  };

  // Delete Telegram binding
  const handleDeleteTelegram = async () => {
    if (!selectedClient?.phone) return;
    try {
      setTelegramDeleteLoading(true);
      const resp = await fetch(
        `${API_TELEGRAM_URL}/api/Users/telegramId?phone=${selectedClient.phone}`,
        { method: "PUT" },
      );
      if (resp.ok) {
        showAlert("Telegram ID успешно удалён", "success");
        setTelegramData(null);
      } else {
        showAlert("Ошибка при удалении Telegram ID", "error");
      }
    } catch (e) {
      console.error("Ошибка удаления Telegram:", e);
      showAlert("Ошибка при удалении Telegram ID", "error");
    } finally {
      setTelegramDeleteLoading(false);
    }
  };

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
            <SearchForm
              selectTypeSearchClient={selectTypeSearchClient}
              setSelectTypeSearchClient={setSelectTypeSearchClient}
              displayPhone={displayPhone}
              handlePhoneChange={handlePhoneChange}
              isLoading={isLoading}
              handleSearchClient={handleSearchClient}
              handleClear={handleClear}
              phoneNumber={phoneNumber}
              isMobile={isMobile}
              telegramLoading={telegramLoading}
              telegramData={telegramData}
              handleDeleteTelegram={handleDeleteTelegram}
              telegramDeleteLoading={telegramDeleteLoading}
            />

            <ClientPersonalInfo
              clientsData={clientsData}
              selectedClientIndex={selectedClientIndex}
              setSelectedClientIndex={setSelectedClientIndex}
              selectedClient={selectedClient}
              tableData={tableData}
              handleExportClientInfo={handleExportClientInfo}
              copySelectedClientToClipboard={copySelectedClientToClipboard}
              copyAllClientsToClipboard={copyAllClientsToClipboard}
            />

            <ClientDataTabs
              selectedClient={selectedClient}
              cardsData={cardsData}
              sortedCards={sortedCards}
              requestSortCards={requestSortCards}
              sortCardsConfig={sortCardsConfig}
              handleExportCards={handleExportCards}
              handleNavigateToTransactions={handleNavigateToTransactions}
              handleNavigateToAllCardsTransactions={
                handleNavigateToAllCardsTransactions
              }
              hasTransactionsAccess={hasTransactionsAccess}
              accountsData={accountsData}
              sortedAccounts={sortedAccounts}
              requestSortAccounts={requestSortAccounts}
              sortAccountsConfig={sortAccountsConfig}
              handleExportAccounts={handleExportAccounts}
              handleNavigateToAccountOperations={
                handleNavigateToAccountOperations
              }
              hasAccountOperationsAccess={hasAccountOperationsAccess}
              creditsData={creditsData}
              sortedCredits={sortedCredits}
              requestSortCredits={requestSortCredits}
              sortCreditsConfig={sortCreditsConfig}
              handleExportCredits={handleExportCredits}
              handleOpenGraph={handleOpenGraph}
              handleOpenDetails={handleOpenDetails}
              handleOpenRepayModal={handleOpenRepayModal}
              depositsData={depositsData}
              sortedDeposits={sortedDeposits}
              requestSortDeposits={requestSortDeposits}
              sortDepositsConfig={sortDepositsConfig}
              handleExportDeposits={handleExportDeposits}
            />
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

      {/* Модальное окно для досрочного погашения */}
      <RepayModal
        isOpen={repayModalOpen}
        onClose={handleCloseRepayModal}
        onSubmit={handleRepaySubmit}
        isLoading={isRepayLoading}
        creditInfo={selectedCreditForRepay}
        accountsData={accountsData}
      />

      {/* Модальное окно для деталей кредита */}
      <CreditDetailsModal
        isOpen={detailsModalOpen}
        onClose={handleCloseDetailsModal}
        data={detailsData}
        isLoading={isDetailsLoading}
      />
    </>
  );
}
