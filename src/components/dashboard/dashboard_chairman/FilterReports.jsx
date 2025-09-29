import React from 'react';
import '../../../styles/components/Filters.scss';

const ReportFilters = ({ activeTab, setActiveTab }) => {
    const buttons = [
        { text: 'Статистика по банку', value: 'bank', class: 'filters__button--black-rep' },
        { text: 'Статистика по МХБ/Филиалам', value: 'branches', class: 'filters__button--black-rep' },
        { text: 'Статистика по сотрудникам', value: 'employees', class: 'filters__button--black-rep' },
    ];

    return (
        <div className="filters-reports">
            <div className="filters__left">
                {buttons.map((btn) => (
                    <button
                        key={btn.value}
                        className={`filters__button ${btn.class || ""} ${activeTab === btn.value ? 'active' : ''}`}
                        onClick={() => setActiveTab(btn.value)}
                    >
                        {btn.text}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default ReportFilters;
