import '../../../styles/dashboard.scss';
import HeaderWorker from '../../../components/dashboard/dashboard_worker/MenuWorker';
import GetBlockInfo from '../../../components/general/GeneralBlockInfo.jsx';
import { Helmet } from 'react-helmet';
import useSidebar from '../../../hooks/useSideBar.js';
import Sidebar from '../../../components/general/DynamicMenu.jsx';

export default function DashboardWorkerTests() {
  const { isSidebarOpen, toggleSidebar } = useSidebar();  

  return (
    <>
      <Helmet>
        <title>Тесты</title>
      </Helmet>
      <div className={`dashboard-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
        <Sidebar activeLink="tests" isOpen={isSidebarOpen} toggle={toggleSidebar} />
        
            <GetBlockInfo page="worker_tests" />
      </div>
    </>
  );
}
