import "../../../styles/dashboard.scss";
import Header from "../../../components/dashboard/dashboard_operator/MenuOperator";
import GetBlockInfo from "../../../components/general/GeneralBlockInfo.jsx";
import { Helmet } from "react-helmet";
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
        <Sidebar activeLink="premi" isOpen={isSidebarOpen} toggle={toggleSidebar} />
        <div className="dashboard-container">
          <GetBlockInfo page="operator_premi" />
        </div>
      </div>
    </>
  );
}
