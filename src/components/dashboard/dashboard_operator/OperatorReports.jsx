import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import "../../../styles/components/BlockInfo.scss";
import Filters from "../../../components/dashboard/dashboard_general/Filters";
import FiltersReports from "../../../components/dashboard/dashboard_operator/FiltersReports";
import TableReportsCards from "../../../components/dashboard/dashboard_operator/table_reports/TableReportsCards";
import TableReportsMb from "../../../components/dashboard/dashboard_operator/table_reports/TableReportsMobBank";
import TableReportsKc from "../../../components/dashboard/dashboard_operator/table_reports/TableReportsKc";
import TableReportsTest from "../../../components/dashboard/dashboard_operator/table_reports/TableReportsTests";

const OperatorReportsBlockInfo = () => {
  const [selectedReport, setSelectedReport] = useState("cards");
  const [dateFilter, setDateFilter] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  const renderTable = () => {
    const commonProps = {
      initial: { opacity: 0, x: 10 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -10 },
      transition: { duration: 0.3 },
    };

    switch (selectedReport) {
      case "mb":
        return (
          <motion.div key="mb" {...commonProps}>
            <Filters
              initialDate="2025-06-21"
              modificationDesc="Отчет по МБ"
              onChange={setDateFilter}
            />
            <TableReportsMb month={dateFilter.month} year={dateFilter.year} />
          </motion.div>
        );

      case "kc":
        return (
          <motion.div key="kc" {...commonProps}>
            <Filters
              initialDate="2025-06-21"
              modificationDesc="Отчет КЦ"
              onChange={setDateFilter}
            />
            <TableReportsKc month={dateFilter.month} year={dateFilter.year} />
          </motion.div>
        );

      case "test":
        return (
          <motion.div key="test" {...commonProps}>
            <Filters
              initialDate="2025-06-21"
              modificationDesc="Отчет Тест"
              onChange={setDateFilter}
            />
            <TableReportsTest month={dateFilter.month} year={dateFilter.year} />
          </motion.div>
        );

      case "cards":
      default:
        return (
          <motion.div key="cards" {...commonProps}>
            <Filters
              initialDate="2025-06-21"
              modificationDesc="Отчет по картам"
              onChange={setDateFilter}
            />
            <TableReportsCards
              month={dateFilter.month}
              year={dateFilter.year}
            />
          </motion.div>
        );
    }
  };

  return (
    <div className="block_info_prems content-page" align="center">
      <FiltersReports onSelect={setSelectedReport} />
      <AnimatePresence mode="wait">{renderTable()}</AnimatePresence>
    </div>
  );
};

export default OperatorReportsBlockInfo;
