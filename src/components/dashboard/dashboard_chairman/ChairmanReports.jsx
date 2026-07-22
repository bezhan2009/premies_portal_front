import React, { useState } from "react";
import ReportFilters from "./FilterReports.jsx";
import ReportContent from "./ReportsContent.jsx";

const ChairmanReports = () => {
  const [activeTab, setActiveTab] = useState("bank");

  return (
    <>
      <div className="block_info_prems content-page">
        <ReportFilters activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="filters-content">
          <ReportContent activeTab={activeTab} />
        </div>
      </div>
    </>
  );
};

export default ChairmanReports;
