import React, { useState, useEffect } from 'react';
import ChairmanReportCardsBlockInfo from '../charts/CardCharts.jsx';
import ChairmanReportFinanceBlockInfo from '../charts/FinanceChart.jsx';
import ReportTableEmployeesChairman from "./table_reports/TableReportsEmployees.jsx";

const ChairmanEmployeeParentComponent = ({ workerId = null, year }) => {
    const [url, setUrl] = useState('');

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
            {!workerId && <ReportTableEmployeesChairman onSelect={handleSelect} />}
            <ChairmanReportCardsBlockInfo key={`cards-${url}`} url={url} />
            <ChairmanReportFinanceBlockInfo key={`finance-${url}`} url={url} />
        </div>
    );
};

export default ChairmanEmployeeParentComponent;
