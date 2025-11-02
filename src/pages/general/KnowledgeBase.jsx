import "../../styles/dashboard.scss";
// import GetBlockInfo from "../../../components/general/GeneralBlockInfo.jsx";
import { Helmet } from "react-helmet";
import HeaderDipozit from "../../components/dashboard/dashboard_dipozit/MenuDipozit.jsx";
import GetBlockInfo from "../../components/general/GeneralBlockInfo.jsx";
import HeaderAgentQR from "../../components/dashboard/dashboard_agent_qr/MenuAgentQR.jsx";

export default function DashboardDipozitKnowledgeBase() {
  return (
    <>
      <Helmet>
        <title>База знаний</title>
      </Helmet>
      <div className="dashboard-container">
        <header className="dashboard-header">
          <HeaderDipozit activeLink="knowledge" />
        </header>
        <GetBlockInfo page="worker_knowledge_base" />
      </div>
    </>
  );
}

export function DashboardQRKnowledgeBase() {
  return (
    <>
      <Helmet>
        <title>База знаний</title>
      </Helmet>
      <div className="dashboard-container">
        <header className="dashboard-header">
          <HeaderAgentQR activeLink="knowledge" />
        </header>
        <GetBlockInfo page="worker_knowledge_base" />
      </div>
    </>
  );
}
