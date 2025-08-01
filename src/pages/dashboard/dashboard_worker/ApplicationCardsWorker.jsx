import '../../../styles/dashboard.scss';
import HeaderWorker from '../../../components/dashboard/dashboard_worker/MenuWorker';
import GetBlockInfo from '../../../components/general/GeneralBlockInfo.jsx';
import { Helmet } from 'react-helmet';

export default function DashboardWorkerApplicationCards() {
    return (
        <>
            <Helmet>
                <title>Кредиты</title>
            </Helmet>
            <div className="dashboard-container">
                <header className="dashboard-header">
                    <HeaderWorker activeLink="cards" />
                </header>
                <GetBlockInfo page="application_cards_worker" />
            </div>
        </>
    );
}
