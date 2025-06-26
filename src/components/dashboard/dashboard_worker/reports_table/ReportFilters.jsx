import React, { useState } from 'react';
import '../../../../styles/components/Filters.scss'

const ReportFilters = ({ onSelect }) => {
    const [activeTab, setActiveTab] = useState('cards');

    const buttons = [
        { text: 'Выданные карты', value: 'cards', class: 'filters__button--black-rep' },
        { text: 'Мобильный банк', value: 'mobileBank', class: 'filters__button--black-rep' },
        { text: 'Овердрафт', value: 'overdraft', class: 'filters__button--black-rep' },
        { text: 'Обороты', value: 'turnovers', class: 'filters__button--black-rep' },
        { text: 'Каналы обслуживания', value: 'kc', class: 'filters__button--black-rep' },
    ];

    const handleButtonClick = (value) => {
        setActiveTab(value);
        onSelect(value);
    };

    return (
        <div className="filters-reports">
            <div className="filters__container">
                <div className="filters__title">Отчет</div>
                <div className="filters__left">
                    {buttons.map((btn) => (
                        <button
                            key={btn.value}
                            className={`filters__button ${btn.class} ${activeTab === btn.value ? 'active' : ''}`}
                            onClick={() => handleButtonClick(btn.value)}
                        >
                            {btn.text}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ReportFilters;
