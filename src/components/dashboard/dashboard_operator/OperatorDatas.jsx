import React, { useState } from "react";
import "../../../styles/components/BlockInfo.scss";
import Filters from "../../../components/dashboard/dashboard_general/Filters";
import FiltersDatas from "./FiltersData";
import OfficeTable from "./table_datas/TableOffice";
import EmployeesTable from "./table_datas/TableEmployees";
import UnderDevelopmentPage from "../dashboard_general/UnderDevelopment";
import { AnimatePresence, motion } from "framer-motion";
import CardsTable from "./table_datas/TableCardPrices.jsx";
import TableCardMargents from "./table_datas/TableCardMargents.jsx";

const OperatorDatasBlockInfo = () => {
  const [selectedTable, setSelectedTable] = useState("office");

  const renderTable = () => {
    switch (selectedTable) {
      case "employees":
        return (
          <>
            <Filters modificationDesc="Сотрудники" />
            <EmployeesTable key="employees" />
          </>
        );
      case "office":
        return (
          <>
            <Filters modificationDesc="Отделения" />
            <OfficeTable key="office" />
          </>
        );
      case "prices":
        return (
          <>
            <Filters modificationDesc="Отделения" />
            <CardsTable key="prices" />
          </>
        );
      case "margents":
        return (
          <>
            <Filters modificationDesc="Отделения" />
            <TableCardMargents key="margents" />
          </>
        );
      default:
        return (
          <>
            <UnderDevelopmentPage />
          </>
        );
    }
  };

  return (
    <div className="block_info_prems" align="center">
      <FiltersDatas onSelect={setSelectedTable} />

      <AnimatePresence mode="wait">
        <motion.div
          key={selectedTable}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.3 }}
        >
          {renderTable()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default OperatorDatasBlockInfo;
