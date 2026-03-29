import '../../../styles/dashboard.scss';
import GetBlockInfo from '../../../components/general/GeneralBlockInfo.jsx';
import { Helmet } from 'react-helmet';

export default function DashboardDirectorReports() {

    return (
        <>
            <Helmet>
                <title>Мой оффис</title>
            </Helmet>
            <div className="dashboard-container">
                <GetBlockInfo page="director_reports" />
            </div>
        </>
    );
}
