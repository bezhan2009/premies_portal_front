import React, { useState } from 'react';

const ReportFilters = ({ onSelect }) => {
    const [activeButton, setActiveButton] = useState('Мобильный банк');

    const handleButtonClick = (buttonName) => {
        setActiveButton(buttonName);
        onSelect(buttonName);
    };

    return (
        <div className="header">
                Отчет
            <button
                className={`btn ${activeButton === 'карты' ? 'active' : ''}`}
                onClick={() => handleButtonClick('карты')}
            >
                Выданные карты
            </button>
            <button
                className={`btn ${activeButton === 'мб' ? 'active' : ''}`}
                onClick={() => handleButtonClick('мб')}
            >
                Мобильный банк
            </button>
            <button
                className={`btn ${activeButton === 'Овердрафт' ? 'active' : ''}`}
                onClick={() => handleButtonClick('Овердрафт')}
            >
                Овердрафт
            </button>
            <button
                className={`btn ${activeButton === 'обороты' ? 'active' : ''}`}
                onClick={() => handleButtonClick('обороты')}
            >
                Обороты
            </button>
            <button
                className={`btn ${activeButton === 'Каналы обслуживания' ? 'active' : ''}`}
                onClick={() => handleButtonClick('Каналы обслуживания')}
            >
                Каналы обслуживания
            </button>
        </div>
    );
};

export default ReportFilters;
