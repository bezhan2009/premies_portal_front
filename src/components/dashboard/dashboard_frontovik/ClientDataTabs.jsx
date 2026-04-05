import React from "react";
import SortIcon from "../../general/SortIcon.jsx";

const ClientDataTabs = ({
  selectedClient,
  cardsData,
  sortedCards,
  requestSortCards,
  sortCardsConfig,
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
}) => {
  if (!selectedClient) return null;

  return (
    <>
      {/* Карты */}
      {cardsData?.length > 0 && (
        <div className="processing-integration__limits-table">
          <div className="limits-table">
            <div className="limits-table__header">
              <h2 className="limits-table__title">Данные карт</h2>
              <div className="limits-table__actions">
                <button
                  onClick={() =>
                    handleNavigateToAllCardsTransactions(sortedCards)
                  }
                  className="export-excel-btn"
                  style={{ marginRight: 10, background: "#2ecc71" }}
                  disabled={!hasTransactionsAccess}
                >
                  Посмотреть историю
                </button>
                <button
                  onClick={handleExportCards}
                  className="export-excel-btn"
                >
                  Экспорт в Excel
                </button>
              </div>
            </div>

            <div className="limits-table__wrapper">
              <table className="limits-table">
                <thead className="limits-table__head">
                  <tr>
                    <th
                      onClick={() => requestSortCards("cardId")}
                      className="limits-table__ th sortable-header"
                    >
                      ID Карты{" "}
                      <SortIcon sortConfig={sortCardsConfig} sortKey="cardId" />
                    </th>
                    <th
                      onClick={() => requestSortCards("type")}
                      className="limits-table__th sortable-header"
                    >
                      Тип{" "}
                      <SortIcon sortConfig={sortCardsConfig} sortKey="type" />
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
                      <td className="limits-table__td">{card.statusName}</td>
                      <td className="limits-table__td">
                        {card.expirationDate}
                      </td>
                      <td className="limits-table__td">{card.currency}</td>
                      <td className="limits-table__td">
                        {card.accounts?.[0]?.state || "-"}
                      </td>
                      <td className="limits-table__td">
                        <button
                          className="selectAll-toggle"
                          style={{ marginRight: 10 }}
                          onClick={() =>
                            handleNavigateToTransactions(card.cardId)
                          }
                          title={
                            !hasTransactionsAccess
                              ? "У вас нет доступа"
                              : "Просмотр истории транзакций"
                          }
                        >
                          История
                        </button>
                        <button
                          className="selectAll-toggle"
                          style={{ background: "#374151" }}
                          onClick={() =>
                            (window.location.href =
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

      {/* Счета */}
      {accountsData?.length > 0 && (
        <div className="processing-integration__limits-table">
          <div className="limits-table">
            <div className="limits-table__header">
              <h2 className="limits-table__title">Данные счетов</h2>
              <div className="limits-table__actions">
                <button
                  onClick={handleExportAccounts}
                  className="export-excel-btn"
                >
                  Экспорт в Excel
                </button>
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
                  {sortedAccounts?.map((acc, idx) => (
                    <tr key={idx} className="limits-table__row">
                      <td className="limits-table__td">{acc.Number}</td>
                      <td className="limits-table__td">
                        {acc.Balance} {acc.Currency?.Code}
                      </td>
                      <td className="limits-table__td">{acc.Status?.Name}</td>
                      <td className="limits-table__td">{acc.DateOpened}</td>
                      <td className="limits-table__td">{acc.Branch?.Name}</td>
                      <td className="limits-table__td">
                        <button
                          className="selectAll-toggle"
                          onClick={() =>
                            handleNavigateToAccountOperations(acc.Number)
                          }
                          title={
                            !hasAccountOperationsAccess
                              ? "У вас нет доступа"
                              : "Просмотр выписки счета"
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

      {/* Кредиты */}
      {creditsData?.length > 0 && (
        <div className="processing-integration__limits-table">
          <div className="limits-table">
            <div className="limits-table__header">
              <h2 className="limits-table__title">Данные кредитов</h2>
              <div className="limits-table__actions">
                <button
                  onClick={handleExportCredits}
                  className="export-excel-btn"
                >
                  Экспорт в Excel
                </button>
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
                      <td className="limits-table__td">{card.referenceId}</td>
                      <td className="limits-table__td">{card.statusName}</td>
                      <td className="limits-table__td">
                        {card.amount} {card.currency}
                      </td>
                      <td className="limits-table__td">{card.documentDate}</td>
                      <td className="limits-table__td">{card.clientCode}</td>
                      <td className="limits-table__td">{card.productCode}</td>
                      <td className="limits-table__td">{card.productName}</td>
                      <td className="limits-table__td">
                        {card.department || "-"}
                      </td>
                      <td
                        className="limits-table__td"
                        style={{ display: "flex" }}
                      >
                        <button
                          className="selectAll-toggle"
                          onClick={() => handleOpenGraph(card.referenceId)}
                          disabled={!card.referenceId}
                        >
                          График
                        </button>
                        <button
                          className="selectAll-toggle"
                          style={{
                            marginLeft: 10,
                            background: "#2980b9",
                          }}
                          onClick={() => handleOpenDetails(card.referenceId)}
                          disabled={!card.referenceId}
                        >
                          Детали
                        </button>
                        <button
                          className="selectAll-toggle"
                          style={{
                            marginLeft: 10,
                            background: "#27ae60",
                          }}
                          onClick={() => handleOpenRepayModal(card)}
                        >
                          Погасить
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

      {/* Депозиты */}
      {depositsData?.length > 0 && (
        <div className="processing-integration__limits-table">
          <div className="limits-table">
            <div className="limits-table__header">
              <h2 className="limits-table__title">Данные депозитов</h2>
              <div className="limits-table__actions">
                <button
                  onClick={handleExportDeposits}
                  className="export-excel-btn"
                >
                  Экспорт в Excel
                </button>
              </div>
            </div>

            <div className="limits-table__wrapper">
              <table className="limits-table">
                <thead className="limits-table__head">
                  <tr>
                    <th
                      onClick={() => requestSortDeposits("AgreementData.Code")}
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
                        requestSortDeposits("AgreementData.ColvirReferenceId")
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
                        requestSortDeposits("AgreementData.Department.Code")
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
    </>
  );
};

export default ClientDataTabs;
