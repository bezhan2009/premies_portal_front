import "../../../styles/dashboard.scss";
import Header from "../../../components/dashboard/dashboard_operator/MenuOperator";
import GetBlockInfo from "../../../components/general/GeneralBlockInfo.jsx";
import { Helmet } from "react-helmet";

export default function DashboardOperatorProcessing() {
    return (
        <>
            <Helmet>
                <title>Моя премия</title>
            </Helmet>
            <div className="dashboard-container">
                <header className="dashboard-header">
                    <Header activeLink="processing" activeSubLink="limits" />
                </header>
                <GetBlockInfo page="operator_processing" />
            </div>
        </>
    );
}
