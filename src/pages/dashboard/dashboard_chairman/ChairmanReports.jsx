import '../../../styles/dashboard.scss';
import HeaderChairman from "../../../components/dashboard/dashboard_chairman/MenuChairman.jsx";
import GetBlockInfo from '../../../components/general/GeneralBlockInfo.jsx';
import { Helmet } from 'react-helmet';


export default function DashboardChairmanReports() {
      

    return (
        <>
            <Helmet>
                <title>Карты</title>
            </Helmet>
            {/* <div className={` ${isSidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}> */}
                <div>
                    <GetBlockInfo page="chairman_reports" />
                </div>
            {/* </div> */}
        </>
    );
}
