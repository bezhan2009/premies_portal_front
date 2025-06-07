import React from 'react';
import '../../../../styles/components/Table.scss';

const data = [
  {
    fullName: 'Умер Фаридун',
    averageScoreKc: '8.85',
  },
  {},
  {},
  {},
  {},
  {},
  {},
  {},
];

const ReportTableKc = () => {
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
              <td>{row.averageScoreKc || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ReportTableKc;
