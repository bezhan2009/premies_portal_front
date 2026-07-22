import React, { useState, useEffect } from 'react';
import ReportTableOfficesChairman from './table_reports/TableReportsOffice.jsx';
import ChairmanReportCardsBlockInfo from '../charts/CardCharts.jsx';
import ChairmanReportFinanceBlockInfo from '../charts/FinanceChart.jsx';

const ChairmanOfficeParentComponent = () => {
    const [url, setUrl] = useState(''); // Состояние для URL

    // Устанавливаем первую строку по умолчанию при загрузке
    useEffect(() => {
        handleSelect(''); // Симулируем выбор первой строки
    }, []);

    const handleSelect = (newUrl) => {
        setUrl(newUrl);
    };

    return (
        <div>
            <ReportTableOfficesChairman onSelect={handleSelect} />
            <ChairmanReportCardsBlockInfo key={`cards-${url}`} url={url} />
            <ChairmanReportFinanceBlockInfo key={`finance-${url}`} url={url} />
        </div>
    );
};

export default ChairmanOfficeParentComponent;
