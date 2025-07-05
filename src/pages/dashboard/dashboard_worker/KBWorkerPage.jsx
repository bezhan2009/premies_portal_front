import '../../../styles/dashboard.scss';
import HeaderWorker from '../../../components/dashboard/dashboard_worker/MenuWorker';
import GetBlockInfo from '../../../components/general/GeneralBlockInfo.jsx';
import { Helmet } from 'react-helmet';

export default function DashboardWorkerKB() {
  return (
    <>
      <Helmet>
        <title>База знаний</title>
      </Helmet>
      <div className="dashboard-container">
        <header className="dashboard-header">
          <HeaderWorker username="Бартов М." activeLink="knowledge" />
        </header>
          <GetBlockInfo page="worker_knowledge_base" />
      </div>
    </>
  );
}
