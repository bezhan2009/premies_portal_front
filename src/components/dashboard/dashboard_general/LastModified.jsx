import React, { useState } from 'react';
import '../../../styles/components/LastModified.scss';

const LastModified = ({ initialDate, modificationDesc }) => {
  const [currentDate, setCurrentDate] = useState(initialDate ? new Date(initialDate) : null);

  const formatInitialDate = (date) => {
    if (!date) return '';
    if (!(date instanceof Date)) {
      const dateStr = date.split('-');
      const day = dateStr[0];
      const month = dateStr[1];
      const year = dateStr[2];
      return `${day}.${month}.${year}`;
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const formatDate = (date) => {
    if (!date) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const changeMonth = (direction) => {
    if (currentDate) {
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + direction);
      setCurrentDate(newDate);
    }
  };

  return (
    <div className="last-modified-container">
      <div className="modification-desc">
        <span className="modification-desc__label">{modificationDesc}</span>
        {initialDate && (
          <div className="last-modified">
            <span className="last-modified__label">
              Последние изменения:
              <span className="last-modified__date"> {formatInitialDate(initialDate)}</span>
            </span>
          </div>
        )}
      </div>
      {initialDate && (
        <div className="date-filter">
          <button
            className="date-filter__arrow date-filter__arrow--left"
            onClick={() => changeMonth(-1)}
          >
            <span className="arrow-icon"></span>
          </button>
          <span className="date-filter__current">{formatDate(currentDate)}</span>
          <button
            className="date-filter__arrow date-filter__arrow--right"
            onClick={() => changeMonth(1)}
          >
            <span className="arrow-icon"></span>
          </button>
        </div>
      )}
    </div>
  );
};

export default LastModified;
