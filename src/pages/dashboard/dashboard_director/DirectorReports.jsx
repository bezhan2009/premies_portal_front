import '../../../styles/dashboard.scss';
import GetBlockInfo from '../../../components/general/GeneralBlockInfo.jsx';
import { Helmet } from 'react-helmet';
import HeaderDirector from "../../../components/dashboard/dashboard_director/MenuDirector.jsx";

export default function DashboardDirectorReports() {
    return (
        <>
            <Helmet>
                <title>Карты</title>
            </Helmet>
            <div className="dashboard-container">
                <header className="dashboard-header">
                    <HeaderDirector activeLink="rep_cards" />
                </header>
                <GetBlockInfo page="director_reports" />
            </div>
        </>
    );
}
