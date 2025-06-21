import '../../styles/dashboard.scss';
import HeaderWorker from '../../components/dashboard/dashboard_worker/MenuWorker';
import GetBlockInfo from '../../components/general/GeneralBlockInfo.jsx';
import { Helmet } from 'react-helmet';

export default function UnderDevelopmentPage() {
  return (
    <>
      <Helmet>
        <title>Страница ещё не создана</title>
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
