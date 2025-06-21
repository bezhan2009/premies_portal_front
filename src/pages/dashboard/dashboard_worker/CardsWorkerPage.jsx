import '../../../styles/dashboard.scss';
import HeaderWorker from '../../../components/dashboard/dashboard_worker/MenuWorker';
import GetBlockInfo from '../../../components/general/GeneralBlockInfo.jsx';
import { Helmet } from 'react-helmet';

export default function DashboardWorkerCards() {
  return (
    <>
      <Helmet>
        <title>Карты</title>
      </Helmet>
      <div className="dashboard-container">
        <header className="dashboard-header">
          <HeaderWorker username="Бартов М." activeLink="cards" />
        </header>
          <GetBlockInfo page="und" />
      </div>
    </>
  );
}
