import '../../../styles/dashboard.scss';
import HeaderWorker from '../../../components/dashboard/dashboard_worker/MenuWorker';
import GetBlockInfo from '../../../components/general/GeneralBlockInfo.jsx';
import { Helmet } from 'react-helmet';

export default function DashboardWorkerTests() {
  return (
    <>
      <Helmet>
        <title>Тесты</title>
      </Helmet>
      <div className="dashboard-container">
        <header className="dashboard-header">
          <HeaderWorker activeLink="tests" />
        </header>
          <GetBlockInfo page="worker_tests" />
      </div>
    </>
  );
}
