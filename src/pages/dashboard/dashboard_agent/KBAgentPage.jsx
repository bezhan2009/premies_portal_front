import '../../../styles/dashboard.scss';
import HeaderWorker from '../../../components/dashboard/dashboard_worker/MenuWorker';
import GetBlockInfo from '../../../components/general/GeneralBlockInfo.jsx';
import { Helmet } from 'react-helmet';
import HeaderAgent from "../../../components/dashboard/dashboard_agent/MenuAgent.jsx";

export default function DashboardAgentKB() {
  return (
    <>
      <Helmet>
        <title>База знаний</title>
      </Helmet>
      <div className="dashboard-container">
        <header className="dashboard-header">
          <HeaderAgent activeLink="knowledge" />
        </header>
          <GetBlockInfo page="worker_knowledge_base" />
      </div>
    </>
  );
}
