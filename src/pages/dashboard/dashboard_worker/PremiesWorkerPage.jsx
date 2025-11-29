import '../../../styles/dashboard.scss';
import HeaderWorker from '../../../components/dashboard/dashboard_worker/MenuWorker';
import GetBlockInfo from '../../../components/general/GeneralBlockInfo.jsx';
import { Helmet } from 'react-helmet';
import useSidebar from '../../../hooks/useSideBar.js';
import Sidebar from '../../general/DynamicMenu.jsx';


export default function DashboardWorkerPremies() {
  const { isSidebarOpen, toggleSidebar } = useSidebar();  

  return (
    <>
      <Helmet>
        <title>Моя премия</title>
      </Helmet>
      <div className={`dashboard-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
        <Sidebar activeLink="worker_premies" isOpen={isSidebarOpen} toggle={toggleSidebar} />
        
        <div className="dashboard-container">
            <GetBlockInfo page="worker_premi" />
        </div>
      </div>
    </>
  );
}
