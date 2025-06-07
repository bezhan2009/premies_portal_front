import React from 'react';
import '../../../../styles/components/Table.scss';

const data = [
  {
    fullName: 'Умер Фаридун',
    plan: 'Visa Business',
    cards: '2022-454545645645',
    mobileBank: '21.06.2025',
    salaryProject: 'Да',
    overdraft: '54',
    activeCards: '',
    kcz: '',
    complaints: '',
    tests: '',
    balance: '34',
  },
  {},
  {},
  {},
  {},
  {},
  {},
  {},
];

const ReportTableCards = () => {
  return (
    <div className="report-table-container">
      <table className="table-reports">
        <thead>
          <tr>
            <th>ФИО сотрудника</th>
            <th>Тип карты</th>
            <th>Номер счета</th>
            <th>Дата выдачи</th>
            <th>Овердрафт</th>
            <th>Остаток по дебету</th>
            <th>Остаток</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx}>
              <td>{row.fullName || ''}</td>
              <td>{row.plan || ''}</td>
              <td>{row.cards || ''}</td>
              <td>{row.mobileBank || ''}</td>
              <td>{row.salaryProject || ''}</td>
              <td>{row.overdraft || ''}</td>
              <td>{row.balance || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ReportTableCards;
