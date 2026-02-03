import '../../../styles/dashboard.scss';
import Header from '../../../components/dashboard/dashboard_operator/MenuOperator';
import GetBlockInfo from '../../../components/general/GeneralBlockInfo.jsx';
import { Helmet } from 'react-helmet';
import useSidebar from '../../../hooks/useSideBar.js';
import Sidebar from '../../general/DynamicMenu.jsx';
import ABSClientSearch from "../../../components/dashboard/dashboard_frontovik/ABSSearch.jsx";

export default function DashboardFrontovikAbsSearch() {
  const { isSidebarOpen, toggleSidebar } = useSidebar();

  return (
    <>
      <Helmet>
        <title>Поиск по АБС</title>
      </Helmet>
      <div className={`dashboard-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
          <Sidebar activeLink="abs_search" isOpen={isSidebarOpen} toggle={toggleSidebar} />

          <div className="dashboard-container">
            <ABSClientSearch />
          </div>

        </div>
    </>
  );
}
