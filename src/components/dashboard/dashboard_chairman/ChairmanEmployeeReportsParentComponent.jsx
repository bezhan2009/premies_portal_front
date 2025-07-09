import React, { useState, useEffect } from 'react';
import ChairmanReportCardsBlockInfo from './charts/CardCharts.jsx';
import ChairmanReportFinanceBlockInfo from './charts/FinanceChart.jsx';
import ReportTableEmployeesChairman from "./table_reports/TableReportsEmployees.jsx";

const ChairmanEmployeeParentComponent = () => {
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
            <ReportTableEmployeesChairman onSelect={handleSelect} />
            <ChairmanReportCardsBlockInfo key={`cards-${url}`} url={url} />
            <ChairmanReportFinanceBlockInfo key={`finance-${url}`} url={url} />
        </div>
    );
};

export default ChairmanEmployeeParentComponent;
