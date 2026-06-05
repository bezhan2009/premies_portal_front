import React from "react";
import { Table } from "../../table/FlexibleAntTable.jsx";
import { Input as AntInput, Space, Button, message } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import RequisitesModal from "./RequisitesModal.jsx";
import { generateCardRequisites } from "../../../api/ABS_frotavik/requisites.js";
import { logAuditAction } from "../../../utils/auditLogger.js";

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
  onResetPin,
  onChangePin,
  onManageServices,
  onOpenLimits,
  hasBlockCardAccess,
  hasChangePinAccess,
  selectedClient,
  tableData,
}) => {
  const [isRequisitesModalOpen, setIsRequisitesModalOpen] = React.useState(false);
  const [requisitesCard, setRequisitesCard] = React.useState(null);
  const [isRequisitesLoading, setIsRequisitesLoading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("accounts");

  const handleOpenRequisitesModal = (card) => {
    setRequisitesCard(card);
    setIsRequisitesModalOpen(true);
  };

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

            {card.details?.hotCardStatus && String(card.details.hotCardStatus) === "17" ? (
              <button
                className="button"
                style={{
                  background: "#10b981",
                  color: "white",
                  width: "100%",
                }}
                onClick={() => onUnblockCard(card.cardId)}
              >
                Активировать
              </button>
            ) : (
              hasBlockCardAccess && (
                card.details?.hotCardStatus === "0" ? (
                  <button
                    className="button"
                    style={{
                      background: "#e11d48",
                      color: "white",
                      width: "100%",
                    }}
                    onClick={() => onBlockCard(card.cardId)}
                  >
                    Заблокировать
                  </button>
                ) : (
                  <button
                    className="button"
                    style={{
                      background: "#10b981",
                      color: "white",
                      width: "100%",
                    }}
                    onClick={() => onUnblockCard(card.cardId)}
                  >
                    Разблокировать
                  </button>
                )
              )
            )}

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
    },
    {
      title: "Дата окончания",
      dataIndex: ["AgreementData", "DateTo"],
      key: "dateTo",
      width: 130,
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
          className={`abs-tab-trigger-btn ${activeTab === "accounts" ? "active" : ""}`}
          onClick={() => setActiveTab("accounts")}
        >
          Счета ({accountsData?.length || 0})
        </button>
        <button
          className={`abs-tab-trigger-btn ${activeTab === "cards" ? "active" : ""}`}
          onClick={() => setActiveTab("cards")}
        >
          Карты ({cardsData?.length || 0})
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
              <div className="limits-table__wrapper">
                <Table
                  tableId="frontovik-accounts"
                  rowKey="Number"
                  columns={accountColumns}
                  dataSource={sortedAccounts}
                  pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Всего ${total} счетов` }}
                  sticky
                  bordered
                  scroll={{ x: "max-content" }}
                />
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
                    Посмотреть историю
                  </button>
                  <button onClick={handleExportCards} className="btn-tab-export">
                    Экспорт в Excel
                  </button>
                </div>
              )}
            </div>
            {cardsData?.length > 0 ? (
              <div className="limits-table__wrapper">
                <Table
                  tableId="frontovik-cards"
                  rowKey="cardId"
                  columns={cardColumns}
                  dataSource={sortedCards}
                  pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Всего ${total} карт` }}
                  sticky
                  bordered
                  scroll={{ x: "max-content" }}
                />
              </div>
            ) : (
              <div className="empty-tab-state">Карты отсутствуют</div>
            )}
          </div>
        )}

        {/* Credits Tab */}
        {activeTab === "credits" && (
          <div className="tab-pane-fade">
            <div className="tab-pane-header">
              <h3>Договоры кредитования</h3>
              {creditsData?.length > 0 && (
                <button onClick={handleExportCredits} className="btn-tab-export">
                  Экспорт в Excel
                </button>
              )}
            </div>
            {creditsData?.length > 0 ? (
              <div className="abs-cards-grid">
                {sortedCredits.map((card, idx) => {
                  return (
                    <details key={card.referenceId || idx} className="abs-expandable-card">
                      <summary className="abs-expandable-card-summary">
                        <div className="card-summary-header">
                          <span className="card-title">{card.productName || "Кредит"}</span>
                          <span className="card-status badge-active">{card.statusName || "-"}</span>
                        </div>
                        <div className="card-summary-amount">
                          <span className="amount-val">{card.amount} {card.currency || ""}</span>
                        </div>
                        <div className="card-progress-wrapper">
                          <div className="progress-labels">
                            <span>Использовано</span>
                            <span>Лимит: {card.amount}</span>
                          </div>
                          <div className="progress-bar-bg">
                            <div className="progress-bar-fill" style={{ width: "100%", background: "#27ae60" }}></div>
                          </div>
                        </div>
                      </summary>
                      <div className="abs-expandable-card-content">
                        <div className="card-detail-grid">
                          <div className="detail-item"><span>Договор</span><strong>{card.contractNumber || "-"}</strong></div>
                          <div className="detail-item"><span>Референс</span><strong>{card.referenceId || "-"}</strong></div>
                          <div className="detail-item"><span>Дата</span><strong>{card.documentDate || "-"}</strong></div>
                          <div className="detail-item"><span>Продукт Код</span><strong>{card.productCode || "-"}</strong></div>
                          <div className="detail-item"><span>Отдел</span><strong>{card.department || "-"}</strong></div>
                        </div>
                        <div className="card-actions-row" style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
                          <button className="button" onClick={() => handleOpenGraph(card.referenceId)} disabled={!card.referenceId}>График</button>
                          <button className="button" style={{ background: "#2980b9" }} onClick={() => handleOpenDetails(card.referenceId)} disabled={!card.referenceId}>Детали</button>
                          {String(card.statusName || "").trim().toLowerCase() !== "погашен" && (
                            <button className="button" style={{ background: "#27ae60" }} onClick={() => handleOpenRepayModal(card)}>Погасить</button>
                          )}
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            ) : (
              <div className="empty-tab-state">Кредиты отсутствуют</div>
            )}
          </div>
        )}

        {/* Deposits Tab */}
        {activeTab === "deposits" && (
          <div className="tab-pane-fade">
            <div className="tab-pane-header">
              <h3>Договоры депозитов</h3>
              {depositsData?.length > 0 && (
                <button onClick={handleExportDeposits} className="btn-tab-export">
                  Экспорт в Excel
                </button>
              )}
            </div>
            {depositsData?.length > 0 ? (
              <div className="abs-cards-grid">
                {sortedDeposits.map((item, idx) => {
                  const agreement = item.AgreementData || {};
                  const balance = item.BalanceAccounts?.[0]?.Balance || 0;
                  const total = agreement.Amount || 0;
                  const percentage = total > 0 ? Math.min((balance / total) * 100, 100) : 0;
                  
                  return (
                    <details key={agreement.ColvirReferenceId || agreement.Code || idx} className="abs-expandable-card">
                      <summary className="abs-expandable-card-summary">
                        <div className="card-summary-header">
                          <span className="card-title">{agreement.Product?.Name || "Депозит"}</span>
                          <span className="card-status badge-active">{agreement.Status?.Name || "-"}</span>
                        </div>
                        <div className="card-summary-amount">
                          <span className="amount-val">{balance} {agreement.Currency || ""}</span>
                          <span className="amount-label">Текущий остаток</span>
                        </div>
                        <div className="card-progress-wrapper">
                          <div className="progress-labels">
                            <span>Накоплено</span>
                            <span>Сумма: {total} {agreement.Currency}</span>
                          </div>
                          <div className="progress-bar-bg">
                            <div className="progress-bar-fill" style={{ width: `${percentage}%`, background: "#3b82f6" }}></div>
                          </div>
                        </div>
                      </summary>
                      <div className="abs-expandable-card-content">
                        <div className="card-detail-grid">
                          <div className="detail-item"><span>Договор</span><strong>{agreement.Code || "-"}</strong></div>
                          <div className="detail-item"><span>Референс</span><strong>{agreement.ColvirReferenceId || "-"}</strong></div>
                          <div className="detail-item"><span>Срок</span><strong>{agreement.DepoTermTU} {agreement.DepoTermTimeType}</strong></div>
                          <div className="detail-item"><span>Дата начала</span><strong>{agreement.DateFrom || "-"}</strong></div>
                          <div className="detail-item"><span>Дата окончания</span><strong>{agreement.DateTo || "-"}</strong></div>
                          <div className="detail-item"><span>Отдел</span><strong>{agreement.Department?.Code || "-"}</strong></div>
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            ) : (
              <div className="empty-tab-state">Депозиты отсутствуют</div>
            )}
          </div>
        )}

        {/* Client Info Detailed Tab */}
        {activeTab === "info" && (
          <div className="tab-pane-fade">
            <div className="tab-pane-header">
              <h3>Персональная информация (АБС)</h3>
            </div>
            {tableData && tableData.length > 0 ? (
              <div className="client-info-grid-container">
                {tableData.map((item, idx) => (
                  <div key={idx} className="client-info-grid-item">
                    <span className="info-label">{item.label}</span>
                    <span className="info-value font-mono">{item.value || (item.value === 0 ? 0 : "Не указано")}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-tab-state">Данные клиента отсутствуют</div>
            )}
          </div>
        )}

      </div>

      <RequisitesModal
        open={isRequisitesModalOpen}
        onClose={() => setIsRequisitesModalOpen(false)}
        onGenerate={handleGenerateRequisites}
        accountsData={accountsData}
        isLoading={isRequisitesLoading}
      />
    </div>
  );
};

export default ClientDataTabs;
