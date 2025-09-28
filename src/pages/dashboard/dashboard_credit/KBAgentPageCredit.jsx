import "../../../styles/dashboard.scss";
import HeaderWorker from "../../../components/dashboard/dashboard_worker/MenuWorker";
import GetBlockInfo from "../../../components/general/GeneralBlockInfo.jsx";
import { Helmet } from "react-helmet";
import HeaderAgent from "../../../components/dashboard/dashboard_agent/MenuAgent.jsx";
import HeaderCredit from "../../../components/dashboard/dashboard_credit/MenuCredit.jsx";

export default function DashboardAgentKBCredit() {
  return (
    <>
      <Helmet>
        <title>База знаний</title>
      </Helmet>
      <div className="dashboard-container">
        <header className="dashboard-header">
          <HeaderCredit activeLink="knowledge" />
        </header>
        <GetBlockInfo page="worker_knowledge_base" />
      </div>
    </>
  );
}
