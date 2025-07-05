import React, { useState, useEffect } from 'react';
import '../../../../styles/components/Table.scss';
import LastModified from "../../dashboard_general/LastModified.jsx";
import '../../../../styles/components/TablesChairman.scss';
import Spinner from "../../../Spinner.jsx";
import { fetchEmployee } from "../../../../api/chairman/reports/employee_spec.js";

const ReportTableCardsChairman = ({ onSelect }) => {
  const [dateFilter, setDateFilter] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Каждый раз при изменении фильтра подтягиваем данные
    const loadData = async () => {
      setLoading(true);
      try {
        // используем URL вида '*/2025' для агрегации по всем офисам
        const url = `*/${dateFilter.year}`;
        // поднимаем его наверх для графика
        onSelect && onSelect(url);

        // получаем массив агрегированных записей
        const list = await fetchEmployee(dateFilter.month, url) || [];

        // суммируем метрики по всему массиву
        let totalCards = 0;
        let totalActive = 0;
        let totalDebit = 0;
        let totalCredit = 0;
        let totalBalance = 0;

        list.forEach(item => {
          const ct = item.CardTurnovers?.[0] || {};
          const cs = item.CardSales?.[0]    || {};
          totalActive  += Number(ct.activated_cards)   || 0;
          totalCards   += Number(cs.cards_sailed)      || 0;
          totalDebit   += Number(cs.deb_osd)           || 0;
          totalCredit  += Number(cs.deb_osk)           || 0;
          // используем out_balance, или in_balance как fallback
          totalBalance += Number(ct.out_balance || cs.in_balance || 0) || 0;
        });

        setRow({
          concreteCards:       totalCards.toLocaleString(),
          concreteActiveCards: totalActive.toLocaleString(),
          overdraftDebt:       totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 }),
          overdraftCredit:     totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 }),
          balanceCards:        totalBalance.toLocaleString(),
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
              <div
                  style={{
                    transform: 'scale(2)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: '100px',
                    width: 'auto',
                  }}
              >
                <Spinner />
              </div>
          ) : row ? (
              <table className="table-reports">
                <thead>
                <tr>
                  <th>Количество карт</th>
                  <th>Конкретно активных карт</th>
                  <th>Оборот по дебету</th>
                  <th>Оборот по кредиту</th>
                  <th>Остатки на картах</th>
                </tr>
                </thead>
                <tbody>
                <tr>
                  <td>{row.concreteCards}</td>
                  <td>{row.concreteActiveCards}</td>
                  <td>{row.overdraftDebt}</td>
                  <td>{row.overdraftCredit}</td>
                  <td>{row.balanceCards}</td>
                </tr>
                </tbody>
              </table>
          ) : (
              <div style={{
                padding: '10px',
                color: '#555',
                fontSize: '16px',
                textAlign: 'center',
                backgroundColor: '#f0f0f0',
                borderRadius: '4px'
              }}>
                Нет данных за выбранный период
              </div>
          )}
        </div>
      </div>
  );
};

export default ReportTableCardsChairman;
