import React, { useState } from "react";
import { Tabs } from "antd";

import TableCardMargents from "./table_datas/TableCardMargents.jsx";
import TableMerchantPosTerminals from "./table_datas/TableMerchantPosTerminals.jsx";

const MerchantAdminPanel = () => {
  const [activeKey, setActiveKey] = useState("dictionary");

  return (
    <div style={{ textAlign: "left" }}>
      <Tabs
        activeKey={activeKey}
        onChange={setActiveKey}
        items={[
          {
            key: "dictionary",
            label: "Справочник",
            children: <TableCardMargents />,
          },
          {
            key: "pos",
            label: "POS-терминалы",
            children: <TableMerchantPosTerminals />,
          },
        ]}
      />
    </div>
  );
};

export default MerchantAdminPanel;
