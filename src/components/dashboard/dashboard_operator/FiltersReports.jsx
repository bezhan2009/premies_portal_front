// FiltersReports.jsx
import React from 'react';
import '../../../styles/components/Filters.scss';

const FiltersReports = ({ onSelect }) => {
  const buttons = [
    { text: 'Отчет по картам', class: 'reports_filter__button--grey', key: 'cards' },
    { text: 'Отчет по МБ', class: 'reports_filter__button--purple', key: 'mb' },
    { text: 'Отчет КЦ', class: 'reports_filter__button--yellow', key: 'kc' },
    { text: 'Отчет Тест', class: 'reports_filter__button--cyan', key: 'test' },
  ];

  return (
    <div className='reports_filter'>
      <div className="filters__left">
        {buttons.map((btn) => (
          <button
            key={btn.key}
            className={`reports_filter__button ${btn.class}`}
            onClick={() => onSelect(btn.key)}
          >
            {btn.text}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FiltersReports;
