import '../../../styles/dashboard.scss';
import GetBlockInfo from '../../../components/general/GeneralBlockInfo.jsx';
import { Helmet } from 'react-helmet';
import useSidebar from '../../../hooks/useSideBar.js';
import Sidebar from '../../../components/general/DynamicMenu.jsx';

export default function DashboardDirectorReports() {
  const { isSidebarOpen, toggleSidebar } = useSidebar();  

    return (
        <>
            <Helmet>
                <title>Мой оффис</title>
            </Helmet>
            <div className={`dashboard-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
                <Sidebar activeLink="director" isOpen={isSidebarOpen} toggle={toggleSidebar} />
                <div className="dashboard-container">
                    <GetBlockInfo page="director_reports" />
                </div>
            </div>
        </>
    );
}
