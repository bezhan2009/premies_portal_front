import '../../../styles/dashboard.scss';
import HeaderChairman from "../../../components/dashboard/dashboard_chairman/MenuChairman.jsx";
import GetBlockInfo from '../../../components/general/GeneralBlockInfo.jsx';
import { Helmet } from 'react-helmet';

export default function DashboardChairmanKnowledgeBase() {
  return (
    <>
      <Helmet>
        <title>Панель управления</title>
      </Helmet>
      <div className="dashboard-container">
        <header className="dashboard-header">
          <HeaderChairman username="Бартов М." activeLink="knowledge" />
        </header>
        <GetBlockInfo page="worker_knowledge_base" />
      </div>
    </>
  );
}
