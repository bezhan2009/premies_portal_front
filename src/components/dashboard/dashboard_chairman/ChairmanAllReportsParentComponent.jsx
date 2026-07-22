import React, { useState, useEffect } from 'react';
import ChairmanReportCardsBlockInfo from '../charts/CardCharts.jsx';
import ChairmanReportFinanceBlockInfo from '../charts/FinanceChart.jsx';
import ReportTableCardsChairman from "./table_reports/TableReportsCards.jsx";

const ChairmanAllParentComponent = () => {
    const [url, setUrl] = useState('');

    // При монтировании подставляем URL по умолчанию (текущий год)
    useEffect(() => {
        const currentYear = new Date().getFullYear();
        setUrl(`*/${currentYear}`);
    }, []);

    const handleSelect = (newUrl) => {
        setUrl(newUrl);
    };

    return (
        <div className="bank-dashboard">
            {/* Таблица агрегированных карт вызывает onSelect */}
            <ReportTableCardsChairman onSelect={handleSelect} />

            {/* Графики перерисуются по изменению url */}
            <ChairmanReportCardsBlockInfo key={`cards-${url}`} url={url} />
            <ChairmanReportFinanceBlockInfo key={`finance-${url}`} url={url} />
        </div>
    );
};

export default ChairmanAllParentComponent;
