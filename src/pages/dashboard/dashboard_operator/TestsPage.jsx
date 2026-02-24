import '../../../styles/dashboard.scss';
import Header from '../../../components/dashboard/dashboard_operator/MenuOperator';
import GetBlockInfo from '../../../components/general/GeneralBlockInfo.jsx';
import { Helmet } from 'react-helmet';
import useSidebar from '../../../hooks/useSideBar.js';
import Sidebar from '../../../components/general/DynamicMenu.jsx';


export default function DashboardOperatorTests() {
  const { isSidebarOpen, toggleSidebar } = useSidebar();  

  return (
    <>
      <Helmet>
        <title>Панель управления</title>
      </Helmet>
      <div className={`dashboard-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
        <Sidebar activeLink="tests_operator" isOpen={isSidebarOpen} toggle={toggleSidebar} />
    
        <div className="dashboard-container">
          <GetBlockInfo page="operator_tests" />
        </div>
      </div>
    </>
  );
}
