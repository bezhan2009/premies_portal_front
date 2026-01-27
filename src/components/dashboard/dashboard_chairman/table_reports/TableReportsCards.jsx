import React, { useState, useEffect } from "react";
import "../../../../styles/components/Table.scss";
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

        // Если cards_for_month равен 0, обнуляем все показатели
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
          <table className="table-reports">
            <thead>
              <tr>
                <th>Всего карт до текущего периода</th>
                <th>Выдано карт в текущем периоде</th>
                <th>Активных карт за текущий период</th>
                <th>Оборот по дебету</th>
                <th>Оборот по кредиту</th>
                <th>Остатки на картах</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{row?.concreteCardsGeneral ?? "0"}</td>
                <td>{row?.concreteCards ?? "0"}</td>
                <td>{row?.concreteActiveCards ?? "0"}</td>
                <td>{row?.overdraftDebt ?? "0.00"}</td>
                <td>{row?.overdraftCredit ?? "0.00"}</td>
                <td>{row?.balanceCards ?? "0"}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ReportTableCardsChairman;
