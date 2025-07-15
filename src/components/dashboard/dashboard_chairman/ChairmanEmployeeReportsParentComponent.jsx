import React, { useState, useEffect } from 'react';
import ChairmanReportCardsBlockInfo from './charts/CardCharts.jsx';
import ChairmanReportFinanceBlockInfo from './charts/FinanceChart.jsx';
import ReportTableEmployeesChairman from "./table_reports/TableReportsEmployees.jsx";

const ChairmanEmployeeParentComponent = ({ workerId = null, year }) => {
    const [url, setUrl] = useState('');

    // Когда меняется workerId или год — формируем новый URL
    useEffect(() => {
        if (workerId) {
            setUrl(`${workerId}/${year}`);
        } else {
            setUrl('');
        }
    }, [workerId, year]);

    const handleSelect = (newUrl) => {
        setUrl(newUrl);
    };

    return (
        <div>
            {/* Если передан workerId, ReportTableEmployeesChairman не рендерит таблицу, но всё равно шлёт onSelect */}
            <ReportTableEmployeesChairman
                onSelect={handleSelect}
                workerId={workerId}
            />

            {/* Передаем в блоки актуальный url */}
            <ChairmanReportCardsBlockInfo key={`cards-${url}`} url={url} />
            <ChairmanReportFinanceBlockInfo key={`finance-${url}`} url={url} />
        </div>
    );
};

export default ChairmanEmployeeParentComponent;
