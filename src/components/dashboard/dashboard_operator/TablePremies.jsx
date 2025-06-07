import React from 'react';
import '../../../styles/components/Table.scss';

const data = [
  {
    fullName: '7925929452',
    plan: 'Зима',
    cards: 'Ivanov Ivan',
    mobileBank: 'Муж',
    salaryProject: 'Нет',
    overdraft: 'Заграничный паспорт РФ P 23992209',
    debit: '29393992',
    balance: 'Россия город Москва улица Чертановская д 64 кв 84',
    activeCards: 'Visa Gold (тариф "GOLD")',
    kcz: 'Мультимапо тная',
    complaints: '4598459456954956',
    tests: '№47599 4569465',
    bonus: '12.02.2024',
  },
  {},
  {},
  {},
  {},
  {},
  {},
  {},
];

const ReportTable = () => {
  return (
    <div className="report-table-container">
      <table className="table-reports">
        <thead>
          <tr>
            <th>ФИО сотрудника</th>
            <th>План продаж</th>
            <th>Продажа Карт</th>
            <th>Мобильный банк</th>
            <th>ЗП проект</th>
            <th>Овердрафт</th>
            <th>Оборот по дебету</th>
            <th>Остатки по картам</th>
            <th>Активные карты</th>
            <th>Оценка КЦ</th>
            <th>Жалобы + ОЗ</th>
            <th>Тесты</th>
            <th>Итого премия</th>
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
              <td>{row.debit || ''}</td>
              <td>{row.balance || ''}</td>
              <td>{row.activeCards || ''}</td>
              <td>{row.kcz || ''}</td>
              <td>{row.complaints || ''}</td>
              <td>{row.tests || ''}</td>
              <td>{row.bonus || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ReportTable;
