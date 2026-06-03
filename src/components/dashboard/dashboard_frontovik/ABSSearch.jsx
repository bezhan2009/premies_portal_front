import React, { useEffect, useState, useCallback } from "react";
import AlertMessage from "../../general/AlertMessage.jsx";
import { logAuditAction } from "../../../utils/auditLogger.js";
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
    canBlockCard,
    canChangePin,
    hasRole,
} from "../../../api/roleHelper.js";
import {
    fetchCardDetails,
    fetchCardServices,
    changeCardStatus,
    unblockCard,
    resetPinCounter,
    generatePin,
    manageCardService,
    fetchCardLimits,
} from "../../../api/processing/transactions.js";

// Extracted Components
import GraphModal from "./GraphModal.jsx";
import CreditDetailsModal from "./CreditDetailsModal.jsx";
import RepayModal from "./RepayModal.jsx";
import SearchForm from "./SearchForm.jsx";
import ClientPersonalInfo from "./ClientPersonalInfo.jsx";
import ClientAuditLogsModal from "./ClientAuditLogsModal.jsx";
import ClientDataTabs from "./ClientDataTabs.jsx";
import BlockCardModal from "./BlockCardModal.jsx";
import ServicesModal from "./ServicesModal.jsx";
import ChangePinModal from "./ChangePinModal.jsx";
import CardLimitsModal from "./CardLimitsModal.jsx";
import ClientDocumentsModal from "../../client-documents/ClientDocumentsModal.jsx";
import DocumentPreviewModal from "../../client-documents/DocumentPreviewModal.jsx";
import { getClientDocumentsByINN } from "../../../api/clientsDataFiles/clientsDataFiles.js";

// Utilities
import {
    normalizeClientData,
    formatPhoneNumber as formatPhoneNumberUtil,
    copyToClipboard as copyToClipboardUtil,
} from "./absSearchUtils.js";
import {
    getClientSelfieDocument,
    resolveClientDocumentUrl,
} from "../../../utils/clientDocuments.js";

const API_BASE_URL = import.meta.env.VITE_BACKEND_ABS_SERVICE_URL;
const API_ATM_URL = import.meta.env.VITE_BACKEND_ATM_SERVICE_URL;
const API_TELEGRAM_URL = import.meta.env.VITE_BACKEND_TELEGRAM_URL;

// Функция преобразования дирамов в сомони (деление на 100)
const convertDiramToSomoni = (value) => {
    if (value === undefined || value === null) return 0;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? 0 : num / 100;
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

    // Telegram states
    const [telegramData, setTelegramData] = useState(null);
    const [telegramLoading, setTelegramLoading] = useState(false);
    const [telegramDeleteLoading, setTelegramDeleteLoading] = useState(false);
    const [clientDocuments, setClientDocuments] = useState([]);
    const [clientDocumentsLoading, setClientDocumentsLoading] = useState(false);
    const [clientDocumentsModalOpen, setClientDocumentsModalOpen] =
        useState(false);
    const [documentPreview, setDocumentPreview] = useState(null);
    const [documentPreviewVariant, setDocumentPreviewVariant] =
        useState("default");
    const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [isServicesModalOpen, setIsServicesModalOpen] = useState(false);
    const [activeCardId, setActiveCardId] = useState(null);
    const [activeCardServices, setActiveCardServices] = useState([]);
    const [blockingCardId, setBlockingCardId] = useState(null);
    const [isBlockingLoading, setIsBlockingLoading] = useState(false);
    const [isLimitsModalOpen, setIsLimitsModalOpen] = useState(false);
    const [cardLimits, setCardLimits] = useState([]);
    const [modalLoading, setModalLoading] = useState(false);

    // Terrorist check states
    const [terrorMatch, setTerrorMatch] = useState(null);
    const [isTerrorChecking, setIsTerrorChecking] = useState(false);

    // Audit logs states
    const [auditLogs, setAuditLogs] = useState([]);
    const [auditLogsLoading, setAuditLogsLoading] = useState(false);
    const [isAuditLogsModalOpen, setIsAuditLogsModalOpen] = useState(false);

    // Проверка доступа к страницам
    const hasTransactionsAccess = canAccessTransactions();
    const hasAccountOperationsAccess = canAccessAccountOperations();
    const hasBlockCardAccess = canBlockCard();
    const hasChangePinAccess = canChangePin();

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
            setPhoneNumber(value);
            setDisplayPhone(value);
        } else {
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
        setClientDocuments([]);
        setClientDocumentsModalOpen(false);
        setDocumentPreview(null);
        setDocumentPreviewVariant("default");
        sessionStorage.removeItem("absClientSearchState");
    };

    // Функция для проверки клиента по базе террористов
    const checkTerrorist = async (client) => {
        if (!client) return;
        setIsTerrorChecking(true);
        setTerrorMatch(null);
        try {
            const token = localStorage.getItem("access_token");
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const fullName = `${client.surname || ''} ${client.name || ''} ${client.patronymic || ''}`.trim();

            const response = await fetch(`${backendUrl}/terror-list/check`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: fullName,
                    bday: "" // If we have birth date from ABS, we could add it here
                })
            });

            if (response.ok) {
                const data = await response.json();
                setTerrorMatch(data.is_match);
            } else {
                console.error("Ошибка при проверке террористов:", response.status);
            }
        } catch (error) {
            console.error("Ошибка сети при проверке террористов:", error);
        } finally {
            setIsTerrorChecking(false);
        }
    };

    useEffect(() => {
        if (clientsData.length > 0 && clientsData[selectedClientIndex]) {
            checkTerrorist(clientsData[selectedClientIndex]);
        } else {
            setTerrorMatch(null);
        }
    }, [clientsData, selectedClientIndex]);

    // Функция для поиска через ATM API
    const searchViaATMService = async (searchType, searchValue) => {
        let url = "";

        switch (searchType) {
            case "byCardId":
                url = `${API_ATM_URL}/services/innbyidn.php?cardidn=${searchValue}`;
                break;
            case "byAccount":
                url = `${API_ATM_URL}/services/clientcode.php?acc=${searchValue}`;
                break;
            case "byName": {
                url = `${API_ATM_URL}/services/clientcode.php?longname=${encodeURIComponent(searchValue || "")}`;
                break;
            }
            case "byLast4":
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

        // Log audit action
        logAuditAction({
            action: "Поиск клиента",
            details: `Поиск клиента по типу '${selectTypeSearchClient}' со значением '${formattedPhone}'`
        });

        try {
            setIsLoading(true);
            const token = localStorage.getItem("access_token");

            const searchTypeIndex = TYPE_SEARCH_CLIENT.findIndex(
                (t) => t.value === selectTypeSearchClient,
            );

            if (searchTypeIndex >= 3 && searchTypeIndex <= 6) {
                const clientCodes = await searchViaATMService(
                    selectTypeSearchClient,
                    formattedPhone,
                );

                if (!clientCodes || clientCodes.length === 0) {
                    showAlert("Клиенты не найдены", "error");
                    setClientsData([]);
                    return;
                }

                const clientCodesArray = Array.isArray(clientCodes)
                    ? clientCodes
                    : [clientCodes];

                const clientsPromises = clientCodesArray.map((item) =>
                    getClientByCode(item.clicode, token),
                );

                const clientsFullData = await Promise.all(clientsPromises);

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

                let normalizedData = [];

                if (searchTypeIndex === 0) {
                    normalizedData = Array.isArray(data) ? data : [data];
                } else if (searchTypeIndex === 1) {
                    normalizedData = [normalizeClientData(data, selectTypeSearchClient)];
                } else if (searchTypeIndex === 2) {
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

    const handleGetDataUser = useCallback(async () => {
        if (!clientsData?.[selectedClientIndex]?.client_code) return;

        try {
            const clientCode = clientsData[selectedClientIndex]?.client_code;
            const client = clientsData[selectedClientIndex];

            // Log audit action
            logAuditAction({
                action: "Просмотр данных клиента",
                client_name: `${client.surname || ""} ${client.name || ""} ${client.patronymic || ""}`.trim(),
                client_phone: client.phone || "",
                client_inn: client.tax_code || "",
                details: `Загрузка подробных данных клиента (карты, счета, кредиты, депозиты) для ${client.surname} ${client.name} (Код клиента: ${client.client_code})`
            });

            const [resCards, resAcc, resCredits, resDeposits] = await Promise.all([
                getUserCards(clientCode),
                getUserAccounts(clientCode),
                getUserCredits(clientCode),
                getUserDeposits(clientCode),
            ]);

            setAccountsData(resAcc || []);
            setCreditsData(resCredits || []);
            setDepositsData(resDeposits || []);

            if (resCards && resCards.length > 0) {
                const enrichedCards = await Promise.all(
                    resCards.map(async (card) => {
                        try {
                            const [details, services] = await Promise.all([
                                fetchCardDetails(card.cardId),
                                fetchCardServices(card.cardId),
                            ]);

                            // 1. Преобразуем балансы счетов в ПЦ из дирамов в сомони
                            if (details && details.accounts && Array.isArray(details.accounts)) {
                                details.accounts = details.accounts.map(acc => ({
                                    ...acc,
                                    balance: convertDiramToSomoni(acc.balance),
                                }));
                            }

                            // 2. Формируем отображаемый тип карты: тип из АБС + (тип из ПЦ)
                            const absType = details?.cardTypeName || card.CardTypeName || "";
                            const pcType = card.type || "";
                            const displayType = pcType
                                ? `${absType} (${pcType})`
                                : absType;

                            return {
                                ...card,
                                details,
                                services,
                                cardTypeDisplay: displayType   // добавляем вычисляемое поле
                            };
                        } catch (e) {
                            console.error(`Ошибка при обогащении карты ${card.cardId}:`, e);
                            return card;
                        }
                    }),
                );
                setCardsData(enrichedCards);
            } else {
                setCardsData([]);
            }
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
            { key: (row) => row.details?.cardNumberMask || "-", label: "Карта" },
            // Используем вычисляемое поле cardTypeDisplay
            { key: (row) => row.cardTypeDisplay || row.details?.cardTypeName || row.CardTypeName || "-", label: "Тип" },
            { key: "statusName", label: "Статус АБС" },
            { key: (row) => `${row.details?.statusDescription || ""} (${row.details?.hotCardStatus || ""})`, label: "Статус ПЦ" },
            { key: (row) => row.details?.accounts?.map(a => a.number).join("\n") || "-", label: "Счета карты" },
            { key: (row) => row.details?.accounts?.map(acc => {
                    const absAcc = accountsData?.find(a => a.Number === acc.number);
                    return absAcc ? `${absAcc.Balance} ${absAcc.Currency?.Code || ''}` : "-";
                }).join("\n") || "-", label: "Остатки в АБС" },
            { key: (row) => row.details?.accounts?.map(a => `${(a.balance || 0).toFixed(2)} ${a.currency === "972" ? "TJS" : a.currency === "840" ? "USD" : a.currency === "978" ? "EUR" : a.currency}`).join("\n") || "-", label: "Остатки в ПЦ" },
            { key: (row) => {
                    const svcs = row.services?.map(s => {
                        const type = s.identification?.serviceId === "300" ? "SMS" :
                            s.identification?.serviceId === "330" ? "3DS" : null;
                        return type ? `${s.extNumber} ${type}` : null;
                    }).filter(Boolean);
                    return svcs?.join(", ") || "-";
                }, label: "Уведомления" },
        ];
        exportToExcel(sortedCards, columns, `Карты_${selectedClient?.surname}`);
    };

    const handleBlockCardConfirm = async (status) => {
        setIsBlockingLoading(true);
        try {
            await changeCardStatus(blockingCardId, status);

            // Log audit action
            logAuditAction({
                action: "Блокировка карты",
                client_name: selectedClient ? `${selectedClient.surname || ""} ${selectedClient.name || ""} ${selectedClient.patronymic || ""}`.trim() : "",
                client_phone: selectedClient?.phone || "",
                client_inn: selectedClient?.tax_code || "",
                card_number: String(blockingCardId),
                details: `Блокировка карты ${blockingCardId} со статусом ${status}`
            });

            showAlert("Карта успешно заблокирована", "success");
            setIsBlockModalOpen(false);
            handleGetDataUser();
        } catch (error) {
            showAlert("Ошибка при блокировке карты", "error");
        } finally {
            setIsBlockingLoading(false);
        }
    };

    const openBlockModal = (cardId) => {
        setBlockingCardId(cardId);
        setIsBlockModalOpen(true);
    };

    const handleResetPin = async (cardId) => {
        try {
            await resetPinCounter(cardId);

            // Log audit action
            logAuditAction({
                action: "Сброс счетчика PIN-кода",
                client_name: selectedClient ? `${selectedClient.surname || ""} ${selectedClient.name || ""} ${selectedClient.patronymic || ""}`.trim() : "",
                client_phone: selectedClient?.phone || "",
                client_inn: selectedClient?.tax_code || "",
                card_number: String(cardId),
                details: `Сброс счетчика неверных попыток ввода PIN-кода для карты ${cardId}`
            });

            showAlert("Счетчик ПИН-кода успешно сброшен", "success");
            handleGetDataUser();
        } catch (e) {
            showAlert("Ошибка при сбросе счетчика ПИН", "error");
        }
    };

    const handleUnblockCard = async (cardId) => {
        try {
            await unblockCard(cardId);

            // Log audit action
            logAuditAction({
                action: "Разблокировка карты",
                client_name: selectedClient ? `${selectedClient.surname || ""} ${selectedClient.name || ""} ${selectedClient.patronymic || ""}`.trim() : "",
                client_phone: selectedClient?.phone || "",
                client_inn: selectedClient?.tax_code || "",
                card_number: String(cardId),
                details: `Разблокировка карты ${cardId}`
            });

            showAlert("Карта успешно разблокирована", "success");
            handleGetDataUser();
        } catch (e) {
            showAlert("Ошибка при разблокировке карты", "error");
        }
    };

    const openPinModal = (cardId) => {
        setActiveCardId(cardId);
        setIsPinModalOpen(true);
    };

    const openServicesModal = (cardId, services) => {
        setActiveCardId(cardId);
        setActiveCardServices(services);
        setIsServicesModalOpen(true);
    };

    const handleChangePinConfirm = async (phone, pin) => {
        setModalLoading(true);
        try {
            console.log("Attempting pin change:", { cardId: activeCardId, phone, pin });
            const res = await generatePin(activeCardId, phone, pin);
            console.log("Pin change response:", res);

            // Log audit action
            logAuditAction({
                action: "Смена PIN-кода",
                client_name: selectedClient ? `${selectedClient.surname || ""} ${selectedClient.name || ""} ${selectedClient.patronymic || ""}`.trim() : "",
                client_phone: selectedClient?.phone || "",
                client_inn: selectedClient?.tax_code || "",
                card_number: String(activeCardId),
                details: `Запрос на смену PIN-кода для карты ${activeCardId} (телефон доставки: ${phone})`
            });

            showAlert("Запрос на смену ПИН выполнен", "success");
            setIsPinModalOpen(false);
            handleGetDataUser();
        } catch (e) {
            console.error("Pin change error:", e);
            showAlert("Ошибка при смене ПИН", "error");
        } finally {
            setModalLoading(false);
        }
    };

    const handleManageServicesConfirm = async (actions) => {
        setModalLoading(true);
        try {
            console.log("Attempting services update:", actions);
            for (const action of actions) {
                const res = await manageCardService(action);
                console.log("Service update response:", res);
            }

            // Log audit action
            logAuditAction({
                action: "Управление сервисами карты",
                client_name: selectedClient ? `${selectedClient.surname || ""} ${selectedClient.name || ""} ${selectedClient.patronymic || ""}`.trim() : "",
                client_phone: selectedClient?.phone || "",
                client_inn: selectedClient?.tax_code || "",
                card_number: String(activeCardId),
                details: `Изменение услуг (SMS/3DS) для карты ${activeCardId}`
            });

            showAlert("Сервисы успешно обновлены", "success");
            setIsServicesModalOpen(false);
            handleGetDataUser();
        } catch (e) {
            console.error("Services update error:", e);
            showAlert("Ошибка при обновлении сервисов", "error");
        } finally {
            setModalLoading(false);
        }
    };

    const handleOpenLimits = async (cardId) => {
        setActiveCardId(cardId);
        setIsLimitsModalOpen(true);
        setModalLoading(true);
        try {
            const limits = await fetchCardLimits(cardId);
            setCardLimits(limits);

            // Log audit action
            logAuditAction({
                action: "Просмотр лимитов карты",
                client_name: selectedClient ? `${selectedClient.surname || ""} ${selectedClient.name || ""} ${selectedClient.patronymic || ""}`.trim() : "",
                client_phone: selectedClient?.phone || "",
                client_inn: selectedClient?.tax_code || "",
                card_number: String(cardId),
                details: `Просмотр лимитов для карты ${cardId}`
            });
        } catch (e) {
            console.error("Error fetching limits:", e);
            showAlert("Ошибка при загрузке лимитов", "error");
        } finally {
            setModalLoading(false);
        }
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

    const handleOpenGraph = async (referenceId) => {
        setSelectedReferenceId(referenceId);
        setGraphModalOpen(true);
        setIsGraphLoading(true);

        // Log audit action
        logAuditAction({
            action: "Просмотр графика кредита",
            client_name: selectedClient ? `${selectedClient.surname || ""} ${selectedClient.name || ""} ${selectedClient.patronymic || ""}`.trim() : "",
            client_phone: selectedClient?.phone || "",
            client_inn: selectedClient?.tax_code || "",
            credit_id: String(referenceId),
            details: `Просмотр графика платежей для кредита с референсом ${referenceId}`
        });

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

    const handleCloseGraphModal = () => {
        setGraphModalOpen(false);
        setGraphData([]);
        setSelectedReferenceId("");
    };

    const handleOpenDetails = async (referenceId) => {
        setDetailsModalOpen(true);
        setIsDetailsLoading(true);

        // Log audit action
        logAuditAction({
            action: "Просмотр деталей кредита",
            client_name: selectedClient ? `${selectedClient.surname || ""} ${selectedClient.name || ""} ${selectedClient.patronymic || ""}`.trim() : "",
            client_phone: selectedClient?.phone || "",
            client_inn: selectedClient?.tax_code || "",
            credit_id: String(referenceId),
            details: `Просмотр детальной информации по кредиту с референсом ${referenceId}`
        });

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

    const handleOpenRepayModal = (credit) => {
        setSelectedCreditForRepay(credit);
        setRepayModalOpen(true);
    };

    const handleCloseRepayModal = () => {
        setRepayModalOpen(false);
        setSelectedCreditForRepay(null);
    };

    const openDocumentPreview = (document, variant = "default") => {
        setDocumentPreview(document);
        setDocumentPreviewVariant(variant);
    };

    const handleCloseDocumentPreview = () => {
        setDocumentPreview(null);
        setDocumentPreviewVariant("default");
    };

    const handleOpenClientPhoto = () => {
        if (!selectedClientSelfie) {
            showAlert("Фото клиента не найдено", "warning");
            return;
        }

        // Log audit action
        logAuditAction({
            action: "Просмотр фото клиента",
            client_name: selectedClient ? `${selectedClient.surname || ""} ${selectedClient.name || ""} ${selectedClient.patronymic || ""}`.trim() : "",
            client_phone: selectedClient?.phone || "",
            client_inn: selectedClient?.tax_code || "",
            details: "Просмотр селфи-фотографии клиента"
        });

        openDocumentPreview(selectedClientSelfie, "oval");
    };

    const handleOpenClientDocuments = () => {
        // Log audit action
        logAuditAction({
            action: "Просмотр документов клиента",
            client_name: selectedClient ? `${selectedClient.surname || ""} ${selectedClient.name || ""} ${selectedClient.patronymic || ""}`.trim() : "",
            client_phone: selectedClient?.phone || "",
            client_inn: selectedClient?.tax_code || "",
            details: "Просмотр списка документов клиента"
        });

        setClientDocumentsModalOpen(true);
    };

    const handleRepaySubmit = async (repayData) => {
        try {
            setIsRepayLoading(true);
            await repayLoanSoap(repayData);

            // Log audit action
            logAuditAction({
                action: "Погашение кредита",
                client_name: selectedClient ? `${selectedClient.surname || ""} ${selectedClient.name || ""} ${selectedClient.patronymic || ""}`.trim() : "",
                client_phone: selectedClient?.phone || "",
                client_inn: selectedClient?.tax_code || "",
                credit_id: String(repayData.refContract),
                account_number: String(repayData.refAccount),
                details: `Погашение кредита (контракт: ${repayData.refContract}) на сумму ${repayData.amount} со счета ${repayData.refAccount}`
            });

            showAlert("Запрос на погашение кредита успешно отправлен", "success");
            handleCloseRepayModal();
            handleGetDataUser();
        } catch (error) {
            console.error("Ошибка при погашении кредита:", error);
            showAlert("Произошла ошибка при погашении кредита", "error");
        } finally {
            setIsRepayLoading(false);
        }
    };

    const handleNavigateToTransactions = (cardId) => {
        // Log audit action
        logAuditAction({
            action: "Переход к транзакциям карты",
            client_name: selectedClient ? `${selectedClient.surname || ""} ${selectedClient.name || ""} ${selectedClient.patronymic || ""}`.trim() : "",
            client_phone: selectedClient?.phone || "",
            client_inn: selectedClient?.tax_code || "",
            card_number: String(cardId),
            details: `Переход к списку транзакций по карте ${cardId}`
        });

        sessionStorage.setItem("allowedCardId", cardId);
        navigate("/processing/transactions/" + cardId);
    };

    const handleNavigateToAllCardsTransactions = (cards) => {
        if (!cards || cards.length === 0) return;
        const cardIds = cards.map((c) => c.cardId).join(",") + ",";

        // Log audit action
        logAuditAction({
            action: "Переход к транзакциям всех карт",
            client_name: selectedClient ? `${selectedClient.surname || ""} ${selectedClient.name || ""} ${selectedClient.patronymic || ""}`.trim() : "",
            client_phone: selectedClient?.phone || "",
            client_inn: selectedClient?.tax_code || "",
            details: `Переход к списку транзакций по всем картам: ${cardIds}`
        });

        navigate("/processing/transactions/" + cardIds);
    };

    const handleNavigateToAccountOperations = (accountNumber) => {
        // Log audit action
        logAuditAction({
            action: "Переход к выписке счета",
            client_name: selectedClient ? `${selectedClient.surname || ""} ${selectedClient.name || ""} ${selectedClient.patronymic || ""}`.trim() : "",
            client_phone: selectedClient?.phone || "",
            client_inn: selectedClient?.tax_code || "",
            account_number: String(accountNumber),
            details: `Переход к выписке по счету ${accountNumber}`
        });

        sessionStorage.setItem("allowedAccountNumber", accountNumber);
        navigate("/accounts/account-operations?account=" + accountNumber);
    };

    console.log("isMobile", isMobile);

    const selectedClient =
        clientsData.length > 0 ? clientsData[selectedClientIndex] : null;
    const selectedClientINN = selectedClient?.tax_code?.trim() || "";
    const selectedClientSelfie = getClientSelfieDocument(clientDocuments);
    const selectedClientPhotoUrl = resolveClientDocumentUrl(selectedClientSelfie);

    useEffect(() => {
        const checkTerror = async () => {
            if (!selectedClient) {
                setTerrorMatch(null);
                return;
            }
            const nameToCheck = selectedClient.ltn_name || selectedClient.name;
            const surnameToCheck = selectedClient.ltn_surname || selectedClient.surname;
            const fullName = `${surnameToCheck || ""} ${nameToCheck || ""} ${selectedClient.patronymic || ""}`.trim();
            if (fullName.length < 2) return;

            setIsTerrorChecking(true);
            try {
                const token = localStorage.getItem("access_token");
                const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/terror-list/check`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        name: fullName,
                        bday: "",
                    }),
                });

                if (response.ok) {
                    const result = await response.json();
                    setTerrorMatch(result.is_match);
                } else if (response.status === 404) {
                    setTerrorMatch(false);
                }
            } catch (error) {
                console.error("Error checking terror list:", error);
            } finally {
                setIsTerrorChecking(false);
            }
        };

        checkTerror();
    }, [selectedClient]);

    useEffect(() => {
        let cancelled = false;

        if (!selectedClientINN) {
            setClientDocuments([]);
            setClientDocumentsLoading(false);
            return () => {
                cancelled = true;
            };
        }

        const loadClientDocuments = async () => {
            try {
                setClientDocumentsLoading(true);
                const response = await getClientDocumentsByINN(selectedClientINN);

                if (!cancelled) {
                    setClientDocuments(response || []);
                }
            } catch (error) {
                console.error("Ошибка загрузки документов клиента:", error);
                if (!cancelled) {
                    setClientDocuments([]);
                    showAlert("Не удалось загрузить документы клиента", "error");
                }
            } finally {
                if (!cancelled) {
                    setClientDocumentsLoading(false);
                }
            }
        };

        loadClientDocuments();

        return () => {
            cancelled = true;
        };
    }, [selectedClientINN]);

    useEffect(() => {
        if (!selectedClient || !hasRole(35)) {
            setAuditLogs([]);
            return;
        }

        const fetchClientAuditLogs = async () => {
            setAuditLogsLoading(true);
            try {
                const token = localStorage.getItem("access_token");
                const backendUrl = import.meta.env.VITE_BACKEND_URL;
                const param = selectedClientINN ? `client_inn=${selectedClientINN}` : `client_phone=${selectedClient.phone || ""}`;
                const response = await fetch(`${backendUrl}/audit/logs?${param}&size=200`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setAuditLogs(data.logs || []);
                }
            } catch (error) {
                console.error("Ошибка при загрузке логов аудита клиента:", error);
            } finally {
                setAuditLogsLoading(false);
            }
        };

        fetchClientAuditLogs();
    }, [selectedClient, selectedClientINN]);

    const tableData = selectedClient
        ? [
            { label: "Телефон", key: "phone", value: selectedClient.phone },
            {
                label: "Тип клиента",
                key: "client_type_name",
                value: selectedClient.client_type_name,
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
                            clientPhotoUrl={selectedClientPhotoUrl}
                            clientPhotoLoading={clientDocumentsLoading}
                            onOpenClientPhoto={handleOpenClientPhoto}
                            onOpenClientDocuments={handleOpenClientDocuments}
                            documentsCount={clientDocuments.length}
                            selectedClientINN={selectedClientINN}
                        />

                        {selectedClient && (
                            <div style={{ marginBottom: 16 }}>
                                {isTerrorChecking ? (
                                    <div style={{ color: "#1890ff" }}>Идет проверка в базе террористов...</div>
                                ) : terrorMatch === true ? (
                                    <div style={{ color: "red", fontWeight: "bold", fontSize: 16, padding: 8, border: "1px solid red", borderRadius: 4, backgroundColor: "#fff2f0" }}>Обслуживание запрещено, обратитесь в Комплайнс</div>
                                ) : terrorMatch === false ? (
                                    <div style={{ color: "green", fontWeight: "bold", fontSize: 16, padding: 8, border: "1px solid green", borderRadius: 4, backgroundColor: "#f6ffed" }}>✓ Клиент проверен</div>
                                ) : null}
                            </div>
                        )}

                        <ClientPersonalInfo
                            clientsData={clientsData}
                            selectedClientIndex={selectedClientIndex}
                            setSelectedClientIndex={setSelectedClientIndex}
                            selectedClient={selectedClient}
                            tableData={tableData}
                            handleExportClientInfo={handleExportClientInfo}
                            copySelectedClientToClipboard={copySelectedClientToClipboard}
                            copyAllClientsToClipboard={copyAllClientsToClipboard}
                            showAuditLogsBtn={hasRole(35)}
                            onOpenAuditLogs={() => setIsAuditLogsModalOpen(true)}
                        />

                        <ClientAuditLogsModal
                            isOpen={isAuditLogsModalOpen}
                            onClose={() => setIsAuditLogsModalOpen(false)}
                            logs={auditLogs}
                            loading={auditLogsLoading}
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
                            onBlockCard={openBlockModal}
                            onUnblockCard={handleUnblockCard}
                            onResetPin={handleResetPin}
                            onChangePin={openPinModal}
                            onManageServices={openServicesModal}
                            onOpenLimits={handleOpenLimits}
                            hasBlockCardAccess={hasBlockCardAccess}
                            hasChangePinAccess={hasChangePinAccess}
                        />
                    </div>
                </div>
            </div>

            <GraphModal
                isOpen={graphModalOpen}
                onClose={handleCloseGraphModal}
                referenceId={selectedReferenceId}
                graphData={graphData}
                isLoading={isGraphLoading}
            />

            <RepayModal
                isOpen={repayModalOpen}
                onClose={handleCloseRepayModal}
                onSubmit={handleRepaySubmit}
                isLoading={isRepayLoading}
                creditInfo={selectedCreditForRepay}
                accountsData={accountsData}
            />

            <CreditDetailsModal
                isOpen={detailsModalOpen}
                onClose={handleCloseDetailsModal}
                data={detailsData}
                isLoading={isDetailsLoading}
            />

            <ClientDocumentsModal
                isOpen={clientDocumentsModalOpen}
                onClose={() => setClientDocumentsModalOpen(false)}
                documents={clientDocuments}
                isLoading={clientDocumentsLoading}
                onPreview={(document) => openDocumentPreview(document)}
                title="Документы клиента"
                subtitle={
                    selectedClient
                        ? `${selectedClient.surname || ""} ${selectedClient.name || ""} ${selectedClient.patronymic || ""} · ИНН: ${selectedClientINN || "не указан"}`
                        : ""
                }
                tableId="frontovik-client-documents"
            />

            <DocumentPreviewModal
                isOpen={Boolean(documentPreview)}
                onClose={handleCloseDocumentPreview}
                document={documentPreview}
                oval={documentPreviewVariant === "oval"}
                title={
                    documentPreviewVariant === "oval"
                        ? "Фото клиента"
                        : documentPreview?.title || "Предпросмотр документа"
                }
            />

            <BlockCardModal
                isOpen={isBlockModalOpen}
                onClose={() => setIsBlockModalOpen(false)}
                onConfirm={handleBlockCardConfirm}
                isLoading={isBlockingLoading}
            />

            <ServicesModal
                isOpen={isServicesModalOpen}
                onClose={() => setIsServicesModalOpen(false)}
                onConfirm={handleManageServicesConfirm}
                cardId={activeCardId}
                initialServices={activeCardServices}
                isLoading={modalLoading}
            />

            <ChangePinModal
                isOpen={isPinModalOpen}
                onClose={() => setIsPinModalOpen(false)}
                onConfirm={handleChangePinConfirm}
                isLoading={modalLoading}
                defaultPhoneNumber={clientsData[selectedClientIndex]?.phone || ""}
            />

            <CardLimitsModal
                isOpen={isLimitsModalOpen}
                onClose={() => setIsLimitsModalOpen(false)}
                limits={cardLimits}
                isLoading={modalLoading}
                cardId={activeCardId}
            />
        </>
    );
}
