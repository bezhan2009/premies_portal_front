import React from 'react';
import '../../../../styles/components/Table.scss';

const data = [
  {
    fio: 'Умаро Фаридун',
    login: 'UmaroF',
    position: 'Куратор123',
    department: 'Мудрикий аналитик',
    location: 'Бончик хур',
    oklad: '4254',
    group: 'Корпто',
  },
  {
    fio: 'Носкова Дилафро',
    login: '',
    position: '',
    department: '',
    location: '',
    oklad: '',
    group: 'Карако ва дигар',
  },
  {},
  {},
  {},
  {},
  {},
  {},
];

const EmployeesTable = () => {
  return (
    <div className="report-table-container">
      <table className="table-reports">
        <thead>
          <tr>
            <th>ФИО</th>
            <th>Логин</th>
            <th>Должность</th>
            <th>Отделение (место работы)</th>
            <th>Должность</th>
            <th>Оклад</th>
            <th>Группа продаж</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx}>
              <td>{row.fio || ''}</td>
              <td>{row.login || ''}</td>
              <td>{row.position || ''}</td>
              <td>{row.department || ''}</td>
              <td>{row.location || ''}</td>
              <td>{row.oklad || ''}</td>
              <td>{row.group || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EmployeesTable;
