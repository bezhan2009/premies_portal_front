import React from 'react';
import '../../../../styles/components/Table.scss';
import LastModified from "../../dashboard_general/LastModified.jsx";
import '../../../../styles/components/TablesChairman.scss'

const data = [
  {
    concreteCards: '12 521',
    concreteActiveCards: '4 521',
    overdraftDebt: '18 154 544,45',
    overdraftCredit: '19 154 578,89',
    balanceCards: '12 124',
  },
];

const ReportTableCardsChairman = () => {
  return (
      <div className='block_info_prems' align='center'>
        <div className="report-table-container">
          <div className="date-filter-container">
            <span className="label">Период</span>
            <LastModified/>
          </div>

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
            {data.map((row, idx) => (
                <tr
                    key={idx}
                >
                  <td>{row.concreteCards || ''}</td>
                  <td>{row.concreteActiveCards || ''}</td>
                  <td>{row.overdraftDebt || ''}</td>
                  <td>{row.overdraftCredit || ''}</td>
                  <td>{row.balanceCards || ''}</td>
                </tr>
            ))}
            </tbody>
          </table>
        </div>
      </div>
  );
};

export default ReportTableCardsChairman;
