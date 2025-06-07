import React from 'react';
import '../../../../styles/components/Table.scss';

const data = [
  {
    officeName: 'Мудирияти амалиети',
  },
  {},
  {},
  {},
  {},
  {},
  {},
  {},
];

const OfficeTable = () => {
  return (
    <div className="report-table-container">
      <table className="table-reports">
        <thead>
          <tr>
            <th>Названия отделения</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx}>
              <td>{row.officeName || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OfficeTable;
