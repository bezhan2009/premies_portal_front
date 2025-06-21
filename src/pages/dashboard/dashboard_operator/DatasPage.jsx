import '../../../styles/dashboard.scss';
import Header from '../../../components/dashboard/dashboard_operator/MenuOperator';
import GetBlockInfo from '../../../components/general/GeneralBlockInfo.jsx';
import { Helmet } from 'react-helmet';

export default function DashboardOperatorDatas() {
  return (
    <>
      <Helmet>
        <title>Панель управления</title>
      </Helmet>
      <div className="dashboard-container">
        <header className="dashboard-header">
          <Header username="Бартов М." activeLink="data" />
        </header>
        <GetBlockInfo page="operator_data" />
      </div>
    </>
  );
}
