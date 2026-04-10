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
      {/* РљР°СЂС‚С‹ */}
      {cardsData?.length > 0 && (
        <div className="processing-integration__limits-table">
          <div className="limits-table">
            <div className="limits-table__header">
              <h2 className="limits-table__title">Р”Р°РЅРЅС‹Рµ РєР°СЂС‚</h2>
              <div className="limits-table__actions">
                <button
                  onClick={() =>
                    handleNavigateToAllCardsTransactions(sortedCards)
                  }
                  className="export-excel-btn"
                  style={{ marginRight: 10, background: "#2ecc71" }}
                  disabled={!hasTransactionsAccess}
                >
                  РџРѕСЃРјРѕС‚СЂРµС‚СЊ РёСЃС‚РѕСЂРёСЋ
                </button>
                <button
                  onClick={handleExportCards}
                  className="export-excel-btn"
                >
                  Р­РєСЃРїРѕСЂС‚ РІ Excel
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
                      ID РљР°СЂС‚С‹{" "}
                      <SortIcon sortConfig={sortCardsConfig} sortKey="cardId" />
                    </th>
                    <th
                      onClick={() => requestSortCards("type")}
                      className="limits-table__th sortable-header"
                    >
                      РўРёРї{" "}
                      <SortIcon sortConfig={sortCardsConfig} sortKey="type" />
                    </th>
                    <th
                      onClick={() => requestSortCards("statusName")}
                      className="limits-table__th sortable-header"
                    >
                      РЎС‚Р°С‚СѓСЃ{" "}
                      <SortIcon
                        sortConfig={sortCardsConfig}
                        sortKey="statusName"
                      />
                    </th>
                    <th
                      onClick={() => requestSortCards("expirationDate")}
                      className="limits-table__th sortable-header"
                    >
                      РЎСЂРѕРє{" "}
                      <SortIcon
                        sortConfig={sortCardsConfig}
                        sortKey="expirationDate"
                      />
                    </th>
                    <th
                      onClick={() => requestSortCards("currency")}
                      className="limits-table__th sortable-header"
                    >
                      Р’Р°Р»СЋС‚Р°{" "}
                      <SortIcon
                        sortConfig={sortCardsConfig}
                        sortKey="currency"
                      />
                    </th>
                    <th
                      onClick={() => requestSortCards("accounts.0.state")}
                      className="limits-table__th sortable-header"
                    >
                      РћСЃС‚Р°С‚РѕРє{" "}
                      <SortIcon
                        sortConfig={sortCardsConfig}
                        sortKey="accounts.0.state"
                      />
                    </th>
                    <th className="limits-table__th">Р”РµР№СЃС‚РІРёСЏ</th>
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
                              ? "РЈ РІР°СЃ РЅРµС‚ РґРѕСЃС‚СѓРїР°"
                              : "РџСЂРѕСЃРјРѕС‚СЂ РёСЃС‚РѕСЂРёРё С‚СЂР°РЅР·Р°РєС†РёР№"
                          }
                        >
                          РСЃС‚РѕСЂРёСЏ
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
                          РџРѕСЃРјРѕС‚СЂРµС‚СЊ С‚Р°СЂРёС„
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

      {/* РЎС‡РµС‚Р° */}
      {accountsData?.length > 0 && (
        <div className="processing-integration__limits-table">
          <div className="limits-table">
            <div className="limits-table__header">
              <h2 className="limits-table__title">Р”Р°РЅРЅС‹Рµ СЃС‡РµС‚РѕРІ</h2>
              <div className="limits-table__actions">
                <button
                  onClick={handleExportAccounts}
                  className="export-excel-btn"
                >
                  Р­РєСЃРїРѕСЂС‚ РІ Excel
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
                      РќРѕРјРµСЂ СЃС‡РµС‚Р°{" "}
                      <SortIcon
                        sortConfig={sortAccountsConfig}
                        sortKey="Number"
                      />
                    </th>
                    <th
                      onClick={() => requestSortAccounts("Balance")}
                      className="limits-table__th sortable-header"
                    >
                      Р‘Р°Р»Р°РЅСЃ{" "}
                      <SortIcon
                        sortConfig={sortAccountsConfig}
                        sortKey="Balance"
                      />
                    </th>
                    <th
                      onClick={() => requestSortAccounts("Status.Name")}
                      className="limits-table__th sortable-header"
                    >
                      РЎС‚Р°С‚СѓСЃ{" "}
                      <SortIcon
                        sortConfig={sortAccountsConfig}
                        sortKey="Status.Name"
                      />
                    </th>
                    <th
                      onClick={() => requestSortAccounts("DateOpened")}
                      className="limits-table__th sortable-header"
                    >
                      Р”Р°С‚Р° РѕС‚РєСЂС‹С‚РёСЏ{" "}
                      <SortIcon
                        sortConfig={sortAccountsConfig}
                        sortKey="DateOpened"
                      />
                    </th>
                    <th
                      onClick={() => requestSortAccounts("Branch.Name")}
                      className="limits-table__th sortable-header"
                    >
                      Р¤РёР»РёР°Р»{" "}
                      <SortIcon
                        sortConfig={sortAccountsConfig}
                        sortKey="Branch.Name"
                      />
                    </th>
                    <th className="limits-table__th">Р”РµР№СЃС‚РІРёСЏ</th>
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
                              ? "РЈ РІР°СЃ РЅРµС‚ РґРѕСЃС‚СѓРїР°"
                              : "РџСЂРѕСЃРјРѕС‚СЂ РІС‹РїРёСЃРєРё СЃС‡РµС‚Р°"
                          }
                        >
                          Р’С‹РїРёСЃРєРё СЃС‡РµС‚Р°
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

      {/* РљСЂРµРґРёС‚С‹ */}
      {creditsData?.length > 0 && (
        <div className="processing-integration__limits-table">
          <div className="limits-table">
            <div className="limits-table__header">
              <h2 className="limits-table__title">Р”Р°РЅРЅС‹Рµ РєСЂРµРґРёС‚РѕРІ</h2>
              <div className="limits-table__actions">
                <button
                  onClick={handleExportCredits}
                  className="export-excel-btn"
                >
                  Р­РєСЃРїРѕСЂС‚ РІ Excel
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
                      РќРѕРјРµСЂ РґРѕРіРѕРІРѕСЂР°{" "}
                      <SortIcon
                        sortConfig={sortCreditsConfig}
                        sortKey="contractNumber"
                      />
                    </th>
                    <th
                      onClick={() => requestSortCredits("referenceId")}
                      className="limits-table__th sortable-header"
                    >
                      РРґРµРЅС‚РёС„РёРєР°С‚РѕСЂ СЃСЃС‹Р»РєРё{" "}
                      <SortIcon
                        sortConfig={sortCreditsConfig}
                        sortKey="referenceId"
                      />
                    </th>
                    <th
                      onClick={() => requestSortCredits("statusName")}
                      className="limits-table__th sortable-header"
                    >
                      РЎС‚Р°С‚СѓСЃ{" "}
                      <SortIcon
                        sortConfig={sortCreditsConfig}
                        sortKey="statusName"
                      />
                    </th>
                    <th
                      onClick={() => requestSortCredits("amount")}
                      className="limits-table__th sortable-header"
                    >
                      РЎСѓРјРјР°{" "}
                      <SortIcon
                        sortConfig={sortCreditsConfig}
                        sortKey="amount"
                      />
                    </th>
                    <th
                      onClick={() => requestSortCredits("documentDate")}
                      className="limits-table__th sortable-header"
                    >
                      Р”Р°С‚Р° РґРѕРєСѓРјРµРЅС‚Р°{" "}
                      <SortIcon
                        sortConfig={sortCreditsConfig}
                        sortKey="documentDate"
                      />
                    </th>
                    <th
                      onClick={() => requestSortCredits("clientCode")}
                      className="limits-table__th sortable-header"
                    >
                      РљР»РёРµРЅС‚РљРѕРґ{" "}
                      <SortIcon
                        sortConfig={sortCreditsConfig}
                        sortKey="clientCode"
                      />
                    </th>
                    <th
                      onClick={() => requestSortCredits("productCode")}
                      className="limits-table__th sortable-header"
                    >
                      РљРѕРґ РїСЂРѕРґСѓРєС‚Р°{" "}
                      <SortIcon
                        sortConfig={sortCreditsConfig}
                        sortKey="productCode"
                      />
                    </th>
                    <th
                      onClick={() => requestSortCredits("productName")}
                      className="limits-table__th sortable-header"
                    >
                      РќР°Р·РІР°РЅРёРµ РїСЂРѕРґСѓРєС‚Р°{" "}
                      <SortIcon
                        sortConfig={sortCreditsConfig}
                        sortKey="productName"
                      />
                    </th>
                    <th
                      onClick={() => requestSortCredits("department")}
                      className="limits-table__th sortable-header"
                    >
                      РћС‚РґРµР»{" "}
                      <SortIcon
                        sortConfig={sortCreditsConfig}
                        sortKey="department"
                      />
                    </th>
                    <th className="limits-table__th">Р”РµР№СЃС‚РІРёСЏ</th>
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
                          Р“СЂР°С„РёРє
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
                          Р”РµС‚Р°Р»Рё
                        </button>
                        {String(card.statusName || "").trim().toLowerCase() !== "погашен" && (
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
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Р”РµРїРѕР·РёС‚С‹ */}
      {depositsData?.length > 0 && (
        <div className="processing-integration__limits-table">
          <div className="limits-table">
            <div className="limits-table__header">
              <h2 className="limits-table__title">Р”Р°РЅРЅС‹Рµ РґРµРїРѕР·РёС‚РѕРІ</h2>
              <div className="limits-table__actions">
                <button
                  onClick={handleExportDeposits}
                  className="export-excel-btn"
                >
                  Р­РєСЃРїРѕСЂС‚ РІ Excel
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
                      РќРѕРјРµСЂ РґРѕРіРѕРІРѕСЂР°{" "}
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
                      Р РµС„РµСЂРµРЅСЃ{" "}
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
                      РЎС‚Р°С‚СѓСЃ{" "}
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
                      РћСЃС‚Р°С‚РѕРє РґРµРїРѕР·РёС‚Р°{" "}
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
                      Р”Р°С‚Р° РЅР°С‡Р°Р»Р°{" "}
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
                      Р”Р°С‚Р° РѕРєРѕРЅС‡Р°РЅРёСЏ{" "}
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
                      РџСЂРѕРґСѓРєС‚{" "}
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
                      РЎСЂРѕРє{" "}
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
                      РћС‚РґРµР»{" "}
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
                      РЎСѓРјРјР° РґРѕРіРѕРІРѕСЂР°{" "}
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

