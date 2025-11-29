import '../../../styles/dashboard.scss';
import HeaderChairman from "../../../components/dashboard/dashboard_chairman/MenuChairman.jsx";
import GetBlockInfo from '../../../components/general/GeneralBlockInfo.jsx';
import { Helmet } from 'react-helmet';
import useSidebar from '../../../hooks/useSideBar.js';
import Sidebar from '../../general/DynamicMenu.jsx';


export default function DashboardChairmanReports() {
    const { isSidebarOpen, toggleSidebar } = useSidebar();  

    return (
        <>
            <Helmet>
                <title>Карты</title>
            </Helmet>
            <div className={`dashboard-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
                <Sidebar activeLink="chairman" isOpen={isSidebarOpen} toggle={toggleSidebar} />
                <div className="dashboard-container">
                    <GetBlockInfo page="chairman_reports" />
                </div>
            </div>
        </>
    );
}
