import React from 'react';
import '../../../../styles/components/Table.scss';

const data = [
  {
    fullName: 'Умер Фаридун',
    connects: '45',
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
            <th>Количество подключений</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx}>
              <td>{row.fullName || ''}</td>
              <td>{row.connects || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ReportTableMobBank;
