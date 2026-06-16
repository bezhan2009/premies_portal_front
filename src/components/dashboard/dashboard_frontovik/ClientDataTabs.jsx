import React from "react";
import { Table } from "../../table/FlexibleAntTable.jsx";
import { Input as AntInput, Space, Button, message } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import RequisitesModal from "./RequisitesModal.jsx";
import DebtCertificateModal from "./DebtCertificateModal.jsx";
import CreditDetails from "./CreditDetails.jsx";
import DepositDetails from "./DepositDetails.jsx";
import UniversalClientCard from "./UniversalClientCard.jsx";
import { generateCardRequisites } from "../../../api/ABS_frotavik/requisites.js";
import { logAuditAction } from "../../../utils/auditLogger.js";
import { serviceCodes } from "../../../utils/serviceCodes.js";
import { formatDateDisplay } from "../../../utils/dateFormatter.js";
import activeLogoImg from "../../../assets/active_logo.png";

const getPcStatusData = (code) => {
  const statusMap = {
    "0": { text: "АКТИВИРОВАНА", color: "#27ae60", bg: "rgba(39, 174, 96, 0.1)" },
    "1": { text: "ПОЗВОНИТЕ В БАНК-ЭМИТЕНТ", color: "#e11d48", bg: "rgba(225, 29, 72, 0.1)" },
    "2": { text: "КАРТА ПОД КОНТРОЛЕМ", color: "#e11d48", bg: "rgba(225, 29, 72, 0.1)" },
    "3": { text: "ОПЕРАЦИИ ЗАПРЕЩЕНЫ", color: "#e11d48", bg: "rgba(225, 29, 72, 0.1)" },
    "4": { text: "ОПЕРАЦИИ ЗАПРЕЩЕНЫ", color: "#e11d48", bg: "rgba(225, 29, 72, 0.1)" },
    "5": { text: "ОПЕРАЦИИ ЗАПРЕЩЕНЫ", color: "#e11d48", bg: "rgba(225, 29, 72, 0.1)" },
    "6": { text: "КАРТА УТЕРЯНА", color: "#e11d48", bg: "rgba(225, 29, 72, 0.1)" },
    "7": { text: "КАРТА УКРАДЕНА", color: "#e11d48", bg: "rgba(225, 29, 72, 0.1)" },
    "8": { text: "ОПЕРАЦИИ ЗАПРЕЩЕНЫ", color: "#e11d48", bg: "rgba(225, 29, 72, 0.1)" },
    "9": { text: "НЕВЕРНАЯ КАРТА", color: "#e11d48", bg: "rgba(225, 29, 72, 0.1)" },
    "10": { text: "ИЗЪЯТЬ КАРТУ", color: "#e11d48", bg: "rgba(225, 29, 72, 0.1)" },
    "11": { text: "ОПЕРАЦИИ ЗАПРЕЩЕНЫ", color: "#e11d48", bg: "rgba(225, 29, 72, 0.1)" },
    "12": { text: "КАРТА НЕ АКТИВИРОВАНА", color: "#e11d48", bg: "rgba(225, 29, 72, 0.1)" },
    "13": { text: "ПРЕВЫШЕНО КОЛИЧЕСТВО ПОПЫТОК PIN", color: "#e11d48", bg: "rgba(225, 29, 72, 0.1)" },
    "14": { text: "ПРИНУДИТЕЛЬНАЯ СМЕНА PIN", color: "#e11d48", bg: "rgba(225, 29, 72, 0.1)" },
    "15": { text: "ЗАДОЛЖЕННОСТЬ ПО КРЕДИТУ", color: "#e11d48", bg: "rgba(225, 29, 72, 0.1)" },
    "17": { text: "ТРЕБУЕТ АКТИВАЦИИ", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" },
    "18": { text: "ОЖИДАНИЕ ПЕРСОНИФИКАЦИИ ИНСТАНТ-КАРТЫ", color: "#e11d48", bg: "rgba(225, 29, 72, 0.1)" },
    "19": { text: "ПРОФИЛАКТИКА МОШЕННИЧЕСТВА", color: "#e11d48", bg: "rgba(225, 29, 72, 0.1)" },
    "20": { text: "ЗАБЛОКИРОВАНА КЛИЕНТОМ", color: "#e11d48", bg: "rgba(225, 29, 72, 0.1)" },
    "21": { text: "ЗАКРЫТА", color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.1)" },
    "24": { text: "ЗАБЛОКИРОВАНА КЛИЕНТОМ", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" }
  };
  const strCode = String(code);
  return statusMap[strCode] || { text: "НЕИЗВЕСТНЫЙ СТАТУС", color: "#64748b", bg: "rgba(100, 116, 139, 0.1)" };
};

const getAbsStatusStyle = (statusName) => {
  const name = String(statusName || "").toLowerCase();
  if (name.includes("активирована")) return { color: "#27ae60", bg: "rgba(39, 174, 96, 0.1)" };
  if (name.includes("закрыта")) return { color: "#e11d48", bg: "rgba(225, 29, 72, 0.1)" };
  if (name.includes("выпущена")) return { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" };
  return { color: "#334155", bg: "#f1f5f9" };
};

const getAccountStatusData = (code, name) => {
  if (code === "OPENED") return { text: "Открыт", bg: "#27ae60", color: "#fff" };
  return { text: name || code || "-", bg: "#f59e0b", color: "#fff" };
};

const getAccountTypeData = (type) => {
  switch (type) {
    case "CCUR": return { text: "Карточный счет", bg: "#eab308", color: "#fff" }; // yellow
    case "CURR": return { text: "Текущий счет", bg: "#3b82f6", color: "#fff" }; // blue
    case "LLINE": return { text: "% счет по кредиту", bg: "#8b5cf6", color: "#fff" }; // purple
    case "TEDP": return { text: "Депозитный счет", bg: "#14b8a6", color: "#fff" }; // teal
    case "LOAN": return { text: "Кредитный счет", bg: "#f43f5e", color: "#fff" }; // rose
    case "OTHERS": return { text: "% счет по депозиту", bg: "#64748b", color: "#fff" }; // slate
    default: return { text: type || "Счет", bg: "#94a3b8", color: "#fff" };
  }
};

// Eagerly load all assets to perform dynamic fuzzy matching
const cardImages = import.meta.glob("../../../assets/*.{png,jpg,jpeg,svg}", { eager: true });

const getCardImageUrl = (type) => {
  if (!type) return activeLogoImg;
  
  const cleanType = String(type)
    .toLowerCase()
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
    
  // Normalize "standard" to "standart" since the files use "STANDART"
  const normalizedCleanType = cleanType.replace("standard", "standart");

  let bestMatchUrl = null;
  let maxScore = 0;

  for (const path in cardImages) {
    const parts = path.split("/");
    const filenameWithExt = parts[parts.length - 1];
    const filename = filenameWithExt.substring(0, filenameWithExt.lastIndexOf("."));
    
    const cleanFilename = filename
      .toLowerCase()
      .replace(/[-_]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (cleanFilename === normalizedCleanType || cleanFilename === cleanType) {
      return cardImages[path].default || cardImages[path];
    }
    
    // Fuzzy matching score: Jaccard-like word overlap
    const typeWords = normalizedCleanType.split(" ");
    const fileWords = cleanFilename.split(" ");
    
    let matches = 0;
    typeWords.forEach(w => {
      if (fileWords.includes(w) || cleanFilename.includes(w)) {
        matches++;
      }
    });

    const score = matches / Math.max(typeWords.length, fileWords.length);
    if (score > maxScore) {
      maxScore = score;
      bestMatchUrl = cardImages[path].default || cardImages[path];
    }
  }

  // Use fuzzy match if score is at least 0.5 (representing high similarity)
  if (maxScore >= 0.5 && bestMatchUrl) {
    return bestMatchUrl;
  }

  return activeLogoImg;
};
const ClientDataTabs = ({
  cardsData,
  sortedCards,
  handleExportCards,
  handleNavigateToTransactions,
  handleNavigateToAllCardsTransactions,
  hasTransactionsAccess,
  accountsData,
  sortedAccounts,
  requestSortAccounts,
  sortAccountsConfig,
  handleExportAccounts,
  handleNavigateToAccountOperations,
  hasAccountOperationsAccess,
  creditsData,
  sortedCredits,
  requestSortCredits,
  sortCreditsConfig,
  handleExportCredits,
  handleOpenGraph,
  handleOpenDetails,
  handleOpenRepayModal,
  depositsData,
  sortedDeposits,
  requestSortDeposits,
  sortDepositsConfig,
  handleExportDeposits,
  onBlockCard,
  onUnblockCard,
  onActivateCard,
  onResetPin,
  onChangePin,
  onManageServices,
  onOpenLimits,
  hasBlockCardAccess,
  hasChangePinAccess,
  selectedClient,
  tableData,
  isMobile,
  activeTab: propActiveTab,
  setActiveTab: propSetActiveTab,
}) => {
  const [isRequisitesModalOpen, setIsRequisitesModalOpen] = React.useState(false);
  const [isDebtCertificateModalOpen, setIsDebtCertificateModalOpen] = React.useState(false);
  const [requisitesCard, setRequisitesCard] = React.useState(null);
  const [isRequisitesLoading, setIsRequisitesLoading] = React.useState(false);
  const [activeTabState, setActiveTabState] = React.useState("cards");
  const activeTab = propActiveTab !== undefined ? propActiveTab : activeTabState;
  const setActiveTab = propSetActiveTab !== undefined ? propSetActiveTab : setActiveTabState;
  const [activeDepositCategory, setActiveDepositCategory] = React.useState("all");
  const [activeCreditCategory, setActiveCreditCategory] = React.useState("all");
  const [selectedCredit, setSelectedCredit] = React.useState(null);
  const [selectedDeposit, setSelectedDeposit] = React.useState(null);

  const openAndHighlightTab = (tabName, elementId) => {
    setActiveTab(tabName);
    let attempts = 0;
    const findAndHighlight = () => {
      const el = document.getElementById(elementId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
        el.style.boxShadow = '0 0 0 4px rgba(245, 158, 11, 0.6)';
        el.style.borderColor = '#f59e0b';
        setTimeout(() => {
          el.style.boxShadow = '';
          el.style.borderColor = '';
        }, 2000);
        if (el.tagName.toLowerCase() === 'details') {
          el.open = true;
        }
      } else if (attempts < 20) {
        attempts++;
        setTimeout(findAndHighlight, 50);
      }
    };
    setTimeout(findAndHighlight, 50);
  };

  const handleCloseRequisitesModal = () => {
    setIsRequisitesModalOpen(false);
    setRequisitesCard(null);
  };

  const depositCategories = React.useMemo(() => {
    if (!depositsData) return [];
    const categories = new Map();
    depositsData.forEach(item => {
      const code = item.AgreementData?.Status?.Code || item.Status?.Code;
      const name = item.AgreementData?.Status?.Name || item.Status?.Name || "Неизвестно";
      if (code) {
        categories.set(code, name);
      }
    });
    return Array.from(categories.entries()).map(([code, name]) => ({ code, name }));
  }, [depositsData]);

  const creditCategories = React.useMemo(() => {
    if (!creditsData) return [];
    const categories = new Map();
    creditsData.forEach(item => {
      const name = item.statusName || "Неизвестно";
      if (name) categories.set(name, name);
    });
    return Array.from(categories.keys());
  }, [creditsData]);

  const filteredDeposits = React.useMemo(() => {
    if (activeDepositCategory === "all") return sortedDeposits;
    return sortedDeposits.filter(item => {
      const code = item.AgreementData?.Status?.Code || item.Status?.Code;
      return code === activeDepositCategory;
    });
  }, [sortedDeposits, activeDepositCategory]);

  const filteredCredits = React.useMemo(() => {
    if (activeCreditCategory === "all") return sortedCredits;
    return sortedCredits.filter(item => {
      const name = item.statusName || "Неизвестно";
      return name === activeCreditCategory;
    });
  }, [sortedCredits, activeCreditCategory]);

  const handleOpenRequisitesModal = (card) => {
    setRequisitesCard(card);
    setIsRequisitesModalOpen(true);
  };

  const paginatedCards = sortedCards || [];
  const paginatedAccounts = sortedAccounts || [];
  const paginatedCredits = filteredCredits || [];
  const paginatedDeposits = filteredDeposits || [];

  const isEligibleForDebtCertificate = React.useMemo(() => {
    if (!creditsData || creditsData.length === 0) return true;
    return creditsData.every(c => {
      const status = String(c.statusName || c.Status?.Name || "").toLowerCase();
      return status.includes("погашен") || status.includes("закрыт");
    });
  }, [creditsData]);

  const handleGenerateRequisites = async (values) => {
    if (!requisitesCard || !selectedClient) return;
    
    setIsRequisitesLoading(true);
    try {
      let engName = "";
      const ltnSurname = selectedClient.ltn_surname || selectedClient.surname_eng || "";
      const ltnName = selectedClient.ltn_name || selectedClient.name_eng || "";
      if (ltnSurname) engName += ltnSurname;
      if (ltnName) engName += (engName ? " " : "") + ltnName;
      engName = engName.trim();
      
      let fio = `${selectedClient.surname || ""} ${selectedClient.name || ""} ${selectedClient.patronymic || ""}`.trim();
      if (engName) {
        fio += ` (${engName})`;
      }

      await generateCardRequisites({
        account: values.account,
        fio: fio,
        currency: values.currency,
        cardNumber: requisitesCard.details?.cardNumberMask || requisitesCard.cardNumber || requisitesCard.cardId,
        engName: engName,
        language: values.language,
      });

      // Log action to ES
      logAuditAction({
        action: "Скачивание реквизитов",
        client_name: `${selectedClient.surname || ""} ${selectedClient.name || ""} ${selectedClient.patronymic || ""}`.trim(),
        client_phone: selectedClient.phone || "",
        client_inn: selectedClient.tax_code || "",
        card_number: requisitesCard.details?.cardNumberMask || requisitesCard.cardNumber || requisitesCard.cardId,
        account_number: values.account,
        details: `Скачивание реквизитов на языке '${values.language}' для карты ${requisitesCard.details?.cardNumberMask || requisitesCard.cardNumber} и счета ${values.account} (валюта ${values.currency})`
      });

      message.success("Реквизиты успешно скачаны");
      setIsRequisitesModalOpen(false);
    } catch (e) {
      message.error("Ошибка при скачивании реквизитов");
    } finally {
      setIsRequisitesLoading(false);
    }
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
    onFilter: (value, record) => {
      const getNestedVal = (obj, path) => {
        if (typeof path === "string" && path.includes(".")) {
          return path.split('.').reduce((acc, part) => acc?.[part], obj);
        }
        return obj?.[path];
      };
      const val = getNestedVal(record, dataIndex);
      return val ? val.toString().toLowerCase().includes(value.toLowerCase()) : false;
    }
  });

  const cardColumns = React.useMemo(() => [
    {
      title: "ID Карты",
      dataIndex: "cardId",
      key: "cardId",
      width: 120,
      ...getColumnSearchProps("cardId", "ID карты"),
    },
    {
      title: "Карта",
      key: "cardNumber",
      width: 180,
      render: (_, card) => card.CardNumber || card.details?.cardNumberMask || card.cardId || "-",
      ...getColumnSearchProps("CardNumber", "карты"),
    },
    {
      title: "Тип",
      key: "cardType",
      width: 150,
      render: (_, card) => card.CardTypeName || card.details?.cardTypeName || card.type || "-",
    },
    {
      title: "Статус АБС",
      dataIndex: "statusName",
      key: "statusName",
      width: 130,
    },
    {
      title: "Статус ПЦ",
      key: "pcStatus",
      width: 180,
      render: (_, card) => (
        <span
          style={{
            color: card.details?.statusDescription
              ?.toLowerCase()
              ?.includes("valid")
              ? "#27ae60"
              : "inherit",
          }}
        >
          {card.details?.statusDescription || "-"} ({card.details?.hotCardStatus || "-"})
        </span>
      ),
    },
    {
      title: "Счета карты",
      key: "cardAccounts",
      width: 200,
      render: (_, card) => card.details?.accounts?.map((acc, aIdx) => (
        <div
          key={aIdx}
          style={{
            whiteSpace: "nowrap",
            borderBottom:
              aIdx < card.details.accounts.length - 1
                ? "1px solid #eee"
                : "none",
            padding: "2px 0",
          }}
        >
          {acc.number}
        </div>
      )),
    },
    {
      title: "Остатки в АБС",
      key: "absBalances",
      width: 180,
      render: (_, card) => card.details?.accounts?.map((acc, aIdx) => {
        const absAcc = accountsData?.find(
          (a) => a.Number === acc.number,
        );
        return (
          <div
            key={aIdx}
            style={{
              whiteSpace: "nowrap",
              borderBottom:
                aIdx < card.details.accounts.length - 1
                  ? "1px solid #eee"
                  : "none",
              padding: "2px 0",
            }}
          >
            {absAcc
              ? `${Number(absAcc.Balance).toFixed(2)} ${absAcc.Currency?.Code || ""}`
              : "-"}
          </div>
        );
      }),
    },
    {
      title: "Остатки в ПЦ",
      key: "pcBalances",
      width: 180,
      render: (_, card) => card.details?.accounts?.map((acc, aIdx) => (
        <div
          key={aIdx}
          style={{
            whiteSpace: "nowrap",
            borderBottom:
              aIdx < card.details.accounts.length - 1
                ? "1px solid #eee"
                : "none",
            padding: "2px 0",
          }}
        >
          <b>{Number(acc.balance).toFixed(2)}</b>{" "}
          {acc.currency === "972"
            ? "TJS"
            : acc.currency === "840"
              ? "USD"
              : acc.currency === "978"
                ? "EUR"
                : acc.currency}
        </div>
      )),
    },
    {
      title: "PIN",
      key: "pinCounter",
      width: 80,
      render: (_, card) => {
        const pinError = Number(card.details?.pinDenialCounter || 0) >= 3;
        return (
          <div
            style={{
              color: pinError ? "red" : "inherit",
              fontWeight: pinError ? "bold" : "normal",
            }}
          >
            {card.details?.pinDenialCounter || "0"}
          </div>
        );
      },
    },
    {
      title: "Уведомления",
      key: "notifications",
      width: 160,
      render: (_, card) => {
        const rendered = card.services?.map((s, sIdx) => {
          const type =
            s.identification?.serviceId === "300"
              ? "SMS"
              : s.identification?.serviceId === "330"
                ? "3DS"
                : null;
          if (!type) return null;
          return (
            <div key={sIdx} style={{ whiteSpace: "nowrap" }}>
              {s.extNumber} {type}
            </div>
          );
        });
        const hasServices = card.services && card.services.filter(s => s.identification?.serviceId === "300" || s.identification?.serviceId === "330").length > 0;
        return hasServices ? rendered : "-";
      },
    },
    {
      title: "Действия",
      key: "actions",
      width: 280,
      render: (_, card) => {
        const pinError = Number(card.details?.pinDenialCounter || 0) >= 3;
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <button
              className="button"
              style={{
                background: "#059669",
                color: "white",
                width: "100%",
              }}
              onClick={() =>
                onManageServices(card.cardId, card.services || [])
              }
            >
              Уведомления
            </button>

            <div
              style={{
                display: "flex",
                gap: "4px",
              }}
            >
              <button
                className="button"
                style={{ flex: 1 }}
                onClick={() =>
                  handleNavigateToTransactions(card.cardId)
                }
                title="Просмотр истории транзакций"
              >
                История
              </button>

              <button
                className="button"
                style={{
                  background: "#374151",
                  color: "white",
                  flex: 1,
                }}
                onClick={() =>
                  window.open(
                    "http://10.64.1.10/services/tariff_by_idn.php?idn=" +
                      card.cardId,
                    "_blank",
                  )
                }
              >
                Тариф
              </button>
            </div>

            <div
              style={{
                display: "flex",
                gap: "4px",
              }}
            >
              {hasChangePinAccess && (
                <button
                  className="button"
                  style={{
                    background: "#4b5563",
                    color: "white",
                    flex: 1,
                  }}
                  onClick={() => onChangePin(card.cardId)}
                >
                  Сменить ПИН
                </button>
              )}

              {pinError && (
                <button
                  className="button"
                  style={{
                    background: "#f59e0b",
                    color: "white",
                    flex: 1,
                  }}
                  onClick={() => onResetPin(card.cardId)}
                >
                  Сброс ПИН
                </button>
              )}
            </div>

            {(() => {
              const absStatus = card.statusName;
              const pcStatus = String(card.details?.hotCardStatus);
              
              const isScenarioA = absStatus === "Карта выпущена" && pcStatus === "17";
              const isScenarioB = absStatus === "Активирована" && pcStatus === "17";
              const isScenarioC = absStatus === "Карта выпущена" && pcStatus === "0";
              const isScenarioD = absStatus === "Активирована" && pcStatus === "0";

              if (isScenarioA || isScenarioB || isScenarioC) {
                return (
                  <button
                    className="button"
                    style={{ background: "#10b981", color: "white", width: "100%" }}
                    onClick={() => onActivateCard(card, isScenarioA ? 'A' : isScenarioB ? 'B' : 'C')}
                  >
                    Активировать
                  </button>
                );
              }

              if (isScenarioD) {
                if (hasBlockCardAccess) {
                  return (
                    <button
                      className="button"
                      style={{ background: "#e11d48", color: "white", width: "100%" }}
                      onClick={() => onBlockCard(card.cardId)}
                    >
                      Заблокировать
                    </button>
                  );
                }
                return null;
              }

              if (hasBlockCardAccess) {
                return pcStatus === "0" ? (
                  <button
                    className="button"
                    style={{ background: "#e11d48", color: "white", width: "100%" }}
                    onClick={() => onBlockCard(card.cardId)}
                  >
                    Заблокировать
                  </button>
                ) : (
                  <button
                    className="button"
                    style={{ background: "#10b981", color: "white", width: "100%" }}
                    onClick={() => onUnblockCard(card.cardId)}
                  >
                    Разблокировать
                  </button>
                );
              }
              return null;
            })()}

            <button
              className="button"
              style={{
                background: "#3b82f6",
                color: "white",
                width: "100%",
              }}
              onClick={() => onOpenLimits(card.cardId)}
            >
              Лимиты
            </button>

            <button
              className="button"
              style={{
                background: "#8b5cf6",
                color: "white",
                width: "100%",
              }}
              onClick={() => handleOpenRequisitesModal(card)}
            >
              Скачать реквизиты
            </button>
          </div>
        );
      },
    },
  ], [accountsData, hasTransactionsAccess, hasChangePinAccess, hasBlockCardAccess, onManageServices, handleNavigateToTransactions, onChangePin, onResetPin, onBlockCard, onUnblockCard, onOpenLimits]);

  const accountColumns = React.useMemo(() => [
    {
      title: "Номер счета",
      dataIndex: "Number",
      key: "Number",
      width: 200,
      ...getColumnSearchProps("Number", "номера счета"),
    },
    {
      title: "Баланс",
      key: "Balance",
      width: 150,
      render: (_, acc) => `${acc.Balance} ${acc.Currency?.Code || ""}`,
    },
    {
      title: "Статус",
      dataIndex: ["Status", "Name"],
      key: "statusName",
      width: 150,
    },
    {
      title: "Дата открытия",
      dataIndex: "DateOpened",
      key: "DateOpened",
      width: 150,
      render: (date) => formatDateDisplay(date),
    },
    {
      title: "Филиал",
      dataIndex: ["Branch", "Name"],
      key: "branchName",
      width: 200,
    },
    {
      title: "Действия",
      key: "actions",
      width: 180,
      render: (_, acc) => (
        <button
          className="button"
          onClick={() =>
            handleNavigateToAccountOperations(acc.Number)
          }
          title="Просмотр выписки счета"
        >
          Выписки счета
        </button>
      ),
    },
  ], [hasAccountOperationsAccess, handleNavigateToAccountOperations]);

  const creditColumns = React.useMemo(() => [
    {
      title: "Номер договора",
      dataIndex: "contractNumber",
      key: "contractNumber",
      width: 160,
      ...getColumnSearchProps("contractNumber", "номера договора"),
    },
    {
      title: "Идентификатор ссылки",
      dataIndex: "referenceId",
      key: "referenceId",
      width: 180,
      ...getColumnSearchProps("referenceId", "идентификатора ссылки"),
    },
    {
      title: "Статус",
      dataIndex: "statusName",
      key: "statusName",
      width: 120,
    },
    {
      title: "Сумма",
      key: "amount",
      width: 150,
      render: (_, card) => `${card.amount} ${card.currency || ""}`,
    },
    {
      title: "Дата документа",
      dataIndex: "documentDate",
      key: "documentDate",
      width: 130,
      render: (date) => formatDateDisplay(date),
    },
    {
      title: "Клиент Код",
      dataIndex: "clientCode",
      key: "clientCode",
      width: 130,
    },
    {
      title: "Код продукта",
      dataIndex: "productCode",
      key: "productCode",
      width: 130,
    },
    {
      title: "Название продукта",
      dataIndex: "productName",
      key: "productName",
      width: 180,
    },
    {
      title: "Отдел",
      key: "department",
      width: 120,
      render: (_, card) => card.department || "-",
    },
    {
      title: "Действия",
      key: "actions",
      width: 250,
      render: (_, card) => (
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className="button"
            onClick={() => handleOpenGraph(card.referenceId)}
            disabled={!card.referenceId}
          >
            График
          </button>
          <button
            className="button"
            style={{
              background: "#2980b9",
            }}
            onClick={() => handleOpenDetails(card.referenceId)}
            disabled={!card.referenceId}
          >
            Детали
          </button>
          {String(card.statusName || "")
            .trim()
            .toLowerCase() !== "погашен" && (
            <button
              className="button"
              style={{
                background: "#27ae60",
              }}
              onClick={() => handleOpenRepayModal(card)}
            >
              Погасить
            </button>
          )}
        </div>
      ),
    },
  ], [handleOpenGraph, handleOpenDetails, handleOpenRepayModal]);

  const depositColumns = React.useMemo(() => [
    {
      title: "Номер договора",
      dataIndex: ["AgreementData", "Code"],
      key: "agreementCode",
      width: 160,
      ...getColumnSearchProps("AgreementData.Code", "номера договора"),
    },
    {
      title: "Референс",
      dataIndex: ["AgreementData", "ColvirReferenceId"],
      key: "colvirReferenceId",
      width: 160,
      ...getColumnSearchProps("AgreementData.ColvirReferenceId", "референса"),
    },
    {
      title: "Статус",
      dataIndex: ["AgreementData", "Status", "Name"],
      key: "statusName",
      width: 120,
    },
    {
      title: "Остаток депозита",
      key: "balance",
      width: 150,
      render: (_, item) => item.BalanceAccounts?.[0]?.Balance || "-",
    },
    {
      title: "Дата начала",
      dataIndex: ["AgreementData", "DateFrom"],
      key: "dateFrom",
      width: 130,
      render: (date) => formatDateDisplay(date),
    },
    {
      title: "Дата окончания",
      dataIndex: ["AgreementData", "DateTo"],
      key: "dateTo",
      width: 130,
      render: (date) => formatDateDisplay(date),
    },
    {
      title: "Продукт",
      dataIndex: ["AgreementData", "Product", "Name"],
      key: "productName",
      width: 180,
    },
    {
      title: "Срок",
      key: "term",
      width: 100,
      render: (_, item) => `${item.AgreementData?.DepoTermTU || ""} ${item.AgreementData?.DepoTermTimeType || ""}`,
    },
    {
      title: "Отдел",
      dataIndex: ["AgreementData", "Department", "Code"],
      key: "departmentCode",
      width: 120,
    },
    {
      title: "Сумма договора",
      key: "amount",
      width: 150,
      render: (_, item) => `${item.AgreementData?.Amount || ""} ${item.AgreementData?.Currency || ""}`,
    },
  ], [accountsData]);

  return (
    <div className="client-data-tabs-container">
      
      {/* ── TABS NAVIGATION BAR ── */}
      <div className="abs-tabs-navigation">
        <button
          className={`abs-tab-trigger-btn ${activeTab === "cards" ? "active" : ""}`}
          onClick={() => setActiveTab("cards")}
        >
          Карты ({cardsData?.length || 0})
        </button>
        <button
          className={`abs-tab-trigger-btn ${activeTab === "accounts" ? "active" : ""}`}
          onClick={() => setActiveTab("accounts")}
        >
          Счета ({accountsData?.length || 0})
        </button>
        <button
          className={`abs-tab-trigger-btn ${activeTab === "credits" ? "active" : ""}`}
          onClick={() => setActiveTab("credits")}
        >
          Кредиты ({creditsData?.length || 0})
        </button>
        <button
          className={`abs-tab-trigger-btn ${activeTab === "deposits" ? "active" : ""}`}
          onClick={() => setActiveTab("deposits")}
        >
          Депозиты ({depositsData?.length || 0})
        </button>
        <button
          className={`abs-tab-trigger-btn ${activeTab === "info" ? "active" : ""}`}
          onClick={() => setActiveTab("info")}
        >
          Информация
        </button>
      </div>

      {/* ── TABS CONTENT WINDOW ── */}
      <div className="abs-tab-content-window">
        
        {/* Accounts Tab */}
        {activeTab === "accounts" && (
          <div className="tab-pane-fade">
            <div className="tab-pane-header">
              <h3>Счета клиента в АБС</h3>
              {accountsData?.length > 0 && (
                <button onClick={handleExportAccounts} className="btn-tab-export">
                  Экспорт в Excel
                </button>
              )}
            </div>
            {accountsData?.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div className="abs-cards-grid">
                  {paginatedAccounts.map((acc, idx) => {
                  const statusData = getAccountStatusData(acc.Status?.Code, acc.Status?.Name);
                  const typeData = getAccountTypeData(acc.Type);
                  
                  // Card connection
                  let pcBalance = null;
                  let cardMask = null;
                  let matchingCard = null;
                  if (acc.Type === "CCUR") {
                    matchingCard = cardsData?.find(c => {
                      const detailsAccounts = c.details?.accounts || [];
                      const cAccounts = c.accounts || [];
                      return detailsAccounts.some(a => {
                        const num = a.number || a.accountNumber;
                        return num && String(num).trim() === String(acc.Number).trim();
                      }) || cAccounts.some(a => {
                        const num = a.number || a.accountNumber;
                        return num && String(num).trim() === String(acc.Number).trim();
                      });
                    });
                    if (matchingCard) {
                      cardMask = matchingCard.details?.cardNumberMask || matchingCard.CardNumber || matchingCard.cardNumber;
                      const cardAcc = matchingCard.details?.accounts?.find(a => {
                        const num = a.number || a.accountNumber;
                        return num && String(num).trim() === String(acc.Number).trim();
                      });
                      if (cardAcc && cardAcc.balance !== undefined) {
                        pcBalance = Number(cardAcc.balance).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + (acc.Currency?.Code || "");
                      }
                    }
                  }

                  // Loan connection
                  let loanText = null;
                  let loanRefId = null;
                  const matchingCredit = creditsData?.find(c => 
                    c.loanDetails?.paymentOptions?.some(p => p.account === acc.Number) &&
                    c.statusName === "Актуален"
                  );
                  if (matchingCredit) {
                    const pOpts = matchingCredit.loanDetails?.paymentOptions || [];
                    const pIdx = pOpts.findIndex(p => p.account === acc.Number);
                    if (pIdx !== -1) {
                      const contractNum = matchingCredit.contractNumber || matchingCredit.referenceId || "Неизвестно";
                      loanText = `Кредит: ${contractNum} (${pIdx + 1})`;
                      loanRefId = matchingCredit.referenceId;
                    }
                  }

                  // Mobile connection
                  const isMobileAcc = isMobile && isMobile.Iban === acc.Number;

                  const badgeStyle = { 
                    fontSize: "12px", 
                    fontWeight: 600, 
                    padding: "4px 8px", 
                    borderRadius: "6px",
                    display: "inline-block"
                  };

                  return (
                    <div key={acc.Number || idx} className="frontovik-card-ui account-card-ui" style={{ height: "100%", justifyContent: "space-between" }}>
                      <div>
                        <div className="card-top-badges" style={{ alignItems: "center" }}>
                          <span style={{ ...badgeStyle, color: statusData.color, background: statusData.bg }}>
                            {statusData.text}
                          </span>
                          <span style={{ ...badgeStyle, color: typeData.color, background: typeData.bg }}>
                            {typeData.text}
                          </span>
                          {cardMask && (
                            <span 
                              style={{ ...badgeStyle, color: "#fff", background: "#f59e0b", cursor: "pointer", transition: "opacity 0.2s" }}
                              onMouseEnter={(e) => e.target.style.opacity = 0.8}
                              onMouseLeave={(e) => e.target.style.opacity = 1}
                              onClick={() => openAndHighlightTab("cards", `card-${matchingCard?.cardId}`)}
                              title="Перейти к карте"
                            >
                              КАРТА: {cardMask}
                            </span>
                          )}
                          {loanText && (
                            <span 
                              style={{ ...badgeStyle, color: "#fff", background: "#0284c7", cursor: "pointer", transition: "opacity 0.2s" }}
                              onMouseEnter={(e) => e.target.style.opacity = 0.8}
                              onMouseLeave={(e) => e.target.style.opacity = 1}
                              onClick={() => loanRefId && openAndHighlightTab("credits", `credit-${loanRefId}`)}
                              title="Перейти к кредиту"
                            >
                              {loanText}
                            </span>
                          )}
                          {isMobileAcc && (
                            <span style={{ ...badgeStyle, color: "#0f172a", background: "#6ee7b7", fontWeight: 700 }}>
                              Основной счет в МП
                            </span>
                          )}
                        </div>

                        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                            <div className="account-balance-block">
                              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Остаток</div>
                              <div style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a" }}>
                                {Number(acc.Balance || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {acc.Currency?.Code || ""}
                              </div>
                            </div>
                            
                            {pcBalance !== null && (
                              <div className="account-pc-balance-block" style={{ textAlign: "right" }}>
                                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Остаток в ПЦ</div>
                                <div style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>
                                  {pcBalance}
                                </div>
                              </div>
                            )}
                          </div>

                          <div style={{ borderBottom: "1px dashed #e2e8f0" }}></div>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                            <div style={{ fontSize: "13px", color: "#64748b" }}>
                              {acc.Branch?.Name || "Мудирияти амалиёти ш. Душанбе"}
                              {acc.Department && serviceCodes[acc.Department] ? ` · Обслуживание: ${serviceCodes[acc.Department]}` : ""}
                            </div>
                            <div style={{ fontSize: "12px", color: "#64748b" }}>
                              Дата открытия: {formatDateDisplay(acc.DateOpened) || "-"}
                            </div>
                          </div>

                          <div className="account-number-copy-box" style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #f1f5f9" }}>
                            <div>
                              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Номер счета</div>
                              <div style={{ fontSize: "18px", fontWeight: "600", color: "#0f172a", fontFamily: "monospace", letterSpacing: "0.5px" }}>{acc.Number}</div>
                            </div>
                            <button 
                              className="copy-btn-large" 
                              style={{ background: "transparent", border: "1px solid #cbd5e1", padding: "8px", borderRadius: "6px", cursor: "pointer", color: "#475569", display: "flex", alignItems: "center", justifyContent: "center" }}
                              onClick={() => {
                                navigator.clipboard.writeText(acc.Number);
                                message.success("Счет скопирован");
                              }}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="card-actions-bar" style={{ marginTop: "auto" }}>
                        <button className="card-action-btn outline-danger" onClick={() => handleNavigateToAccountOperations(acc.Number)}>Выписка (АБС)</button>
                        <button className="card-action-btn neutral" onClick={() => handleOpenRequisitesModal(matchingCard || { cardId: "", details: { cardNumberMask: "" } })}>Скачать реквизиты</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              </div>
            ) : (
              <div className="empty-tab-state">Счета отсутствуют</div>
            )}
          </div>
        )}

        {/* Cards Tab */}
        {activeTab === "cards" && (
          <div className="tab-pane-fade">
            <div className="tab-pane-header">
              <h3>Карты клиента</h3>
              {cardsData?.length > 0 && (
                <div className="tab-header-btn-row">
                  <button
                    onClick={() => handleNavigateToAllCardsTransactions(sortedCards)}
                    className="btn-tab-export btn-tab-history"
                  >
                    Посмотреть историю всех карт
                  </button>
                  <button onClick={handleExportCards} className="btn-tab-export">
                    Экспорт в Excel
                  </button>
                </div>
              )}
            </div>
            {cardsData?.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div className="abs-cards-grid">
                  {paginatedCards.map((card, idx) => {
                  const absStatus = card.statusName || "-";
                  const absStyle = getAbsStatusStyle(absStatus);
                  
                  const pcStatusCode = card.details?.hotCardStatus;
                  const pcStatusData = getPcStatusData(pcStatusCode);
                  
                  // SMS & 3DS
                  const smsService = card.services?.find(s => s.identification?.serviceId === "300");
                  const tdsService = card.services?.find(s => s.identification?.serviceId === "330");
                  
                  // PIN
                  const pinCount = Number(card.details?.pinDenialCounter || 0);
                  const pinColor = pinCount < 3 ? "#27ae60" : "#e11d48";
                  const pinBg = pinCount < 3 ? "rgba(39, 174, 96, 0.1)" : "rgba(225, 29, 72, 0.1)";

                  const isBlocked = (() => {
                    if (pcStatusCode === undefined || pcStatusCode === null) return false;
                    const codeNum = Number(pcStatusCode);
                    return (codeNum >= 1 && codeNum <= 16) || (codeNum >= 18 && codeNum <= 20);
                  })();

                  const agreementStr = card.details?.agreement || card.agreement || "";
                  const cardBranchCode = agreementStr.length >= 4 ? agreementStr.substring(0, 4) : null;
                  const cardBranchName = cardBranchCode && serviceCodes[cardBranchCode] ? serviceCodes[cardBranchCode] : null;

                  return (
                    <div id={`card-${card.cardId}`} key={card.cardId || idx} className={`frontovik-card-ui ${isBlocked ? "pc-status-blocked" : ""}`}>
                      <div className="card-top-badges" style={{ alignItems: "center" }}>
                        <span style={{ color: absStyle.color, background: absStyle.bg, fontSize: "12px", fontWeight: 600, padding: "4px 8px", borderRadius: "6px" }}>
                          {absStatus} (АБС)
                        </span>
                        {pcStatusCode !== undefined && (
                          <span style={{ color: pcStatusData.color, background: pcStatusData.bg, fontSize: "12px", fontWeight: 600, padding: "4px 8px", borderRadius: "6px" }}>
                            {pcStatusData.text} ({pcStatusCode}) (ПЦ)
                          </span>
                        )}
                        <span style={{ 
                          color: smsService ? "#166534" : "#92400e", 
                          background: smsService ? "#dcfce7" : "#fef3c7",
                          fontSize: "12px", fontWeight: 600, padding: "4px 8px", borderRadius: "6px" 
                        }}>
                          СМС: {smsService ? smsService.extNumber : "не подключен"}
                        </span>
                        <span style={{ 
                          color: tdsService ? "#166534" : "#92400e", 
                          background: tdsService ? "#dcfce7" : "#fef3c7",
                          fontSize: "12px", fontWeight: 600, padding: "4px 8px", borderRadius: "6px" 
                        }}>
                          3DS: {tdsService ? tdsService.extNumber : "не подключен"}
                        </span>
                        <span style={{ 
                          color: pinColor, 
                          background: pinBg,
                          fontSize: "12px", fontWeight: 600, padding: "4px 8px", borderRadius: "6px" 
                        }}>
                          PIN: {pinCount}
                        </span>
                      </div>
                      
                      <div className="card-main-info">
                        <div className="card-img-container">
                          <img 
                            src={getCardImageUrl(card.type || card.CardTypeName)} 
                            alt={card.type || "Card"} 
                            onError={(e) => { e.target.src = activeLogoImg; }}
                          />
                        </div>
                        <div className="card-details-text">
                          <div className="card-type-name">{card.type || card.CardTypeName || card.details?.cardTypeName || "Unknown Card"}</div>
                          <div className="card-number-mask">{card.CardNumber || card.details?.cardNumberMask || card.cardNumber || "-"}</div>
                          <div className="card-dates">
                            <div className="exp-date">{formatDateDisplay(card.details?.expirationDate || card.expirationDate || "-")}</div>
                            <div className="right-dates">
                              <span style={{ display: 'block' }}>IDN: {card.cardId || "-"}</span>
                              {cardBranchName && <span style={{ display: 'block', color: '#64748b' }}>Обслуживается: {cardBranchName}</span>}
                              <span style={{ display: 'block', color: '#64748b' }}>Дата выдачи: {formatDateDisplay(card.details?.requestDate || card.requestDate || "-")}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="card-accounts-table">
                        <div className="account-row-header">
                          <div style={{ flex: 1.5 }}>Счета:</div>
                          <div style={{ flex: 1 }}>Баланс в АБС</div>
                          <div style={{ flex: 1 }}>Баланс в ПЦ</div>
                          <div style={{ width: '120px' }}></div>
                        </div>
                        {(() => {
                          // Combine accounts from PC details and ABS card info
                          const mergedAccounts = [];
                          const seenNumbers = new Set();
                          
                          if (card.details?.accounts && Array.isArray(card.details.accounts)) {
                            card.details.accounts.forEach(acc => {
                              const num = acc.number || acc.accountNumber;
                              if (num && !seenNumbers.has(num)) {
                                seenNumbers.add(num);
                                mergedAccounts.push({
                                  number: num,
                                  balance: acc.balance,
                                  currency: acc.currency
                                });
                              }
                            });
                          }
                          
                          if (card.accounts && Array.isArray(card.accounts)) {
                            card.accounts.forEach(acc => {
                              const num = acc.accountNumber || acc.number;
                              if (num && !seenNumbers.has(num)) {
                                seenNumbers.add(num);
                                mergedAccounts.push({
                                  number: num,
                                  balance: undefined,
                                  currency: undefined
                                });
                              }
                            });
                          }

                          if (mergedAccounts.length === 0) {
                            return <div className="empty-accounts-message" style={{ padding: '8px 0', color: '#64748b', fontSize: '13px', fontStyle: 'italic' }}>Связанные счета отсутствуют</div>;
                          }

                          return mergedAccounts.map((acc, aIdx) => {
                            const absAcc = accountsData?.find((a) => a.Number === acc.number);
                            return (
                              <div className="account-row" key={aIdx}>
                                <div style={{ flex: 1.5, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span className="acc-number">{acc.number}</span>
                                  <button className="copy-btn-small" onClick={() => {
                                    navigator.clipboard.writeText(acc.number);
                                    message.success("Счет скопирован");
                                  }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                  </button>
                                </div>
                                <div style={{ flex: 1, fontWeight: '600' }}>
                                  {absAcc ? (
                                    <>
                                      <span>{Number(absAcc.Balance).toFixed(2)}</span>
                                      <span style={{ color: absAcc.Currency?.Code === 'TJS' ? '#27ae60' : absAcc.Currency?.Code === 'USD' ? '#e11d48' : '#3b82f6', marginLeft: '4px' }}>
                                        {absAcc.Currency?.Code}
                                      </span>
                                    </>
                                  ) : "-"}
                                </div>
                                <div style={{ flex: 1, fontWeight: '600' }}>
                                  {acc.balance !== undefined ? (
                                    <>
                                      <span>{Number(acc.balance).toFixed(2)}</span>
                                      <span style={{ 
                                        color: acc.currency === '972' ? '#27ae60' : acc.currency === '840' ? '#e11d48' : '#3b82f6', 
                                        marginLeft: '4px' 
                                      }}>
                                        {acc.currency === "972" ? "TJS" : acc.currency === "840" ? "USD" : acc.currency === "978" ? "EUR" : acc.currency}
                                      </span>
                                    </>
                                  ) : "-"}
                                </div>
                                <div style={{ width: '120px', textAlign: 'right' }}>
                                  <button className="btn-tab-export" style={{ padding: '4px 10px', fontSize: '11px', background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0' }} onClick={() => handleNavigateToAccountOperations(acc.number)}>Перейти к счету</button>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>

                      <div className="card-actions-bar">
                        {card.details?.hotCardStatus && String(card.details.hotCardStatus) === "17" ? (
                          <button className="card-action-btn primary btn-unlock-highlight" onClick={() => onUnblockCard(card.cardId)}>Активировать</button>
                        ) : (
                          hasBlockCardAccess && (
                            card.details?.hotCardStatus === "0" ? (
                              <button className="card-action-btn neutral" style={{color: '#e11d48'}} onClick={() => onBlockCard(card.cardId)}>Заблокировать</button>
                            ) : (
                              <button className="card-action-btn primary btn-unlock-highlight" onClick={() => onUnblockCard(card.cardId)}>Разблокировать</button>
                            )
                          )
                        )}
                        {hasChangePinAccess && (
                          <button className="card-action-btn outline-danger" onClick={() => onChangePin(card.cardId)}>Сменить ПИН</button>
                        )}
                        <button className="card-action-btn neutral" onClick={() => onOpenLimits(card.cardId, card.exId || card.cardExId || "")}>Лимиты</button>
                        <button className="card-action-btn neutral" onClick={() => window.open(`http://10.64.1.10/services/tariff_by_idn.php?idn=${card.cardId}`, "_blank")}>Тарифы</button>
                        <button className="card-action-btn neutral" onClick={() => handleNavigateToTransactions(card.cardId)}>История</button>
                        <button className="card-action-btn neutral" onClick={() => onManageServices(card.cardId, card.services)}>Уведомления</button>
                        <button className="card-action-btn neutral" onClick={() => handleOpenRequisitesModal(card)}>Скачать реквизиты</button>
                        {pinCount >= 1 && (
                          <button 
                            className={`card-action-btn ${pinCount >= 3 ? "danger btn-reset-pin-highlight" : "warning btn-reset-pin-warning"}`} 
                            onClick={() => onResetPin(card.cardId)}
                          >
                            Сбросить PIN-код
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              </div>
            ) : (
              <div className="empty-tab-state">Карты отсутствуют</div>
            )}
          </div>
        )}

        {/* Credits Tab */}
        {activeTab === "credits" && (
          <div className="tab-pane-fade">
            {selectedCredit ? (
              <CreditDetails credit={selectedCredit} onBack={() => setSelectedCredit(null)} />
            ) : (
              <>
                <div className="tab-pane-header" style={{ flexDirection: "column", alignItems: "flex-start", gap: "16px" }}>
                  <div className="flex items-center justify-between mb-4" style={{ width: "100%" }}>
                    <h3 className="text-lg font-bold text-slate-800">Договоры кредитования</h3>
                    {isEligibleForDebtCertificate && (
                      <Button 
                        type="primary" 
                        onClick={() => setIsDebtCertificateModalOpen(true)}
                      >
                        Справка об отсутствии долгов
                      </Button>
                    )}
                    {creditsData?.length > 0 && !isEligibleForDebtCertificate && (
                      <button onClick={handleExportCredits} className="btn-tab-export">
                        Экспорт в Excel
                      </button>
                    )}
                  </div>
                  
                  {/* Category Filters */}
                  {creditCategories.length > 0 && (
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", width: "100%" }}>
                      <button 
                        style={{
                          padding: "6px 14px", 
                          borderRadius: "20px", 
                          fontSize: "13px", 
                          fontWeight: 600,
                          border: "none",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          background: activeCreditCategory === "all" ? "#0f172a" : "#f1f5f9",
                          color: activeCreditCategory === "all" ? "#fff" : "#475569"
                        }}
                        onClick={() => setActiveCreditCategory("all")}
                      >
                        Все
                      </button>
                      {creditCategories.map(cat => (
                        <button 
                          key={cat}
                          style={{
                            padding: "6px 14px", 
                            borderRadius: "20px", 
                            fontSize: "13px", 
                            fontWeight: 600,
                            border: "none",
                            cursor: "pointer",
                            transition: "all 0.2s",
                            background: activeCreditCategory === cat ? "#0f172a" : "#f1f5f9",
                            color: activeCreditCategory === cat ? "#fff" : "#475569"
                          }}
                          onClick={() => setActiveCreditCategory(cat)}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {filteredCredits?.length > 0 ? (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {paginatedCredits.map((card, idx) => {
                      const details = card.loanDetails || {};
                      const params = details.params || {};
                      const balances = details.balances || [];
                      const graphs = card.graphs || [];

                      const statusName = params.statusName || card.statusName || "Неизвестно";
                      let statusColor = { bg: "rgba(245, 158, 11, 0.1)", text: "#f59e0b" };
                      if (statusName === "Актуален") {
                        statusColor = { bg: "rgba(39, 174, 96, 0.1)", text: "#27ae60" };
                      } else if (statusName === "Закрыт" || statusName === "Закрыт досрочно") {
                        statusColor = { bg: "rgba(225, 29, 72, 0.1)", text: "#e11d48" };
                      }

                      const amount = params.amount || card.amount || "0";
                      const currency = params.currency || card.currency || "TJS";
                      const term = params.term || "-";
                      const startDate = params.startDate || card.startDate || "-";
                      const endDate = params.endDate || card.endDate || "-";
                      const department = params.department || card.department || "Неизвестно";
                      const interestRate = params.interestRate || "0";

                      const debtAccounts = balances.filter(b => b.currCode === "TJS" && b.activeFl === "dt");
                      const debtBalance = debtAccounts.reduce((acc, curr) => acc + Number(curr.balance || 0), 0);
                      const repaid = Math.max(0, Number(amount) - debtBalance);
                      const percentage = Number(amount) > 0 ? Math.min((repaid / Number(amount)) * 100, 100) : 0;

                      let nextPaymentAmount = 0;
                      let nextPaymentDate = "-";
                      if (graphs && graphs.length > 0) {
                        const now = new Date();
                        const nextMonth = new Date();
                        nextMonth.setDate(now.getDate() + 31);
                        
                        const upcoming = graphs.filter(g => {
                          if (!g.PaymentDate) return false;
                          const pDate = new Date(g.PaymentDate);
                          return pDate >= now && pDate <= nextMonth;
                        });

                        if (upcoming.length > 0) {
                          const targetDate = upcoming[0].PaymentDate;
                          nextPaymentDate = targetDate.split(" ")[0];
                          upcoming.forEach(g => {
                            if (g.PaymentDate === targetDate && (g.Code === "CR_PD" || g.Code === "CR_INTER")) {
                              nextPaymentAmount += Number(g.Amount || 0);
                            }
                          });
                        }
                      }

                      return (
                        <div id={`credit-${card.referenceId}`} key={card.referenceId || idx} className="frontovik-card-ui" style={{ width: "100%", padding: "20px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", borderBottom: "1px dashed #e2e8f0", paddingBottom: "16px", marginBottom: "16px" }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                                <div style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>
                                  {params.productName || card.productName || "Кредит"}
                                </div>
                                <span style={{ 
                                  fontSize: "12px", 
                                  fontWeight: 600, 
                                  padding: "4px 8px", 
                                  borderRadius: "6px", 
                                  backgroundColor: statusColor.bg, 
                                  color: statusColor.text 
                                }}>
                                  {statusName}
                                </span>
                              </div>
                              <div style={{ fontSize: "12px", color: "#64748b" }}>
                                Дата получения: {formatDateDisplay(startDate)} | Дата окончания: {formatDateDisplay(endDate)} | Обслуживается: {department && serviceCodes[department] ? serviceCodes[department] : department}
                              </div>
                            </div>
                            
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Остаток задолженности</div>
                              <div style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a" }}>
                                {debtBalance.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} {currency}
                              </div>
                            </div>
                          </div>

                          <div style={{ marginBottom: "20px" }}>
                            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Погашено: {repaid.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} {currency}</div>
                            <div style={{ width: "100%", height: "6px", backgroundColor: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
                              <div style={{ width: `${percentage}%`, height: "100%", backgroundColor: "#e11d48" }}></div>
                            </div>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px", marginBottom: "20px" }}>
                            <div>
                              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Сумма кредита</div>
                              <div style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>
                                {Number(amount).toLocaleString('ru-RU')} {currency}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>% Ставка</div>
                              <div style={{ fontSize: "16px", fontWeight: "700", color: "#27ae60" }}>{interestRate} %</div>
                            </div>
                            <div>
                              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Срок</div>
                              <div style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>{term} Мес</div>
                            </div>
                            <div>
                              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Ежемесячный платеж</div>
                              <div style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>
                                {nextPaymentAmount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} {currency}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Дата след платежа</div>
                              <div style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>{nextPaymentDate}</div>
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: "12px" }}>
                            <button 
                              className="card-action-btn outline-danger" 
                              onClick={() => handleOpenRepayModal(card)}
                              disabled={statusName === "Погашен"}
                            >
                              Погасить досрочно
                            </button>
                            <button 
                              className="card-action-btn neutral"
                              onClick={() => setSelectedCredit(card)}
                            >
                              Подробнее
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  </>
                ) : (
                  <div className="empty-tab-state">Кредиты отсутствуют</div>
                )}
              </>
            )}
          </div>
        )}

        {/* Deposits Tab */}
        {activeTab === "deposits" && (
          <div className="tab-pane-fade">
            {selectedDeposit ? (
              <DepositDetails deposit={selectedDeposit} onBack={() => setSelectedDeposit(null)} />
            ) : (
              <>
                <div className="tab-pane-header" style={{ flexDirection: "column", alignItems: "flex-start", gap: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                    <h3>Договоры депозитов</h3>
                    {depositsData?.length > 0 && (
                      <button onClick={handleExportDeposits} className="btn-tab-export">
                        Экспорт в Excel
                      </button>
                    )}
                  </div>
                  
                  {/* Category Filters */}
                  {depositCategories.length > 0 && (
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", width: "100%" }}>
                      <button 
                        style={{
                          padding: "6px 14px", 
                          borderRadius: "20px", 
                          fontSize: "13px", 
                          fontWeight: 600,
                          border: "none",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          background: activeDepositCategory === "all" ? "#0f172a" : "#f1f5f9",
                          color: activeDepositCategory === "all" ? "#fff" : "#475569"
                        }}
                        onClick={() => setActiveDepositCategory("all")}
                      >
                        Все
                      </button>
                      {depositCategories.map(cat => (
                        <button 
                          key={cat.code}
                          style={{
                            padding: "6px 14px", 
                            borderRadius: "20px", 
                            fontSize: "13px", 
                            fontWeight: 600,
                            border: "none",
                            cursor: "pointer",
                            transition: "all 0.2s",
                            background: activeDepositCategory === cat.code ? "#0f172a" : "#f1f5f9",
                            color: activeDepositCategory === cat.code ? "#fff" : "#475569"
                          }}
                          onClick={() => setActiveDepositCategory(cat.code)}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {filteredDeposits?.length > 0 ? (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {filteredDeposits.map((item, idx) => {
                      const agreement = item.AgreementData || {};
                      const statusName = agreement.Status?.Name || item.Status?.Name || "Неизвестно";
                      
                      let statusColor = { bg: "rgba(245, 158, 11, 0.1)", text: "#f59e0b" };
                      if (statusName === "Актуален") {
                        statusColor = { bg: "rgba(39, 174, 96, 0.1)", text: "#27ae60" };
                      } else if (statusName === "Закрыт") {
                        statusColor = { bg: "rgba(225, 29, 72, 0.1)", text: "#e11d48" };
                      }

                      const depoAcc = item.BalanceAccounts?.find(a => a.RuleCode === "DEPOACC") || {};
                      const depoBalance = depoAcc.Balance || "0.00";
                      const currency = agreement.Currency || depoAcc.CurrCode || "TJS";

                      const incomeAcc = item.BalanceAccounts?.find(a => a.RuleCode === "CLIACC") || {};
                      const incomeBalance = incomeAcc.Balance || "0.00";
                      const incomeCurr = incomeAcc.CurrCode || currency;
                      
                      const allRates = item.SumTypes || item.sumTypes || item.Rates || item.Conditions || agreement.Rates || agreement.Conditions || [];
                      const bonusRate = allRates.find(r => r.Code === "DEP_BONUS")?.Pcn || "0";
                      const penaltyRate = allRates.find(r => r.Code === "DEP_PNLTY")?.Pcn || "0";
                      const taxRate = allRates.find(r => r.Code === "DEP_TAX")?.Pcn || "0";

                      const dateFromStr = agreement.DateFrom || item.DateFrom || "-";
                      const dateToStr = agreement.DateTo || item.DateTo || "-";
                      const department = agreement.Department?.Code || item.Department?.Code || "Неизвестно";
                      const amount = agreement.Amount || item.Amount || "0";

                      const termVal = agreement.DepoTermTU;
                      const termType = agreement.DepoTermTimeType;
                      const termText = termVal ? `${termVal} ${termType === 'M' ? 'мес.' : termType === 'D' ? 'дн.' : termType || ''}` : "-";

                      let progressPercent = 0;
                      if (dateFromStr !== "-" && dateToStr !== "-") {
                        const fromTime = new Date(dateFromStr.split('.').reverse().join('-')).getTime() || new Date(dateFromStr).getTime();
                        const toTime = new Date(dateToStr.split('.').reverse().join('-')).getTime() || new Date(dateToStr).getTime();
                        const now = new Date().getTime();
                        
                        if (fromTime && toTime && toTime > fromTime) {
                          if (now >= toTime) {
                            progressPercent = 100;
                          } else if (now > fromTime) {
                            progressPercent = ((now - fromTime) / (toTime - fromTime)) * 100;
                          }
                        }
                      }

                      return (
                        <div id={`deposit-${agreement.ColvirReferenceId || idx}`} key={agreement.ColvirReferenceId || agreement.Code || idx} className="frontovik-card-ui" style={{ width: "100%", padding: "20px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", borderBottom: "1px dashed #e2e8f0", paddingBottom: "16px", marginBottom: "16px" }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                                <div style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>
                                  {agreement.Product?.Name || agreement.Name || item.Name || "Депозит"}
                                </div>
                                <span style={{ 
                                  fontSize: "12px", 
                                  fontWeight: 600, 
                                  padding: "4px 8px", 
                                  borderRadius: "6px", 
                                  backgroundColor: statusColor.bg, 
                                  color: statusColor.text 
                                }}>
                                  {statusName}
                                </span>
                              </div>
                              <div style={{ fontSize: "12px", color: "#64748b" }}>
                                Дата открытия: {formatDateDisplay(dateFromStr)} | Дата окончания: {formatDateDisplay(dateToStr)} | Обслуживается: {department && serviceCodes[department] ? serviceCodes[department] : department}
                              </div>
                            </div>
                            
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Текущий остаток</div>
                              <div style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a" }}>
                                {Number(depoBalance).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} {currency}
                              </div>
                              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                                Счет: <span style={{ fontFamily: "monospace", color: "#334155" }}>{depoAcc.AccCode || "-"}</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ marginBottom: "20px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                              <span>Срок депозита</span>
                              <span>Пройдено: {progressPercent.toFixed(0)}%</span>
                            </div>
                            <div style={{ width: "100%", height: "6px", backgroundColor: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
                              <div style={{ width: `${progressPercent}%`, height: "100%", backgroundColor: "#ef4444" }}></div>
                            </div>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px", marginBottom: "20px" }}>
                            <div>
                              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Сумма договора</div>
                              <div style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>
                                {Number(amount).toLocaleString('ru-RU')} {currency}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>% Ставка</div>
                              <div style={{ fontSize: "16px", fontWeight: "700", color: "#27ae60" }}>{bonusRate} %</div>
                            </div>
                            <div>
                              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Срок</div>
                              <div style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>{termText}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Налог с дохода</div>
                              <div style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>{taxRate} %</div>
                            </div>
                            <div>
                              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>При расторжении</div>
                              <div style={{ fontSize: "16px", fontWeight: "700", color: "#e11d48" }}>{penaltyRate} %</div>
                            </div>
                            <div>
                              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Ожидаемый доход</div>
                              <div style={{ fontSize: "16px", fontWeight: "700", color: "#27ae60" }}>
                                {Number(incomeBalance).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} {incomeCurr}
                              </div>
                              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                                Счет: {incomeAcc.AccCode || "-"}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: "12px" }}>
                            <button 
                              className="card-action-btn neutral"
                              onClick={() => setSelectedDeposit(item)}
                            >
                              Подробнее
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {filteredDeposits.length > ITEMS_PER_PAGE && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                      <Pagination 
                        current={currentPage.deposits} 
                        total={filteredDeposits.length} 
                        pageSize={ITEMS_PER_PAGE} 
                        onChange={(page) => handlePageChange('deposits', page)} 
                        showSizeChanger={false}
                      />
                    </div>
                  )}
                  </>
                ) : (
                  <div className="empty-tab-state">Депозиты отсутствуют</div>
                )}
              </>
            )}
          </div>
        )}

        {/* Client Info Detailed Tab */}
        {activeTab === "info" && (
          <div className="tab-pane-fade">
            <div className="tab-pane-header">
              <h3>Персональная информация (АБС)</h3>
            </div>
            <UniversalClientCard client={selectedClient} />
          </div>
        )}

      </div>

      <RequisitesModal
        open={isRequisitesModalOpen}
        onClose={() => setIsRequisitesModalOpen(false)}
        onGenerate={handleGenerateRequisites}
        accountsData={accountsData}
        cardData={requisitesCard}
        isLoading={isRequisitesLoading}
      />
      
      <DebtCertificateModal
        open={isDebtCertificateModalOpen}
        handleClose={() => setIsDebtCertificateModalOpen(false)}
        clientData={selectedClient}
      />
    </div>
  );
};

export default ClientDataTabs;
