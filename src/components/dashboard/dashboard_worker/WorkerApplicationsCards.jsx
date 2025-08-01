// RenderReports.jsx
import React from 'react';
import ApplicationReport from "./reports_table/applications_table.jsx";

const WorkerApplicationsCards = () => {
    return (
        <div className="block_info_prems" align="center">
            <ApplicationReport />;
        </div>
    );
};

export default WorkerApplicationsCards;
