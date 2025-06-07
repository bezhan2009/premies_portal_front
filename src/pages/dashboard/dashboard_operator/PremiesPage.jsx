import '../../../styles/dashboard.scss';
import Header from '../../../components/general/MenuOperator'
import GetBlockInfo from '../../../components/dashboard/dashboard_general/GeneralBlockInfo';
import { Helmet } from 'react-helmet';

export default function DashboardOperatorPremies() {
  return (
    <>
      <Helmet>
        <title>Панель управления</title>
      </Helmet>
      <div className="dashboard-container">
        <header className="dashboard-header">
          <Header username="Бартов М." activeLink="premi" />
        </header>
        <GetBlockInfo page="operator_premi" />
      </div>
    </>
  );
}
