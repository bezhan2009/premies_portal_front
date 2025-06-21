import '../../../styles/dashboard.scss';
import HeaderWorker from '../../../components/dashboard/dashboard_worker/MenuWorker';
import GetBlockInfo from '../../../components/general/GeneralBlockInfo.jsx';
import { Helmet } from 'react-helmet';

export default function DashboardWorkerPremies() {
  return (
    <>
      <Helmet>
        <title>Моя премия</title>
      </Helmet>
      <div className="dashboard-container">
        <header className="dashboard-header">
          <HeaderWorker username="Бартов М." activeLink="premies" />
        </header>
          <GetBlockInfo page="worker_premi" />
      </div>
    </>
  );
}
