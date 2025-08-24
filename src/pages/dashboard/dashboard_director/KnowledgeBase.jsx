import '../../../styles/dashboard.scss';
import GetBlockInfo from '../../../components/general/GeneralBlockInfo.jsx';
import { Helmet } from 'react-helmet';
import HeaderDirector from "../../../components/dashboard/dashboard_director/MenuDirector.jsx";

export default function DashboardDirectorKnowledgeBase() {
  return (
    <>
      <Helmet>
        <title>База знаний</title>
      </Helmet>
      <div className="dashboard-container">
        <header className="dashboard-header">
          <HeaderDirector activeLink="knowledge" />
        </header>
        <GetBlockInfo page="worker_knowledge_base" />
      </div>
    </>
  );
}
