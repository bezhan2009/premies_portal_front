// components/TechnicalDayBanner/TechnicalDayBanner.tsx
import React from 'react';
import '../../styles/TechnicalDayBanner.scss';

function TechnicalDayBanner() {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="technical-day-banner">
      <div className="technical-day-banner__container">
        <div className="technical-day-banner__icon">🔧</div>
        <h1 className="technical-day-banner__title">Технический день</h1>
        <p className="technical-day-banner__message">
          Сегодня проводятся технические работы. Приносим извинения за временные неудобства.
        </p>
        <div className="technical-day-banner__details">
          <p>Система будет доступна после завершения работ</p>
          <p className="technical-day-banner__time">Время работ: 09:00 - 18:00</p>
        </div>
        <button 
          className="technical-day-banner__refresh-btn"
          onClick={handleRefresh}
        >
          Проверить доступность
        </button>
      </div>
    </div>
  );
};

export default TechnicalDayBanner;
