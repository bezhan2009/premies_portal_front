import React, { useState, useEffect } from 'react';
import ChartReportCards from "../charts/CardCharts.jsx";
import ChartReportFinance from "../charts/FinanceChart.jsx";
import ReportTableEmployeesDirector from "./table_reports/TableReportsEmployees.jsx";

const DirectorEmployeeParentComponent = ({ workerId = null, year }) => {
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
            <ReportTableEmployeesDirector
                onSelect={handleSelect}
                workerId={workerId}
            />

            {/* Передаем в блоки актуальный url */}
            <ChartReportCards key={`cards-${url}`} url={url} />
            <ChartReportFinance key={`finance-${url}`} url={url} />
        </div>
    );
};

export default DirectorEmployeeParentComponent;
