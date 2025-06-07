import React from 'react';
import '../../../../styles/components/Table.scss';

const data = [
  {
    fullName: 'Умер Фаридун',
    averageScoreTests: '45',
  },
  {},
  {},
  {},
  {},
  {},
  {},
  {},
];

const ReportTableMobBank = () => {
  return (
    <div className="report-table-container">
      <table className="table-reports">
        <thead>
          <tr>
            <th>ФИО сотрудника</th>
            <th>Средняя оценка</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx}>
              <td>{row.fullName || ''}</td>
              <td>{row.averageScoreTests || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ReportTableMobBank;
