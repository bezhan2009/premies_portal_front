import React from "react";
import { Table } from "../../table/FlexibleAntTable.jsx";

const ClientDataTabs = ({
  selectedClient,
  cardsData,
  handleExportCards,
  handleNavigateToTransactions,
  handleNavigateToAllCardsTransactions,
  hasTransactionsAccess,
  accountsData,
  handleExportAccounts,
  handleNavigateToAccountOperations,
  hasAccountOperationsAccess,
  creditsData,
  handleExportCredits,
  handleOpenGraph,
  handleOpenDetails,
  handleOpenRepayModal,
  depositsData,
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
                  onClick={() => handleNavigateToAllCardsTransactions?.(cardsData)}
                  className="export-excel-btn"
                  style={{ marginRight: 10, background: "#2ecc71" }}
                  disabled={!hasTransactionsAccess}
                >
                  Посмотреть историю
                </button>
                <button onClick={handleExportCards} className="export-excel-btn">
                  Экспорт в Excel
                </button>
              </div>
            </div>
            <Table
              dataSource={cardsData}
              rowKey={(row, idx) => `card-${idx}`}
              pagination={false}
              bordered
              scroll={{ x: "max-content" }}
            >
              <Table.Column
                title="ID Карты"
                dataIndex="cardId"
                key="cardId"
                sortable
              />
              <Table.Column title="Тип" dataIndex="type" key="type" sortable />
              <Table.Column
                title="Статус"
                dataIndex="statusName"
                key="statusName"
                sortable
              />
              <Table.Column
                title="Срок"
                dataIndex="expirationDate"
                key="expirationDate"
                sortable
              />
              <Table.Column
                title="Валюта"
                dataIndex="currency"
                key="currency"
                sortable
              />
              <Table.Column
                title="Остаток"
                key="state"
                render={(_, row) => row.accounts?.[0]?.state || "-"}
                sortable
              />
              <Table.Column
                title="Действия"
                key="actions"
                render={(_, row) => (
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      className="selectAll-toggle"
                      onClick={() => handleNavigateToTransactions(row.cardId)}
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
                        row.cardId)
                      }
                    >
                      Посмотреть тариф
                    </button>
                  </div>
                )}
              />
            </Table>
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
            <Table
              dataSource={accountsData}
              rowKey={(row, idx) => `acc-${idx}`}
              pagination={false}
              bordered
              scroll={{ x: "max-content" }}
            >
              <Table.Column
                title="Номер счета"
                dataIndex="Number"
                key="Number"
                sortable
              />
              <Table.Column
                title="Баланс"
                key="Balance"
                render={(_, row) => `${row.Balance} ${row.Currency?.Code}`}
                sortable
              />
              <Table.Column
                title="Статус"
                key="Status"
                render={(_, row) => row.Status?.Name}
                sortable
              />
              <Table.Column
                title="Дата открытия"
                dataIndex="DateOpened"
                key="DateOpened"
                sortable
              />
              <Table.Column
                title="Филиал"
                key="Branch"
                render={(_, row) => row.Branch?.Name}
                sortable
              />
              <Table.Column
                title="Действия"
                key="actions"
                render={(_, row) => (
                  <button
                    className="selectAll-toggle"
                    onClick={() => handleNavigateToAccountOperations(row.Number)}
                    title={
                      !hasAccountOperationsAccess
                        ? "У вас нет доступа"
                        : "Просмотр выписки счета"
                    }
                  >
                    Выписки счета
                  </button>
                )}
              />
            </Table>
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
            <Table
              dataSource={creditsData}
              rowKey={(row, idx) => `credit-${idx}`}
              pagination={false}
              bordered
              scroll={{ x: "max-content" }}
            >
              <Table.Column
                title="Номер договора"
                dataIndex="contractNumber"
                key="contractNumber"
                sortable
              />
              <Table.Column
                title="Идентификатор ссылки"
                dataIndex="referenceId"
                key="referenceId"
                sortable
              />
              <Table.Column
                title="Статус"
                dataIndex="statusName"
                key="statusName"
                sortable
              />
              <Table.Column
                title="Сумма"
                key="amount"
                render={(_, row) => `${row.amount} ${row.currency}`}
                sortable
              />
              <Table.Column
                title="Дата документа"
                dataIndex="documentDate"
                key="documentDate"
                sortable
              />
              <Table.Column
                title="КлиентКод"
                dataIndex="clientCode"
                key="clientCode"
                sortable
              />
              <Table.Column
                title="Код продукта"
                dataIndex="productCode"
                key="productCode"
                sortable
              />
              <Table.Column
                title="Название продукта"
                dataIndex="productName"
                key="productName"
                sortable
              />
              <Table.Column
                title="Отдел"
                dataIndex="department"
                key="department"
                render={(val) => val || "-"}
                sortable
              />
              <Table.Column
                title="Действия"
                key="actions"
                render={(_, row) => (
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      className="selectAll-toggle"
                      onClick={() => handleOpenGraph(row.referenceId)}
                      disabled={!row.referenceId}
                    >
                      График
                    </button>
                    <button
                      className="selectAll-toggle"
                      style={{ background: "#2980b9" }}
                      onClick={() => handleOpenDetails(row.referenceId)}
                      disabled={!row.referenceId}
                    >
                      Детали
                    </button>
                    <button
                      className="selectAll-toggle"
                      style={{ background: "#27ae60" }}
                      onClick={() => handleOpenRepayModal(row)}
                    >
                      Погасить
                    </button>
                  </div>
                )}
              />
            </Table>
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
            <Table
              dataSource={depositsData}
              rowKey={(row, idx) => `depo-${idx}`}
              pagination={false}
              bordered
              scroll={{ x: "max-content" }}
            >
              <Table.Column
                title="Номер договора"
                key="code"
                render={(_, row) => row.AgreementData?.Code}
                sortable
              />
              <Table.Column
                title="Референс"
                key="ref"
                render={(_, row) => row.AgreementData?.ColvirReferenceId}
                sortable
              />
              <Table.Column
                title="Статус"
                key="status"
                render={(_, row) => row.AgreementData?.Status?.Name}
                sortable
              />
              <Table.Column
                title="Остаток депозита"
                key="balance"
                render={(_, row) => row.BalanceAccounts?.[0]?.Balance || "-"}
                sortable
              />
              <Table.Column
                title="Дата начала"
                key="dateFrom"
                render={(_, row) => row.AgreementData?.DateFrom}
                sortable
              />
              <Table.Column
                title="Дата окончания"
                key="dateTo"
                render={(_, row) => row.AgreementData?.DateTo}
                sortable
              />
              <Table.Column
                title="Продукт"
                key="product"
                render={(_, row) => row.AgreementData?.Product?.Name}
                sortable
              />
              <Table.Column
                title="Срок"
                key="term"
                render={(_, row) =>
                  `${row.AgreementData?.DepoTermTU} ${row.AgreementData?.DepoTermTimeType}`
                }
                sortable
              />
              <Table.Column
                title="Отдел"
                key="dept"
                render={(_, row) => row.AgreementData?.Department?.Code}
                sortable
              />
              <Table.Column
                title="Сумма договора"
                key="amount"
                render={(_, row) =>
                  `${row.AgreementData?.Amount} ${row.AgreementData?.Currency}`
                }
                sortable
              />
            </Table>
          </div>
        </div>
      )}
    </>
  );
};

export default ClientDataTabs;