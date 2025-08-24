import React, { useState, useEffect } from 'react';
import '../../../../styles/components/Table.scss';
import LastModified from "../../dashboard_general/LastModified.jsx";
import '../../../../styles/components/TablesChairman.scss';
import Spinner from "../../../Spinner.jsx";
import { fetchEmployee } from "../../../../api/chairman/reports/employee_spec.js";

const ReportTableCardsDirector = ({ onSelect }) => {
  const [dateFilter, setDateFilter] = useState({
    month: new Date().getMonth() + 1,
    year:  new Date().getFullYear(),
  });
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const url = `${dateFilter.year}/director/office`;
        onSelect?.(url);

        const list = await fetchEmployee(dateFilter.month, url) || [];

        if (!list.length) {
          setRow(null);
          return;
        }

        const officeData = list[0];

        // Если это данные по офису с работниками
        if (officeData.office_user) {
          let totalCardsForMonth = 0;
          let totalActivatedCards = 0;
          let totalDebOsd = 0;
          let totalDebOsk = 0;
          let totalOutBalance = 0;
          let totalCardsInGeneral = 0;

          officeData.office_user.forEach(({ worker }) => {
            if (worker?.CardSales?.length) {
              const sales = worker.CardSales[0];
              totalCardsForMonth += sales.cards_for_month || sales.cards_sailed || 0;
              totalDebOsd += sales.deb_osd || 0;
              totalDebOsk += sales.deb_osk || 0;
              totalOutBalance += sales.out_balance || 0;
              totalCardsInGeneral += sales.cards_sailed_in_general || 0;
            }

            if (worker?.CardTurnovers?.length) {
              const turns = worker.CardTurnovers[0];
              totalActivatedCards += turns.activated_cards || 0;
            }
          });

          setRow({
            concreteCards: totalCardsForMonth.toLocaleString(),
            concreteCardsGeneral: totalCardsInGeneral.toLocaleString(),
            concreteActiveCards: totalActivatedCards.toLocaleString(),
            overdraftDebt: totalDebOsd.toLocaleString(undefined, { minimumFractionDigits: 2 }),
            overdraftCredit: totalDebOsk.toLocaleString(undefined, { minimumFractionDigits: 2 }),
            balanceCards: totalOutBalance.toLocaleString(),
          });
        }
        // Если это агрегированные данные (как в чартах)
        else {
          let sumCardsForMonth = 0;
          let sumActivatedCards = 0;
          let sumDebOsd = 0;
          let sumDebOsk = 0;
          let sumOutBalance = 0;
          let sumCardsInGeneral = 0;

          list.forEach(w => {
            if (Array.isArray(w.CardSales)) {
              w.CardSales.forEach(s => {
                sumCardsForMonth += s.cards_for_month || s.cards_sailed || 0;
                sumDebOsd += s.deb_osd || 0;
                sumDebOsk += s.deb_osk || 0;
                sumOutBalance += s.out_balance || 0;
                sumCardsInGeneral += s.cards_sailed_in_general || 0;
              });
            }

            if (Array.isArray(w.CardTurnovers)) {
              w.CardTurnovers.forEach(t => {
                sumActivatedCards += t.activated_cards || 0;
              });
            }
          });

          setRow({
            concreteCards: sumCardsForMonth.toLocaleString(),
            concreteCardsGeneral: sumCardsInGeneral.toLocaleString(),
            concreteActiveCards: sumActivatedCards.toLocaleString(),
            overdraftDebt: sumDebOsd.toLocaleString(undefined, { minimumFractionDigits: 2 }),
            overdraftCredit: sumDebOsk.toLocaleString(undefined, { minimumFractionDigits: 2 }),
            balanceCards: sumOutBalance.toLocaleString(),
          });
        }
      } catch (err) {
        console.error("Error loading data:", err);
        setRow(null);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [dateFilter, onSelect]);

  return (
      <div className="block_info_prems" align="center">
        <div className="report-table-container">
          <div className="date-filter-container">
            <span className="label">Период</span>
            <LastModified
                initialDate={new Date(dateFilter.year, dateFilter.month - 1, 1)}
                onChange={({ month, year }) => setDateFilter({ month, year })}
            />
          </div>

          {loading ? (
              <div style={{
                transform:   'scale(2)',
                display:     'flex',
                justifyContent: 'center',
                alignItems:  'center',
                marginBottom:  '100px',
                width:        'auto',
              }}>
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
                  <td>{row?.concreteCardsGeneral ?? '0'}</td>
                  <td>{row?.concreteCards ?? '0'}</td>
                  <td>{row?.concreteActiveCards ?? '0'}</td>
                  <td>{row?.overdraftDebt ?? '0.00'}</td>
                  <td>{row?.overdraftCredit ?? '0.00'}</td>
                  <td>{row?.balanceCards ?? '0'}</td>
                </tr>
                </tbody>
              </table>
          )}
        </div>
      </div>
  );
};

export default ReportTableCardsDirector;
