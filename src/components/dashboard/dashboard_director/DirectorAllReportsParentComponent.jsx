import React, { useState, useEffect } from 'react';
import ReportTableCardsDirector from "./table_reports/TableReportsCards.jsx";
import ChartReportCards from "../charts/CardCharts.jsx";
import ChartReportFinance from "../charts/FinanceChart.jsx";

const DirectorAllParentComponent = () => {
    const [url, setUrl] = useState('');

    // При монтировании подставляем URL по умолчанию (текущий год)
    useEffect(() => {
        const currentYear = new Date().getFullYear();
        setUrl(`${currentYear}/director/office`);
    }, []);

    const handleSelect = (newUrl) => {
        setUrl(newUrl);
    };

    return (
        <div className="office-dashboard">
            {/* Таблица агрегированных карт вызывает onSelect */}
            <ReportTableCardsDirector onSelect={handleSelect} />

            {/* Графики перерисуются по изменению url */}
            <ChartReportCards key={`cards-${url}`} url={url} />
            <ChartReportFinance key={`finance-${url}`} url={url} />
        </div>
    );
};

export default DirectorAllParentComponent;
