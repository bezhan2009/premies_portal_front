import React, { useState, useEffect } from "react";
import { Table } from "../../../table/FlexibleAntTable.jsx";
import LastModified from "../../dashboard_general/LastModified.jsx";
import "../../../../styles/components/TablesChairman.scss";
import Spinner from "../../../Spinner.jsx";
import { fetchEmployee } from "../../../../api/chairman/reports/employee_spec.js";

const ReportTableCardsChairman = ({ onSelect }) => {
  const [dateFilter, setDateFilter] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const url = `*/${dateFilter.year}/stats`;
        onSelect?.(url);

        const list = (await fetchEmployee(dateFilter.month, url)) || [];
        const statObj = list[0] || { CardSales: [{}], CardTurnovers: [{}] };
        const sales = statObj.CardSales[0] || {};
        const turns = statObj.CardTurnovers[0] || {};

        let cardsForMonth = sales.cards_for_month ?? 0;
        let activatedCards = turns.activated_cards ?? 0;
        let debtOsd = sales.deb_osd ?? 0;
        let debtOsk = sales.deb_osk ?? 0;
        let outBalance = sales.out_balance ?? 0;
        let cardsInGeneral = sales.cards_sailed_in_general ?? 0;

        if (cardsForMonth === 0 || debtOsd === 0) {
          activatedCards = 0;
          cardsForMonth = 0;
          debtOsd = 0;
          debtOsk = 0;
          outBalance = 0;
          cardsInGeneral = 0;
        }

        setRow({
          id: 1,
          concreteCards: cardsForMonth.toLocaleString(),
          concreteCardsGeneral: cardsInGeneral.toLocaleString(),
          concreteActiveCards: activatedCards.toLocaleString(),
          overdraftDebt: debtOsd.toLocaleString(undefined, {
            minimumFractionDigits: 2,
          }),
          overdraftCredit: debtOsk.toLocaleString(undefined, {
            minimumFractionDigits: 2,
          }),
          balanceCards: outBalance.toLocaleString(),
        });
      } catch (err) {
        console.error(err);
        setRow(null);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [dateFilter, onSelect]);

  return (
    <div className="block_info_prems content-page" align="center">
      <div className="report-table-container">
        <div className="date-filter-container">
          <span className="label">Период</span>
          <LastModified
            initialDate={new Date(dateFilter.year, dateFilter.month - 1, 1)}
            onChange={({ month, year }) => setDateFilter({ month, year })}
          />
        </div>

        {loading ? (
          <div
            style={{
              transform: "scale(2)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: "100px",
              width: "auto",
            }}
          >
            <Spinner />
          </div>
        ) : (
          <Table
            dataSource={row ? [row] : []}
            rowKey="id"
            pagination={false}
            bordered
          >
            <Table.Column title="Всего карт до текущего периода" dataIndex="concreteCardsGeneral" key="concreteCardsGeneral" />
            <Table.Column title="Выдано карт в текущем периоде" dataIndex="concreteCards" key="concreteCards" />
            <Table.Column title="Активных карт за текущий период" dataIndex="concreteActiveCards" key="concreteActiveCards" />
            <Table.Column title="Оборот по дебету" dataIndex="overdraftDebt" key="overdraftDebt" />
            <Table.Column title="Оборот по кредиту" dataIndex="overdraftCredit" key="overdraftCredit" />
            <Table.Column title="Остатки на картах" dataIndex="balanceCards" key="balanceCards" />
          </Table>
        )}
      </div>
    </div>
  );
};

export default ReportTableCardsChairman;
