import '../../../styles/dashboard.scss';
import HeaderAgentSMS from '../../../components/dashboard/dashboard_agent_sms/MenuAgentSMS.jsx';
import GetBlockInfo from '../../../components/general/GeneralBlockInfo.jsx';
import { Helmet } from 'react-helmet';

export default function DashboardAgentSMSKnowledgeBase() {
  return (
    <>
      <Helmet>
        <title>База знаний</title>
      </Helmet>
      <div className="dashboard-container">
        <header className="dashboard-header">
          <HeaderAgentSMS activeLink="knowledge" />
        </header>
        <GetBlockInfo page="worker_knowledge_base" />
      </div>
    </>
  );
}
