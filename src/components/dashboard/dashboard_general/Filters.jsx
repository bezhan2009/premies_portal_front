import React from 'react';
import LastModified from './LastModified';
import '../../../styles/components/Filters.scss';

const Filters = ({ initialDate, modificationDesc, onChange }) => {
  const buttons = [
    { text: 'Фильтры', class: 'filters__button--black' },
    { text: 'Добавить', class: 'filters__button--orange' },
    { text: 'Изменить', class: 'filters__button--blue' },
    { text: 'Удалить', class: 'filters__button--red' },
    { text: 'Загрузить файл', class: 'filters__button--green' },
  ];

  return (
    <div className="filters">
      <div className="filters__left">
        <LastModified initialDate={initialDate} modificationDesc={modificationDesc} onChange={onChange} />
      </div>
      <div className="filters__right">
        {buttons.map((btn) => (
          <button key={btn.text} className={`filters__button ${btn.class}`}>
            {btn.text}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Filters;
