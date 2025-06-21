import React, { useState, useEffect } from 'react';
import '../../../../styles/components/Table.scss';
import LastModified from '../../dashboard_general/LastModified.jsx';
import '../../../../styles/components/TablesChairman.scss';

const data = [
  {
    category: 'Умарова Фаридун',
    concreteCards: '5 000',
    concreteActiveCards: '4 000',
    overdraftDebt: '8 000 000',
    overdraftCredit: '7 000 000',
    balanceCards: '12 124',
    premium: '1000',
  },
  {
    category: 'Носирова Дилрабо',
    concreteCards: '545',
    concreteActiveCards: '55',
    overdraftDebt: '5',
    overdraftCredit: '55',
    balanceCards: '554',
    premium: '500',
  },
  {
    category: 'Сафина Карина',
    concreteCards: '5',
    concreteActiveCards: '5',
    overdraftDebt: '4',
    overdraftCredit: '4',
    balanceCards: '4',
    premium: '1200',
  },
  {
    category: 'Кто то',
    concreteCards: '1',
    concreteActiveCards: '1',
    overdraftDebt: '1',
    overdraftCredit: '1',
    balanceCards: '1',
    premium: '100',
  },
];

const ReportTableEmployeesChairman = ({ onSelect }) => {
  const [selectedRow, setSelectedRow] = useState(0); // Первая строка выбрана по умолчанию

  useEffect(() => {
    onSelect(''); // Вызываем onSelect при загрузке для первой строки
  }, [onSelect]);

  const handleRowClick = (index) => {
    setSelectedRow(index); // Устанавливаем выбранную строку
    const url = Math.floor(Math.random() * 1000).toString();
    onSelect(url); // Передаем URL родителю
  };

  return (
      <div className="block_info_prems" align="center">
        <div className="report-table-container">
          <div className="date-filter-container">
            <span className="label">Период</span>
            <LastModified />
          </div>

          <table className="table-reports">
            <thead>
            <tr>
              <th>Выберите</th>
              <th>Отделение</th>
              <th>Количество карт</th>
              <th>Конкретно активных карт</th>
              <th>Оборот по дебету</th>
              <th>Оборот по кредиту</th>
              <th>Остатки на картах</th>
              <th>Премия</th>
            </tr>
            </thead>
            <tbody>
            {data.map((row, idx) => (
                <tr
                    key={idx}
                    onClick={() => handleRowClick(idx)} // Клик по строке
                    style={{ cursor: 'pointer' }}
                >
                  <td>
                    <div
                        className={`choose-td ${selectedRow === idx ? 'active' : ''}`} // Активный класс
                    ></div>
                  </td>
                  <td>{row.category || ''}</td>
                  <td>{row.concreteCards || ''}</td>
                  <td>{row.concreteActiveCards || ''}</td>
                  <td>{row.overdraftDebt || ''}</td>
                  <td>{row.overdraftCredit || ''}</td>
                  <td>{row.balanceCards || ''}</td>
                  <td>{row.premium || ''}</td>
                </tr>
            ))}
            </tbody>
          </table>
        </div>
      </div>
  );
};

export default ReportTableEmployeesChairman;
