import React, { useState } from 'react';
import ReportFilters from "./FilterReports.jsx";
import ReportContent from "./ReportsContent.jsx";

const DirectorReports = () => {
    const [activeTab, setActiveTab] = useState('office');

    return (
        <>
            <div className="block_info_prems">
                <ReportFilters activeTab={activeTab} setActiveTab={setActiveTab} />
            </div>
            <div className="filters-content">
                <ReportContent activeTab={activeTab} />
            </div>
        </>
    );
};

export default DirectorReports;
