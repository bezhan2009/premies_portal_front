import '../../../styles/dashboard.scss';
import Header from '../../../components/dashboard/dashboard_operator/MenuOperator';
import GetBlockInfo from '../../../components/general/GeneralBlockInfo.jsx';
import { Helmet } from 'react-helmet';

export default function DashboardOperatorKnowledgeBase() {
  return (
    <>
      <Helmet>
        <title>Панель управления</title>
      </Helmet>
      <div className="dashboard-container">
        <header className="dashboard-header">
          <Header activeLink="knowledge" />
        </header>
        <GetBlockInfo page="operator_knowledge_base" />
      </div>
    </>
  );
}
